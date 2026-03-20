"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  AlertTriangle,
  DollarSign,
  Calendar,
  ArrowLeft,
  Download,
  Filter,
  PieChart,
  LineChart,
  Activity,
  Layers,
  ArrowRightCircle
} from "lucide-react"
import { db } from "@/lib/database"
import type { Book, Member, Transaction, Author } from "@/lib/types"
import { getOverdueTransactions, calculateFine } from "@/lib/utils/library-utils"
import Link from "next/link"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"

function ReportsPageContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState("all")
  const [searchResults, setSearchResults] = useState<{
    books: Book[]
    members: Member[]
    transactions: Transaction[]
  }>({ books: [], members: [], transactions: [] })

  const [books, setBooks] = useState<Book[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [overdueTransactions, setOverdueTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const allBooks = db.getAllBooks()
    const allMembers = db.getAllMembers()
    const allAuthors = db.getAllAuthors()
    const allTransactions = db.getAllTransactions()
    const overdue = getOverdueTransactions()

    setBooks(allBooks)
    setAuthors(allAuthors)
    setMembers(allMembers)
    setTransactions(allTransactions)
    setOverdueTransactions(overdue)
  }, [])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch()
    } else {
      setSearchResults({ books: [], members: [], transactions: [] })
    }
  }, [searchQuery, searchType])

  const resolveAuthorNames = (book: Book): string[] => {
    if (!book.authorIds || book.authorIds.length === 0) return []
    return authors.filter((a) => book.authorIds!.includes(a.id)).map((a) => `${a.firstName} ${a.lastName}`.trim())
  }

  const performSearch = () => {
    const query = searchQuery.toLowerCase()
    let bookResults: Book[] = []
    let memberResults: Member[] = []
    let transactionResults: Transaction[] = []

    if (searchType === "all" || searchType === "books") {
      bookResults = books.filter((book) => {
        const authorNames = resolveAuthorNames(book)
        return book.title.toLowerCase().includes(query) || authorNames.some((name) => name.toLowerCase().includes(query)) || book.isbn.includes(query) || (book.genre || '').toLowerCase().includes(query) || (book.publisher || '').toLowerCase().includes(query)
      })
    }
    if (searchType === "all" || searchType === "members") {
      memberResults = members.filter((member) => member.firstName.toLowerCase().includes(query) || member.lastName.toLowerCase().includes(query) || member.membershipId.toLowerCase().includes(query) || member.phone.includes(query))
    }
    if (searchType === "all" || searchType === "transactions") {
      transactionResults = transactions.filter((transaction) => {
        const book = db.getBookById(transaction.bookId)
        const member = db.getMemberById(transaction.memberId)
        return transaction.id.includes(query) || (book && book.title.toLowerCase().includes(query)) || (member && member.firstName.toLowerCase().includes(query)) || (member && member.lastName.toLowerCase().includes(query)) || (member && member.membershipId.toLowerCase().includes(query))
      })
    }
    setSearchResults({ books: bookResults.slice(0, 20), members: memberResults.slice(0, 20), transactions: transactionResults.slice(0, 20) })
  }

  const reportData = useMemo(() => {
    const totalFines = overdueTransactions.reduce((sum, t) => sum + calculateFine(t.dueDate), 0)
    const activeLoans = transactions.filter((t) => t.status === "active").length
    const totalReturned = transactions.filter((t) => t.status === "returned").length
    const bookBorrowCounts = transactions.reduce((acc, t) => { acc[t.bookId] = (acc[t.bookId] || 0) + 1; return acc; }, {} as Record<string, number>)
    const popularBooks = Object.entries(bookBorrowCounts).map(([bookId, count]) => ({ book: db.getBookById(bookId), borrowCount: count })).filter((item) => item.book).sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 10)
    const memberBorrowCounts = transactions.reduce((acc, t) => { acc[t.memberId] = (acc[t.memberId] || 0) + 1; return acc; }, {} as Record<string, number>)
    const activeMembers = Object.entries(memberBorrowCounts).map(([memberId, count]) => ({ member: db.getMemberById(memberId), borrowCount: count })).filter((item) => item.member).sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 10)
    const genreDistribution = books.reduce((acc, book) => { const genre = book.genre || 'Unknown'; acc[genre] = (acc[genre] || 0) + 1; return acc; }, {} as Record<string, number>)
    const monthlyActivity = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(); date.setMonth(date.getMonth() - i); const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthTransactions = transactions.filter((t) => { const transactionDate = new Date(t.borrowDate); const transactionKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, "0")}`; return transactionKey === monthKey; });
      return { month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }), transactions: monthTransactions.length, books: new Set(monthTransactions.map((t) => t.bookId)).size, members: new Set(monthTransactions.map((t) => t.memberId)).size };
    }).reverse()

    return { totalFines, activeLoans, totalReturned, popularBooks, activeMembers, genreDistribution, monthlyActivity }
  }, [books, members, transactions, overdueTransactions])

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString()

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics</h1>
                <p className="text-xs text-blue-600 font-extrabold tracking-wider">Library Reports</p>
              </div>
              <div className="mx-4 h-6 w-px bg-white/10 hidden md:block"></div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                  <ArrowLeft className="h-4 w-4 mr-2 text-blue-600" /> Back
                </Button>
              </Link>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest h-10 px-6 rounded-lg shadow-none shadow-none">
              <Download className="h-4 w-4 mr-2" /> Export Data
            </Button>
          </div>
        </div>
      </header>

      <DashboardLayout>
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="bg-white border border-slate-100 shadow-none">
            <TabsTrigger value="search" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-none font-black text-xs uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 text-slate-500 h-full">
              <Search className="h-4 w-4" /> Global Search
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-none font-black text-xs uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 text-slate-500 h-full">
              <BarChart3 className="h-4 w-4" /> Detailed Insights
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
              <CardHeader className="border-b border-slate-100 pb-6 bg-white">
                <div className="flex items-center gap-2">
                  <Search className="h-6 w-6 text-blue-600" />
                  <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Search Repository</CardTitle>
                </div>
                <CardDescription className="text-slate-500 text-xs font-bold mt-1">Unified search across all library assets and members</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Enter keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white border-slate-200 shadow-none transition-all hover:border-blue-300 placeholder:text-slate-400 h-11 focus-visible:ring-blue-500 font-bold"
                    />
                  </div>
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger className="w-full md:w-60 h-11 bg-white border-slate-200 text-slate-900 font-black text-xs uppercase tracking-widest shadow-none">
                      <SelectValue placeholder="Search Scope" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      <SelectItem value="all">Everything</SelectItem>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="members">Members</SelectItem>
                      <SelectItem value="transactions">Activity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {searchQuery.length >= 2 ? (
                  <div className="space-y-12 pt-4">
                    {/* Books Results */}
                    {(searchType === "all" || searchType === "books") && searchResults.books.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="flex items-center gap-3 mb-6 border-l-2 border-blue-600 pl-4">
                          <BookOpen className="h-4 w-4 text-blue-600/50" />
                          <h3 className="text-slate-900 font-bold text-sm tracking-tight">Books ({searchResults.books.length})</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {searchResults.books.map((book) => (
                            <div key={book.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-none transition-all hover:border-blue-600/30">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-bold text-slate-900 tracking-tight text-sm group-hover:text-blue-600 transition-colors">{book.title}</p>
                                  <p className="text-[10px] text-slate-400 font-medium mt-1">by {resolveAuthorNames(book).join(", ") || "Unknown"}</p>
                                  <div className="flex items-center gap-2 mt-4">
                                    <Badge variant="outline" className="text-[9px] font-bold border-slate-200 text-slate-400">{book.genre}</Badge>
                                    <span className="text-[10px] text-slate-300 font-mono">{book.isbn}</span>
                                  </div>
                                </div>
                                <Badge className={`${book.availableCopies > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} text-[9px] font-black uppercase`}>
                                  {book.availableCopies} Left
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Patrons Results */}
                    {(searchType === "all" || searchType === "members") && searchResults.members.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-75">
                        <div className="flex items-center gap-3 mb-6 border-l-2 border-emerald-600 pl-4">
                          <Users className="h-4 w-4 text-emerald-600/50" />
                          <h3 className="text-slate-900 font-bold text-sm tracking-tight">Members ({searchResults.members.length})</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {searchResults.members.map((member) => (
                            <div key={member.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-none transition-all hover:border-emerald-600/30">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-bold text-slate-900 tracking-tight text-sm group-hover:text-emerald-600 transition-colors">{member.firstName} {member.lastName}</p>
                                  <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-400 font-medium">
                                    <span>ID: {member.membershipId}</span>
                                    <span className="w-1 h-1 rounded-full bg-white border border-slate-200"></span>
                                    <span>{member.phone}</span>
                                  </div>
                                </div>
                                <Badge className={`${member.isActive ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"} text-[9px] font-black uppercase`}>
                                  {member.isActive ? "Active" : "Locked"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Logs Results */}
                    {(searchType === "all" || searchType === "transactions") && searchResults.transactions.length > 0 && (
                      <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-150">
                        <div className="flex items-center gap-3 mb-6 border-l-2 border-indigo-600 pl-4">
                          <Activity className="h-4 w-4 text-indigo-600/50" />
                          <h3 className="text-slate-900 font-bold text-sm tracking-tight">Activity ({searchResults.transactions.length})</h3>
                        </div>
                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-white">
                              <TableRow className="border-slate-100">
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Book Name</TableHead>
                                <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-wider text-center">Type</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider text-center">Date</TableHead>
                                <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-wider text-right">Transaction ID</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {searchResults.transactions.map((transaction) => {
                                const book = db.getBookById(transaction.bookId)
                                if (!book) return null
                                return (
                                  <TableRow key={transaction.id} className="border-slate-100 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-700 text-sm">{book.title}</span>
                                        <span className="text-[10px] text-slate-400 font-black uppercase">Ref: {transaction.id.slice(-8)}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <Badge className={`${transaction.type === 'borrow' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'} text-[9px] font-black uppercase`}>{transaction.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-center text-[10px] font-black text-slate-500 uppercase">{formatDate(transaction.borrowDate)}</TableCell>
                                    <TableCell className="text-right text-[10px] font-mono text-slate-300">{transaction.id.slice(-12)}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {searchResults.books.length === 0 && searchResults.members.length === 0 && searchResults.transactions.length === 0 && (
                      <div className="text-center py-20 text-slate-200 font-bold uppercase text-xs tracking-[0.3em] flex flex-col items-center gap-4">
                        <Search className="h-10 w-10 opacity-20" />
                        Zero matching records found
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-32 text-slate-200 font-bold uppercase text-[10px] tracking-[0.4em] flex flex-col items-center gap-6">
                    <Filter className="h-12 w-12 opacity-10" />
                    Awaiting Search Parameters (min 2 chars)
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Visual Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Borrowed", val: reportData.activeLoans, icon: BookOpen, bg: "bg-blue-500", darkBg: "bg-blue-600" },
                { label: "Returned", val: reportData.totalReturned, icon: TrendingUp, bg: "bg-emerald-500", darkBg: "bg-emerald-600" },
                { label: "Overdue", val: overdueTransactions.length, icon: AlertTriangle, bg: "bg-red-500", darkBg: "bg-red-600" },
                { label: "Fines", val: `$${reportData.totalFines.toFixed(2)}`, icon: DollarSign, bg: "bg-amber-400", darkBg: "bg-amber-500", textClass: "text-slate-900" }
              ].map(card => {
                const isDarkText = card.textClass === "text-slate-900";
                return (
                  <div key={card.label} className={`${card.bg} rounded-lg overflow-hidden flex flex-col shadow-sm transition-transform hover:-translate-y-1`}>
                    <div className="p-5 flex items-center justify-between relative overflow-hidden flex-1">
                      <div className="z-10">
                        <div className={`text-4xl font-black ${isDarkText ? "text-slate-900" : "text-white"} tracking-tight mb-2`}>{card.val}</div>
                        <p className={`text-sm ${isDarkText ? "text-slate-800 font-bold" : "text-white font-medium"} opacity-90`}>{card.label}</p>
                      </div>
                      <card.icon className={`h-20 w-20 absolute -right-2 top-2 ${isDarkText ? "text-slate-900 opacity-20" : "text-white opacity-20"}`} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              {/* Leaderboards */}
              <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <PieChart className="h-3 w-3 text-blue-600/50" />
                    <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Popular Books</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-px">
                    {reportData.popularBooks.map((item, index) => (
                      <div key={item.book!.id} className="flex items-center justify-between p-4 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-none ${index < 3 ? 'bg-blue-600 text-white shadow-none' : 'bg-white border border-slate-100 text-slate-400'}`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors tracking-tight leading-tight">{item.book!.title}</p>
                            <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">by {resolveAuthorNames(item.book!).join(", ") || "Unknown"}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-700 font-black text-[10px] uppercase tracking-widest px-2.5 py-1 shadow-none">
                          {item.borrowCount} LOANS
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-emerald-600/50" />
                    <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Active Members</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-px">
                    {reportData.activeMembers.map((item, index) => (
                      <div key={item.member!.id} className="flex items-center justify-between p-4 hover:bg-white border hover:border-emerald-100 transition-colors shadow-none">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-none ${index < 3 ? 'bg-emerald-600 text-white shadow-none' : 'bg-white border border-slate-100 text-slate-400'}`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors tracking-tight leading-tight">{item.member!.firstName} {item.member!.lastName}</p>
                            <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide uppercase">ID: {item.member!.membershipId}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-emerald-100 bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest px-2.5 py-1 shadow-none">
                          {item.borrowCount} BOOKS
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Volume Distribution */}
            <Card className="bg-white border border-slate-200 shadow-none overflow-hidden mt-4">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="h-3 w-3 text-indigo-600/50" />
                  <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Books by Genre</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(reportData.genreDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([genre, count]) => {
                      const max = Math.max(...Object.values(reportData.genreDistribution))
                      const percentage = (count / max) * 100
                      return (
                        <div key={genre} className="p-4 rounded-xl bg-white border border-slate-200 shadow-none transition-all hover:border-blue-200">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 truncate">{genre}</p>
                          <div className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{count}</div>
                          <div className="w-full h-1 bg-white rounded-full mt-3 relative overflow-hidden">
                            <div className="absolute top-0 left-0 h-full bg-indigo-600 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Time Series Data */}
            <Card className="bg-white border border-slate-200 shadow-none overflow-hidden mt-4">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Monthly Activity</CardTitle>
                  <CardDescription className="text-slate-400 text-[10px] font-medium">Activity over the last 6 months</CardDescription>
                </div>
                <LineChart className="h-5 w-5 text-blue-600/50" />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-white">
                    <TableRow className="border-slate-100">
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Month</TableHead>
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Total Loans</TableHead>
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Unique Books</TableHead>
                      <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-right">Active Members</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.monthlyActivity.map((month) => (
                      <TableRow key={month.month} className="border-slate-100 hover:bg-blue-50/20">
                        <TableCell className="font-black text-sm uppercase tracking-wider text-blue-600">{month.month}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-50 border-blue-100 text-blue-700 font-black text-xs px-3 shadow-none">{month.transactions}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-black text-slate-900 text-sm">{month.books}</TableCell>
                        <TableCell className="text-right font-black text-slate-900 text-sm">{month.members}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsPageContent />
    </ProtectedRoute>
  )
}
