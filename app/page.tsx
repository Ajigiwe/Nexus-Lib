"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Users, ArrowRightLeft, AlertTriangle, Search, BarChart3, Settings, LogOut, Database, Activity, LayoutDashboard, Layers, UserCheck, TrendingUp, ShieldCheck, PieChart, Map as MapIcon, Calendar, Minus, Plus } from "lucide-react"
import { Area, AreaChart, BarChart, Bar, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, CartesianGrid } from "recharts"
import { db, visitorService } from "@/lib/database"
import type { Book, Member, Transaction, Author, ActiveVisit } from "@/lib/types"
import { getOverdueTransactions } from "@/lib/utils/library-utils"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/components/auth-provider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { DashboardLayout } from "@/components/dashboard-layout"

import Link from "next/link"

function DashboardContent() {
  const { user, logout, isAdmin } = useAuth()
  const [stats, setStats] = useState({
    totalBooks: 0,
    availableBooks: 0,
    totalMembers: 0,
    activeTransactions: 0,
    overdueBooks: 0,
    activeVisitors: 0,
  })

  const [registrationChartType, setRegistrationChartType] = useState<"area" | "bar">("area")
  const [visitorDate, setVisitorDate] = useState<Date | undefined>(new Date())

  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [authors, setAuthors] = useState<Author[]>([])

  useEffect(() => {
    // One-time clear of members as requested
    const cleared = localStorage.getItem("librarymanapp_members_cleared_once")
    if (!cleared) {
      db.clearMembers()
      localStorage.setItem("librarymanapp_members_cleared_once", "true")
    }

    // Load data
    const allBooks = db.getAllBooks()
    const allMembers = db.getAllMembers()
    const allAuthors = db.getAllAuthors()
    const allTransactions = db.getAllTransactions()
    const allActiveVisits = visitorService.getAllActive()
    const overdueTransactions = getOverdueTransactions()

    setBooks(allBooks)
    setMembers(allMembers)
    setRecentTransactions(allTransactions.slice(-5).reverse())
    setAuthors(allAuthors)

    setStats({
      totalBooks: allBooks.length,
      availableBooks: allBooks.reduce((sum, book) => sum + book.availableCopies, 0),
      totalMembers: allMembers.length,
      activeTransactions: allTransactions.filter((t) => t.status === "active").length,
      overdueBooks: overdueTransactions.length,
      activeVisitors: allActiveVisits.length,
    })
  }, [])

  const getRegistrationData = () => {
    // Generate data for the last 6 months including the current one.
    const months: {name: string; year: number; monthNum: number; registrations: number}[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        monthNum: d.getMonth(),
        registrations: 0,
      });
    }

    if (members && members.length > 0) {
      members.forEach((member) => {
        if (!member.joinDate) return;
        const joinDate = new Date(member.joinDate);
        const joinMonth = joinDate.getMonth();
        const joinYear = joinDate.getFullYear();
        
        // Find if this join date falls into our 6 month window
        const targetMonth = months.find(m => m.monthNum === joinMonth && m.year === joinYear);
        if (targetMonth) {
          targetMonth.registrations += 1;
        }
      });
      return months.map(m => ({ name: m.name, registrations: m.registrations }));
    }
    
    // Fallback data if no members exist yet
    return [
      { name: 'Jan', registrations: 4 },
      { name: 'Feb', registrations: 7 },
      { name: 'Mar', registrations: 5 },
      { name: 'Apr', registrations: 12 },
      { name: 'May', registrations: 8 },
      { name: 'Jun', registrations: 15 },
    ]
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-8 py-4 max-w-[1500px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Library</h1>
                <p className="text-xs text-blue-600 font-extrabold uppercase tracking-widest">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-80">User Profile</span>
                <span className="text-xs font-black text-blue-600 tracking-tight">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="hidden lg:flex border-slate-200 hover:bg-white border-blue-200 hover:border-blue-400 shadow-none hover:shadow-none">
                      <Settings className="h-4 w-4 mr-2 text-indigo-600" /> Admin
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={logout} className="text-rose-600 hover:bg-rose-600 hover:text-white uppercase text-xs font-extrabold tracking-wider border-rose-200 h-9 px-4 shadow-none hover:shadow-none">
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <DashboardLayout>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Books", val: stats.totalBooks, icon: BookOpen, bg: "bg-cyan-500", darkBg: "bg-cyan-600", link: "/books" },
                { label: "Total Members", val: stats.totalMembers, icon: UserCheck, bg: "bg-green-500", darkBg: "bg-green-600", link: "/members" },
                { label: "Active Borrowed", val: stats.activeTransactions, icon: ArrowRightLeft, bg: "bg-yellow-400", darkBg: "bg-yellow-500", link: "/circulation", textClass: "text-slate-900", subText: "text-slate-800" },
                { label: "Overdue Items", val: stats.overdueBooks, icon: AlertTriangle, bg: "bg-red-500", darkBg: "bg-red-600", link: "/circulation" }
              ].map(card => {
                const isDarkText = card.textClass === "text-slate-900";
                return (
                  <Link href={card.link} key={card.label}>
                    <div className={`${card.bg} rounded-lg overflow-hidden flex flex-col shadow-sm transition-transform hover:-translate-y-1 h-full`}>
                      <div className="p-5 flex items-center justify-between relative overflow-hidden flex-1">
                        <div className="z-10">
                          <div className={`text-4xl font-black ${isDarkText ? "text-slate-900" : "text-white"} tracking-tight mb-2`}>{card.val}</div>
                          <p className={`text-sm ${isDarkText ? "text-slate-800 font-bold" : "text-white font-medium"} opacity-90`}>{card.label}</p>
                        </div>
                        <card.icon className={`h-20 w-20 absolute -right-2 top-2 ${isDarkText ? "text-slate-900 opacity-20" : "text-white opacity-20"}`} />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Registration Chart */}
              <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-none overflow-hidden rounded-xl">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-4 bg-white">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-slate-700" />
                    <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Registrations</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant={registrationChartType === "area" ? "default" : "ghost"} 
                      size="sm" 
                      onClick={() => setRegistrationChartType("area")}
                      className={registrationChartType === "area" ? "bg-blue-600 hover:bg-blue-700 text-white rounded text-xs px-3 shadow-none" : "text-slate-600 rounded text-xs px-3"}
                    >
                      Area
                    </Button>
                    <Button 
                      variant={registrationChartType === "bar" ? "default" : "ghost"} 
                      size="sm" 
                      onClick={() => setRegistrationChartType("bar")}
                      className={registrationChartType === "bar" ? "bg-blue-600 hover:bg-blue-700 text-white rounded text-xs px-3 shadow-none" : "text-slate-600 rounded text-xs px-3"}
                    >
                      Bar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {registrationChartType === "area" ? (
                        <AreaChart data={getRegistrationData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                          <YAxis tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#64748b'}} allowDecimals={false} />
                          <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="registrations" stroke="#2563eb" fillOpacity={1} fill="url(#colorRegistrations)" strokeWidth={2} />
                        </AreaChart>
                      ) : (
                        <BarChart data={getRegistrationData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                          <YAxis tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#64748b'}} allowDecimals={false} />
                          <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="registrations" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Map Mock */}
              <Card className="bg-blue-500 border-none shadow-none overflow-hidden rounded-xl text-white">
                <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-blue-400">
                  <div className="flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-white" />
                    <CardTitle className="text-white font-bold text-lg tracking-tight border-none">Visitors</CardTitle>
                  </div>
                  <div className="flex flex-row items-center gap-1 border-none shadow-none">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 bg-white text-blue-600 hover:bg-white/90 active:bg-white shadow-sm rounded-sm transition-colors cursor-pointer">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent
                          mode="single"
                          selected={visitorDate}
                          onSelect={setVisitorDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-blue-600 active:bg-blue-700 rounded-sm transition-colors cursor-pointer">
                      <Minus className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex flex-col items-center justify-center relative min-h-[160px]">
                  <div className="flex flex-col items-center justify-center text-white">
                    <span className="text-7xl font-black">{stats.activeVisitors}</span>
                    <span className="text-sm font-medium mt-2 opacity-80 uppercase tracking-widest">Active Visitors</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
              {/* Recent Assets Card */}
              <Card className="bg-white border border-slate-200 shadow-none overflow-hidden rounded-xl">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-5 bg-white">
                  <div>
                    <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Recent Books</CardTitle>
                    <CardDescription className="text-slate-600 text-xs font-bold tracking-tight">Latest items added to catalog</CardDescription>
                  </div>
                  <BookOpen className="h-6 w-6 text-blue-600 opacity-20" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {books.slice(0, 5).map(book => (
                      <div key={book.id} className="p-4 hover:bg-white border hover:border-blue-200 transition-colors shadow-none">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-400 font-black text-xs border border-blue-100">BOOK</div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 text-sm line-clamp-1">{book.title}</span>
                            <span className="text-xs text-slate-500 font-bold tracking-tight">ISBN: {book.isbn}</span>
                          </div>
                        </div>
                        <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-xs font-black px-2.5 py-1 shadow-none">{book.availableCopies} CP</Badge>
                      </div>
                    ))}
                  </div>
                  <Link href="/books">
                    <Button variant="ghost" className="w-full h-12 rounded-none bg-white hover:bg-white border-t border-slate-100 hover:border-blue-200 transition-colors shadow-none flex items-center justify-center font-black">
                      View All Books <TrendingUp className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recent Entities Card */}
              <Card className="bg-white border border-slate-200 shadow-none overflow-hidden rounded-xl">
                <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between py-5 bg-white">
                  <div>
                    <CardTitle className="text-slate-900 font-black text-xl tracking-tight">New Members</CardTitle>
                    <CardDescription className="text-slate-600 text-xs font-bold tracking-tight">Latest registrations in past month</CardDescription>
                  </div>
                  <UserCheck className="h-6 w-6 text-emerald-600 opacity-20" />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {members.slice(0, 5).map(member => (
                      <div key={member.id} className="p-3 hover:bg-white border hover:border-blue-200 transition-colors shadow-none">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-black text-xs border border-emerald-100 text-center">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-900 text-sm leading-tight">{member.firstName} {member.lastName}</span>
                            <span className="text-xs text-slate-500 font-bold">ID: {member.membershipId}</span>
                          </div>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-xs font-black shadow-none">Active</Badge>
                      </div>
                    ))}
                  </div>
                  <Link href="/members">
                    <Button variant="ghost" className="w-full h-12 rounded-none bg-white hover:bg-white border-t border-slate-100 hover:border-blue-200 transition-colors shadow-none flex items-center justify-center font-black">
                      View All Members <Users className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
        </div>
      </DashboardLayout>
    </div>
  )
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
