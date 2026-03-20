"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  ArrowRightLeft,
  Search,
  BookOpen,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Clock,
  DollarSign,
  Briefcase,
  History,
  Info,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowRightCircle
} from "lucide-react"
import { db } from "@/lib/database"
import type { Book, Member, Transaction } from "@/lib/types"
import {
  borrowBook,
  returnBook,
  canMemberBorrowBook,
  calculateFine,
  getOverdueTransactions,
} from "@/lib/utils/library-utils"
import Link from "next/link"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { toast } from "@/components/ui/use-toast"

function CirculationPageContent() {
  const [activeTransactions, setActiveTransactions] = useState<Transaction[]>([])
  const [overdueTransactions, setOverdueTransactions] = useState<Transaction[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])

  const [borrowBookSearch, setBorrowBookSearch] = useState("")
  const [borrowMemberSearch, setBorrowMemberSearch] = useState("")
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const [returnTransactionId, setReturnTransactionId] = useState("")
  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([])
  const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([])

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    if (borrowBookSearch.length >= 2) {
      const books = db.getAllBooks().filter((book) => {
        const query = borrowBookSearch.toLowerCase()
        const titleMatch = book.title.toLowerCase().includes(query)
        const authorNames = db.getAllAuthors().filter((a) => book.authorIds?.includes(a.id)).map((a) => `${a.firstName} ${a.lastName}`).join(", ").toLowerCase()
        const authorMatch = authorNames.includes(query)
        const isbnMatch = book.isbn.includes(borrowBookSearch)
        return titleMatch || authorMatch || isbnMatch
      })
      setBookSearchResults(books.slice(0, 5))
    } else {
      setBookSearchResults([])
    }
  }, [borrowBookSearch])

  useEffect(() => {
    if (borrowMemberSearch.length >= 2) {
      const query = borrowMemberSearch.toLowerCase()
      const members = db.getAllMembers().filter((member) =>
        member.firstName.toLowerCase().includes(query) ||
        member.lastName.toLowerCase().includes(query) ||
        member.membershipId.toLowerCase().includes(query) ||
        (member.email?.toLowerCase() || "").includes(query)
      )
      setMemberSearchResults(members.slice(0, 5))
    } else {
      setMemberSearchResults([])
    }
  }, [borrowMemberSearch])

  const loadTransactions = () => {
    const allTransactions = db.getAllTransactions()
    const active = allTransactions.filter((t) => t.status === "active")
    const overdue = getOverdueTransactions()
    const recent = allTransactions.slice(-10).reverse()

    setActiveTransactions(active)
    setOverdueTransactions(overdue)
    setRecentTransactions(recent)
  }

  const handleBorrowBook = () => {
    if (!selectedBook || !selectedMember) {
      toast({ title: "Incomplete selection", description: "Select both a book and a member.", variant: "destructive" })
      return
    }
    const result = borrowBook(selectedBook.id, selectedMember.id)
    if (result.success) {
      toast({ title: "Loan confirmed", description: result.message })
      setSelectedBook(null)
      setSelectedMember(null)
      setBorrowBookSearch("")
      setBorrowMemberSearch("")
      loadTransactions()
    } else {
      toast({ title: "Loan failed", description: result.message, variant: "destructive" })
    }
  }

  const handleReturnBook = (transactionId?: string) => {
    const id = transactionId || returnTransactionId
    if (!id) {
      toast({ title: "Missing ID", description: "Transaction ID is required.", variant: "destructive" })
      return
    }
    const result = returnBook(id)
    if (result.success) {
      const fineText = result.fine && result.fine > 0 ? ` Fine: $${result.fine.toFixed(2)}` : ""
      toast({ title: "Item returned", description: `${result.message}${fineText}` })
      setReturnTransactionId("")
      loadTransactions()
    } else {
      toast({ title: "Return failed", description: result.message, variant: "destructive" })
    }
  }

  const getTransactionDetails = (transaction: Transaction) => {
    const book = db.getBookById(transaction.bookId)
    const member = db.getMemberById(transaction.memberId)
    return { book, member }
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = now.getTime() - due.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getAuthorNames = (book: Book) => {
    return db.getAllAuthors().filter((a) => book.authorIds?.includes(a.id)).map((a) => `${a.firstName} ${a.lastName}`).join(", ")
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Circulation</h1>
                <p className="text-xs text-blue-600 font-extrabold tracking-wider uppercase">Borrowing & Returns</p>
              </div>
              <div className="mx-4 h-6 w-px bg-white"></div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border border-slate-200">
                  <ArrowLeft className="h-4 w-4 mr-2 text-blue-600" /> Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-600 text-white border-0 font-black text-[10px] uppercase tracking-widest px-3 py-1 shadow-none shadow-none">{activeTransactions.length} LOANS</Badge>
              <Badge className="bg-rose-600 text-white border-0 font-black text-[10px] uppercase tracking-widest px-3 py-1 shadow-none shadow-none">{overdueTransactions.length} OVERDUE</Badge>
            </div>
          </div>
        </div>
      </header>

      <DashboardLayout>
        {/* Statistics Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Borrowed", val: activeTransactions.length, icon: ArrowRightLeft, bg: "bg-blue-500", darkBg: "bg-blue-600" },
            { label: "Overdue", val: overdueTransactions.length, icon: AlertTriangle, bg: "bg-red-500", darkBg: "bg-red-600" },
            { label: "History", val: recentTransactions.length, icon: History, bg: "bg-indigo-500", darkBg: "bg-indigo-600" },
            { label: "Active", val: activeTransactions.length, icon: ShieldCheck, bg: "bg-emerald-500", darkBg: "bg-emerald-600" }
          ].map((stat) => {
            const isDarkText = false;
            return (
              <div key={stat.label} className={`${stat.bg} rounded-lg overflow-hidden flex flex-col shadow-sm transition-transform hover:-translate-y-1`}>
                <div className="p-5 flex items-center justify-between relative overflow-hidden flex-1">
                  <div className="z-10">
                    <div className={`text-4xl font-black ${isDarkText ? "text-slate-900" : "text-white"} tracking-tight mb-2`}>{stat.val}</div>
                    <p className={`text-sm ${isDarkText ? "text-slate-800 font-bold" : "text-white font-medium"} opacity-90`}>{stat.label}</p>
                  </div>
                  <stat.icon className={`h-20 w-20 absolute -right-2 top-2 ${isDarkText ? "text-slate-900 opacity-20" : "text-white opacity-20"}`} />
                </div>
              </div>
            )
          })}
        </div>

        <Tabs defaultValue="borrow" className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-none p-1 h-12">
            <TabsTrigger value="borrow" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-black text-xs tracking-widest rounded-lg transition-all text-slate-500 uppercase h-full">BORROW</TabsTrigger>
            <TabsTrigger value="return" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-black text-xs tracking-widest rounded-lg transition-all text-slate-500 uppercase h-full">RETURN</TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-black text-xs tracking-widest rounded-lg transition-all text-slate-500 uppercase h-full">HISTORY</TabsTrigger>
          </TabsList>

          {/* Borrow Book Tab */}
          <TabsContent value="borrow" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Asset Discovery */}
              <Card className="bg-white border border-slate-200 overflow-hidden shadow-none">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Select Book</CardTitle>
                      <CardDescription className="text-slate-500 text-xs font-bold mt-1">Search for a book to borrow</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Title, Author, or ISBN..."
                      value={borrowBookSearch}
                      onChange={(e) => setBorrowBookSearch(e.target.value)}
                      className="pl-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-12 font-bold"
                    />
                  </div>

                  {bookSearchResults.length > 0 && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar-thin">
                      {bookSearchResults.map((book) => (
                        <div
                          key={book.id}
                          className={`p-4 rounded-xl border transition-all group cursor-pointer ${selectedBook?.id === book.id ? "bg-blue-600 border-blue-500 shadow-none shadow-none" : "bg-white border-slate-200 hover:bg-white border hover:border-blue-100 transition-all shadow-none"}`}
                          onClick={() => setSelectedBook(book)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`font-black uppercase tracking-tight ${selectedBook?.id === book.id ? "text-white" : "text-slate-900"}`}>{book.title}</p>
                              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedBook?.id === book.id ? "text-blue-100" : "text-slate-400"}`}>by {getAuthorNames(book)}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={`${book.availableCopies > 0 ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-rose-100 text-rose-600 border-rose-200"} font-black text-[9px] uppercase tracking-tighter`}>
                                {book.availableCopies} available
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedBook && (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-4 items-center">
                      <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xl">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 uppercase text-sm">{selectedBook.title}</p>
                        <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Book ISBN: {selectedBook.isbn}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Patron Verification */}
              <Card className="bg-white border border-slate-200 overflow-hidden shadow-none">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="h-6 w-6 text-emerald-600" />
                    <div>
                      <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Select Member</CardTitle>
                      <CardDescription className="text-slate-500 text-xs font-bold mt-1">Confirm who is borrowing</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Name, ID, or Email..."
                      value={borrowMemberSearch}
                      onChange={(e) => setBorrowMemberSearch(e.target.value)}
                      className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12"
                    />
                  </div>

                  {memberSearchResults.length > 0 && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar-thin">
                      {memberSearchResults.map((member) => {
                        const canBorrow = canMemberBorrowBook(member.id)
                        return (
                          <div
                            key={member.id}
                            className={`p-4 rounded-xl border transition-all group cursor-pointer ${selectedMember?.id === member.id ? "bg-emerald-600 border-emerald-500 shadow-none shadow-none" : "bg-white border-slate-200 hover:bg-white border hover:border-blue-100 transition-all shadow-none"}`}
                            onClick={() => setSelectedMember(member)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className={`font-black uppercase tracking-tight ${selectedMember?.id === member.id ? "text-white" : "text-slate-900"}`}>{member.firstName} {member.lastName}</p>
                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedMember?.id === member.id ? "text-emerald-50" : "text-slate-400"}`}>ID: {member.membershipId}</p>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedMember?.id === member.id ? 'text-white' : (canBorrow.canBorrow ? 'text-emerald-600' : 'text-rose-600')}`}>
                                  {member.currentBooksCount}/{member.maxBooksAllowed} Books
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {selectedMember && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-4 items-center">
                      <div className="h-12 w-12 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xl">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 uppercase text-sm">{selectedMember.firstName} {selectedMember.lastName}</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Membership ID: {selectedMember.membershipId}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Confirmation Area */}
            <div className="flex items-center justify-center pt-8">
              <Button
                onClick={handleBorrowBook}
                disabled={!selectedBook || !selectedMember || selectedBook.availableCopies === 0 || !!selectedBook?.isReference}
                className="h-16 px-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-sm tracking-[0.2em] rounded-2xl shadow-none shadow-none transition-all active:scale-95 disabled:opacity-20 flex items-center gap-4 group"
              >
                <Zap className="h-5 w-5 group-hover:animate-pulse" />
                Borrow Book
              </Button>
            </div>
          </TabsContent>

          {/* Return Book Tab */}
          <TabsContent value="return" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Manual Intake */}
              <Card className="bg-white border border-slate-200 shadow-none overflow-hidden lg:h-fit">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Return Book</CardTitle>
                  <CardDescription className="text-slate-400 text-[10px] font-medium mt-1">Enter the transaction ID below</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionId" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction ID</Label>
                    <Input
                      id="transactionId"
                      placeholder="TRX-XXXXXX..."
                      value={returnTransactionId}
                      onChange={(e) => setReturnTransactionId(e.target.value)}
                      className="bg-white border border-slate-200 text-slate-900 placeholder:text-slate-300 h-12 font-mono"
                    />
                  </div>
                  <Button onClick={() => handleReturnBook()} disabled={!returnTransactionId} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Process Return
                  </Button>
                </CardContent>
              </Card>

              {/* Overdue Express List */}
              <Card className="bg-white border border-slate-200 shadow-none overflow-hidden lg:col-span-2">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Current Loans</CardTitle>
                    <CardDescription className="text-slate-400 text-[10px] font-medium mt-1">List of books currently out</CardDescription>
                  </div>
                  <Clock className="h-5 w-5 text-slate-200" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar-thin">
                    <Table>
                      <TableHeader className="bg-white">
                        <TableRow className="border-slate-100">
                          <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Book / Member</TableHead>
                          <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Due Date</TableHead>
                          <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Status</TableHead>
                          <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeTransactions.slice(0, 10).map((transaction) => {
                          const { book, member } = getTransactionDetails(transaction)
                          if (!book || !member) return null
                          const isOverdue = new Date(transaction.dueDate) < new Date()
                          return (
                            <TableRow key={transaction.id} className="border-slate-100 hover:bg-white transition-colors group">
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-700 text-sm">{book.title}</span>
                                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{member.firstName} {member.lastName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>{formatDate(transaction.dueDate)}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                {isOverdue ? (
                                  <Badge className="bg-rose-100 text-rose-600 border-rose-200 text-[9px] font-black uppercase h-5">Overdue</Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-600 border-blue-200 text-[9px] font-black uppercase h-5">Safe</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleReturnBook(transaction.id)} className="h-8 text-emerald-600 hover:text-white hover:bg-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-lg border border-slate-100">Return Item</Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    {activeTransactions.length === 0 && (
                      <div className="text-center py-12 text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em] italic">Repository currently clear of loans</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Circulation History Tab */}
          <TabsContent value="transactions" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            <Card className="bg-white border border-slate-200 overflow-hidden shadow-none">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Circulation History</CardTitle>
                  <CardDescription className="text-slate-400 text-[10px] font-medium mt-1">List of all past borrowing activity</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-white">
                    <TableRow className="border-slate-100">
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Book Information</TableHead>
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Member Name</TableHead>
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Type</TableHead>
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Date</TableHead>
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Status</TableHead>
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-right">Fine</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((transaction) => {
                      const { book, member } = getTransactionDetails(transaction)
                      if (!book || !member) return null
                      return (
                        <TableRow key={transaction.id} className="border-slate-100 hover:bg-white transition-colors group">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700 text-sm leading-tight">{book.title}</span>
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Trans ID: {transaction.id.slice(-8)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span className="text-blue-600 font-bold">{member.firstName} {member.lastName}</span>
                              <span className="text-[10px] text-slate-300 uppercase font-black">{member.membershipId}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${transaction.type === "borrow" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"} border-slate-100 text-[9px] font-black uppercase px-2 h-5`}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-[10px] font-black text-slate-600 uppercase">
                            {formatDate(transaction.type === "return" && transaction.returnDate ? transaction.returnDate : transaction.borrowDate)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${transaction.status === "active" ? "bg-blue-600 text-white" : transaction.status === "returned" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"} text-[9px] font-black uppercase px-2 h-5`}>
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-[10px] font-black text-rose-600">
                            {transaction.fineAmount > 0 ? `$${transaction.fineAmount.toFixed(2)}` : "-"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {recentTransactions.length === 0 && (
                  <div className="text-center py-20 text-slate-200 font-bold uppercase text-[10px] tracking-[0.3em]">No transaction history detected</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </div>
  )
}

export default function CirculationPage() {
  return (
    <ProtectedRoute>
      <CirculationPageContent />
    </ProtectedRoute>
  )
}
