"use client"

import type React from "react"

import { useAuth } from "./auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, Lock, Home } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useState } from "react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, login, loading } = useAuth()
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [loginError, setLoginError] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-8 w-8 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault()
      setIsLoggingIn(true)
      setLoginError("")

      const result = await login(loginForm.username, loginForm.password)
      if (!result.success) {
        setLoginError(result.message)
      }
      setIsLoggingIn(false)
    }

    return (
      <div className="min-h-screen bg-[#1e40af] flex items-center justify-center p-4">
        <Card className="w-full max-w-[360px] bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex flex-col items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                <BookOpen className="h-10 w-10 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white tracking-tight">Nexus LMS</CardTitle>
                <CardDescription className="text-blue-100/60 text-xs">Library Management System</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-600 text-white p-3 rounded-lg text-xs font-bold text-center shadow-lg animate-in fade-in zoom-in duration-300">
                  {loginError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-white text-xs font-bold ml-1 uppercase tracking-wider">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="admin"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:bg-white/20 focus:border-white/40 transition-all h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white text-xs font-bold ml-1 uppercase tracking-wider">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:bg-white/20 focus:border-white/40 transition-all h-10 text-sm"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-10 bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-xl transition-all active:scale-[0.98] text-sm mt-2" 
                disabled={isLoggingIn}
              >
                {isLoggingIn ? "Verifying..." : "Sign In"}
              </Button>
            </form>

            <div className="pt-4 border-t border-white/10 px-1">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 ml-1 text-center">Demo Credentials</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-[10px] font-bold text-white/50 uppercase mb-0.5">Admin</p>
                  <p className="text-[10px] text-white font-mono font-bold">admin / Admin123</p>
                </div>
                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-[10px] font-bold text-white/50 uppercase mb-0.5">Librarian</p>
                  <p className="text-[10px] text-white font-mono font-bold">librarian / lib123</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">This page requires administrator privileges.</p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {children}
      {/* Global brand top bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-accent z-40" />
    </>
  )
}
