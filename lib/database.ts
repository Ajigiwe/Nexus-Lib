// Local Storage Database Implementation for LibraryMan

import type {
  Book,
  Member,
  Transaction,
  Author,
  BookSearchFilters,
  MemberSearchFilters,
  TransactionSearchFilters,
  AuthorSearchFilters,
  Visitor,
  ActiveVisit,
} from "./types"


type StoreName = "books" | "members" | "authors" | "transactions" | "visitors" | "active_visits"

function isBrowser() {
  return typeof window !== "undefined"
}


class LocalDatabase {
  private getStorageKey(table: string): string {
    return `librarymanapp_${table}`
  }

  // Generic CRUD operations
  private getAll<T>(table: StoreName): T[] {
    if (!isBrowser()) return []
    try {
      const raw = localStorage.getItem(this.getStorageKey(table))
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  private save<T>(table: StoreName, data: T[]): void {
    if (!isBrowser()) return
    try {
      localStorage.setItem(this.getStorageKey(table), JSON.stringify(data))
    } catch (e) {
      console.error(`Failed to save ${table} to localStorage:`, e)
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Book operations
  getAllBooks(): Book[] {
    return this.getAll<Book>("books")
  }

  getBookById(id: string): Book | null {
    const books = this.getAllBooks()
    return books.find((book) => book.id === id) || null
  }

  addBook(bookData: Omit<Book, "id" | "addedDate" | "updatedDate">): Book {
    const books = this.getAllBooks()
    const newBook: Book = {
      ...bookData,
      id: this.generateId(),
      addedDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      isNew: (bookData as any).isNew ?? true,
    }
    books.push(newBook)
    this.save("books", books)
    return newBook
  }

  updateBook(id: string, updates: Partial<Book>): Book | null {
    const books = this.getAllBooks()
    const index = books.findIndex((book) => book.id === id)
    if (index === -1) return null

    books[index] = {
      ...books[index],
      ...updates,
      updatedDate: new Date().toISOString(),
    }
    this.save("books", books)
    return books[index]
  }

  deleteBook(id: string): boolean {
    const books = this.getAllBooks()
    const filteredBooks = books.filter((book) => book.id !== id)
    if (filteredBooks.length === books.length) return false
    this.save("books", filteredBooks)
    return true
  }

  // Visitor operations
  getAllVisitors(): Visitor[] {
    return this.getAll<Visitor>("visitors")
  }

  addVisitor(visitorData: Omit<Visitor, "id">): Visitor {
    const visitors = this.getAllVisitors()
    const newVisitor: Visitor = {
      ...visitorData,
      id: this.generateId(),
    }
    visitors.push(newVisitor)
    this.save("visitors", visitors)
    return newVisitor
  }

  updateVisitor(id: string, updates: Partial<Visitor>): Visitor | null {
    const visitors = this.getAllVisitors()
    const index = visitors.findIndex((v) => v.id === id)
    if (index === -1) return null

    visitors[index] = { ...visitors[index], ...updates }
    this.save("visitors", visitors)
    return visitors[index]
  }

  deleteVisitor(id: string): boolean {
    const visitors = this.getAllVisitors()
    const filtered = visitors.filter((v) => v.id !== id)
    if (filtered.length === visitors.length) return false
    this.save("visitors", filtered)
    return true
  }

  // Active visit operations
  getAllActiveVisits(): ActiveVisit[] {
    return this.getAll<ActiveVisit>("active_visits")
  }

  addActiveVisit(data: Omit<ActiveVisit, "id" | "startedAt"> & { startedAt?: string }): ActiveVisit {
    const actives = this.getAllActiveVisits()
    const newVisit: ActiveVisit = {
      id: this.generateId(),
      startedAt: data.startedAt ?? new Date().toISOString(),
      name: data.name,
      contact: data.contact,
      gender: data.gender,
      memberId: data.memberId,
    }
    actives.push(newVisit)
    this.save("active_visits", actives)
    return newVisit
  }

  updateActiveVisit(id: string, updates: Partial<ActiveVisit>): ActiveVisit | null {
    const actives = this.getAllActiveVisits()
    const index = actives.findIndex((v) => v.id === id)
    if (index === -1) return null

    actives[index] = { ...actives[index], ...updates }
    this.save("active_visits", actives)
    return actives[index]
  }

  // Ends an active visit, moving it to visitors history with visitDate = end time
  endActiveVisit(id: string, endedAt?: string): Visitor | null {
    const actives = this.getAllActiveVisits()
    const idx = actives.findIndex((v) => v.id === id)
    if (idx === -1) return null
    const [ended] = actives.splice(idx, 1)
    this.save("active_visits", actives)

    const visitor: Omit<Visitor, "id"> = {
      name: ended.name,
      contact: ended.contact,
      gender: ended.gender,
      memberId: ended.memberId,
      visitDate: (endedAt ?? new Date().toISOString()),
    }
    return this.addVisitor(visitor)
  }

  // Sweep: move any active visit startedAt older than 12h into history
  sweepExpiredActiveVisits(nowISO?: string): number {
    const now = nowISO ? new Date(nowISO).getTime() : Date.now()
    const cutoff = now - 12 * 60 * 60 * 1000
    const actives = this.getAllActiveVisits()
    let moved = 0
    const remaining: ActiveVisit[] = []
    for (const a of actives) {
      const started = new Date(a.startedAt).getTime()
      if (started <= cutoff) {
        // Move to history with visitDate = startedAt (or now?). We'll record as startedAt to reflect day of visit
        this.addVisitor({
          name: a.name,
          contact: a.contact,
          gender: a.gender,
          memberId: a.memberId,
          visitDate: a.startedAt,
        })
        moved++
      } else {
        remaining.push(a)
      }
    }
    if (moved > 0) this.save("active_visits", remaining)
    return moved
  }

  // Member operations
  getAllMembers(): Member[] {
    return this.getAll<Member>("members")
  }

  getMemberById(id: string): Member | null {
    const members = this.getAllMembers()
    return members.find((member) => member.id === id) || null
  }

  private generateMembershipId(joinDate: string): string {
    const members = this.getAllMembers()
    const joinYear = new Date(joinDate).getFullYear()
    const yearSuffix = joinYear.toString().slice(-2) // Get last 2 digits of year
    
    // Find the highest sequential number for this year
    const yearMembers = members.filter(m => m.membershipId.endsWith(`-${yearSuffix}`))
    let maxNumber = 0
    
    yearMembers.forEach(member => {
      const match = member.membershipId.match(/^(\d{3})-\d{2}$/)
      if (match) {
        const number = parseInt(match[1], 10)
        if (number > maxNumber) {
          maxNumber = number
        }
      }
    })
    
    const nextNumber = maxNumber + 1
    const paddedNumber = nextNumber.toString().padStart(3, '0')
    return `${paddedNumber}-${yearSuffix}`
  }

  addMember(memberData: Omit<Member, "id" | "membershipId">): Member {
    const members = this.getAllMembers()
    const membershipId = this.generateMembershipId(memberData.joinDate)
    const newMember: Member = {
      ...memberData,
      id: this.generateId(),
      membershipId: membershipId,
      renewalCount: (memberData as any).renewalCount ?? 0,
    }
    members.push(newMember)
    this.save("members", members)
    return newMember
  }

  updateMember(id: string, updates: Partial<Member>): Member | null {
    const members = this.getAllMembers()
    const index = members.findIndex((member) => member.id === id)
    if (index === -1) return null

    members[index] = { ...members[index], ...updates }
    this.save("members", members)
    return members[index]
  }

  deleteMember(id: string): boolean {
    const members = this.getAllMembers()
    const filteredMembers = members.filter((member) => member.id !== id)
    if (filteredMembers.length === members.length) return false
    this.save("members", filteredMembers)
    return true
  }

  clearMembers(): void {
    this.save("members", [])
  }

  // Transaction operations
  getAllTransactions(): Transaction[] {
    return this.getAll<Transaction>("transactions")
  }

  addTransaction(transactionData: Omit<Transaction, "id">): Transaction {
    const transactions = this.getAllTransactions()
    const newTransaction: Transaction = {
      ...transactionData,
      id: this.generateId(),
    }
    transactions.push(newTransaction)
    this.save("transactions", transactions)
    return newTransaction
  }

  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    const transactions = this.getAllTransactions()
    const index = transactions.findIndex((transaction) => transaction.id === id)
    if (index === -1) return null

    transactions[index] = { ...transactions[index], ...updates }
    this.save("transactions", transactions)
    return transactions[index]
  }

  // Author operations
  getAllAuthors(): Author[] {
    return this.getAll<Author>("authors")
  }

  getAuthorById(id: string): Author | null {
    const authors = this.getAllAuthors()
    return authors.find((author) => author.id === id) || null
  }

  addAuthor(authorData: Omit<Author, "id" | "addedDate" | "updatedDate">): Author {
    const authors = this.getAllAuthors()
    const newAuthor: Author = {
      ...authorData,
      id: this.generateId(),
      addedDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
    }
    authors.push(newAuthor)
    this.save("authors", authors)
    return newAuthor
  }

  updateAuthor(id: string, updates: Partial<Author>): Author | null {
    const authors = this.getAllAuthors()
    const index = authors.findIndex((author) => author.id === id)
    if (index === -1) return null

    authors[index] = {
      ...authors[index],
      ...updates,
      updatedDate: new Date().toISOString(),
    }
    this.save("authors", authors)
    return authors[index]
  }

  deleteAuthor(id: string): boolean {
    // Check if author has any books
    const books = this.getAllBooks()
    const hasBooks = books.some((book) => book.authorIds?.includes(id))
    if (hasBooks) {
      throw new Error("Cannot delete author with associated books")
    }

    const authors = this.getAllAuthors()
    const filteredAuthors = authors.filter((author) => author.id !== id)
    if (filteredAuthors.length === authors.length) return false
    this.save("authors", filteredAuthors)
    return true
  }

  // Initialize with sample data
  initializeSampleData(): void {
    // Initialize authors first
    if (this.getAllAuthors().length === 0) {
      const sampleAuthors: Omit<Author, "id" | "addedDate" | "updatedDate">[] = [
        {
          firstName: "F. Scott",
          lastName: "Fitzgerald",
          nationality: "American",
          birthDate: "1896-09-24",
          biography:
            "American novelist and short story writer, widely regarded as one of the greatest American writers of the 20th century.",
        },
        {
          firstName: "Harper",
          lastName: "Lee",
          nationality: "American",
          birthDate: "1926-04-28",
          biography: "American novelist best known for her 1960 novel To Kill a Mockingbird.",
        },
        {
          firstName: "George",
          lastName: "Orwell",
          nationality: "British",
          birthDate: "1903-06-25",
          biography:
            "English novelist, essayist, journalist and critic, best known for his novels Animal Farm and Nineteen Eighty-Four.",
        },
      ]

      sampleAuthors.forEach((author) => this.addAuthor(author))
    }

    // Do not auto-seed books anymore; ensure storage key exists with empty array
    if (this.getAllBooks().length === 0) {
      this.save("books", [])
    }

    // No default members seed

    // Initialize empty visitors list if not present
    if (this.getAllVisitors().length === 0) {
      this.save("visitors", [])
    }

    // Initialize empty active visits list if not present
    if (this.getAllActiveVisits().length === 0) {
      this.save("active_visits", [])
    }
  }
}

export const db = new LocalDatabase()



// Service objects for easier access
export const bookService = {
  getAll: () => db.getAllBooks(),
  getById: (id: string) => db.getBookById(id),
  create: (data: Omit<Book, "id" | "addedDate" | "updatedDate">) => db.addBook(data),
  update: (id: string, data: Partial<Book>) => db.updateBook(id, data),
  delete: (id: string) => db.deleteBook(id),
  search: (filters: BookSearchFilters) => {
    const books = db.getAllBooks()
    const authors = db.getAllAuthors()

    return books.filter((book) => {
      if (filters.title && !book.title.toLowerCase().includes(filters.title.toLowerCase())) return false
      if (filters.isbn && !book.isbn.toLowerCase().includes(filters.isbn.toLowerCase())) return false
      if (filters.genre && book.genre && !book.genre.toLowerCase().includes(filters.genre.toLowerCase())) return false
      if (filters.publisher && !book.publisher.toLowerCase().includes(filters.publisher.toLowerCase())) return false
      if (filters.yearFrom && book.publishedYear < filters.yearFrom) return false
      if (filters.genre && book.genre && book.genre !== filters.genre) return false
      if (filters.availableOnly && book.availableCopies === 0) return false

      if (filters.authorName) {
        const bookAuthors = authors.filter((author) => book.authorIds?.includes(author.id))
        const authorMatch = bookAuthors.some((author) =>
          `${author.firstName} ${author.lastName}`.toLowerCase().includes(filters.authorName!.toLowerCase()),
        )
        if (!authorMatch) return false
      }

      return true
    })
  },
}

export const memberService = {
  getAll: () => db.getAllMembers(),
  getById: (id: string) => db.getMemberById(id),
  create: (data: Omit<Member, "id" | "membershipId">) => db.addMember(data),
  update: (id: string, data: Partial<Member>) => db.updateMember(id, data),
  delete: (id: string) => db.deleteMember(id),
  search: (filters: MemberSearchFilters) => {
    const members = db.getAllMembers()
    return members.filter((member) => {
      if (filters.name) {
        const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
        if (!fullName.includes(filters.name.toLowerCase())) return false
      }
      if (filters.membershipId && !member.membershipId.toLowerCase().includes(filters.membershipId.toLowerCase()))
        return false
      if (filters.membershipType && member.membershipType !== filters.membershipType) return false
      if (filters.isActive !== undefined && member.isActive !== filters.isActive) return false
      return true
    })
  },
}

export const authorService = {
  getAll: () => db.getAllAuthors(),
  getById: (id: string) => db.getAuthorById(id),
  create: (data: Omit<Author, "id" | "addedDate" | "updatedDate">) => db.addAuthor(data),
  update: (id: string, data: Partial<Author>) => db.updateAuthor(id, data),
  delete: (id: string) => db.deleteAuthor(id),
  search: (filters: AuthorSearchFilters) => {
    const authors = db.getAllAuthors()
    return authors.filter((author) => {
      if (filters.name) {
        const fullName = `${author.firstName} ${author.lastName}`.toLowerCase()
        if (!fullName.includes(filters.name.toLowerCase())) return false
      }
      if (filters.nationality && !author.nationality?.toLowerCase().includes(filters.nationality.toLowerCase()))
        return false
      if (filters.birthYear && author.birthDate) {
        const birthYear = new Date(author.birthDate).getFullYear()
        if (birthYear !== filters.birthYear) return false
      }
      return true
    })
  },
}

export const transactionService = {
  getAll: () => db.getAllTransactions(),
  create: (data: Omit<Transaction, "id">) => db.addTransaction(data),
  update: (id: string, data: Partial<Transaction>) => db.updateTransaction(id, data),
  search: (filters: TransactionSearchFilters) => {
    const transactions = db.getAllTransactions()
    return transactions.filter((transaction) => {
      if (filters.memberId && transaction.memberId !== filters.memberId) return false
      if (filters.bookId && transaction.bookId !== filters.bookId) return false
      if (filters.status && transaction.status !== filters.status) return false
      if (filters.dateFrom && transaction.borrowDate < filters.dateFrom) return false
      if (filters.dateTo && transaction.borrowDate > filters.dateTo) return false
      return true
    })
  },
}

export const visitorService = {
  getAll: () => db.getAllVisitors(),
  create: (data: Omit<Visitor, "id">) => db.addVisitor(data),
  delete: (id: string) => db.deleteVisitor(id),
  // Active visits
  getAllActive: () => db.getAllActiveVisits(),
  start: (data: Omit<ActiveVisit, "id" | "startedAt"> & { startedAt?: string }) => db.addActiveVisit(data),
  update: (id: string, data: Partial<Visitor>) => db.updateVisitor(id, data),
  updateActive: (id: string, data: Partial<ActiveVisit>) => db.updateActiveVisit(id, data),
  end: (id: string, endedAt?: string) => db.endActiveVisit(id, endedAt),
  sweep: (nowISO?: string) => db.sweepExpiredActiveVisits(nowISO),
}
