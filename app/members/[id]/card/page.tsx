"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { db } from "@/lib/database"
import type { Member } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { User as UserIcon, BookOpen } from "lucide-react"
import { QRCode } from "@/components/qr-code"

function Barcode({ value }: { value: string }) {
  // Simple deterministic barcode-like SVG (not a real standard). Visual only.
  // Maps each char to a set of bars based on charCode bits.
  const bars = useMemo(() => {
    const arr: number[] = []
    for (const ch of value) {
      const code = ch.charCodeAt(0)
      for (let i = 0; i < 7; i++) {
        arr.push((code >> i) & 1)
      }
      // add a spacer between chars
      arr.push(0)
    }
    return arr
  }, [value])

  const barWidth = 3
  const height = 80
  const quiet = 10
  const width = quiet * 2 + bars.length * barWidth

  return (
    <svg width={width} height={height} role="img" aria-label={`Barcode for ${value}`}
      style={{ background: "#fff", border: "1px solid #eee" }}>
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {/* Quiet zones */}
      <g transform={`translate(${quiet},0)`}>
        {bars.map((b, i) => (
          <rect key={i} x={i * barWidth} y={5} width={barWidth} height={height - 25} fill={b ? "#000" : "#fff"} />
        ))}
      </g>
      {/* Human-readable */}
      <text x={width / 2} y={height - 6} textAnchor="middle" fontFamily="monospace" fontSize="14">
        {value}
      </text>
    </svg>
  )
}

export default function MemberCardPage() {
  const params = useParams<{ id: string }>()
  const memberId = params?.id
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!memberId) return
      try {
        if (cancelled) return
        const m = db.getMemberById(memberId)
        if (m) setMember(m)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [memberId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading card…</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Member not found.</p>
      </div>
    )
  }

  const fullName = `${member.firstName} ${member.lastName}`

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page {
            size: auto;
            margin: 0.5in;
          }
        }
      `}</style>
      
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl shadow-none overflow-hidden border border-gray-200">
          {/* Black Header */}
          <div className="bg-black px-5 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-black" />
            </div>
            <h1 className="text-white text-xl font-bold">Member Card</h1>
          </div>

          {/* Card Body */}
          <div className="p-5">
            <div className="grid grid-cols-12 gap-0">
              {/* Left: Photo and Barcode */}
              <div className="col-span-3 space-y-4">
                {/* Photo */}
                <div className="border border-slate-200 rounded-lg p-3 aspect-[3/4] flex flex-col items-center justify-center bg-white shadow-none max-w-[200px] transition-all hover:border-blue-200">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={fullName}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.onerror = null
                        target.style.display = "none"
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `
                            <svg class="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span class="text-gray-400 text-sm mt-2">Photo</span>
                          `
                        }
                      }}
                    />
                  ) : (
                    <>
                      <UserIcon className="w-20 h-20 text-gray-400" />
                      <span className="text-gray-400 text-sm mt-2">Photo</span>
                    </>
                  )}
                </div>

                {/* Barcode */}
                <div className="flex flex-col items-center">
                  <Barcode value={member.membershipId} />
                  <p className="text-xs text-gray-500 mt-2">Scan with scanner</p>
                </div>
              </div>

              {/* Center: Member Details */}
              <div className="col-span-4 space-y-4 pl-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">NAME</div>
                  <div className="text-xl font-bold text-gray-900">{fullName}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">ID</div>
                  <div className="text-xl font-bold text-gray-900">{member.membershipId}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">VALID UNTIL</div>
                  <div className="text-xl font-bold text-gray-900">
                    {new Date(member.expiryDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>

              {/* Right: QR Code */}
              <div className="col-span-5 flex flex-col items-center justify-center">
                <div className="border-4 border-gray-900 p-2 bg-white">
                  <QRCode 
                    value={{
                      id: member.id,
                      membershipId: member.membershipId,
                      name: `${member.firstName} ${member.lastName}`,
                      expiry: member.expiryDate
                    }} 
                    size={160} 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-3">Scan with camera</p>
              </div>
            </div>
          </div>
        </div>

        <div className="no-print mt-8 flex justify-center gap-3">
          <Button onClick={() => window.print()} size="lg">
            Print Card
          </Button>
          <Button variant="outline" onClick={() => window.close()} size="lg">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
