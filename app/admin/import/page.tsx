"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { ArrowLeft, FileUp, UploadCloud, Database, Info, CheckCircle2, AlertCircle, FileText, Users, BookOpen } from "lucide-react"

import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { authorService, bookService, db, memberService } from "@/lib/database"
import { generateMembershipId } from "@/lib/utils/library-utils"
import { idbWriteArray } from "@/lib/idb"
import type { Author, Book, Member } from "@/lib/types"

const parseCSV = (file: File): Promise<Record<string, string>[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results: any) => {
        const rows = (results.data || []).map((r: Record<string, string>) => {
          const normalized: Record<string, string> = {}
          Object.entries(r).forEach(([k, v]) => {
            normalized[String(k).trim()] = String(v ?? "").trim()
          })
          return normalized
        })
        resolve(rows)
      },
      error: (err: unknown) => reject(err),
    })
  })
}

const parseXLSX = async (file: File): Promise<Record<string, string>[]> => {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as any
  if (!rows.length) return []
  const headers = (rows[0] || []).map((h) => String(h || "").trim())
  const out: Record<string, string>[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || []
    const obj: Record<string, string> = {}
    headers.forEach((h: string, idx: number) => {
      obj[h] = String(row[idx] ?? "").trim()
    })
    if (Object.values(obj).some((v) => v !== "")) out.push(obj)
  }
  return out
}

const parseFile = (file: File): Promise<Record<string, string>[]> => {
  const name = (file.name || "").toLowerCase()
  if (name.endsWith(".csv")) return parseCSV(file)
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseXLSX(file)
  return parseCSV(file)
}

function useImportState() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [results, setResults] = useState<{ ok: boolean; info: string }[]>([])

  const setSuccess = (text: string) => setMessage({ type: "success", text })
  const setError = (text: string) => setMessage({ type: "error", text })

  return { message, setMessage, setSuccess, setError, busy, setBusy, preview, setPreview, results, setResults }
}

const toInt = (v: string, fallback = 0) => {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

function normalizeGender(v: string): "Male" | "Female" | "Other" | "Unspecified" | null {
  const s = (v || "").trim().toLowerCase()
  if (!s) return null
  if (["m", "male"].includes(s)) return "Male"
  if (["f", "female"].includes(s)) return "Female"
  if (["o", "other", "nonbinary", "nb"].includes(s)) return "Other"
  return "Unspecified"
}

async function resolveAuthorIds(authorsCells: string): Promise<string[]> {
  const parts = authorsCells.split(/[;|]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return []
  const existing = db.getAllAuthors()
  const ids: string[] = []
  for (const full of parts) {
    const tokens = full.split(/\s+/)
    const firstName = tokens.length > 1 ? tokens.slice(0, -1).join(" ") : tokens[0]
    const lastName = tokens.length > 1 ? tokens[tokens.length - 1] : ""
    const found = existing.find((a) => a.firstName.toLowerCase() === firstName.toLowerCase() && a.lastName.toLowerCase() === lastName.toLowerCase())
    if (found) ids.push(found.id)
    else {
      const created = authorService.create({ firstName, lastName }) as unknown as Author
      ids.push(created.id)
    }
  }
  return ids
}

async function importAuthors(rows: Record<string, string>[]) {
  const results: { ok: boolean; info: string }[] = []
  const existing = db.getAllAuthors()
  const authorsToAdd: Omit<Author, 'id' | 'addedDate' | 'updatedDate'>[] = []
  for (const r of rows) {
    const firstName = r.firstName || r.first || r["first_name"] || ""
    const lastName = r.lastName || r.last || r["last_name"] || ""
    if (!firstName || !lastName) { results.push({ ok: false, info: "Missing identity fields" }); continue; }
    const dup = existing.find((a) => a.firstName.toLowerCase() === firstName.toLowerCase() && a.lastName.toLowerCase() === lastName.toLowerCase())
    if (dup) { results.push({ ok: true, info: `Skipped (duplicate): ${firstName} ${lastName}` }); continue; }
    authorsToAdd.push({ firstName, lastName, nationality: r.nationality || "", birthDate: r.birthDate || r["birth_date"] || "", biography: r.biography || r.bio || "" })
    results.push({ ok: true, info: `Queued: ${firstName} ${lastName}` })
  }
  if (authorsToAdd.length > 0) {
    const currentAuthors = db.getAllAuthors()
    const updatedAuthors = [...currentAuthors, ...authorsToAdd.map(a => ({ ...a, id: crypto.randomUUID(), addedDate: new Date().toISOString(), updatedDate: new Date().toISOString() }))]
    await idbWriteArray('authors', updatedAuthors)
    window.dispatchEvent(new Event('authors-updated'))
  }
  return results
}

async function importBooks(rows: Record<string, string>[]) {
  const results: { ok: boolean; info: string }[] = []
  for (const r of rows) {
    const isbn = r.isbn || r.ISBN || ""; const title = r.title || r.Title || ""
    if (!isbn || !title) { results.push({ ok: false, info: "Missing ISBN/Title" }); continue; }
    const authorIds = await resolveAuthorIds(r.authors || r.author || r["author_names"] || "")
    bookService.create({ isbn, title, authorIds, publisher: r.publisher || "", publishedYear: toInt(r.publishedYear || r.year || r["published_year"] || "0"), genre: r.genre || "", totalCopies: toInt(r.totalCopies || r["total_copies"] || "1", 1), availableCopies: toInt(r.availableCopies || r["available_copies"] || "1", 1), location: r.location || "", description: r.description || "" } as any)
    results.push({ ok: true, info: `Imported volume: ${title}` })
  }
  return results
}

async function importMembers(rows: Record<string, string>[]) {
  const results: { ok: boolean; info: string }[] = []
  const existing = db.getAllMembers()
  for (const r of rows) {
    const firstName = r.firstName || r.first || r["first_name"] || ""; const lastName = r.lastName || r.last || r["last_name"] || ""
    const gender = normalizeGender(r.gender || r.Gender || r["sex"] || "")
    const joinDate = r.joinDate || r["join_date"] || ""
    if (!firstName || !lastName || !gender || !joinDate) { results.push({ ok: false, info: "Incomplete record data" }); continue; }
    if (existing.find(m => m.firstName.toLowerCase() === firstName.toLowerCase() && m.lastName.toLowerCase() === lastName.toLowerCase() && m.joinDate === joinDate)) { results.push({ ok: true, info: `Skipped duplicate: ${firstName} ${lastName}` }); continue; }
    const expiryDate = new Date(joinDate); expiryDate.setMonth(expiryDate.getMonth() + 3)
    memberService.create({ membershipId: generateMembershipId("patron"), firstName, lastName, email: r.email || "", phone: r.phone || "", address: r.address || "", gender, membershipType: "patron", joinDate, expiryDate: expiryDate.toISOString().split("T")[0], isActive: true, maxBooksAllowed: 2, currentBooksCount: 0 } as any)
    results.push({ ok: true, info: `Member added: ${firstName} ${lastName}` })
  }
  return results
}

function ImportSection({ kind, onImport }: { kind: "authors" | "books" | "members", onImport: (rows: Record<string, string>[]) => Promise<{ ok: boolean; info: string }[]> }) {
  const s = useImportState(); const fileInputRef = useRef<HTMLInputElement>(null); const [fileName, setFileName] = useState("")
  const template = useMemo(() => {
    if (kind === "authors") return ["firstName", "lastName", "nationality", "birthDate", "biography"]
    if (kind === "books") return ["isbn", "title", "authors", "publisher", "publishedYear", "genre", "totalCopies", "availableCopies", "location", "description"]
    return ["firstName", "lastName", "gender", "joinDate", "phone", "address"]
  }, [kind])

  const handleFile = useCallback(async (file?: File) => {
    if (!file) return; s.setBusy(true); s.setMessage(null);
    try {
      setFileName(file.name); const rows = await parseFile(file); s.setPreview(rows.slice(0, 10))
      const res = await onImport(rows); s.setResults(res)
      s.setSuccess(`${res.filter(r => r.ok).length}/${res.length} items processed successfully`)
    } catch (e: any) { s.setError(e?.message || "Import failure") }
    finally { s.setBusy(false); if (fileInputRef.current) fileInputRef.current.value = ""; setFileName("") }
  }, [onImport])

  return (
    <Card className="bg-white border border-slate-200 shadow-none">
      <CardHeader className="border-b border-slate-100 pb-6">
        <div className="flex items-center gap-2">
          {kind === 'authors' && <Users className="h-5 w-5 text-blue-600" />}
          {kind === 'books' && <BookOpen className="h-5 w-5 text-indigo-600" />}
          {kind === 'members' && <Users className="h-5 w-5 text-emerald-600" />}
          <div>
            <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Import {kind}</CardTitle>
            <CardDescription className="text-slate-400 text-[10px] font-medium">Headers: {template.join(", ")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-8 space-y-6">
        {s.message && (
          <Alert className={`${s.message.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'} border animate-in fade-in zoom-in-95`}>
            {s.message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <AlertDescription className="font-bold text-xs uppercase tracking-widest">{s.message.text}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-6 rounded-2xl border-slate-200 shadow-none transition-all hover:border-blue-300">
          <Input ref={fileInputRef} id={`file-${kind}`} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={s.busy} className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-xs tracking-widest h-12 px-8 rounded-xl shadow-none w-full sm:w-auto">
            <FileUp className="h-5 w-5 mr-3" /> Select File
          </Button>
          <div className="flex flex-col items-center sm:items-start">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Accepted Types: CSV, XLSX, XLS</span>
            <span className="text-xs text-blue-600 font-bold mt-1">{fileName || "No file selected"}</span>
          </div>
        </div>

        {s.preview.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 border-l-2 border-indigo-500 pl-4">
              <FileText className="h-4 w-4 text-indigo-600" />
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Data Preview</h4>
            </div>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="border-slate-100">
                    {Object.keys(s.preview[0]).map((h) => (
                      <TableHead key={h} className="text-slate-500 font-black uppercase text-[9px] tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.preview.map((row, idx) => (
                    <TableRow key={idx} className="border-slate-100 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                      {Object.values(row).map((v, i) => (
                        <TableCell key={i} className="text-[10px] text-slate-600 whitespace-nowrap py-3">{String(v)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {s.results.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 border-l-2 border-blue-500 pl-4">
              <Database className="h-4 w-4 text-blue-600" />
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Import Progress</h4>
            </div>
            <div className="rounded-xl border border-slate-200 max-h-64 overflow-auto custom-scrollbar-thin bg-white border-slate-100 shadow-none transition-all hover:border-blue-300">
              <Table>
                <TableHeader className="bg-white sticky top-0 z-10 border-b border-slate-100">
                  <TableRow className="border-slate-200">
                    <TableHead className="text-slate-500 font-black uppercase text-[9px] tracking-wider w-20">Status</TableHead>
                    <TableHead className="text-slate-500 font-black uppercase text-[9px] tracking-wider">Status Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.results.map((r, i) => (
                    <TableRow key={i} className="border-slate-100 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                      <TableCell>
                        <Badge className={`${r.ok ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"} text-[8px] font-black uppercase`}>
                          {r.ok ? "SUCCESS" : "ERROR"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] font-bold text-slate-500 py-2">{r.info}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ImportContent() {
  const searchParams = useSearchParams()
  const tab = (searchParams.get("tab") || "authors").toLowerCase()
  const initialTab = ["authors", "books", "members"].includes(tab) ? (tab as "authors" | "books" | "members") : "authors"

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Library</h1>
                <p className="text-[10px] text-blue-600 font-bold tracking-wider">Import</p>
              </div>
              <div className="mx-4 h-6 w-px bg-white"></div>
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none border-slate-200">
                  <ArrowLeft className="h-4 w-4 mr-2 text-blue-600" /> Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8 max-w-5xl">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Data Import</h2>
          <p className="text-xs text-slate-400 font-medium">Add or update library records using CSV or Excel files</p>
        </div>

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-12 w-full lg:w-auto grid grid-cols-3 gap-1 mb-8 shadow-none">
            <TabsTrigger value="books" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold text-[11px] tracking-wider rounded-lg transition-all">BOOKS</TabsTrigger>
            <TabsTrigger value="authors" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold text-[11px] tracking-wider rounded-lg transition-all">AUTHORS</TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-bold text-[11px] tracking-wider rounded-lg transition-all">MEMBERS</TabsTrigger>
          </TabsList>

          <TabsContent value="authors" className="animate-in fade-in duration-300"><ImportSection kind="authors" onImport={importAuthors} /></TabsContent>
          <TabsContent value="books" className="animate-in fade-in duration-300"><ImportSection kind="books" onImport={importBooks} /></TabsContent>
          <TabsContent value="members" className="animate-in fade-in duration-300"><ImportSection kind="members" onImport={importMembers} /></TabsContent>
        </Tabs>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-none flex items-start gap-4">
          <Info className="h-5 w-5 text-blue-600 mt-1" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-900 tracking-tight">Note</p>
            <p className="text-[10px] text-slate-400 leading-relaxed font-bold">Ensure files use UTF-8 encoding. Duplicates will be automatically skipped based on unique markers (ISBN, ID, Name).</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ImportPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <ImportContent />
    </ProtectedRoute>
  )
}
