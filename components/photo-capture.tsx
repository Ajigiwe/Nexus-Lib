"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Upload, X, RotateCcw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PhotoCaptureProps {
  onPhotoCapture: (photoUrl: string) => void
  currentPhoto?: string
  onClear?: () => void
}

export function PhotoCapture({ onPhotoCapture, currentPhoto, onClear }: PhotoCaptureProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "webcam">("upload")
  const [preview, setPreview] = useState<string | null>(currentPhoto || null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_SIZE_MB = 2
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

  // Cleanup stream on unmount or tab change
  useEffect(() => {
    return () => {
      stopWebcam()
    }
  }, [])

  useEffect(() => {
    if (activeTab !== "webcam") {
      stopWebcam()
    }
  }, [activeTab])

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStreaming(false)
    setVideoReady(false)
  }

  const startWebcam = async () => {
    setError(null)
    setVideoReady(false)
    
    try {
      console.log("Requesting camera access...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      })
      
      console.log("Camera access granted, stream:", stream)
      
      // Set streaming first to render the video element
      setStreaming(true)
      
      // Wait for next tick to ensure video element is in DOM
      setTimeout(() => {
        if (videoRef.current) {
          const video = videoRef.current
          console.log("Setting video source...")
          
          video.srcObject = stream
          streamRef.current = stream
          
          // Multiple event handlers to ensure video plays
          video.onloadedmetadata = () => {
            console.log("Video metadata loaded")
            setVideoReady(true)
            video.play()
              .then(() => console.log("Video playing"))
              .catch((err) => console.error("Play failed:", err))
          }
          
          video.onloadeddata = () => {
            console.log("Video data loaded")
          }
          
          // Fallback: try to play immediately
          video.play().catch((err) => console.log("Initial play attempt:", err))
        } else {
          console.error("Video ref not available")
        }
      }, 100)
      
    } catch (err) {
      console.error("Error accessing webcam:", err)
      setError(
        "Could not access camera. Please ensure camera permissions are granted and you're using HTTPS (or localhost).",
      )
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current) return

    const canvas = document.createElement("canvas")
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
      
      // Validate size
      const sizeInBytes = Math.ceil((dataUrl.length * 3) / 4)
      if (sizeInBytes > MAX_SIZE_BYTES) {
        setError(`Captured photo is too large. Please try again or use file upload with a smaller image.`)
        return
      }
      
      setPreview(dataUrl)
      onPhotoCapture(dataUrl)
      stopWebcam()
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please upload a valid image file (JPEG, PNG, GIF, or WebP).")
      return
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      setError(`File size must be less than ${MAX_SIZE_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setPreview(dataUrl)
      onPhotoCapture(dataUrl)
    }
    reader.onerror = () => {
      setError("Failed to read file. Please try again.")
    }
    reader.readAsDataURL(file)
  }

  const handleClear = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onClear?.()
  }

  const handleRetake = () => {
    setPreview(null)
    setError(null)
    if (activeTab === "webcam" && !streaming) {
      startWebcam()
    }
  }

  return (
    <div className="space-y-4">
      <Label>Member Photo (Optional)</Label>

      {preview ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-primary/20">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex gap-2 justify-center">
                <Button type="button" variant="outline" onClick={handleRetake}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button type="button" variant="outline" onClick={handleClear}>
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "webcam")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="webcam">
              <Camera className="h-4 w-4 mr-2" />
              Use Webcam
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:border-muted-foreground/50 transition-colors">
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      Click to upload or drag and drop
                      <br />
                      <span className="text-xs">Max size: {MAX_SIZE_MB}MB (JPEG, PNG, GIF, WebP)</span>
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_TYPES.join(",")}
                      onChange={handleFileUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webcam" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {!streaming ? (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
                      <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-4 text-center">
                        Click to start your camera
                        <br />
                        <span className="text-xs">Camera permissions required</span>
                      </p>
                      <Button type="button" onClick={startWebcam}>
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 bg-black min-h-[300px] flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-contain"
                          style={{ maxHeight: "400px", display: streaming ? "block" : "none" }}
                        />
                        {streaming && !videoReady && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                            Loading camera...
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 justify-center">
                        <Button type="button" onClick={capturePhoto} disabled={!videoReady}>
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button type="button" variant="outline" onClick={stopWebcam}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

