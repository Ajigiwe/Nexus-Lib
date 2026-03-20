"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Users, Plus, Search, Edit, Trash2, ArrowLeft, Calendar, Phone, Printer, UploadCloud, BookOpen, UserPlus, Filter, X } from "lucide-react"
import { db } from "@/lib/database"
import type { Member } from "@/lib/types"
import Link from "next/link"
import Image from "next/image"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PhotoCapture } from "@/components/photo-capture"
import { toast } from "@/components/ui/use-toast"

function MembersPageContent() {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Status")
  const [genderFilter, setGenderFilter] = useState<"All Genders" | "Male" | "Female" | "Other" | "Unspecified">(
    "All Genders",
  )
  const [joinFrom, setJoinFrom] = useState<string>("") // YYYY-MM-DD
  const [joinTo, setJoinTo] = useState<string>("") // YYYY-MM-DD
  const [sortKey, setSortKey] = useState<
    | "name_asc"
    | "name_desc"
    | "expiry_asc"
    | "expiry_desc"
    | "status_asc"
    | "status_desc"
    | "gender_asc"
    | "gender_desc"
  >("name_asc")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())

  // Helper: compute expiry date 3 months from the given join date (YYYY-MM-DD)
  const computeExpiry = (joinDateStr: string): string => {
    const d = new Date(joinDateStr)
    if (isNaN(d.getTime())) return ""
    const e = new Date(d)
    e.setMonth(e.getMonth() + 3)
    return e.toISOString().split("T")[0]
  }

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    gender: "" as "Male" | "Female" | "Other" | "",
    joinDate: new Date().toISOString().split("T")[0],
    expiryDate: computeExpiry(new Date().toISOString().split("T")[0]),
    isActive: true,
    maxBooksAllowed: 2,
    photoUrl: "",
  })

  useEffect(() => {
    loadMembers()
  }, [])

  useEffect(() => {
    setFormData((prev) => ({ ...prev, expiryDate: computeExpiry(prev.joinDate) }))
  }, [formData.joinDate])

  useEffect(() => {
    const filtered = members.filter((member) => {
      const matchesQuery =
        !searchQuery ||
        member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.membershipId.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === "All Status" ||
        (statusFilter === "Active" && member.isActive) ||
        (statusFilter === "Inactive" && !member.isActive) ||
        (statusFilter === "Expired" && new Date(member.expiryDate) < new Date())

      const g = (member.gender || "Unspecified") as "Male" | "Female" | "Other" | "Unspecified"
      const matchesGender = genderFilter === "All Genders" || g === genderFilter

      const jd = member.joinDate
      const matchesFrom = !joinFrom || jd >= joinFrom
      const matchesTo = !joinTo || jd <= joinTo

      return matchesQuery && matchesStatus && matchesGender && matchesFrom && matchesTo
    })

    const sorted = [...filtered].sort((a, b) => {
      const na = `${a.firstName} ${a.lastName}`.toLowerCase()
      const nb = `${b.firstName} ${b.lastName}`.toLowerCase()
      const ea = new Date(a.expiryDate).getTime()
      const eb = new Date(b.expiryDate).getTime()
      const sa = a.isActive ? 1 : 0
      const sb = b.isActive ? 1 : 0
      const ga = (a.gender || "").toString()
      const gb = (b.gender || "").toString()
      switch (sortKey) {
        case "name_desc":
          return nb.localeCompare(na)
        case "expiry_asc":
          return ea - eb
        case "expiry_desc":
          return eb - ea
        case "status_asc":
          return sa - sb
        case "status_desc":
          return sb - sa
        case "gender_asc":
          return ga.localeCompare(gb)
        case "gender_desc":
          return gb.localeCompare(ga)
        case "name_asc":
        default:
          return na.localeCompare(nb)
      }
    })

    setFilteredMembers(sorted)
  }, [members, searchQuery, statusFilter, genderFilter, joinFrom, joinTo, sortKey])

  const loadMembers = () => {
    const allMembers = db.getAllMembers()

    const needsBackfill = allMembers.some((m) => !m.gender)
    if (needsBackfill) {
      allMembers.forEach((m) => {
        if (!m.gender) {
          db.updateMember(m.id, { gender: "Unspecified" as any })
        }
      })
    }

    const today = new Date()
    allMembers.forEach((m) => {
      const expired = new Date(m.expiryDate) < today
      if (expired && m.isActive) {
        db.updateMember(m.id, { isActive: false })
      }
    })

    const fresh = needsBackfill ? db.getAllMembers() : allMembers
    setMembers(fresh)
  }

  const isMemberSelected = (id: string) => selectedMemberIds.has(id)
  const toggleSelectMember = (id: string, checked: boolean) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }
  const toggleSelectAllMembers = (list: Member[], checked: boolean) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (checked) list.forEach((m) => next.add(m.id))
      else list.forEach((m) => next.delete(m.id))
      return next
    })
  }

  const handleBulkDeleteMembers = (ids: string[]) => {
    if (ids.length === 0) return
    const deletable: string[] = []
    const blocked: string[] = []
    ids.forEach((id) => {
      const m = db.getMemberById(id)
      if (m && (m.currentBooksCount || 0) > 0) blocked.push(id)
      else deletable.push(id)
    })

    if (deletable.length === 0) {
      toast({ title: "Action denied", description: "Selected members have active book loans.", variant: "destructive" })
      return
    }

    if (!confirm(`Permanently delete ${deletable.length} member(s)?`)) return

    deletable.forEach((id) => db.deleteMember(id))
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      deletable.forEach((id) => next.delete(id))
      return next
    })
    loadMembers()

    if (blocked.length > 0) {
      toast({ title: "Bulk delete partial", description: `${blocked.length} members skipped due to active loans.` })
    } else {
      toast({ title: "Bulk delete successful", description: `${deletable.length} members removed.` })
    }
  }

  const resetForm = () => {
    const joinDate = new Date()
    const expiryDate = new Date(joinDate)
    expiryDate.setMonth(expiryDate.getMonth() + 3)

    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      address: "",
      gender: "",
      joinDate: joinDate.toISOString().split("T")[0],
      expiryDate: expiryDate.toISOString().split("T")[0],
      isActive: true,
      maxBooksAllowed: 2,
      photoUrl: "",
    })
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()

    const join = new Date(formData.joinDate)
    const exp = new Date(join)
    exp.setMonth(exp.getMonth() + 3)

    const newMember = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      address: formData.address,
      gender: formData.gender as "Male" | "Female" | "Other" | "Unspecified",
      membershipType: "patron" as const,
      joinDate: formData.joinDate,
      expiryDate: exp.toISOString().split("T")[0],
      isActive: true,
      maxBooksAllowed: formData.maxBooksAllowed,
      currentBooksCount: 0,
      photoUrl: formData.photoUrl || undefined,
    }

    const newMemberAdded = db.addMember(newMember)

    loadMembers()
    setIsAddDialogOpen(false)
    resetForm()
    toast({ title: "Patron added", description: `${newMember.firstName} ${newMember.lastName} registered successfully.` })

    if (typeof window !== "undefined") {
      window.open(`/members/${newMemberAdded.id}/card`, "_blank")
    }
  }

  const handleEditMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    if (!formData.gender) {
      toast({ title: "Missing field", description: "Please select a gender.", variant: "destructive" })
      return
    }

    const updatedMember = db.updateMember(editingMember.id, {
      ...formData,
      gender: formData.gender as any,
    })

    if (updatedMember) {
      loadMembers()
      setIsEditDialogOpen(false)
      setEditingMember(null)
      resetForm()
      toast({ title: "Patron updated", description: "Changes saved successfully." })
    }
  }

  const handleDeleteMember = (memberId: string) => {
    const member = db.getMemberById(memberId)
    if (!member) return

    if (member.currentBooksCount > 0) {
      toast({ title: "Action denied", description: "Member has active book loans.", variant: "destructive" })
      return
    }

    if (confirm("Permanently delete this member?")) {
      db.deleteMember(memberId)
      loadMembers()
      toast({ title: "Patron removed" })
    }
  }

  const toggleMemberStatus = (memberId: string) => {
    const member = db.getMemberById(memberId)
    if (!member) return

    if (member.currentBooksCount > 0 && member.isActive) {
      toast({ title: "Action denied", description: "Member has active book loans.", variant: "destructive" })
      return
    }

    db.updateMember(memberId, { isActive: !member.isActive })
    loadMembers()
    toast({ title: "Status updated", description: `${member.firstName}'s account is now ${!member.isActive ? 'Active' : 'Inactive'}.` })
  }

  const openEditDialog = (member: Member) => {
    setEditingMember(member)
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      phone: member.phone,
      address: member.address,
      gender: (member.gender as any) || "",
      joinDate: member.joinDate,
      expiryDate: computeExpiry(member.joinDate),
      isActive: member.isActive,
      maxBooksAllowed: member.maxBooksAllowed,
      photoUrl: member.photoUrl || "",
    })
    setIsEditDialogOpen(true)
  }

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date()
  }

  const renewMembership = (memberId: string) => {
    const member = db.getMemberById(memberId)
    if (!member) return
    const today = new Date()
    const newExpiry = new Date(today)
    newExpiry.setMonth(newExpiry.getMonth() + 3)
    db.updateMember(memberId, {
      expiryDate: newExpiry.toISOString().split("T")[0],
      isActive: true,
      renewalCount: (member as any).renewalCount ? (member as any).renewalCount + 1 : 1,
    })
    loadMembers()
    toast({ title: "Membership renewed", description: "Date extended by 3 months." })
  }

  const totalActive = useMemo(() => members.filter((m) => m.isActive).length, [members])
  const totalExpired = useMemo(() => members.filter((m) => new Date(m.expiryDate) < new Date()).length, [members])
  const totalMale = useMemo(() => members.filter((m) => (m.gender || "Unspecified") === "Male").length, [members])
  const totalFemale = useMemo(() => members.filter((m) => (m.gender || "Unspecified") === "Female").length, [members])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Members</h1>
                <p className="text-xs text-blue-600 font-extrabold tracking-wider">Library Patrons</p>
              </div>
              <div className="mx-4 h-6 w-px bg-white"></div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                  <ArrowLeft className="h-4 w-4 mr-2 text-blue-600" /> Back
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/import?tab=members">
                <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-white font-extrabold text-xs uppercase tracking-wider h-9">
                  <UploadCloud className="h-4 w-4 mr-2 text-sky-600" /> Import
                </Button>
              </Link>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest h-10 px-6 shadow-none shadow-none">
                    <Plus className="h-5 w-5 mr-2" /> Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white border border-slate-200 text-slate-900">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900 font-bold text-xl tracking-tight">Add Member</DialogTitle>
                    <DialogDescription className="text-slate-400 text-[10px] font-medium mt-1">Enter member details below.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddMember} className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-xs font-bold text-slate-600 uppercase">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="John"
                          className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-xs font-bold text-slate-600 uppercase">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Doe"
                          className="bg-white border-slate-200 text-slate-900"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-bold text-slate-600 uppercase">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="555-0123"
                          className="bg-white border-slate-200 text-slate-900"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender" className="text-xs font-bold text-slate-600 uppercase">Gender</Label>
                        <Select
                          value={(formData.gender as any) || undefined}
                          onValueChange={(v) => setFormData({ ...formData, gender: (v as any) || "" })}
                        >
                          <SelectTrigger id="gender" className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 text-slate-900">
                            <SelectItem value="Unspecified">Unspecified</SelectItem>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-xs font-bold text-slate-600 uppercase">Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Main St, City, State"
                        rows={2}
                        className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300 resize-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="joinDate" className="text-xs font-bold text-slate-600 uppercase">Join Date</Label>
                        <Input
                          id="joinDate"
                          type="date"
                          value={formData.joinDate}
                          onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                          className="bg-white border-slate-200 text-slate-900"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate" className="text-xs font-bold text-slate-300 uppercase tracking-widest">Expiry Date (Auto)</Label>
                        <Input
                          id="expiryDate"
                          type="date"
                          value={formData.expiryDate}
                          className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 bg-white">
                      <PhotoCapture
                        onPhotoCapture={(photoUrl) => setFormData({ ...formData, photoUrl })}
                        currentPhoto={formData.photoUrl}
                        onClear={() => setFormData({ ...formData, photoUrl: "" })}
                      />
                    </div>

                    <DialogFooter className="gap-2 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-slate-600 hover:bg-white font-extrabold uppercase text-xs">
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-widest px-10 h-10 shadow-none shadow-none">Add Member</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <DashboardLayout>
        {/* Statistics Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Members", val: totalActive, icon: Users, bg: "bg-emerald-500", darkBg: "bg-emerald-600" },
            { label: "Expired", val: totalExpired, icon: Calendar, bg: "bg-red-500", darkBg: "bg-red-600" },
            { label: "Male", val: totalMale, icon: Search, bg: "bg-blue-500", darkBg: "bg-blue-600" },
            { label: "Female", val: totalFemale, icon: Search, bg: "bg-indigo-500", darkBg: "bg-indigo-600" },
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

        {/* Filters */}
        <Card className="bg-white border border-slate-200 shadow-none">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="flex items-center gap-2 shrink-0 pr-4 lg:border-r border-slate-100">
                <Filter className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-slate-900 font-black text-sm tracking-tight">Filters</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full items-end">
                <div className="relative md:col-span-2 lg:col-span-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                  <Input
                    placeholder="Search name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 font-bold h-10 w-full"
                  />
                </div>
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest h-10 w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      <SelectItem value="All Status">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as any)}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest h-10 w-full">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      <SelectItem value="All Genders">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Unspecified">Unspecified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="join-from" className="text-[9px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">From Date</Label>
                  <Input id="join-from" type="date" value={joinFrom} onChange={(e) => setJoinFrom(e.target.value)} className="bg-white border-slate-300 text-slate-900 font-bold h-10 w-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="join-to" className="text-[9px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">To Date</Label>
                  <Input id="join-to" type="date" value={joinTo} onChange={(e) => setJoinTo(e.target.value)} className="bg-white border-slate-300 text-slate-900 font-bold h-10 w-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card className="bg-white border border-slate-200 shadow-none overflow-hidden">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 font-black text-xl tracking-tight">MemberList</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold mt-1">{filteredMembers.length} members found</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                  <SelectTrigger className="w-52 bg-white border-slate-200 shadow-none transition-all hover:border-blue-300 text-xs font-black uppercase tracking-widest h-10 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    <SelectItem value="name_asc">Name: A → Z</SelectItem>
                    <SelectItem value="name_desc">Name: Z → A</SelectItem>
                    <SelectItem value="expiry_asc">Expiry: Sooner</SelectItem>
                    <SelectItem value="expiry_desc">Expiry: Later</SelectItem>
                    <SelectItem value="status_desc">Active First</SelectItem>
                  </SelectContent>
                </Select>
                {selectedMemberIds.size > 0 && (
                  <Button
                    className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest h-10 px-6 shadow-none shadow-none"
                    onClick={() => handleBulkDeleteMembers(Array.from(selectedMemberIds))}
                  >
                    Delete ({selectedMemberIds.size})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-white">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      className="border-slate-200 shadow-none data-[state=checked]:bg-blue-600"
                      checked={filteredMembers.length > 0 && filteredMembers.every((m) => isMemberSelected(m.id))}
                      onCheckedChange={(val) => toggleSelectAllMembers(filteredMembers, !!val)}
                    />
                  </TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Member</TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Contact</TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Books</TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Status</TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Expiry</TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} className="border-slate-100 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                    <TableCell className="text-center">
                      <Checkbox
                        className="border-slate-200 shadow-none data-[state=checked]:bg-blue-600"
                        checked={isMemberSelected(member.id)}
                        onCheckedChange={(val) => toggleSelectMember(member.id, !!val)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-xs overflow-hidden">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            member.firstName[0] + member.lastName[0]
                          )}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm leading-tight tracking-tight">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wider uppercase">ID: {member.membershipId}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-bold">
                        <Phone className="h-3.5 w-3.5 text-blue-500" />
                        {member.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="bg-white border border-slate-200 shadow-none px-2.5 py-1 rounded-md text-[11px] font-black text-slate-600 shadow-none inline-block">
                        {member.currentBooksCount} / {member.maxBooksAllowed}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Badge className={`${member.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-slate-400 border-slate-200'} text-xs font-black uppercase px-2 shadow-none border`}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {isExpired(member.expiryDate) && (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-100 text-xs font-black uppercase px-2 shadow-none border">Expired</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <Calendar className="h-3 w-3 text-indigo-300" />
                        {new Date(member.expiryDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-white border hover:border-blue-100 transition-colors shadow-none"
                          title="Print Card"
                          onClick={() => typeof window !== "undefined" && window.open(`/members/${member.id}/card`, "_blank")}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-white border border-slate-200 shadow-none transition-all hover:border-blue-100"
                          onClick={() => openEditDialog(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMemberStatus(member.id)}
                          className={`text-[10px] font-bold h-8 px-3 border border-slate-200 shadow-none ${member.isActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          {member.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMember(member.id)}
                          className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 shadow-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredMembers.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex h-12 w-12 rounded-full bg-white items-center justify-center mb-4 border border-slate-100">
                  <Search className="h-6 w-6 text-slate-200" />
                </div>
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No matching patrons found.</p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Renewal Shortcuts */}
        <Card className="bg-rose-50 border border-rose-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-rose-900 font-bold text-lg tracking-tight flex items-center gap-2">
              <Calendar className="h-5 w-5 text-rose-600" />
              Renewals Needed
            </CardTitle>
            <CardDescription className="text-rose-500 text-[10px] font-medium mt-1">Memberships that need renewal</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-rose-100">
                <TableRow className="border-rose-200 hover:bg-transparent">
                  <TableHead className="text-rose-800 font-black uppercase text-[10px] tracking-wider">Member</TableHead>
                  <TableHead className="text-rose-800 font-black uppercase text-[10px] tracking-wider">Contact</TableHead>
                  <TableHead className="text-rose-800 font-black uppercase text-[10px] tracking-wider">Expired On</TableHead>
                  <TableHead className="text-rose-800 font-black uppercase text-[10px] tracking-wider text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.filter((m) => isExpired(m.expiryDate)).map((member) => (
                  <TableRow key={member.id} className="border-rose-100 hover:bg-white transition-colors group">
                    <TableCell>
                      <div className="font-black text-rose-950 text-sm leading-tight">{member.firstName} {member.lastName}</div>
                      <div className="text-[10px] font-black uppercase text-rose-500 tracking-widest mt-0.5">ID: {member.membershipId}</div>
                    </TableCell>
                    <TableCell className="text-rose-900 text-xs font-bold">{member.phone}</TableCell>
                    <TableCell className="text-rose-950 text-xs font-black uppercase">{new Date(member.expiryDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => renewMembership(member.id)}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-widest h-9 px-5 shadow-none shadow-rose-200"
                      >
                        Renew (+3m)
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {members.filter((m) => isExpired(m.expiryDate)).length === 0 && (
              <div className="text-center py-8 text-rose-400/20 font-black uppercase text-[10px] tracking-widest">All memberships are current.</div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-blue-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-black text-xl">Edit Patron Profile</DialogTitle>
            <DialogDescription className="text-white/50">Update personal or membership details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditMember} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName" className="text-xs font-bold text-white/70 uppercase">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName" className="text-xs font-bold text-white/70 uppercase">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-xs font-bold text-white/70 uppercase">Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gender" className="text-xs font-bold text-white/70 uppercase">Gender</Label>
                <Select
                  value={(formData.gender as any) || undefined}
                  onValueChange={(v) => setFormData({ ...formData, gender: (v as any) || "" })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-blue-950 border-white/10 text-white">
                    <SelectItem value="Unspecified">Unspecified</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address" className="text-xs font-bold text-white/70 uppercase">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="bg-white/5 border-white/10 text-white resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-joinDate" className="text-xs font-bold text-white/70 uppercase">Join Date</Label>
                <Input
                  id="edit-joinDate"
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expiryDate" className="text-xs font-bold text-white/70 uppercase tracking-widest opacity-40">Expiry Date (Auto)</Label>
                <Input
                  id="edit-expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  className="bg-white/5 border-white/10 text-white opacity-50 cursor-not-allowed"
                  readOnly
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <PhotoCapture
                onPhotoCapture={(photoUrl) => setFormData({ ...formData, photoUrl })}
                currentPhoto={formData.photoUrl}
                onClear={() => setFormData({ ...formData, photoUrl: "" })}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest px-8">Save Profile</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function MembersPage() {
  return (
    <ProtectedRoute>
      <MembersPageContent />
    </ProtectedRoute>
  )
}
