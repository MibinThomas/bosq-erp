"use client"

import React, { useState, useRef, useEffect } from "react"
import { X, ZoomIn, ZoomOut, RotateCw, Check, Image as ImageIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageCropperProps {
  isOpen: boolean
  imageSrc: string | null
  onClose: () => void
  onCrop: (croppedBase64: string) => void
}

export function ImageCropper({ isOpen, imageSrc, onClose, onCrop }: ImageCropperProps) {
  const [zoom, setZoom] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [aspectRatio, setAspectRatio] = useState<string>("1:1") // '1:1' | '4:3' | '16:9' | 'free'
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const isDraggingRef = useRef<boolean>(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Reset states when a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setRotation(0)
      setOffset({ x: 0, y: 0 })
      setAspectRatio("1:1")
      setCroppedPreview(null)
    }
  }, [isOpen, imageSrc])

  if (!isOpen || !imageSrc) return null

  // Crop frame dimensions based on aspect ratio
  // Centered in a 380px x 300px viewport
  const getCropFrameStyle = () => {
    const containerW = 380
    const containerH = 300

    let w = 240
    let h = 240

    if (aspectRatio === "4:3") {
      w = 280
      h = 210
    } else if (aspectRatio === "16:9") {
      w = 320
      h = 180
    } else if (aspectRatio === "free") {
      w = 300
      h = 200
    }

    const top = (containerH - h) / 2
    const left = (containerW - w) / 2

    return { w, h, top, left }
  };

  const cropFrame = getCropFrameStyle()

  // Dragging event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    offsetStartRef.current = { ...offset }
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId)
    }
    updateRealtimePreview()
  }

  // Live preview generator
  const updateRealtimePreview = () => {
    if (!imageRef.current) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = imageRef.current
    const { w: cropW, h: cropH, top: cropTop, left: cropLeft } = cropFrame
    
    // Set crop canvas size (1.5x resolution for sharpness)
    canvas.width = cropW * 1.5
    canvas.height = cropH * 1.5
    ctx.scale(1.5, 1.5)

    // Clear canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, cropW, cropH)

    // Center of viewport is 190x150
    const viewCX = 190
    const viewCY = 150

    // Apply translations in viewport coordinates relative to crop frame top-left
    ctx.translate(viewCX - cropLeft + offset.x, viewCY - cropTop + offset.y)
    ctx.scale(zoom, zoom)
    ctx.rotate((rotation * Math.PI) / 180)

    // Draw the image centered
    const imgWidth = img.naturalWidth || 300
    const imgHeight = img.naturalHeight || 300
    
    // Maintain relative display size in canvas
    // Assume display size fits within 300px base in crop viewport
    const displayAspect = imgWidth / imgHeight
    let displayW = 260
    let displayH = 260 / displayAspect
    if (displayAspect < 1) {
      displayH = 260
      displayW = 260 * displayAspect
    }

    ctx.drawImage(img, -displayW / 2, -displayH / 2, displayW, displayH)

    try {
      setCroppedPreview(canvas.toDataURL("image/png"))
    } catch (err) {
      console.error("Failed to generate preview:", err)
    }
  }

  // Trigger preview update on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateRealtimePreview()
    }, 150)
    return () => clearTimeout(timer)
  }, [zoom, rotation, offset, aspectRatio])

  const handleSave = () => {
    if (!imageRef.current) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = imageRef.current
    const { w: cropW, h: cropH, top: cropTop, left: cropLeft } = cropFrame

    // Export higher resolution (2x) for high quality print in PDFs
    const scaleFactor = 2
    canvas.width = cropW * scaleFactor
    canvas.height = cropH * scaleFactor
    ctx.scale(scaleFactor, scaleFactor)

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, cropW, cropH)

    const viewCX = 190
    const viewCY = 150

    ctx.translate(viewCX - cropLeft + offset.x, viewCY - cropTop + offset.y)
    ctx.scale(zoom, zoom)
    ctx.rotate((rotation * Math.PI) / 180)

    const imgWidth = img.naturalWidth || 300
    const imgHeight = img.naturalHeight || 300
    
    const displayAspect = imgWidth / imgHeight
    let displayW = 260
    let displayH = 260 / displayAspect
    if (displayAspect < 1) {
      displayH = 260
      displayW = 260 * displayAspect
    }

    ctx.drawImage(img, -displayW / 2, -displayH / 2, displayW, displayH)

    try {
      const croppedDataUrl = canvas.toDataURL("image/png")
      onCrop(croppedDataUrl)
    } catch (err) {
      console.error("Failed to export crop canvas:", err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-3xl bg-card rounded-3xl border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Adjust & Crop Product Image</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Drag to reposition, use zoom and rotation sliders to align</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 hover:bg-muted">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Left / Center: Interactive Crop Viewport */}
          <div className="md:col-span-7 flex flex-col items-center justify-center space-y-4">
            <div 
              ref={containerRef}
              className="relative w-[380px] h-[300px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-move touch-none flex items-center justify-center"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ userSelect: "none" }}
            >
              {/* Image element rotated, translated, and scaled */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Original Upload"
                onLoad={updateRealtimePreview}
                className="absolute pointer-events-none select-none max-w-none max-h-none"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                  width: "260px",
                  height: "auto",
                  transition: isDraggingRef.current ? "none" : "transform 0.1s ease-out",
                }}
              />

              {/* Overlay Backdrop Frame */}
              <div 
                className="absolute border border-primary pointer-events-none shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]"
                style={{
                  width: `${cropFrame.w}px`,
                  height: `${cropFrame.h}px`,
                  top: `${cropFrame.top}px`,
                  left: `${cropFrame.left}px`,
                  borderRadius: "8px",
                }}
              />

              {/* Visual Frame Gridlines */}
              <div
                className="absolute border border-dashed border-white/20 pointer-events-none"
                style={{
                  width: `${cropFrame.w}px`,
                  height: `${cropFrame.h}px`,
                  top: `${cropFrame.top}px`,
                  left: `${cropFrame.left}px`,
                  borderRadius: "8px",
                }}
              >
                <div className="absolute inset-x-0 top-1/3 border-b border-white/10" />
                <div className="absolute inset-x-0 bottom-1/3 border-b border-white/10" />
                <div className="absolute inset-y-0 left-1/3 border-r border-white/10" />
                <div className="absolute inset-y-0 right-1/3 border-r border-white/10" />
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 bg-muted/40 py-1 px-3 rounded-full border border-border/20">
              <span>💡 Touch or click and drag the image directly to reposition</span>
            </div>
          </div>

          {/* Right: Fine-tuning Tools & Final Preview */}
          <div className="md:col-span-5 flex flex-col space-y-5">
            
            {/* Aspect Ratio Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Aspect Ratio</span>
              <div className="grid grid-cols-4 gap-1 bg-muted p-1 rounded-xl border border-border/40">
                {(["1:1", "4:3", "16:9", "free"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
                      aspectRatio === ratio
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/30"
                    }`}
                  >
                    {ratio === "free" ? "Free" : ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Slider & Increments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Zoom</span>
                <span className="text-xs font-mono font-bold text-primary">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-border/80 hover:bg-muted"
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-primary cursor-pointer h-1.5 bg-muted rounded-lg appearance-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full border-border/80 hover:bg-muted"
                  onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Rotation Control */}
            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border/40">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Rotate Image</span>
                <p className="text-[10px] text-muted-foreground">Rotate by 90° increments</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="h-9 px-3 flex items-center gap-1.5 hover:bg-muted font-medium border-border/80 text-xs"
              >
                <RotateCw className="h-3.5 w-3.5" />
                {rotation}°
              </Button>
            </div>

            {/* Live Cropped Result Preview Box */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Live Crop Result Preview</span>
              <div className="h-36 w-full border border-border/60 bg-muted/20 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-inner p-3">
                {croppedPreview ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <img 
                      src={croppedPreview} 
                      alt="Cropped Preview" 
                      className="max-h-full max-w-full object-contain rounded-lg shadow border border-border/40 bg-white" 
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <ImageIcon className="h-7 w-7 text-muted-foreground/60" />
                    <span className="text-[10px] font-medium">Generating preview...</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-border/60 bg-muted/10">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl px-5 py-2.5 h-11 text-sm font-semibold border-border/80">
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleSave} 
            className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl px-6 py-2.5 h-11 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/25 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            Apply & Crop
          </Button>
        </div>

      </div>
    </div>
  )
}
