"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserCheck, Search, LayoutDashboard, BookOpen, Users, ArrowRightLeft, Layers, BarChart3, Activity, Database, Map as MapIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "./auth-provider"

export function Sidebar() {
  const { user } = useAuth()
  const pathname = usePathname()

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/visitors", icon: MapIcon, label: "Visitors" },
    { href: "/books", icon: BookOpen, label: "Books" },
    { href: "/authors", icon: Users, label: "Authors" },
    { href: "/members", icon: UserCheck, label: "Members" },
    { href: "/circulation", icon: ArrowRightLeft, label: "Circulation" },
    { href: "/reports", icon: Layers, label: "Reports" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/backup", icon: Database, label: "Backup" },
  ]

  return (
    <aside className="lg:col-span-2 space-y-6">
      <Card className="bg-slate-800 border-none shadow-none overflow-hidden rounded-xl text-slate-300">
        <CardHeader className="pb-4 border-b border-slate-700/50 bg-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden border-2 border-slate-500">
              <UserCheck className="h-6 w-6 text-slate-300" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.firstName || 'Admin'}</p>
              <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400"></span> Online
              </p>
            </div>
          </div>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search" className="w-full bg-slate-700 border-none rounded text-xs pl-9 pr-3 py-2 outline-none text-white placeholder-slate-400 focus:ring-1 focus:ring-slate-500 transition-all font-medium" />
          </div>
        </CardHeader>
        <CardContent className="pt-4 px-3 pb-6">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link key={item.label} href={item.href}>
                  <Button variant="ghost" className={`justify-start w-full group transition-all h-10 px-3 rounded text-left shadow-none ${isActive ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                    <item.icon className="h-4 w-4 mr-3" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>
        </CardContent>
      </Card>
    </aside>
  )
}
