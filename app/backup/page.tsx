"use client"

import React, { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Upload,
  Database,
  FileText,
  Users,
  BookOpen,
  UserPlus,
  Eye,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  HardDrive,
  RefreshCcw,
  Binary,
  ShieldAlert,
  Info
} from "lucide-react"
import { db } from "@/lib/database"
import { authManager } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"
import Link from "next/link"
import * as XLSX from "xlsx"

function BackupPageContent() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedTables, setSelectedTables] = useState({
    books: true,
    members: true,
    authors: true,
    transactions: true,
    visitors: true,
    activeVisits: true,
    users: false
  })
  const restoreInputRef = useRef<HTMLInputElement | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const getTableData = (tableName: string) => {
    switch (tableName) {
      case 'books': return db.getAllBooks()
      case 'members': return db.getAllMembers()
      case 'authors': return db.getAllAuthors()
      case 'transactions': return db.getAllTransactions()
      case 'visitors': return db.getAllVisitors()
      case 'activeVisits': return db.getAllActiveVisits()
      case 'users': return authManager.getAllUsers()
      default: return []
    }
  }

  const getTableCount = (tableName: string) => getTableData(tableName).length
  const handleTableSelection = (tableName: string, checked: boolean) => setSelectedTables(prev => ({ ...prev, [tableName]: checked }))
  const handleSelectAll = () => {
    const allSelected = Object.values(selectedTables).every(Boolean)
    const newState = Object.keys(selectedTables).reduce((acc, key) => ({ ...acc, [key]: !allSelected }), {} as typeof selectedTables)
    setSelectedTables(newState)
  }

  const handleBackup = () => {
    const selectedCount = Object.values(selectedTables).filter(Boolean).length
    if (selectedCount === 0) { showMessage("error", "Select at least one data category"); return; }
    try {
      const data: any = {}; Object.entries(selectedTables).forEach(([k, v]) => { if (v) data[k] = getTableData(k); })
      const payload = { version: 1, createdAt: new Date().toISOString(), selectedTables: Object.keys(selectedTables).filter(k => (selectedTables as any)[k]), data }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url
      a.download = `nexus-backup-${new Date().toISOString().split("T")[0]}.json`; a.click()
      URL.revokeObjectURL(url); showMessage("success", "Backup file generated successfully")
    } catch (e: any) { showMessage("error", "Backup generation failure") }
  }

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const payload = JSON.parse(await file.text()); const d = payload.data; const ensureArray = (v: any) => (Array.isArray(v) ? v : [])
      if (d.books) localStorage.setItem("librarymanapp_books", JSON.stringify(ensureArray(d.books)))
      if (d.members) localStorage.setItem("librarymanapp_members", JSON.stringify(ensureArray(d.members)))
      if (d.authors) localStorage.setItem("librarymanapp_authors", JSON.stringify(ensureArray(d.authors)))
      if (d.transactions) localStorage.setItem("librarymanapp_transactions", JSON.stringify(ensureArray(d.transactions)))
      if (d.visitors) localStorage.setItem("librarymanapp_visitors", JSON.stringify(ensureArray(d.visitors)))
      if (d.activeVisits) localStorage.setItem("librarymanapp_active_visits", JSON.stringify(ensureArray(d.activeVisits)))
      if (d.users) localStorage.setItem("librarymanapp_auth_users", JSON.stringify(ensureArray(d.users)))
      showMessage("success", "Data restored. Please refresh the page.")
    } catch (err: any) { showMessage("error", "Corrupt or invalid backup file") }
    finally { if (restoreInputRef.current) restoreInputRef.current.value = "" }
  }

  const handleClearAllData = async () => {
    try {
      const d = { books: db.getAllBooks(), members: db.getAllMembers(), authors: db.getAllAuthors(), transactions: db.getAllTransactions(), visitors: db.getAllVisitors(), activeVisits: db.getAllActiveVisits() }
      const blob = new Blob([JSON.stringify({ version: 1, createdAt: new Date().toISOString(), data: d }, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url
      a.download = `auto-rescue-backup-${new Date().toISOString().split("T")[0]}.json`; a.click(); URL.revokeObjectURL(url)

      localStorage.setItem("librarymanapp_books", "[]"); localStorage.setItem("librarymanapp_members", "[]")
      localStorage.setItem("librarymanapp_authors", "[]"); localStorage.setItem("librarymanapp_transactions", "[]")
      localStorage.setItem("librarymanapp_visitors", "[]"); localStorage.setItem("librarymanapp_active_visits", "[]")
      showMessage("success", "Data cleared successfully. Database reset."); setTimeout(() => window.location.reload(), 2000)
    } catch (error: any) { showMessage("error", "Data reset aborted - error detected") }
  }

  const tables = [
    { key: 'books', name: 'Books', icon: BookOpen, sub: 'Library books' },
    { key: 'members', name: 'Members', icon: UserPlus, sub: 'Library members' },
    { key: 'authors', name: 'Authors', icon: Users, sub: 'Book authors' },
    { key: 'transactions', name: 'History', icon: FileText, sub: 'Borrowing history' },
    { key: 'visitors', name: 'Visitors', icon: Eye, sub: 'Visitor history' },
    { key: 'users', name: 'Staff', icon: ShieldCheck, sub: 'Admin accounts' }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cloud Backup</h1>
                <p className="text-xs text-blue-600 font-extrabold tracking-wider uppercase">Data Management</p>
              </div>
              <div className="mx-4 h-6 w-px bg-white"></div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border border-slate-200">
                  <ArrowLeft className="h-4 w-4 mr-2 text-blue-600" /> Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <DashboardLayout>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Repository Archive</h2>
            <p className="text-xs text-slate-500 font-bold tracking-tight">Backup your library system or restore from a previous archive node</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold px-3 py-1">LocalStorage: active</Badge>
            <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-3 py-1">Encryption: AES/None</Badge>
          </div>
        </div>

        {message && (
          <Alert className={`${message.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'} border animate-in fade-in zoom-in-95`}>
            {message.type === 'error' ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            <AlertDescription className="font-bold text-xs uppercase tracking-widest">{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Selection Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-6">
                <div>
                  <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Data Categories</CardTitle>
                  <CardDescription className="text-slate-500 text-xs font-bold mt-1 tracking-tight">Select which storage blocks to include in the exported bundle</CardDescription>
                </div>
                <Button variant="ghost" onClick={handleSelectAll} className="h-8 text-[9px] font-bold uppercase text-slate-400 border border-slate-200 hover:bg-white px-4 shadow-none">Toggle All</Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tables.map(it => (
                    <div key={it.key} className={`flex items-start gap-3 p-5 rounded-2xl border transition-all ${selectedTables[it.key as keyof typeof selectedTables] ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                      <Checkbox id={it.key} checked={selectedTables[it.key as keyof typeof selectedTables]} onCheckedChange={(c) => handleTableSelection(it.key, !!c)} className="mt-1 border-slate-300 data-[state=checked]:bg-blue-600" />
                      <div className="flex-1">
                        <label htmlFor={it.key} className="text-sm font-black text-slate-900 tracking-tight cursor-pointer block">{it.name}</label>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">{it.sub}</p>
                        <Badge className="mt-3 bg-white text-[9px] font-mono border border-slate-100 text-slate-400">{getTableCount(it.key)} RECORDS</Badge>
                      </div>
                      <it.icon className={`h-5 w-5 ${selectedTables[it.key as keyof typeof selectedTables] ? 'text-blue-600' : 'text-slate-200'}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Info Note */}
            <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-none flex items-start gap-4">
              <Info className="h-5 w-5 text-blue-600 mt-1" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900 tracking-tight">Important Note</p>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">Backups are saved in JSON format. Keep these files safe as they contain all your library data. Restoring will replace your current data with the file content.</p>
              </div>
            </div>
          </div>

          {/* Actions Column */}
          <div className="space-y-6">
            <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
              <CardHeader className="border-b border-slate-100 pb-6">
                <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Operations</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <Button onClick={handleBackup} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest h-14 shadow-none shadow-none rounded-xl transition-all active:scale-95">
                  <Download className="h-5 w-5 mr-3" /> Export Dataset
                </Button>
                <Button onClick={() => restoreInputRef.current?.click()} variant="outline" className="w-full border-slate-200 text-slate-600 hover:bg-white font-black text-xs uppercase tracking-widest h-14 rounded-xl">
                  <Upload className="h-5 w-5 mr-3 text-blue-400" /> Import Archive
                </Button>
                <input ref={restoreInputRef} type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />

                <div className="pt-4 border-t border-slate-100 uppercase">
                  <p className="text-[9px] font-bold text-slate-300 tracking-[0.2em] mb-4 text-center">Data Safety</p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="w-full border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white font-bold text-[10px] tracking-wider h-10">
                        <Trash2 className="h-4 w-4 mr-3" /> Reset All Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-white border border-slate-200 text-slate-900 max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-rose-600 font-bold text-xl tracking-tight flex items-center gap-2">
                          <AlertTriangle className="h-6 w-6" /> Warning: Data Deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400 text-[10px] font-medium mt-2 leading-relaxed">
                          This will delete all library data including Books, Members, and Transactions. A safety backup will be downloaded automatically before deletion.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel className="bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-none px-4 py-2 rounded-lg text-slate-600 font-bold text-[10px] uppercase tracking-wider">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllData} className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold">Confirm Clear</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-indigo-50 border border-indigo-100 overflow-hidden group">
              <CardHeader className="pb-2">
                <HardDrive className="h-5 w-5 text-indigo-400 mb-2" />
                <CardTitle className="text-indigo-900 font-bold text-sm">Cloud Sync</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider leading-relaxed">Cloud synchronization is currently disabled. All data is stored locally in your browser.</p>
                <Button disabled className="w-full mt-4 bg-indigo-100 text-indigo-400 border border-indigo-200 font-bold text-[9px] tracking-widest h-8 cursor-not-allowed">
                  <RefreshCcw className="h-3 w-3 mr-2" /> Sync Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </div>
  )
}

export default function BackupPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <BackupPageContent />
    </ProtectedRoute>
  )
}
