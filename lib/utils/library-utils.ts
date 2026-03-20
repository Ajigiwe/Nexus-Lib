// Utility functions for library operations

import type { Book, Transaction } from "../types"
import { db } from "../database"

export function calculateFine(dueDate: string, returnDate: string = new Date().toISOString()): number {
  const due = new Date(dueDate)
  const returned = new Date(returnDate)
  const diffTime = returned.getTime() - due.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 0

  // $0.50 per day fine
  return diffDays * 0.5
}

export function canMemberBorrowBook(memberId: string): { canBorrow: boolean; reason?: string } {
  const member = db.getMemberById(memberId)
  if (!member) return { canBorrow: false, reason: "Member not found" }
  if (!member.isActive) return { canBorrow: false, reason: "Member account is inactive" }

  // Membership validity: 3 months from joinDate (or earlier if expiryDate set and reached)
  const join = new Date(member.joinDate)
  const validUntil = new Date(join)
  validUntil.setMonth(validUntil.getMonth() + 3)
  const now = new Date()
  const effectiveExpiry = member.expiryDate ? new Date(member.expiryDate) : validUntil
  if (now > effectiveExpiry) {
    return { canBorrow: false, reason: "Membership expired. Please renew." }
  }

  // Enforce max 2 concurrent loans for all patrons
  const maxAllowed = 2
  if (member.currentBooksCount >= maxAllowed) {
    return { canBorrow: false, reason: "Maximum book limit reached (2)." }
  }

  const memberTransactions = db.getAllTransactions().filter((t) => t.memberId === memberId && t.status === "overdue")
  if (memberTransactions.length > 0) {
    return { canBorrow: false, reason: "Member has overdue books" }
  }

  return { canBorrow: true }
}

export function borrowBook(
  bookId: string,
  memberId: string,
): { success: boolean; message: string; transaction?: Transaction } {
  const book = db.getBookById(bookId)
  const member = db.getMemberById(memberId)

  if (!book) return { success: false, message: "Book not found" }
  if (!member) return { success: false, message: "Member not found" }
  if ((book as any).isReference) return { success: false, message: "This is a reference-only book and cannot be borrowed" }
  if ((book as any).availableCopies !== undefined && (book as any).availableCopies <= 0)
    return { success: false, message: "No copies available" }

  const canBorrow = canMemberBorrowBook(memberId)
  if (!canBorrow.canBorrow) return { success: false, message: canBorrow.reason || "Cannot borrow book" }

  // Calculate due date (14 days from now)
  const borrowDate = new Date()
  const dueDate = new Date(borrowDate)
  dueDate.setDate(dueDate.getDate() + 14)

  // Create transaction
  const transaction = db.addTransaction({
    bookId,
    memberId,
    type: "borrow",
    borrowDate: borrowDate.toISOString(),
    dueDate: dueDate.toISOString(),
    status: "active",
    fineAmount: 0,
  })

  // Update book and member counts
  if ((book as any).availableCopies !== undefined) {
    db.updateBook(bookId, { availableCopies: (book as any).availableCopies - 1 } as Partial<Book>)
  }
  db.updateMember(memberId, { currentBooksCount: member.currentBooksCount + 1 })

  return { success: true, message: "Book borrowed successfully", transaction }
}

export function returnBook(transactionId: string): { success: boolean; message: string; fine?: number } {
  const transactions = db.getAllTransactions()
  const transaction = transactions.find((t) => t.id === transactionId)

  if (!transaction) return { success: false, message: "Transaction not found" }
  if (transaction.status === "returned") return { success: false, message: "Book already returned" }

  const book = db.getBookById(transaction.bookId)
  const member = db.getMemberById(transaction.memberId)

  if (!book || !member) return { success: false, message: "Book or member not found" }

  const returnDate = new Date().toISOString()
  const fine = calculateFine(transaction.dueDate, returnDate)

  // Update transaction
  db.updateTransaction(transactionId, {
    returnDate,
    status: "returned",
    fineAmount: fine,
  })

  // Update book and member counts
  if ((book as any).availableCopies !== undefined) {
    db.updateBook(transaction.bookId, { availableCopies: (book as any).availableCopies + 1 } as Partial<Book>)
  }
  db.updateMember(transaction.memberId, { currentBooksCount: member.currentBooksCount - 1 })

  return { success: true, message: "Book returned successfully", fine }
}

export function searchBooks(
  query: string,
  filters?: { genre?: string; author?: string; availableOnly?: boolean },
): Book[] {
  const books = db.getAllBooks()
  const authors = db.getAllAuthors()

  const resolveAuthorNames = (book: Book): string[] => {
    if (!book.authorIds || book.authorIds.length === 0) return []
    return authors
      .filter((a) => book.authorIds!.includes(a.id))
      .map((a) => `${a.firstName} ${a.lastName}`.trim())
  }

  return books.filter((book) => {
    const authorNames = resolveAuthorNames(book)
    const matchesQuery =
      !query ||
      book.title.toLowerCase().includes(query.toLowerCase()) ||
      authorNames.some((name) => name.toLowerCase().includes(query.toLowerCase())) ||
      book.isbn.includes(query)

    const matchesGenre = !filters?.genre || book.genre === filters.genre
    const matchesAuthor =
      !filters?.author ||
      authorNames.some((name) => name.toLowerCase().includes(filters.author!.toLowerCase()))
    const matchesAvailable = !filters?.availableOnly || book.availableCopies > 0

    return matchesQuery && matchesGenre && matchesAuthor && matchesAvailable
  })
}

export function getOverdueTransactions(): Transaction[] {
  const transactions = db.getAllTransactions()
  const now = new Date()

  return transactions.filter((transaction) => {
    if (transaction.status !== "active") return false
    const dueDate = new Date(transaction.dueDate)
    return now > dueDate
  })
}

export function generateMembershipId(type: "patron" = "patron"): string {
  const prefix = "PAT"
  const members = db.getAllMembers()
  const existingIds = members
    .filter((m) => m.membershipId.startsWith(prefix))
    .map((m) => Number.parseInt(m.membershipId.slice(3)))
    .filter((n) => !isNaN(n))

  const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1
  return `${prefix}${nextNumber.toString().padStart(3, "0")}`
}
