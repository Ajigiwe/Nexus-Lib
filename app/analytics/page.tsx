"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { db, transactionService, visitorService } from "@/lib/database"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { Button } from "@/components/ui/button"
import { ArrowLeft, BookOpen, Users, ArrowRightLeft, TrendingUp, Download, Printer, PieChart as PieChartIcon, Activity, BarChart3 } from "lucide-react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import Link from "next/link"

function formatMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function getLastNMonths(n: number) {
  const out: { key: string; label: string; date: Date }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = formatMonthKey(d)
    const label = d.toLocaleString(undefined, { month: "short", year: "2-digit" })
    out.push({ key, label, date: d })
  }
  return out
}

function KPIPageContent() {
  const [selectedMonth, setSelectedMonth] = useState<string>(formatMonthKey(new Date()))
  const [barMetric, setBarMetric] = useState<"registrations" | "borrows" | "visitors">("borrows")
  const [pieMetric, setPieMetric] = useState<"registrations" | "borrows" | "visitors">("borrows")
  const monthOptions = useMemo(() => getLastNMonths(24), [])
  const normalizedSelected = useMemo(() => {
    const keys = new Set(monthOptions.map((b) => b.key))
    if (keys.has(selectedMonth)) return selectedMonth
    return monthOptions[monthOptions.length - 1]?.key
  }, [monthOptions, selectedMonth])

  const stats = useMemo(() => {
    const m = db.getAllMembers()
    const tx = transactionService.getAll()
    const v = visitorService.getAll()
    const b = db.getAllBooks()

    return {
      registrations: m.filter((it) => formatMonthKey(new Date(it.joinDate)) === normalizedSelected).length,
      borrows: tx.filter((t: any) => t.type === "borrow" && formatMonthKey(new Date(t.borrowDate)) === normalizedSelected).length,
      renewals: tx.filter((t: any) => t.type === "renew" && formatMonthKey(new Date(t.borrowDate)) === normalizedSelected).length,
      newBooks: b.filter((it: any) => it.addedDate && formatMonthKey(new Date(it.addedDate)) === normalizedSelected).length,
      visitors: v.filter((it) => formatMonthKey(new Date(it.visitDate)) === normalizedSelected).length
    }
  }, [normalizedSelected])

  const details = useMemo(() => {
    const members = db.getAllMembers(); const tx = transactionService.getAll(); const v = visitorService.getAll(); const b = db.getAllBooks()
    const mById = new Map(members.map(m => [m.id, m])); const bById = new Map(b.map(it => [it.id, it]))

    return {
      registrations: members.filter(m => formatMonthKey(new Date(m.joinDate)) === normalizedSelected),
      borrows: tx.filter((t: any) => t.type === "borrow" && formatMonthKey(new Date(t.borrowDate)) === normalizedSelected).map((t: any) => ({ ...t, member: mById.get(t.memberId), book: bById.get(t.bookId) })),
      visitors: v.filter(it => formatMonthKey(new Date(it.visitDate)) === normalizedSelected),
      overdue: tx.filter((t: any) => (t.status === "overdue" || (t.type === "borrow" && !t.returnDate && new Date(t.dueDate) < new Date()))).map((t: any) => ({ ...t, member: mById.get(t.memberId), book: bById.get(t.bookId) }))
    }
  }, [normalizedSelected])

  const pieData = useMemo(() => {
    const colors = ["#3B82F6", "#6366F1", "#8B5CF6", "#A855F7"]
    const raw = pieMetric === "registrations" ? details.registrations : pieMetric === "borrows" ? details.borrows.map(t => t.member) : details.visitors
    const counts: Record<string, number> = { Male: 0, Female: 0, Other: 0, Unspecified: 0 }
    raw.forEach((it: any) => { const g = it?.gender || "Unspecified"; if (g in counts) counts[g]++; else counts.Unspecified++; })
    return Object.entries(counts).map(([name, value], i) => ({ name, value, fill: colors[i] }))
  }, [details, pieMetric])

  const barData = useMemo(() => {
    const months = getLastNMonths(12); const members = db.getAllMembers(); const tx = transactionService.getAll(); const vis = visitorService.getAll()
    return months.map(m => ({
      label: m.label,
      value: barMetric === "registrations" ? members.filter(it => formatMonthKey(new Date(it.joinDate)) === m.key).length :
        barMetric === "borrows" ? tx.filter((t: any) => t.type === "borrow" && formatMonthKey(new Date(t.borrowDate)) === m.key).length :
          vis.filter(it => formatMonthKey(new Date(it.visitDate)) === m.key).length
    }))
  }, [barMetric])

  const exportPDF = () => {
    const doc = new jsPDF({ unit: "pt" })
    doc.setFontSize(20); doc.text(`Library Report - ${normalizedSelected}`, 40, 50)
    autoTable(doc, {
      startY: 70, head: [["Metric", "Value"]],
      body: [["Registrations", stats.registrations], ["Borrowed", stats.borrows], ["Renewals", stats.renewals], ["New Assets", stats.newBooks], ["Visitors", stats.visitors]],
      headStyles: { fillColor: [59, 130, 246] }
    })
    doc.save(`report-${normalizedSelected}.pdf`)
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics</h1>
              <p className="text-xs text-blue-600 font-extrabold tracking-wider uppercase">Library Insights</p>
            </div>
            <div className="mx-4 h-6 w-px bg-white hidden md:block"></div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border border-slate-200 h-8">
                <ArrowLeft className="h-4 w-4 mr-2 text-blue-600" /> Back
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 h-9" value={normalizedSelected} onChange={(e) => setSelectedMonth(e.target.value)} />
            <Button variant="ghost" onClick={exportPDF} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] tracking-widest h-8 px-4 shadow-none">
              <Printer className="h-3.5 w-3.5 mr-2" /> Print Report
            </Button>
          </div>
        </div>
      </header>

      <DashboardLayout>
        {/* Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Registrations", val: stats.registrations, icon: Users, bg: "bg-blue-500", darkBg: "bg-blue-600" },
            { label: "Borrowed", val: stats.borrows, icon: ArrowRightLeft, bg: "bg-indigo-500", darkBg: "bg-indigo-600" },
            { label: "Renewals", val: stats.renewals, icon: TrendingUp, bg: "bg-violet-500", darkBg: "bg-violet-600" },
            { label: "New Books", val: stats.newBooks, icon: BookOpen, bg: "bg-emerald-500", darkBg: "bg-emerald-600" },
            { label: "Visits", val: stats.visitors, icon: Activity, bg: "bg-sky-500", darkBg: "bg-sky-600" }
          ].map(card => (
            <div key={card.label} className={`${card.bg} rounded-lg overflow-hidden flex flex-col shadow-sm transition-transform hover:-translate-y-1 text-white`}>
              <div className="p-5 flex items-center justify-between relative overflow-hidden flex-1">
                <div className="z-10">
                  <div className="text-4xl font-black text-white tracking-tight mb-2">{card.val}</div>
                  <p className="text-sm text-white font-medium opacity-90">{card.label}</p>
                </div>
                <card.icon className="h-20 w-20 absolute -right-2 top-2 text-white opacity-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Velocity Trends */}
          <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-slate-900 font-black text-xl tracking-tight flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-blue-600" /> Global Trends
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold mt-1 tracking-tight">Active library throughput metrics (12 months interval)</CardDescription>
              </div>
              <Select value={barMetric} onValueChange={(v: any) => setBarMetric(v)}>
                <SelectTrigger className="w-32 bg-white border-slate-200 text-[10px] uppercase font-black tracking-widest h-9 text-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900">
                  <SelectItem value="registrations">Registrations</SelectItem>
                  <SelectItem value="borrows">Borrowed</SelectItem>
                  <SelectItem value="visitors">Visits</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="pt-8 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '10px', fontWeight: '900', color: '#000' }} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Demographics */}
          <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-slate-900 font-black text-xl tracking-tight flex items-center gap-2">
                  <PieChartIcon className="h-6 w-6 text-indigo-600" /> Demographic Scope
                </CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold mt-1 tracking-tight">Member distribution protocol by gender</CardDescription>
              </div>
              <Select value={pieMetric} onValueChange={(v: any) => setPieMetric(v)}>
                <SelectTrigger className="w-32 bg-white border-slate-200 text-[10px] uppercase font-black tracking-widest h-9 text-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900">
                  <SelectItem value="registrations">Registrations</SelectItem>
                  <SelectItem value="borrows">Borrowed</SelectItem>
                  <SelectItem value="visitors">Visits</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="pt-8 flex flex-col items-center justify-center p-0">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0.05)" strokeWidth={1} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', fontSize: '10px', fontWeight: '900', color: '#000' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 pb-8 border-t border-slate-100 w-full pt-6">
                {pieData.map((it) => (
                  <div key={it.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: it.fill }} />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{it.name}</span>
                    <span className="text-[10px] font-black text-slate-900">{it.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overview Section */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-none">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Summary</h3>
            <p className="text-[10px] text-slate-400 font-medium">Current library status</p>
          </div>
          <div className="flex gap-4">
            <div className="text-center px-6 border-r border-slate-100">
              <div className="text-xl font-black text-blue-600">{details.overdue.length}</div>
              <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Overdue</div>
            </div>
            <div className="text-center px-6">
              <div className="text-xl font-black text-indigo-600">{details.borrows.length + stats.renewals}</div>
              <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Borrowed</div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <KPIPageContent />
    </ProtectedRoute>
  )
}
