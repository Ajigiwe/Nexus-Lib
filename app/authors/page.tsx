"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import {
  Users,
  User,
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar,
  Download,
  UploadCloud,
  BookOpen,
  Globe,
  Mail,
  ExternalLink,
  Filter,
  UserPlus
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import type { Author, AuthorSearchFilters } from "@/lib/types"
import { authorService, bookService } from "@/lib/database"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Sidebar } from "@/components/sidebar"

function AuthorsPageContent() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [filteredAuthors, setFilteredAuthors] = useState<Author[]>([])
  const [searchFilters, setSearchFilters] = useState<AuthorSearchFilters>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    biography: "",
    birthDate: "",
    nationality: "",
    website: "",
    email: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadAuthors()
  }, [])

  useEffect(() => {
    handleSearch()
  }, [authors, searchFilters])

  const loadAuthors = () => {
    const allAuthors = authorService.getAll()
    setAuthors(allAuthors)
  }

  const handleSearch = () => {
    const results = authorService.search(searchFilters)
    setFilteredAuthors(results)
    setSelectedIds((prev) => new Set(Array.from(prev).filter((id) => results.some((a) => a.id === id))))
  }

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      biography: "",
      birthDate: "",
      nationality: "",
      website: "",
      email: "",
    })
  }

  const handleAdd = () => {
    try {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast({
          title: "Required Fields",
          description: "Author's name cannot be empty.",
          variant: "destructive",
        })
        return
      }

      authorService.create(formData)
      loadAuthors()
      setIsAddDialogOpen(false)
      resetForm()
      toast({ title: "Author added", description: "Standard database record created." })
    } catch (error) {
      toast({ title: "Operation failed", variant: "destructive" })
    }
  }

  const handleEdit = () => {
    if (!selectedAuthor) return
    try {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast({ title: "Name required", variant: "destructive" })
        return
      }
      authorService.update(selectedAuthor.id, formData)
      loadAuthors()
      setIsEditDialogOpen(false)
      setSelectedAuthor(null)
      resetForm()
      toast({ title: "Record updated" })
    } catch (error) {
      toast({ title: "Update failed", variant: "destructive" })
    }
  }

  const handleDelete = (author: Author) => {
    if (confirm(`Permanently remove ${author.firstName} ${author.lastName}?`)) {
      try {
        authorService.delete(author.id)
        loadAuthors()
        toast({ title: "Author removed" })
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Linked records prevent deletion.", variant: "destructive" })
      }
    }
  }

  const toggleSelect = (id: string, checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const allVisibleIds = filteredAuthors.map((a) => a.id)
  const visibleSelectedCount = allVisibleIds.filter((id) => selectedIds.has(id)).length
  const allVisibleSelected = filteredAuthors.length > 0 && visibleSelectedCount === filteredAuthors.length
  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected

  const toggleSelectAllVisible = (checked: boolean | "indeterminate") => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) allVisibleIds.forEach((id) => next.add(id))
      else allVisibleIds.forEach((id) => next.delete(id))
      return next
    })
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Remove ${selectedIds.size} selected author(s)? Items with active book links will be skipped.`)) return

    let success = 0
    const selectedList = Array.from(selectedIds)
    for (const id of selectedList) {
      try {
        authorService.delete(id)
        success++
      } catch (e: any) { }
    }
    if (success > 0) toast({ title: "Success", description: `Cleaned ${success} records.` })
    loadAuthors()
    setSelectedIds(new Set())
  }

  const openEditDialog = (author: Author) => {
    setSelectedAuthor(author)
    setFormData({
      firstName: author.firstName,
      lastName: author.lastName,
      biography: author.biography || "",
      birthDate: author.birthDate || "",
      nationality: author.nationality || "",
      website: author.website || "",
      email: author.email || "",
    })
    setIsEditDialogOpen(true)
  }

  const getAuthorBookCount = (authorId: string) => {
    return bookService.getAll().filter((book) => book.authorIds?.includes(authorId)).length
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Authors Master</h1>
                <p className="text-xs text-blue-600 font-extrabold tracking-wider">Literary database</p>
              </div>
              <div className="mx-4 h-6 w-px bg-white"></div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                  <ArrowLeft className="h-4 w-4 mr-2 text-blue-600" /> Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/import?tab=authors">
                <Button variant="ghost" size="sm" className="border border-slate-200 text-slate-600 hover:bg-white font-bold text-[10px] uppercase tracking-wider">
                  <UploadCloud className="h-4 w-4 mr-2 text-sky-600" /> Import
                </Button>
              </Link>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest h-10 px-6 shadow-none shadow-none">
                    <UserPlus className="h-5 w-5 mr-2" /> Add Author
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-900">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900 font-bold text-xl tracking-tight">Add Author</DialogTitle>
                    <DialogDescription className="text-slate-400 text-[10px] font-medium mt-1">Enter author details below.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-xs font-bold text-slate-500 uppercase">First Name</Label>
                        <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="John" className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-xs font-bold text-slate-500 uppercase">Last Name</Label>
                        <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Doe" className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nationality" className="text-xs font-bold text-slate-500 uppercase">Nationality</Label>
                        <Input id="nationality" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} placeholder="Global" className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="birthDate" className="text-xs font-bold text-slate-500 uppercase">Birth Date</Label>
                        <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase">Contact Email</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="author@domain.com" className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-xs font-bold text-slate-500 uppercase">Profile URL</Label>
                      <Input id="website" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="biography" className="text-xs font-bold text-slate-500 uppercase">Brief Bio</Label>
                      <Textarea id="biography" value={formData.biography} onChange={(e) => setFormData({ ...formData, biography: e.target.value })} className="bg-white border-slate-200 text-slate-900 resize-none shadow-none transition-all hover:border-blue-300" rows={3} />
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-slate-500 hover:bg-white border hover:border-blue-200 transition-colors uppercase text-[10px] font-bold">Cancel</Button>
                    <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-[10px] tracking-widest px-8">Add Author</Button>
                  </DialogFooter>
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
            { label: "Total Authors", val: authors.length, icon: Users, bg: "bg-blue-500", darkBg: "bg-blue-600" },
            { label: "Nationalities", val: new Set(authors.map(a => a.nationality).filter(Boolean)).size, icon: Globe, bg: "bg-emerald-500", darkBg: "bg-emerald-600" },
            { label: "Total Books", val: bookService.getAll().length, icon: BookOpen, bg: "bg-amber-400", darkBg: "bg-amber-500", textClass: "text-slate-900" },
            { label: "Active", val: authors.length, icon: User, bg: "bg-red-500", darkBg: "bg-red-600" }
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

        {/* Filters */}
        <Card className="bg-white border border-slate-200 shadow-none">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Filters</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold mt-1">Search and filter authors</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input
                  placeholder="Filter by author name..."
                  value={searchFilters.name || ""}
                  onChange={(e) => setSearchFilters({ ...searchFilters, name: e.target.value })}
                  className="pl-10 bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                />
              </div>
              <div className="md:col-span-4">
                <Input
                  placeholder="Filter by nationality..."
                  value={searchFilters.nationality || ""}
                  onChange={(e) => setSearchFilters({ ...searchFilters, nationality: e.target.value })}
                  className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  type="number"
                  placeholder="Birth Year..."
                  value={searchFilters.birthYear || ""}
                  onChange={(e) => setSearchFilters({ ...searchFilters, birthYear: e.target.value ? Number(e.target.value) : undefined })}
                  className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                />
              </div>
              <div className="md:col-span-1">
                <Button variant="ghost" onClick={() => setSearchFilters({})} className="w-full text-slate-400 hover:text-slate-900 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authors Master List */}
        <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Author List</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold mt-1">Author profiles: {filteredAuthors.length} records found</CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-500/20 font-black text-[10px] uppercase tracking-widest px-4 h-8"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-3 w-3 mr-2" /> Delete {selectedIds.size}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-white">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      className="border-slate-300 data-[state=checked]:bg-blue-600"
                      checked={allVisibleSelected}
                      onCheckedChange={(v) => toggleSelectAllVisible(Boolean(v))}
                    />
                  </TableHead>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider">Identity</TableHead>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider text-center">Biography</TableHead>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider text-center">Books</TableHead>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider">Contact</TableHead>
                  <TableHead className="text-slate-500 font-bold text-[10px] tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuthors.map((author) => (
                  <TableRow key={author.id} className="border-slate-100 hover:bg-white transition-colors group">
                    <TableCell className="text-center">
                      <Checkbox
                        className="border-slate-300 data-[state=checked]:bg-blue-600"
                        checked={selectedIds.has(author.id)}
                        onCheckedChange={(v) => toggleSelect(author.id, Boolean(v))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-900 text-sm leading-tight tracking-tight uppercase">{author.firstName} {author.lastName}</span>
                        <span className="text-xs text-slate-500 font-bold mt-1 truncate max-w-[200px]">{author.biography || 'No bio available'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        {author.nationality && <Badge className="bg-white border border-slate-200 shadow-none px-2 py-0.5 text-[9px] font-black uppercase">{author.nationality}</Badge>}
                        <span className="text-[10px] text-slate-500 font-bold tracking-tight">{author.birthDate ? new Date(author.birthDate).getFullYear() : 'Birth: N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-blue-600 font-black text-xs">
                        <BookOpen className="h-3 w-3 opacity-50" />
                        {getAuthorBookCount(author.id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        {author.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                            <Mail className="h-3.5 w-3.5 text-blue-500" /> {author.email}
                          </div>
                        )}
                        {author.website && (
                          <a href={author.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-black text-sky-700 hover:text-sky-600 transition-colors group/link bg-sky-50 px-2 py-1 rounded-md border border-sky-100 shadow-none w-fit">
                            <Globe className="h-3.5 w-3.5" /> Profile <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                          </a>
                        )}
                        {!author.email && !author.website && <span className="text-xs text-slate-300 uppercase font-black tracking-widest">No contact info</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-sky-600 hover:text-white hover:bg-sky-600 border border-slate-100" onClick={() => openEditDialog(author)} title="Edit Author">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-slate-100" onClick={() => handleDelete(author)} title="Delete Author">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredAuthors.length === 0 && (
              <div className="text-center py-12 text-slate-200 font-bold uppercase text-xs tracking-widest italic">No matching author data in repository</div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 font-bold text-xl tracking-tight">Edit Author</DialogTitle>
            <DialogDescription className="text-slate-400 text-[10px] font-medium mt-1">Update author details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">First Name</Label>
                <Input id="editFirstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Name</Label>
                <Input id="editLastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editNationality" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nationality</Label>
                <Input id="editNationality" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editBirthDate" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Birth Date</Label>
                <Input id="editBirthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email Address</Label>
              <Input id="editEmail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editWebsite" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Website Link</Label>
              <Input id="editWebsite" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="bg-white border-slate-200 text-slate-900 shadow-none transition-all hover:border-blue-300" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editBiography" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Author Biography</Label>
              <Textarea id="editBiography" value={formData.biography} onChange={(e) => setFormData({ ...formData, biography: e.target.value })} className="bg-white border-slate-200 text-slate-900 resize-none shadow-none transition-all hover:border-blue-300" rows={3} />
            </div>
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="text-slate-500 hover:bg-white border hover:border-blue-100 transition-colors shadow-none text-[10px] font-bold">Discard Changes</Button>
            <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] tracking-widest px-8 h-10 shadow-none shadow-none">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AuthorsPage() {
  return (
    <ProtectedRoute>
      <AuthorsPageContent />
    </ProtectedRoute>
  )
}
