// LibraryMan Data Types and Schema

export interface Book {
  id: string
  isbn: string
  title: string
  authorIds: string[] // Changed from single author string to array of author IDs
  publisher: string
  publishedYear: number
  genre?: string
  // New classification fields
  category?: "Fiction" | "Non-Fiction"
  deweyDecimal?: string // Only for Non-Fiction
  totalCopies: number
  availableCopies: number
  location?: string
  description?: string
  coverImage?: string
  addedDate: string
  updatedDate: string
  isNew?: boolean
  isReference?: boolean
}

export interface Member {
  id: string
  membershipId: string
  firstName: string
  lastName: string
  email?: string
  phone: string
  address: string
  gender: "Male" | "Female" | "Other" | "Unspecified"
  membershipType: "patron"
  joinDate: string
  expiryDate: string
  isActive: boolean
  maxBooksAllowed: number
  currentBooksCount: number
  renewalCount?: number
  photoUrl?: string
}

export interface Transaction {
  id: string
  bookId: string
  memberId: string
  type: "borrow" | "return" | "renew"
  borrowDate: string
  dueDate: string
  returnDate?: string
  status: "active" | "returned" | "overdue"
  fineAmount: number
  notes?: string
}

export interface Fine {
  id: string
  memberId: string
  transactionId: string
  amount: number
  reason: string
  status: "pending" | "paid" | "waived"
  createdDate: string
  paidDate?: string
}


// Search and Filter Types
export interface BookSearchFilters {
  title?: string
  authorName?: string // Changed from author to authorName for clarity
  isbn?: string
  genre?: string
  publisher?: string
  yearFrom?: number
  yearTo?: number
  availableOnly?: boolean
}

export interface MemberSearchFilters {
  name?: string
  membershipId?: string
  membershipType?: string
  isActive?: boolean
}

export interface TransactionSearchFilters {
  memberId?: string
  bookId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export interface Author {
  id: string
  firstName: string
  lastName: string
  biography?: string
  birthDate?: string
  nationality?: string
  website?: string
  email?: string
  addedDate: string
  updatedDate: string
}

export interface AuthorSearchFilters {
  name?: string
  nationality?: string
  birthYear?: number
}

// Visitor records (includes both members and non-members)
export interface Visitor {
  id: string
  name: string
  contact: string
  visitDate: string
  gender: "Male" | "Female" | "Other" | "Unspecified"
  memberId?: string // optional link to a registered member
}

// Active visits (auto-move to Visitor history after 12 hours)
export interface ActiveVisit {
  id: string
  name: string
  contact: string
  gender: "Male" | "Female" | "Other" | "Unspecified"
  memberId?: string
  startedAt: string
}
