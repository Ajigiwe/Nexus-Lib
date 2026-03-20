"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  BookOpen,
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar,
  Download,
  UploadCloud,
  Eye,
  Type,
  Hash,
  Filter,
  Layers,
  Archive,
  Book as BookIcon,
  ShieldCheck,
  Globe,
  X
} from "lucide-react"
import { bookService, authorService } from "@/lib/database"
import type { Book, Author } from "@/lib/types"
import { searchBooks } from "@/lib/utils/library-utils"
import Link from "next/link"
import Image from "next/image"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { toast } from "@/components/ui/use-toast"

function BooksPageContent() {
  const [books, setBooks] = useState<Book[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [scanIsbn, setScanIsbn] = useState("")
  const [genreFilter, setGenreFilter] = useState("All Genres")
  const [availableOnlyFilter, setAvailableOnlyFilter] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [viewingBook, setViewingBook] = useState<Book | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [authorQuery, setAuthorQuery] = useState("")

  const [formData, setFormData] = useState({
    isbn: "",
    title: "",
    authorIds: [] as string[],
    publisher: "",
    publishedYear: new Date().getFullYear(),
    category: undefined as undefined | "Fiction" | "Non-Fiction",
    deweyDecimal: "",
    totalCopies: 1,
    description: "",
    isNew: false,
    isReference: false,
  })

  const deweyClasses = [
    { code: 0, name: "000 – Computer science, information & general works" },
    { code: 100, name: "100 – Philosophy & psychology" },
    { code: 200, name: "200 – Religion" },
    { code: 300, name: "300 – Social sciences" },
    { code: 400, name: "400 – Language" },
    { code: 500, name: "500 – Pure science" },
    { code: 600, name: "600 – Technology" },
    { code: 700, name: "700 – Arts & recreation" },
    { code: 800, name: "800 – Literature" },
    { code: 900, name: "900 – History & geography" },
  ] as const

  const getDeweyTopClass = (ddc: string) => {
    const m = ddc.match(/^(\d{1,3})/)
    if (!m) return undefined
    const top = Math.min(900, Math.floor(parseInt(m[1], 10) / 100) * 100)
    return deweyClasses.find((c) => c.code === top)
  }

  const setDeweyTopClass = (code: number) => {
    const current = formData.deweyDecimal.trim()
    const decimals = current.includes(".") ? current.slice(current.indexOf(".")) : ""
    const next = `${String(code).padStart(3, "0")}${decimals}`
    setFormData((f) => ({ ...f, deweyDecimal: next }))
  }

  const genres = [
    "Fiction", "Non-Fiction", "Science Fiction", "Fantasy", "Mystery",
    "Romance", "Thriller", "Biography", "History", "Science",
    "Technology", "Self-Help", "Children", "Young Adult", "Poetry",
    "Drama", "Other",
  ]

  useEffect(() => {
    loadBooks()
    loadAuthors()
  }, [])

  useEffect(() => {
    const filtered = searchBooks(searchQuery, {
      genre: genreFilter === "All Genres" ? undefined : genreFilter,
      availableOnly: availableOnlyFilter,
    })
    setFilteredBooks(filtered)
  }, [books, searchQuery, genreFilter, availableOnlyFilter])

  const normalizeIsbn = (value: string) => {
    const raw = value.trim()
    const first = raw.split(/\s+/)[0]
    return first.replace(/[^0-9Xx]/g, "")
  }

  const handleScanSubmit = () => {
    const normalized = normalizeIsbn(scanIsbn)
    if (!normalized) return
    setSearchQuery(normalized)
    setScanIsbn("")
    toast({ title: "ISBN Scanned", description: `Searching for: ${normalized}` })
  }

  const loadBooks = () => {
    setBooks(bookService.getAll())
  }

  const loadAuthors = () => {
    setAuthors(authorService.getAll())
  }

  const isSelected = (id: string) => selectedIds.has(id)
  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }
  const toggleSelectAll = (list: Book[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) list.forEach((b) => next.add(b.id))
      else list.forEach((b) => next.delete(b.id))
      return next
    })
  }

  const handleBulkDelete = (ids: string[]) => {
    if (ids.length === 0) return
    if (!confirm(`Permanently delete ${ids.length} selected book(s)?`)) return
    ids.forEach((id) => bookService.delete(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
    loadBooks()
    toast({ title: "Books removed", description: `${ids.length} items deleted from collection.` })
  }

  const getAuthorFullName = (a: Author) => `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim()

  const findAuthorByNameCI = (name: string) => {
    const target = name.trim().toLowerCase()
    return authors.find((a) => getAuthorFullName(a).toLowerCase() === target)
  }

  const addAuthorByName = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    let author = findAuthorByNameCI(trimmed)
    if (!author) {
      const parts = trimmed.split(/\s+/)
      const firstName = parts.slice(0, -1).join(" ") || parts[0]
      const lastName = parts.length > 1 ? parts.slice(-1)[0] : ""
      author = authorService.create({ firstName, lastName })
      setAuthors((prev) => [...prev, author!])
    }
    const id = author.id
    setFormData((f) => (f.authorIds.includes(id) ? f : { ...f, authorIds: [...f.authorIds, id] }))
    setAuthorQuery("")
  }

  const removeAuthor = (id: string) => {
    setFormData((f) => ({ ...f, authorIds: f.authorIds.filter((x) => x !== id) }))
  }

  const resetForm = () => {
    setFormData({
      isbn: "",
      title: "",
      authorIds: [],
      publisher: "",
      publishedYear: new Date().getFullYear(),
      category: undefined,
      deweyDecimal: "",
      totalCopies: 1,
      description: "",
      isNew: false,
      isReference: false,
    })
  }

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.authorIds.length === 0) {
      toast({ title: "Author required", description: "Please select at least one author.", variant: "destructive" })
      return
    }
    if (formData.category === "Non-Fiction" && !formData.deweyDecimal.trim()) {
      toast({ title: "Classification required", description: "Dewey Decimal is required for Non-Fiction.", variant: "destructive" })
      return
    }
    bookService.create({ ...formData, availableCopies: formData.totalCopies })
    loadBooks()
    setIsAddDialogOpen(false)
    resetForm()
    toast({ title: "Book added", description: "Successfully added to library collection." })
  }

  const handleEditBook = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBook) return
    if (formData.authorIds.length === 0) {
      toast({ title: "Author required", description: "Please select at least one author.", variant: "destructive" })
      return
    }
    const updatedBook = bookService.update(editingBook.id, {
      ...formData,
      availableCopies: Math.max(0, editingBook.availableCopies + (formData.totalCopies - editingBook.totalCopies)),
    })
    if (updatedBook) {
      loadBooks()
      setIsEditDialogOpen(false)
      setEditingBook(null)
      resetForm()
      toast({ title: "Book updated" })
    }
  }

  const handleDeleteBook = (bookId: string) => {
    if (confirm("Permanently delete this book?")) {
      bookService.delete(bookId)
      loadBooks()
      toast({ title: "Book removed" })
    }
  }

  const openEditDialog = (book: Book) => {
    setEditingBook(book)
    setFormData({
      isbn: book.isbn,
      title: book.title,
      authorIds: book.authorIds || [],
      publisher: book.publisher,
      publishedYear: book.publishedYear,
      category: book.category,
      deweyDecimal: book.deweyDecimal || "",
      totalCopies: book.totalCopies,
      description: book.description || "",
      isNew: book.isNew ?? false,
      isReference: !!book.isReference,
    })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (book: Book) => {
    setViewingBook(book)
    setIsViewDialogOpen(true)
  }

  const getAuthorNames = (authorIds: string[]) => {
    return authorIds
      .map((id) => {
        const author = authors.find((a) => a.id === id)
        return author ? `${author.firstName} ${author.lastName}` : "Unknown"
      })
      .join(", ")
  }

  const circulatingBooks = filteredBooks.filter((b) => !b.isReference)
  const referenceBooks = filteredBooks.filter((b) => !!b.isReference)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg shadow-none shadow-none">
                <BookIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Books</h1>
                <p className="text-xs text-blue-600 font-extrabold tracking-wider">Library Management</p>
              </div>
              <div className="mx-4 h-6 w-px bg-white"></div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                  <ArrowLeft className="h-3.5 w-3.5 mr-2 text-blue-500" /> Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/import?tab=books">
                <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                  <UploadCloud className="h-4 w-4 mr-2 text-sky-600" /> Import
                </Button>
              </Link>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest h-10 px-6 shadow-none shadow-none">
                    <Plus className="h-5 w-5 mr-2" /> Add Book
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white border border-slate-200 text-slate-900 custom-scrollbar-thin">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900 font-black text-2xl tracking-tight">Add New Book</DialogTitle>
                    <DialogDescription className="text-slate-500 text-sm font-bold mt-1">Add a new book to the library collection.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddBook} className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="isbn" className="text-xs font-bold text-slate-500 uppercase">ISBN / EAN</Label>
                        <Input
                          id="isbn"
                          value={formData.isbn}
                          onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                          placeholder="978-..."
                          className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-bold text-slate-500 uppercase">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Book title"
                          className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Authors</Label>
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-300" />
                          <Input
                            placeholder="Search or add author..."
                            value={authorQuery}
                            onChange={(e) => setAuthorQuery(e.target.value)}
                            className="pl-10 bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                addAuthorByName(authorQuery)
                              }
                            }}
                          />
                        </div>
                        {authorQuery.trim() && (
                          <div className="border border-slate-200 rounded-xl bg-white p-1 max-h-40 overflow-y-auto shadow-none">
                            {authors
                              .filter((a) => getAuthorFullName(a).toLowerCase().includes(authorQuery.toLowerCase()) && !formData.authorIds.includes(a.id))
                              .map((a) => (
                                <button key={a.id} type="button" className="w-full text-left px-3 py-2 hover:bg-white border hover:border-blue-100 transition-colors" onClick={() => addAuthorByName(getAuthorFullName(a))}>
                                  {getAuthorFullName(a)}
                                </button>
                              ))
                            }
                            <button type="button" className="w-full text-left px-3 py-2 hover:bg-blue-50 text-blue-600 font-bold text-xs uppercase tracking-widest border-t border-slate-100 mt-1" onClick={() => addAuthorByName(authorQuery)}>
                              + Add "{authorQuery}"
                            </button>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {formData.authorIds.map((id) => {
                            const a = authors.find((x) => x.id === id)
                            return (
                              <Badge key={id} className="bg-blue-600/20 text-blue-400 border border-blue-500/20 flex items-center gap-1.5 px-3 py-1">
                                {a ? getAuthorFullName(a) : "Unknown"}
                                <X className="h-3 w-3 cursor-pointer hover:text-slate-900" onClick={() => removeAuthor(id)} />
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="publisher" className="text-xs font-bold text-slate-500 uppercase">Publisher</Label>
                        <Input
                          id="publisher"
                          value={formData.publisher}
                          onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                          placeholder="Publisher name"
                          className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="publishedYear" className="text-xs font-bold text-slate-500 uppercase">Year</Label>
                        <Input
                          id="publishedYear"
                          type="number"
                          value={formData.publishedYear}
                          onChange={(e) => setFormData({ ...formData, publishedYear: Number(e.target.value) })}
                          className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalCopies" className="text-xs font-bold text-slate-500 uppercase">Copies</Label>
                        <Input
                          id="totalCopies"
                          type="number"
                          value={formData.totalCopies}
                          onChange={(e) => setFormData({ ...formData, totalCopies: Number(e.target.value) })}
                          className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-xs font-bold text-slate-500 uppercase">Primary Category</Label>
                        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}>
                          <SelectTrigger className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300">                           <SelectItem value="Fiction">Fiction</SelectItem>
                            <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dewey" className="text-xs font-bold text-slate-500 uppercase">Dewey Decimal (Non-Fiction)</Label>
                        <Select
                          value={formData.deweyDecimal && getDeweyTopClass(formData.deweyDecimal) ? String(getDeweyTopClass(formData.deweyDecimal)!.code) : undefined}
                          onValueChange={(v) => setDeweyTopClass(parseInt(v, 10))}
                          disabled={formData.category !== "Non-Fiction"}
                        >
                          <SelectTrigger className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300">
                            <SelectValue placeholder="Dewey Class" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 text-slate-900 max-h-60">
                            {deweyClasses.map((c) => (
                              <SelectItem key={c.code} value={String(c.code)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase">Synopsis / Notes</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300 resize-none"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-6 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="isNew" checked={!!formData.isNew} onCheckedChange={(v) => setFormData({ ...formData, isNew: !!v })} className="border-slate-300 data-[state=checked]:bg-blue-600" />
                        <Label htmlFor="isNew" className="text-xs font-bold text-slate-500 uppercase">New Arrival</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="isReference" checked={!!formData.isReference} onCheckedChange={(v) => setFormData({ ...formData, isReference: !!v })} className="border-slate-300 data-[state=checked]:bg-rose-600" />
                        <Label htmlFor="isReference" className="text-xs font-black text-slate-700 uppercase tracking-widest">Reference Item</Label>
                      </div>
                    </div>

                    <DialogFooter className="gap-2 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-slate-600 hover:bg-white border hover:border-blue-200 transition-colors">Cancel</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest px-10 h-10 shadow-none shadow-none">Save Book</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <DashboardLayout>
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Books", val: books.length, icon: BookIcon, bg: "bg-blue-500", darkBg: "bg-blue-600" },
            { label: "Available", val: books.reduce((acc, b) => acc + (b.availableCopies > 0 ? 1 : 0), 0), icon: ShieldCheck, bg: "bg-emerald-500", darkBg: "bg-emerald-600" },
            { label: "Fiction", val: books.filter(b => b.category === "Fiction").length, icon: Globe, bg: "bg-indigo-500", darkBg: "bg-indigo-600" },
            { label: "Reference", val: books.filter(b => b.isReference).length, icon: Archive, bg: "bg-red-500", darkBg: "bg-red-600" }
          ].map(card => {
            const isDarkText = false;
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

        <Card className="bg-white border border-slate-200 shadow-none">
          <CardHeader className="border-b border-slate-100 pb-4 bg-white">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Search Books</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold mt-1">Filters for all books below</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-12 xl:col-span-5 relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <Input
                  placeholder="Search title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-white border-slate-300 text-slate-900 font-bold placeholder:text-slate-400"
                />
              </div>
              <div className="lg:col-span-6 xl:col-span-3">
                <Input
                  placeholder="Scan ISBN Barcode..."
                  value={scanIsbn}
                  onChange={(e) => setScanIsbn(e.target.value)}
                  className="h-10 bg-white border-slate-300 text-slate-900 font-bold placeholder:text-slate-400"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScanSubmit(); } }}
                />
              </div>
              <div className="lg:col-span-6 xl:col-span-2">
                <Select value={genreFilter} onValueChange={setGenreFilter}>
                  <SelectTrigger className="h-10 bg-white border-slate-300 text-slate-900 font-black text-xs uppercase tracking-widest shadow-none">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900 max-h-60">
                    <SelectItem value="All Genres">All Genres</SelectItem>
                    {genres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-12 xl:col-span-2">
                <Button
                  variant="outline"
                  className={`w-full font-black uppercase text-xs tracking-wider border transition-all h-10 ${availableOnlyFilter ? 'bg-blue-600 border-blue-600 text-white shadow-none' : 'bg-white border border-slate-200 text-slate-600 hover:bg-white transiton-all'}`}
                  onClick={() => setAvailableOnlyFilter(!availableOnlyFilter)}
                >
                  {availableOnlyFilter ? 'Showing Available' : 'Show Available Only'}
                </Button>
              </div>
            </div>
            {selectedIds.size > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                <Button
                  className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest h-10 px-6 shadow-none shadow-none"
                  onClick={() => handleBulkDelete(Array.from(selectedIds))}
                >
                  Delete Selected ({selectedIds.size})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Books */}
        <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 font-bold text-lg tracking-tight">Available Books</CardTitle>
                <CardDescription className="text-slate-400 text-[10px] font-medium mt-1">Books allowed for borrowing</CardDescription>
              </div>
              <Layers className="h-4 w-4 text-slate-200" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-white">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-12 text-center text-slate-600 font-extrabold uppercase text-xs tracking-wider">#</TableHead>
                  <TableHead className="text-slate-600 font-extrabold uppercase text-xs tracking-wider">Book Name</TableHead>
                  <TableHead className="text-slate-600 font-extrabold uppercase text-xs tracking-wider">Author</TableHead>
                  <TableHead className="text-slate-600 font-extrabold uppercase text-xs tracking-wider">Classification</TableHead>
                  <TableHead className="text-slate-600 font-extrabold uppercase text-xs tracking-wider text-center">In Stock</TableHead>
                  <TableHead className="text-slate-600 font-extrabold uppercase text-xs tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {circulatingBooks.map((book) => (
                  <TableRow key={book.id} className="border-slate-100 hover:bg-white transition-colors group">
                    <TableCell className="text-center">
                      <Checkbox
                        className="border-slate-300 data-[state=checked]:bg-blue-600"
                        checked={isSelected(book.id)}
                        onCheckedChange={(val) => toggleSelect(book.id, !!val)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-2">
                          {book.title}
                          {book.isNew && <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" title="New Arrival" />}
                        </span>
                        <span className="text-xs text-slate-500 font-bold mt-1 tracking-tight">ISBN: {book.isbn}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-medium">{getAuthorNames(book.authorIds || [])}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] font-black uppercase tracking-tight px-2 py-0.5 shadow-none">{book.genre}</Badge>
                        {book.category === "Non-Fiction" && book.deweyDecimal && (
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-black uppercase tracking-tight px-2 py-0.5 shadow-none">DDC {book.deweyDecimal}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-xs font-black text-slate-600 uppercase tracking-widest bg-white px-2 py-1 rounded-md inline-block border border-slate-200 shadow-none transition-all hover:border-blue-300">
                        <span className={book.availableCopies > 0 ? "text-emerald-600" : "text-rose-600"}>{book.availableCopies}</span>
                        <span className="mx-1 text-slate-300">/</span>
                        <span>{book.totalCopies}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-white hover:bg-blue-500 border border-slate-100" onClick={() => openViewDialog(book)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-500 hover:text-white hover:bg-sky-500 border border-slate-100" onClick={() => openEditDialog(book)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-slate-100" onClick={() => handleDeleteBook(book.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {circulatingBooks.length === 0 && (
              <div className="text-center py-12 text-slate-300 font-bold uppercase text-xs tracking-widest italic">Inventory list empty</div>
            )}
          </CardContent>
        </Card>

        {/* Reference Books */}
        <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Reference Books</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold mt-1">In-house lookup only</CardDescription>
              </div>
              <ShieldCheck className="h-5 w-5 text-rose-300" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-white">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-12 text-center text-slate-600 font-extrabold uppercase text-xs tracking-wider">#</TableHead>
                  <TableHead className="text-slate-600 font-extrabold uppercase text-xs tracking-wider">Book Title</TableHead>
                  <TableHead className="text-slate-600 font-extrabold uppercase text-xs tracking-wider">Authors</TableHead>
                  <TableHead className="text-slate-600 font-extrabold uppercase text-xs tracking-wider">Classification</TableHead>
                  <TableHead className="text-slate-600 font-extrabold uppercase text-xs tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referenceBooks.map((book) => (
                  <TableRow key={book.id} className="border-slate-100 hover:bg-white border hover:border-blue-100 transition-colors group">
                    <TableCell className="text-center text-xs font-black text-slate-400">
                      {referenceBooks.indexOf(book) + 1}.
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 text-sm leading-tight tracking-tight">{book.title}</span>
                        <span className="text-xs text-slate-500 font-bold mt-1">ISBN: {book.isbn}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-bold">{getAuthorNames(book.authorIds || [])}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px] font-black uppercase px-2 py-0.5 shadow-none">{book.genre}</Badge>
                        {book.deweyDecimal && <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[10px] font-black uppercase px-2 py-0.5 shadow-none">DDC {book.deweyDecimal}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-white border hover:border-blue-200 transition-colors" onClick={() => openViewDialog(book)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-900 hover:bg-white border hover:border-blue-200 transition-colors" onClick={() => openEditDialog(book)}><Edit className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {referenceBooks.length === 0 && (
              <div className="text-center py-8 text-slate-300 font-bold uppercase text-[10px] tracking-widest italic leading-relaxed">No reference assets logged</div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>

      {/* View/Edit Dialogs (Overlaid) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-white border border-slate-200 text-slate-900 custom-scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-xl tracking-tight">Edit Book Details</DialogTitle>
            <DialogDescription className="text-slate-400 text-[10px] font-medium mt-1">Update book information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditBook} className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-isbn" className="text-xs font-bold text-slate-500 uppercase">ISBN</Label>
                <Input id="edit-isbn" value={formData.isbn} onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-xs font-bold text-slate-500 uppercase">Title</Label>
                <Input id="edit-title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Author(s)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.authorIds.map((id) => {
                  const a = authors.find(x => x.id === id)
                  return (
                    <Badge key={id} className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 text-xs font-black uppercase shadow-none">
                      {a ? getAuthorNames([id]) : 'Unknown'}
                      <X className="h-3.5 w-3.5 ml-2 cursor-pointer hover:text-slate-900" onClick={() => removeAuthor(id)} />
                    </Badge>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <Input value={authorQuery} onChange={(e) => setAuthorQuery(e.target.value)} placeholder="Type author name..." className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAuthorByName(authorQuery); } }} />
                <Button type="button" size="sm" onClick={() => addAuthorByName(authorQuery)} className="bg-blue-600 hover:bg-blue-500 text-white">Add</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Year</Label>
                <Input type="number" value={formData.publishedYear} onChange={(e) => setFormData({ ...formData, publishedYear: Number(e.target.value) })} className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Total Copies</Label>
                <Input type="number" value={formData.totalCopies} onChange={(e) => setFormData({ ...formData, totalCopies: Number(e.target.value) })} className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Publisher</Label>
                <Input value={formData.publisher} onChange={(e) => setFormData({ ...formData, publisher: e.target.value })} className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300" />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="text-slate-500 hover:bg-white uppercase text-[10px] font-bold">Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-[10px] tracking-widest px-8">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-xl bg-white border border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-xl tracking-tight">Book Details</DialogTitle>
          </DialogHeader>
          {viewingBook && (
            <div className="space-y-6 pt-4">
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-none transition-all hover:border-blue-200">
                <p className="text-xs font-black uppercase text-blue-600 tracking-wider mb-2">Title</p>
                <p className="text-2xl font-black leading-tight text-slate-900">{viewingBook.title}</p>
                {viewingBook.isNew && <Badge className="mt-3 bg-blue-100 text-blue-700 text-xs h-6 font-black uppercase px-3 shadow-none">Registered: New Arrival</Badge>}
                <div className="grid grid-cols-2 gap-8 mt-6">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">ISBN</p>
                    <p className="font-mono text-base font-extrabold text-slate-700">{viewingBook.isbn}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Author</p>
                    <p className="text-base font-extrabold text-slate-700">{getAuthorNames(viewingBook.authorIds || [])}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-6">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Category</p>
                    <p className="text-base font-extrabold text-slate-700">{viewingBook.genre} / {viewingBook.category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">Publisher</p>
                    <p className="text-base font-extrabold text-slate-700">{viewingBook.publisher} ({viewingBook.publishedYear})</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-none">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Stock Status</p>
                    <p className="text-3xl font-black mt-1 text-slate-900">
                      {viewingBook.availableCopies} <span className="text-sm font-extrabold text-slate-400 ml-1">/ {viewingBook.totalCopies} IN STOCK</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Status</p>
                    <p className={`text-sm font-black uppercase mt-1 px-3 py-1 rounded-full ${viewingBook.isReference ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      {viewingBook.isReference ? 'Reference Only' : 'Can Borrow'}
                    </p>
                  </div>
                </div>
              </div>

              {viewingBook.description && (
                <div className="space-y-2 px-1">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Description</p>
                  <p className="text-sm leading-relaxed text-slate-600 font-semibold whitespace-pre-wrap">{viewingBook.description}</p>
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button onClick={() => setIsViewDialogOpen(false)} className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-widest h-11 px-8 rounded-xl shadow-none transition-transform hover:scale-[1.02]">Close Record</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function BooksPage() {
  return (
    <ProtectedRoute>
      <BooksPageContent />
    </ProtectedRoute>
  )
}
