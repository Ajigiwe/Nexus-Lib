"use client"

import { QRCodeSVG } from "qrcode.react"

interface QRCodeProps {
  value: string | any
  size?: number
}

// Real QR Code generator using qrcode.react library
// Generates proper, scannable QR codes that are unique for each value
export function QRCode({ value, size = 200 }: QRCodeProps) {
  const qrValue = typeof value === "object" ? JSON.stringify(value) : value

  return (
    <QRCodeSVG
      value={qrValue}
      size={size}
      level="H" // High error correction level
      includeMargin={false}
      bgColor="#ffffff"
      fgColor="#000000"
    />
  )
}

