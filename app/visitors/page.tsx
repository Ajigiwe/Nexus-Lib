"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/components/protected-route"
import { memberService, visitorService } from "@/lib/database"
import type { Member, Visitor, ActiveVisit } from "@/lib/types"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, UserPlus, Trash2, Users, Calendar, Clock, TrendingUp, Download, BookOpen, QrCode, Edit2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import * as XLSX from "xlsx"
import { QRScanner } from "@/components/qr-scanner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DashboardLayout } from "@/components/dashboard-layout"

function VisitorsPageContent() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [activeVisits, setActiveVisits] = useState<ActiveVisit[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [sortKey, setSortKey] = useState<"date_desc" | "date_asc" | "name_asc" | "name_desc" | "gender_asc" | "gender_desc">("date_desc")

  // New filters
  const [nameSearch, setNameSearch] = useState<string>("")
  const [genderFilter, setGenderFilter] = useState<"All Genders" | "Male" | "Female" | "Other" | "Unspecified">(
    "All Genders",
  )
  const [dateFrom, setDateFrom] = useState<string>("") // YYYY-MM-DD
  const [dateTo, setDateTo] = useState<string>("") // YYYY-MM-DD

  type VisitorGroup = {
    key: string
    name: string
    contact: string
    memberId?: string
    gender: "Male" | "Female" | "Other" | "Unspecified"
    visitCount: number
    lastVisit: string
    visits: Visitor[]
  }

  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [linkedMemberId, setLinkedMemberId] = useState<string>("")
  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "Unspecified" | "">("")
  // Quick add by Membership ID / Barcode
  const [scanCode, setScanCode] = useState<string>("")
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  const [qrError, setQRError] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<VisitorGroup | null>(null)

  // Editing state
  const [editingVisitor, setEditingVisitor] = useState<{ id: string; name: string; contact: string; gender: "Male" | "Female" | "Other" | "Unspecified"; memberId?: string; isActive: boolean } | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = () => {
    try {
      const vs = visitorService as unknown as { getAll?: () => Visitor[]; getAllActive?: () => ActiveVisit[]; sweep?: () => number }
      const ms = memberService as unknown as { getAll?: () => Member[] }
      // Sweep expired active visits (>24h) before loading
      if (typeof vs?.sweep === "function") {
        const moved = vs.sweep()
        if (moved > 0) {
          // optional: notify quietly or ignore
        }
      }
      const v = typeof vs?.getAll === "function" ? vs.getAll() : []
      const a = typeof vs?.getAllActive === "function" ? vs.getAllActive() : []
      const m = typeof ms?.getAll === "function" ? ms.getAll() : []
      setVisitors(v)
      setActiveVisits(a)
      setMembers(m)
    } catch (err) {
      console.error("Failed to load visitors/members", err)
      toast({ title: "Load failed", description: "Could not load visitors or members.", variant: "destructive" })
    }
  }

  const memberOptions = useMemo(
    () => members.map((m) => ({ id: m.id, label: `${m.membershipId} - ${m.firstName} ${m.lastName}` })),
    [members],
  )

  const suggestions = useMemo(() => {
    const qName = name.trim().toLowerCase()
    const qContact = contact.trim().toLowerCase()
    if (!qName && !qContact) return { members: [] as Member[], visitors: [] as Visitor[] }

    // Search members
    const memberMatches = members.filter((m) => {
      const full = `${m.firstName} ${m.lastName}`.toLowerCase()
      const byName = qName ? full.includes(qName) || m.membershipId.toLowerCase().includes(qName) : false
      const byContact = qContact
        ? (m.phone || "").toLowerCase().includes(qContact)
        : false
      return byName || byContact
    })

    // Search past visitors (exclude duplicates with members)
    const visitorMatches = visitors.filter((v) => {
      const full = v.name.toLowerCase()
      const byName = qName ? full.includes(qName) : false
      const byContact = qContact ? (v.contact || "").toLowerCase().includes(qContact) : false

      // Exclude if this visitor is already linked to a member that's in memberMatches
      const isLinkedMember = v.memberId && memberMatches.some(m => m.id === v.memberId)

      return (byName || byContact) && !isLinkedMember
    })

    // Sort and limit results
    const sortedMembers = memberMatches
      .sort((a, b) => {
        const af = `${a.firstName} ${a.lastName}`.toLowerCase()
        const bf = `${b.firstName} ${b.lastName}`.toLowerCase()
        const ax = af === qName ? 0 : 1
        const bx = bf === qName ? 0 : 1
        return ax - bx
      })
      .slice(0, 3)

    const sortedVisitors = visitorMatches
      .sort((a, b) => {
        const ax = a.name.toLowerCase() === qName ? 0 : 1
        const bx = b.name.toLowerCase() === qName ? 0 : 1
        if (ax !== bx) return ax - bx
        // Sort by most recent visit date
        return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
      })
      .slice(0, 3)

    return { members: sortedMembers, visitors: sortedVisitors }
  }, [name, contact, members, visitors])

  const handleLinkMember = (m: Member) => {
    setLinkedMemberId(m.id)
    // Prefill name/contact from member for consistency
    setName(`${m.firstName} ${m.lastName}`)
    setContact(m.phone || contact)
    // Prefill gender from member (except Unspecified)
    if (m.gender && m.gender !== "Unspecified") {
      setGender(m.gender as "Male" | "Female" | "Other")
    }
  }

  const handleSelectPastVisitor = (v: Visitor) => {
    setName(v.name)
    setContact(v.contact || "")
    if (v.gender) {
      setGender(v.gender as "Male" | "Female" | "Other")
    }
    if (v.memberId) {
      setLinkedMemberId(v.memberId)
    }
  }

  const isAlreadyVisitedToday = (name: string, contact: string, memberId?: string) => {
    const today = new Date().toISOString().split("T")[0]

    // Check active visits
    const alreadyActive = activeVisits.some(v => {
      const isMemberMatch = memberId && v.memberId === memberId
      const isGuestMatch = !memberId && v.name.toLowerCase() === name.toLowerCase() && v.contact === contact
      return isMemberMatch || isGuestMatch
    })

    if (alreadyActive) return true

    // Check history
    return visitors.some(v => {
      const visitDate = v.visitDate.split("T")[0]
      if (visitDate !== today) return false

      const isMemberMatch = memberId && v.memberId === memberId
      const isGuestMatch = !memberId && v.name.toLowerCase() === name.toLowerCase() && v.contact === contact
      return isMemberMatch || isGuestMatch
    })
  }

  const startVisitForMember = (member: Member) => {
    try {
      if (isAlreadyVisitedToday(`${member.firstName} ${member.lastName}`, member.phone || "-", member.id)) {
        toast({
          title: "Already visited today",
          description: `${member.firstName} ${member.lastName} has already been recorded today.`,
          variant: "destructive"
        })
        setScanCode("")
        return
      }

      const startFn = (visitorService as unknown as { start?: (d: any) => ActiveVisit }).start
      if (typeof startFn === "function") {
        startFn({
          name: `${member.firstName} ${member.lastName}`,
          contact: member.phone || "-",
          gender: member.gender !== "Unspecified" ? (member.gender as any) : "",
          memberId: member.id,
        })
        toast({
          title: "Visit recorded",
          description: `${member.firstName} ${member.lastName} (${member.membershipId})`,
        })
        setScanCode("")
        load()
      }
    } catch (err) {
      console.error("Failed to start visit", err)
      toast({ title: "Add failed", description: "Could not start visit from ID.", variant: "destructive" })
    }
  }

  // Quick add: enter/scan Membership ID to start an active visit immediately
  const handleAddByIdOrBarcode = () => {
    const code = scanCode.trim()
    if (!code) {
      toast({ title: "Missing ID", description: "Enter or scan a membership ID.", variant: "destructive" })
      return
    }
    const member = members.find((m) => m.membershipId.toLowerCase() === code.toLowerCase())
    if (!member) {
      toast({ title: "Not found", description: `No member with ID ${code}.`, variant: "destructive" })
      return
    }
    startVisitForMember(member)
  }

  const handleQrScanSuccess = (raw: string) => {
    let code = raw.trim()

    // Try to parse as JSON first (new format)
    try {
      const parsed = JSON.parse(code)
      if (parsed && typeof parsed === "object") {
        if (parsed.membershipId) {
          code = parsed.membershipId
        } else if (parsed.id) {
          // Fallback to id if membershipId missing but it might be the internal ID
          const mById = members.find(m => m.id === parsed.id)
          if (mById) code = mById.membershipId
        }
      }
    } catch {
      // Not JSON, assume it's the raw membershipId (legacy format)
    }

    setIsQRDialogOpen(false)
    setQRError(null)

    if (!code) {
      toast({ title: "Invalid QR", description: "The scanned code was empty.", variant: "destructive" })
      return
    }

    const member = members.find((m) => m.membershipId.toLowerCase() === code.toLowerCase())
    if (!member) {
      toast({ title: "Not found", description: `No member with ID ${code}.`, variant: "destructive" })
      return
    }

    handleLinkMember(member)
    setScanCode(member.membershipId)
    startVisitForMember(member)
  }

  const handleQrScanError = (message: string) => {
    setQRError(message)
  }

  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      const g = (v.gender || "Unspecified") as "Male" | "Female" | "Other" | "Unspecified"
      const matchesGender = genderFilter === "All Genders" || g === genderFilter
      const d = v.visitDate.split("T")[0]
      const matchesFrom = !dateFrom || d >= dateFrom
      const matchesTo = !dateTo || d <= dateTo
      const matchesName = !nameSearch || v.name.toLowerCase().includes(nameSearch.toLowerCase())
      return matchesGender && matchesFrom && matchesTo && matchesName
    })
  }, [visitors, genderFilter, dateFrom, dateTo, nameSearch])

  const allVisitsByKey = useMemo(() => {
    const map = new Map<string, Visitor[]>()
    visitors.forEach((visit) => {
      const key = visit.memberId
        ? `member-${visit.memberId}`
        : `guest-${visit.name.toLowerCase()}|${(visit.contact || "").toLowerCase()}`
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(visit)
    })
    map.forEach((arr) => arr.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()))
    return map
  }, [visitors])

  const groupedVisitors = useMemo<VisitorGroup[]>(() => {
    const map = new Map<string, VisitorGroup>()
    filteredVisitors.forEach((visit) => {
      const key = visit.memberId ? `member-${visit.memberId}` : `guest-${visit.name.toLowerCase()}|${(visit.contact || "").toLowerCase()}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: visit.name,
          contact: visit.contact || "",
          memberId: visit.memberId,
          gender: (visit.gender as "Male" | "Female" | "Other" | "Unspecified") || "Unspecified",
          visitCount: 0,
          lastVisit: visit.visitDate,
          visits: [],
        })
      }
      const entry = map.get(key)!
      entry.visits.push(visit)
      entry.visitCount += 1
      if (new Date(visit.visitDate).getTime() > new Date(entry.lastVisit).getTime()) {
        entry.lastVisit = visit.visitDate
      }
      // Prefer gender if current visit has one
      if (visit.gender && visit.gender !== "Unspecified") {
        entry.gender = visit.gender as "Male" | "Female" | "Other" | "Unspecified"
      }
    })

    const arr = Array.from(map.values()).map((entry) => ({
      ...entry,
      visits: entry.visits.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()),
    }))

    return arr.sort((a, b) => {
      switch (sortKey) {
        case "date_asc":
          return new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()
        case "name_asc":
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        case "name_desc":
          return b.name.toLowerCase().localeCompare(a.name.toLowerCase())
        case "gender_asc":
          return (a.gender || "").localeCompare(b.gender || "")
        case "gender_desc":
          return (b.gender || "").localeCompare(a.gender || "")
        case "date_desc":
        default:
          return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime()
      }
    })
  }, [filteredVisitors, sortKey])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return; // Prevent double submission

    if (!name.trim() || !contact.trim() || !gender) {
      toast({ title: "Missing fields", description: "Please provide name, contact, and gender.", variant: "destructive" })
      return
    }

    if (isAlreadyVisitedToday(name.trim(), contact.trim(), linkedMemberId || undefined)) {
      toast({
        title: "Already visited today",
        description: `${name.trim()} has already been recorded today.`,
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      const startFn = (visitorService as unknown as { start?: (d: any) => ActiveVisit }).start
      if (typeof startFn === "function") {
        await new Promise(resolve => setTimeout(resolve, 0)) // Allow UI to update

        startFn({
          name: name.trim(),
          contact: contact.trim(),
          gender: gender,
          memberId: linkedMemberId || undefined,
        })

        toast({ title: "Active visit started", description: `${name.trim()} is now active.` })

        // Reset form state (keep gender for consecutive entries)
        setName("")
        setContact("")
        setLinkedMemberId("")
        // Don't reset gender - keep last selection for consecutive entries

        // Reload data in the next tick
        setTimeout(load, 0)
      }
    } catch (err) {
      console.error("Failed to add visit", err)
      toast({ title: "Add failed", description: "Could not record visit.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const [endingVisitId, setEndingVisitId] = useState<string | null>(null)

  const handleEndActive = async (id: string) => {
    if (endingVisitId === id) return; // Prevent double-click
    setEndingVisitId(id)
    try {
      const endFn = (visitorService as unknown as { end?: (id: string, endedAt?: string) => Visitor | null }).end
      if (typeof endFn === "function") {
        const moved = endFn(id)
        if (moved) toast({ title: "Visit ended", description: "Moved to visit history." })
      }
      await new Promise(resolve => setTimeout(resolve, 0)) // Allow UI to update
      load()
    } catch (err) {
      console.error("Failed to end active visit", err)
      toast({ title: "Action failed", description: "Could not end active visit.", variant: "destructive" })
    } finally {
      setEndingVisitId(null)
    }
  }

  const handleUpdateVisitor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVisitor) return

    try {
      if (editingVisitor.isActive) {
        const updateActiveFn = (visitorService as any).updateActive
        if (typeof updateActiveFn === "function") {
          updateActiveFn(editingVisitor.id, {
            name: editingVisitor.name,
            contact: editingVisitor.contact,
            gender: editingVisitor.gender,
            memberId: editingVisitor.memberId || undefined
          })
        }
      } else {
        const updateFn = (visitorService as any).update
        if (typeof updateFn === "function") {
          updateFn(editingVisitor.id, {
            name: editingVisitor.name,
            contact: editingVisitor.contact,
            gender: editingVisitor.gender,
            memberId: editingVisitor.memberId || undefined
          })
        }
      }

      toast({ title: "Visitor updated", description: "Changes saved successfully." })
      setIsEditDialogOpen(false)
      load()
    } catch (err) {
      console.error("Failed to update visitor", err)
      toast({ title: "Update failed", description: "Could not save changes.", variant: "destructive" })
    }
  }

  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null)

  const handleDeleteVisit = async (id: string) => {
    if (deletingVisitId === id) return; // Prevent double-click
    setDeletingVisitId(id)
    try {
      const delFn = (visitorService as unknown as { delete?: (id: string) => boolean }).delete
      if (typeof delFn === "function") {
        delFn(id)
        toast({ title: "Visit removed" })
      }
      await new Promise(resolve => setTimeout(resolve, 0)) // Allow UI to update
      load()
    } catch (err) {
      console.error("Failed to delete visit", err)
      toast({ title: "Delete failed", description: "Could not remove visit.", variant: "destructive" })
    } finally {
      setDeletingVisitId(null)
    }
  }

  const resolveMember = (memberId?: string) => {
    if (!memberId) return "-"
    const m = members.find((mm) => mm.id === memberId)
    return m ? `${m.membershipId} • ${m.firstName} ${m.lastName}` : "Unknown"
  }

  // Calculate visitor statistics
  const visitorStats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay()) // Start of this week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const todayVisits = visitors.filter(v => {
      const visitDate = new Date(v.visitDate)
      return visitDate >= today
    }).length

    const weekVisits = visitors.filter(v => {
      const visitDate = new Date(v.visitDate)
      return visitDate >= weekStart
    }).length

    const monthVisits = visitors.filter(v => {
      const visitDate = new Date(v.visitDate)
      return visitDate >= monthStart
    }).length

    return {
      today: todayVisits,
      week: weekVisits,
      month: monthVisits,
      active: activeVisits.length
    }
  }, [visitors, activeVisits])

  // Export filtered visitor data to Excel
  const handleExportVisitors = () => {
    const filteredVisitors = visitors.filter((v) => {
      const g = (v.gender || "Unspecified") as "Male" | "Female" | "Other" | "Unspecified"
      const matchesGender = genderFilter === "All Genders" || g === genderFilter
      const d = v.visitDate.split("T")[0]
      const matchesFrom = !dateFrom || d >= dateFrom
      const matchesTo = !dateTo || d <= dateTo
      const matchesName = !nameSearch || v.name.toLowerCase().includes(nameSearch.toLowerCase())
      return matchesGender && matchesFrom && matchesTo && matchesName
    })

    const exportData = filteredVisitors.map((v, index) => ({
      "#": index + 1,
      "Name": v.name,
      "Contact": v.contact,
      "Date/Time": new Date(v.visitDate).toLocaleString(),
      "Gender": v.gender || "Unspecified",
      "Member Link": resolveMember(v.memberId)
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Visitor Logs")

    // Generate filename with current filter state
    const date = new Date().toISOString().split("T")[0]
    const filters = []
    if (nameSearch) filters.push(`name-${nameSearch}`)
    if (dateFrom) filters.push(`from-${dateFrom}`)
    if (dateTo) filters.push(`to-${dateTo}`)
    if (genderFilter !== "All Genders") filters.push(`gender-${genderFilter}`)

    const filterSuffix = filters.length > 0 ? `-${filters.join("-")}` : ""
    const filename = `visitor-logs${filterSuffix}-${date}.xlsx`

    XLSX.writeFile(workbook, filename)
    toast({
      title: "Export successful",
      description: `Exported ${exportData.length} visitor records to ${filename}`
    })
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Visitors</h1>
                <p className="text-xs text-blue-600 font-extrabold tracking-wider">Library Attendance</p>
              </div>
              <div className="mx-4 h-6 w-px bg-white/10 hidden md:block"></div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                  <ArrowLeft className="h-4 w-4 mr-2 text-blue-600" /> Back
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="border border-slate-200 text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none font-black text-xs uppercase tracking-widest gap-2 h-10 px-6 rounded-lg shadow-none"
                onClick={handleExportVisitors}
              >
                <Download className="h-4 w-4" /> Export Data
              </Button>
            </div>
          </div>
        </div>
      </header>

      <DashboardLayout>
        {/* Statistics Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Visitors Today", val: visitorStats.today, icon: Calendar, bg: "bg-blue-500", darkBg: "bg-blue-600" },
            { label: "Weekly Visits", val: visitorStats.week, icon: TrendingUp, bg: "bg-indigo-500", darkBg: "bg-indigo-600" },
            { label: "Monthly Visits", val: visitorStats.month, icon: Users, bg: "bg-emerald-500", darkBg: "bg-emerald-600" },
            { label: "In Library", val: visitorStats.active, icon: Clock, bg: "bg-red-500", darkBg: "bg-red-600" }
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

        {/* Add Visit */}
        <Card className="bg-white border border-slate-200 shadow-none">
          <CardHeader className="border-b border-slate-100 bg-white pb-6">
            <CardTitle className="text-slate-900 font-black text-xl tracking-tight flex items-center gap-2">
              <UserPlus className="h-6 w-6 text-blue-600" />
              New Entry
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs font-bold mt-1 tracking-tight">Record a session for members or guests</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Quick Add by Membership ID / Barcode */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="scan" className="text-xs font-black text-slate-700 uppercase tracking-widest">Member ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="scan"
                    placeholder="Scan or type ID"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    className="!bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-11 focus:ring-blue-500 font-bold"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddByIdOrBarcode()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest h-11 px-6 rounded-lg shadow-none shadow-none transition-all active:scale-95"
                    onClick={handleAddByIdOrBarcode}
                  >
                    Check In
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 opacity-70">For library members</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Digital Access</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="border border-slate-300 text-slate-700 hover:bg-white border hover:border-blue-100 transition-colors shadow-none bg-white font-black text-xs uppercase tracking-widest w-full h-11 shadow-none"
                    onClick={() => {
                      setIsQRDialogOpen(true)
                      setQRError(null)
                    }}
                  >
                    <QrCode className="h-5 w-5 mr-3 text-indigo-600" /> Scan QR code
                  </Button>
                </div>
              </div>
            </div>

            <Dialog
              open={isQRDialogOpen}
              onOpenChange={(open) => {
                setIsQRDialogOpen(open)
                if (!open) setQRError(null)
              }}
            >
              <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900">
                <DialogHeader>
                  <DialogTitle className="text-slate-900 font-black">Scan Member QR</DialogTitle>
                  <DialogDescription className="text-slate-500">Point the webcam at the QR code</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {isQRDialogOpen && (
                    <QRScanner
                      onScan={handleQrScanSuccess}
                      onError={handleQrScanError}
                      qrbox={{ width: 250, height: 250 }}
                    />
                  )}
                  {qrError && (
                    <Alert className="bg-rose-50 border-rose-200 text-rose-600">
                      <AlertDescription>{qrError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <div className="h-px bg-white border-b border-slate-100 my-8 shadow-none" />

            <form onSubmit={handleAddVisit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 relative">
                <Label htmlFor="name" className="text-xs font-black text-slate-700 uppercase tracking-widest">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter name..." className="!bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-11 font-bold w-full" required />

                {/* Suggestions under name */}                 {!linkedMemberId && (suggestions.members.length > 0 || suggestions.visitors.length > 0) && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-none p-2 text-xs">
                    {suggestions.members.length > 0 && (
                      <div className="mb-2">
                        <div className="px-2 py-1 text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-slate-100 mb-1">Members</div>
                        {suggestions.members.map((m: Member) => (
                          <div key={m.id} className="flex items-center justify-between gap-2 p-2 hover:bg-white border hover:border-blue-100 transition-colors shadow-none rounded-lg transition-colors group">
                            <div className="truncate">
                              <span className="font-bold text-slate-900">{m.firstName} {m.lastName}</span>
                              <span className="mx-1 text-slate-200">•</span>
                              <span className="text-slate-400">{m.membershipId}</span>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-black uppercase text-blue-400 border border-blue-400/20 hover:bg-blue-400/10" onClick={() => handleLinkMember(m)}>
                              Link
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {suggestions.visitors.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-slate-100 mb-1">Past Visitors</div>
                        {suggestions.visitors.map((v: Visitor) => (
                          <div key={v.id} className="flex items-center justify-between gap-2 p-2 hover:bg-white border hover:border-blue-100 transition-colors shadow-none rounded-lg transition-colors group">
                            <div className="truncate">
                              <span className="font-bold text-slate-900">{v.name}</span>
                              <span className="mx-1 text-slate-200">•</span>
                              <span className="text-slate-400 text-[10px]">{new Date(v.visitDate).toLocaleDateString()}</span>
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-black uppercase text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/10" onClick={() => handleSelectPastVisitor(v)}>
                              Use
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact" className="text-xs font-black text-slate-700 uppercase tracking-widest">Contact Info</Label>
                <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or Email" className="!bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 h-11 font-bold w-full" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-xs font-black text-slate-700 uppercase tracking-widest">Gender</Label>
                <Select value={gender || undefined} onValueChange={(v) => setGender((v as any) || "")}>
                  <SelectTrigger className="!bg-white border-slate-300 text-slate-900 h-11 font-bold">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs tracking-widest h-11 px-8 shadow-none shadow-none transition-all active:scale-95 rounded-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Processing..." : "REGISTER GUEST"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Dialog
          open={!!selectedGroup}
          onOpenChange={(open) => {
            if (!open) setSelectedGroup(null)
          }}
        >
          <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-black">History: {selectedGroup?.name}</DialogTitle>
              <DialogDescription className="text-slate-500">
                {selectedGroup?.visitCount ?? 0} recorded sessions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {selectedGroup?.visits.map((visit) => (
                <div key={visit.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white border border-slate-200 transition-all shadow-none hover:border-blue-200">
                  <div>
                    <div className="font-bold text-sm text-slate-900">{new Date(visit.visitDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-blue-600">{new Date(visit.visitDate).toLocaleTimeString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider bg-white border border-slate-200 shadow-none">{visit.gender || "Unspecified"}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-white hover:bg-blue-600"
                      onClick={() => {
                        setEditingVisitor({
                          id: visit.id,
                          name: visit.name,
                          contact: visit.contact || "",
                          gender: (visit.gender as any) || "Other",
                          memberId: visit.memberId,
                          isActive: false
                        })
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {selectedGroup && selectedGroup.visits.length === 0 && (
                <p className="text-sm text-slate-300 text-center py-8 font-bold uppercase tracking-widest">No logs found.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <div className="space-y-6">
          {/* Active Visitors */}
          <Card className="bg-white border border-slate-200 shadow-none overflow-hidden h-full">
            <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-6">
              <div>
                <CardTitle className="text-slate-900 font-black text-lg tracking-tight">Active Now</CardTitle>
                <CardDescription className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1 opacity-70">Library Floor Attendance</CardDescription>
              </div>
              <Badge className="bg-blue-600 text-white border-0 font-black uppercase text-[10px] tracking-widest px-3 py-1 shadow-none shadow-none">{activeVisits.length} ONLINE</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Patron</TableHead>
                    <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Entry</TableHead>
                    <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeVisits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-slate-300 font-bold uppercase text-xs tracking-widest">No active visitors</TableCell>
                    </TableRow>
                  ) : (
                    activeVisits.map((v) => (
                      <TableRow key={v.id} className="border-slate-100 hover:bg-white border hover:border-blue-100 transition-colors shadow-none group">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{v.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{v.memberId ? `Member: ${v.memberId}` : `Guest: ${v.contact}`}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-blue-600">{new Date(v.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-[9px] text-slate-400 font-medium uppercase">{new Date(v.startedAt).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 font-black text-xs uppercase tracking-widest h-9 px-4 rounded-lg shadow-none transition-all"
                            onClick={() => handleEndActive(v.id)}
                            disabled={endingVisitId === v.id}
                          >
                            {endingVisitId === v.id ? "..." : "End Session"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>

        {/* Visit History */}
        <Card className="bg-white border border-slate-200 shadow-none overflow-hidden mt-6">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-slate-900 font-bold text-lg tracking-tight flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600/50" />
                  Visit History ({groupedVisitors.length})
                </CardTitle>
                <CardDescription className="text-slate-400 text-[10px] font-medium mt-1">Master logs of library attendance</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                  <SelectTrigger className="w-40 bg-white border-slate-200 shadow-none transition-all hover:border-blue-300 text-[10px] font-bold uppercase tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    <SelectItem value="date_desc">Newest First</SelectItem>
                    <SelectItem value="date_asc">Oldest First</SelectItem>
                    <SelectItem value="name_asc">Name A-Z</SelectItem>
                    <SelectItem value="name_desc">Name Z-A</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleExportVisitors} variant="ghost" size="sm" className="border border-slate-200 text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none font-bold text-[10px] uppercase tracking-wider">
                  <Download className="h-4 w-4 mr-2 text-blue-600" /> Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 bg-white border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Search name..."
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                className="bg-white border-slate-200 text-slate-900 text-xs"
              />
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-xs" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-white border-slate-200 text-slate-900 text-xs" />
              <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as any)}>
                <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-xs">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-900">
                  <SelectItem value="All Genders">All Genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader className="bg-white">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider w-12 text-center">#</TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Patron Name</TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Frequency</TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Last Activity</TableHead>
                  <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-right">Association</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedVisitors.map((group, index) => (
                  <TableRow key={group.key} className="border-slate-100 hover:bg-white border hover:border-blue-100 transition-colors shadow-none transition-colors">
                    <TableCell className="text-[10px] font-bold text-slate-300 text-center">{index + 1}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-slate-900 font-bold hover:text-blue-600 transition-colors text-sm tracking-tight"
                        onClick={() =>
                          setSelectedGroup({
                            ...group,
                            visits: allVisitsByKey.get(group.key) ?? [],
                            visitCount: allVisitsByKey.get(group.key)?.length ?? group.visitCount,
                          })
                        }
                      >
                        {group.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-slate-900 font-bold text-center">{group.visitCount}</TableCell>
                    <TableCell className="text-slate-500 text-[11px] font-medium text-center">{new Date(group.lastVisit).toLocaleDateString()}</TableCell>
                    <TableCell className="text-slate-400 text-[10px] font-medium text-right">{resolveMember(group.memberId)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {groupedVisitors.length === 0 && (
              <div className="text-center py-12 text-slate-200 font-bold uppercase text-xs tracking-widest">No matching logs.</div>
            )}
          </CardContent>
        </Card>
      </DashboardLayout>

      {/* Final Edit Dialog placement */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white border border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-lg tracking-tight">
              <Edit2 className="w-5 h-5 text-blue-600/50" />
              Edit Session
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-[10px] font-medium mt-1">
              Update information for this visitor session.
            </DialogDescription>
          </DialogHeader>
          {editingVisitor && (
            <form onSubmit={handleUpdateVisitor} className="space-y-6 py-4">
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editingVisitor.name}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, name: e.target.value })}
                    className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300 h-10"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-contact" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contact Number</Label>
                  <Input
                    id="edit-contact"
                    value={editingVisitor.contact}
                    onChange={(e) => setEditingVisitor({ ...editingVisitor, contact: e.target.value })}
                    className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300 h-10"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gender</Label>
                  <div className="flex gap-4">
                    {(["Male", "Female", "Other"] as const).map((g) => (
                      <div key={g} className="flex items-center space-x-2 bg-white border border-slate-200 shadow-none transition-all hover:border-blue-200">
                        <input
                          type="radio"
                          id={`edit-gender-${g}`}
                          name="edit-gender"
                          className="w-4 h-4 accent-blue-600"
                          checked={editingVisitor.gender === g}
                          onChange={() => setEditingVisitor({ ...editingVisitor, gender: g })}
                        />
                        <Label htmlFor={`edit-gender-${g}`} className="text-xs font-bold text-slate-900">{g}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-8 gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none font-bold text-[10px] uppercase">
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-[10px] tracking-widest px-8 h-10 shadow-none shadow-none">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function VisitorsPage() {
  return (
    <ProtectedRoute>
      <VisitorsPageContent />
    </ProtectedRoute>
  )
}
