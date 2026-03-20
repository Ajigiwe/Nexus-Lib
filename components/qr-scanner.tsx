"use client"

import { useEffect, useId, useRef } from "react"

import type { Html5QrcodeScanner } from "html5-qrcode"

interface QRScannerProps {
  onScan: (value: string) => void
  onError?: (error: string) => void
  fps?: number
  qrbox?: { width: number; height: number } | number
}

/**
 * Thin wrapper around html5-qrcode scanner to use inside dialogs/modals.
 * Automatically cleans up the camera when unmounted and calls `onScan`
 * with the decoded text the first time it is read.
 */
export function QRScanner({ onScan, onError, fps = 10, qrbox = { width: 220, height: 220 } }: QRScannerProps) {
  const containerId = useId().replace(/:/g, "-")
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const hasScannedRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function initScanner() {
      if (!isMounted || typeof window === "undefined") return

      const { Html5QrcodeScanner } = await import("html5-qrcode")
      const scanner = new Html5QrcodeScanner(
        containerId,
        {
          fps,
          qrbox,
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false,
      )

      const success = (decodedText: string) => {
        if (hasScannedRef.current) return
        hasScannedRef.current = true
        onScan(decodedText)
        scanner.clear().catch(() => {})
      }

      const failure = (err: string) => {
        if (err.includes("NotFoundException")) return
        onError?.(err)
      }

      scanner.render(success, failure)
      scannerRef.current = scanner
    }

    initScanner()

    return () => {
      isMounted = false
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [containerId, fps, onError, onScan, qrbox])

  return <div id={containerId} className="w-full" />
}

