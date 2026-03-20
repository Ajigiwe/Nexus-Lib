"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Settings, Users, Plus, Edit, Trash2, ArrowLeft, Shield, UserCheck, BookOpen, Key, Mail, Fingerprint, ShieldAlert, CheckCircle2, UserPlus, Info } from "lucide-react"
import { authManager } from "@/lib/auth"
import type { User } from "@/lib/auth"
import { useAuth } from "@/components/auth-provider"
import { ProtectedRoute } from "@/components/protected-route"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"

function AdminPanelContent() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" })

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "librarian" as "admin" | "librarian",
    gender: "Unspecified" as "Male" | "Female" | "Other" | "Unspecified",
    isActive: true,
    staffId: "",
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = () => {
    const allUsers = authManager.getAllUsers()
    setUsers(allUsers)
  }

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "librarian",
      gender: "Unspecified",
      isActive: true,
      staffId: "",
    })
  }

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordUser) return
    const { password, confirm } = passwordForm
    if (!password || password.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters", variant: "destructive" })
      return
    }
    if (password !== confirm) {
      toast({ title: "Validation Error", description: "Passwords do not match", variant: "destructive" })
      return
    }
    try {
      authManager.setPassword(passwordUser.id, password)
      setIsPasswordDialogOpen(false)
      setPasswordUser(null)
      setPasswordForm({ password: "", confirm: "" })
      toast({ title: "Credentials Updated", description: "Standard security reset complete." })
    } catch (err: any) {
      toast({ title: "System Error", description: err?.message || "Internal failure", variant: "destructive" })
    }
  }

  const handleClearPassword = () => {
    if (!passwordUser) return
    if (confirm("Reset to system default credentials for this node?")) {
      try {
        authManager.clearPassword(passwordUser.id)
        setIsPasswordDialogOpen(false)
        setPasswordUser(null)
        setPasswordForm({ password: "", confirm: "" })
        toast({ title: "Staff Reset", description: "Account reverted to default login credentials." })
      } catch (err: any) {
        toast({ title: "System Error", description: err?.message || "Internal failure", variant: "destructive" })
      }
    }
  }

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (users.find((u) => u.username === formData.username)) {
      toast({ title: "Conflict", description: "Username already registered.", variant: "destructive" })
      return
    }
    if (!formData.staffId?.trim()) {
      toast({ title: "Data Missing", description: "Staff ID is mandatory.", variant: "destructive" })
      return
    }
    if (users.find((u: any) => u.staffId === formData.staffId)) {
      toast({ title: "Conflict", description: "Staff ID already assigned.", variant: "destructive" })
      return
    }
    try {
      authManager.addUser({ ...formData } as any)
      loadUsers()
      setIsAddDialogOpen(false)
      resetForm()
      toast({ title: "User Created", description: "New staff member has been added to the system." })
    } catch (error: any) {
      toast({ title: "System Error", description: error?.message || "Internal failure", variant: "destructive" })
    }
  }

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    if (users.find((u) => u.username === formData.username && u.id !== editingUser.id)) {
      toast({ title: "Conflict", description: "Username already in use.", variant: "destructive" })
      return
    }
    try {
      authManager.updateUser(editingUser.id, { ...formData } as any)
      loadUsers()
      setIsEditDialogOpen(false)
      setEditingUser(null)
      resetForm()
      toast({ title: "User Updated", description: "Account details have been modified." })
    } catch (error) {
      toast({ title: "System Error", variant: "destructive" })
    }
  }

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser?.id) {
      toast({ title: "Access Denied", description: "You cannot delete your own account.", variant: "destructive" })
      return
    }
    if (confirm(`Permanently remove access for ${user.firstName} ${user.lastName}?`)) {
      try {
        authManager.deleteUser(user.id)
        loadUsers()
        toast({ title: "Access Revoked" })
      } catch (error) {
        toast({ title: "System Error", variant: "destructive" })
      }
    }
  }

  const toggleUserStatus = (user: User) => {
    if (user.id === currentUser?.id) {
      toast({ title: "Access Denied", description: "Status change of master administrator account blocked.", variant: "destructive" })
      return
    }
    try {
      authManager.updateUser(user.id, { isActive: !user.isActive })
      loadUsers()
      toast({ title: "Status Updated", description: `User ${user.isActive ? "deactivated" : "activated"}` })
    } catch (error) {
      toast({ title: "System Error", variant: "destructive" })
    }
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      gender: ((user as any).gender as any) || "Unspecified",
      staffId: (user as any).staffId || "",
    })
    setIsEditDialogOpen(true)
  }

  const openPasswordDialog = (user: User) => {
    setPasswordUser(user)
    setPasswordForm({ password: "", confirm: "" })
    setIsPasswordDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-none">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-none shadow-none">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Admin</h1>
                <p className="text-xs text-indigo-600 font-extrabold tracking-wider uppercase">Access Protocol</p>
              </div>
              <div className="mx-4 h-6 w-px bg-white/10"></div>
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none h-8 flex items-center">
                  <ArrowLeft className="h-3.5 w-3.5 mr-2 text-indigo-600" /> Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-80">Current User</span>
                <span className="text-xs font-bold text-blue-600 tracking-tight">{currentUser?.firstName} {currentUser?.lastName}</span>
              </div>
              <Badge className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] uppercase font-black px-3 py-1">{currentUser?.role}</Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Management Card */}
        <Card className="bg-white border-slate-200 shadow-none overflow-hidden">
          <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-none">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-slate-900 font-black text-xl tracking-tight">Staff Directory</CardTitle>
                <CardDescription className="text-slate-500 text-xs font-bold mt-1 tracking-tight">Manage library personnel access and security clearances</CardDescription>
              </div>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest h-10 px-8 rounded-xl shadow-none shadow-none transition-all active:scale-95">
                  <UserPlus className="h-4 w-4 mr-2" /> Add Staff Member
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-slate-900 font-bold text-xl tracking-tight">Add User</DialogTitle>
                  <DialogDescription className="text-slate-600 text-xs font-bold mt-1 tracking-tight">Enter user details below to create a new personnel node</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-6 pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-[10px] font-black uppercase text-slate-700 tracking-widest">First Name</Label>
                      <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required className="bg-white border-slate-300 text-slate-900 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Last Name</Label>
                      <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required className="bg-white border-slate-300 text-slate-900 font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Username (Login)</Label>
                      <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required className="bg-white border-slate-300 text-slate-900 font-mono font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Communication Channel</Label>
                      <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="bg-white border-slate-300 text-slate-900 font-bold" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staffId" className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Unique Personnel ID</Label>
                    <Input id="staffId" value={formData.staffId} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })} required className="bg-white border-slate-300 text-slate-900 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Gender Tag</Label>
                      <Select value={formData.gender} onValueChange={(value: any) => setFormData({ ...formData, gender: value })}>
                        <SelectTrigger className="bg-white border-slate-300 text-slate-900 font-bold">
                          <SelectValue placeholder="Attribute" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-900">
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Unspecified">Unspecified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Access Role</Label>
                      <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                        <SelectTrigger className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300">
                          <SelectValue placeholder="Protocol" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-900">
                          <SelectItem value="librarian">Librarian Level</SelectItem>
                          <SelectItem value="admin">Root Administrative</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none uppercase text-[10px] font-black tracking-widest">Cancel</Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-[10px] tracking-widest px-8 shadow-none">Add User</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="border-slate-100">
                    <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Personnel Name</TableHead>
                    <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Handle</TableHead>
                    <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider">Security Tier</TableHead>
                    <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-center">Status</TableHead>
                    <TableHead className="text-slate-600 font-black uppercase text-xs tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-slate-100 hover:bg-white border hover:border-blue-100 transition-colors shadow-none">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-white border border-slate-200 shadow-none h-9 w-9 flex items-center justify-center text-blue-600 font-black text-xs transition-all hover:border-blue-300">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{user.firstName} {user.lastName}</span>
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-slate-500">{user.username}</TableCell>
                      <TableCell>
                        <Badge className={`${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'} text-[9px] font-bold`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-bold h-5">Active</Badge>
                        ) : (
                          <Badge className="bg-white border border-slate-200 transition-colors shadow-none px-2 py-0.5 text-[9px] font-black uppercase">Deactivated</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-600 hover:text-white border border-slate-200" onClick={() => openPasswordDialog(user)} title="Update Credentials">
                            <Key className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-slate-200" onClick={() => openEditDialog(user)} title="Edit User">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className={`h-8 w-8 border border-slate-200 ${user.isActive ? 'text-emerald-600 hover:bg-emerald-600' : 'text-amber-600 hover:bg-amber-600'} hover:text-white`} onClick={() => toggleUserStatus(user)} disabled={user.id === currentUser?.id} title={user.isActive ? 'Suspend Access' : 'Restore Access'}>
                            <UserCheck className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-600 hover:text-white border border-slate-200" onClick={() => handleDeleteUser(user)} disabled={user.id === currentUser?.id} title="Delete Record">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Security Reset Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-black text-xl uppercase tracking-tight flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-indigo-600" />
                Password Reset
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                {passwordUser ? `Updating password for: ${passwordUser.username}` : ""}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSetPassword} className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-[10px] font-black uppercase text-slate-500 tracking-widest">New Password</Label>
                <Input id="new-password" type="password" value={passwordForm.password} onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))} placeholder="Minimum 6 characters" required minLength={6} className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Confirm Key</Label>
                <Input id="confirm-password" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} required className="bg-white border-slate-200 shadow-none transition-all hover:border-blue-300" />
              </div>
              <div className="flex flex-col gap-4 mt-4">
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl shadow-none shadow-none">Save Password</Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="ghost" onClick={handleClearPassword} disabled={!passwordUser} className="text-rose-600 hover:bg-rose-50 uppercase text-[9px] font-black tracking-widest border border-rose-200">Reset Password</Button>
                  <Button type="button" variant="ghost" onClick={() => setIsPasswordDialogOpen(false)} className="text-slate-400 hover:bg-white border hover:border-blue-100 transition-colors shadow-none uppercase text-[9px] font-black tracking-widest">Cancel</Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Node Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-slate-900 font-black text-xl uppercase tracking-tight">Modify User Details</DialogTitle>
              <DialogDescription className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Update existing user information.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">First Name</Label>
                  <Input value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required className="bg-white border-slate-200 text-slate-900" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Last Name</Label>
                  <Input value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required className="bg-white border-slate-200 text-slate-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Username</Label>
                  <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required className="bg-white border-slate-200 text-slate-900 font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">Access Level</Label>
                  <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                      <SelectValue placeholder="Protocol" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900">
                      <SelectItem value="librarian">Librarian</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-600" />
                <p className="text-[9px] font-black uppercase text-blue-600/80 tracking-widest">Personnel ID [{formData.staffId}] is locked for audit integrity purposes.</p>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="text-slate-600 hover:bg-white border hover:border-blue-100 transition-colors shadow-none uppercase text-[10px] font-black tracking-widest">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-[10px] tracking-widest px-8">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <AdminPanelContent />
    </ProtectedRoute>
  )
}
