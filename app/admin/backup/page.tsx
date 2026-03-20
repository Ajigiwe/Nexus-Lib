"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BackupPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new backup page
    router.replace("/backup")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to backup page...</p>
    </div>
  )
}
