"use client"

import React, { useState, useRef, useCallback } from "react"
import { UploadCloud, X, Star, Move, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ImageCropper } from "@/components/ui/image-cropper"

interface ImageUploaderProps {
  images: string[]
  onChange: (images: string[]) => void
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Cropper states
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Drag state for reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Utility to convert Base64 Data URL to a File
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(",")
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      openCropper(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      openCropper(file)
    }
  }

  const openCropper = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      setRawImageSrc(reader.result as string)
      setIsCropperOpen(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropSave = async (croppedBase64: string) => {
    setIsCropperOpen(false)
    setUploading(true)

    try {
      if (process.env.NODE_ENV === "development") {
        onChange([...images, croppedBase64])
        toast.success("Image cropped and saved locally (Dev Mode Base64)!")
        setUploading(false)
        return
      }

      const croppedFile = dataURLtoFile(croppedBase64, `product-cropped-${Date.now()}.png`)
      const formData = new FormData()
      formData.append("file", croppedFile)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (uploadRes.ok) {
        const data = await uploadRes.json()
        if (data.url) {
          onChange([...images, data.url])
          toast.success("Image cropped and uploaded successfully!")
        } else {
          onChange([...images, croppedBase64])
        }
      } else {
        onChange([...images, croppedBase64])
      }
    } catch (err) {
      console.error("Failed to upload cropped image:", err)
      onChange([...images, croppedBase64])
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    onChange(newImages)
  }

  const setPrimary = (index: number) => {
    if (index === 0) return
    const newImages = [...images]
    const [item] = newImages.splice(index, 1)
    newImages.unshift(item)
    onChange(newImages)
  }

  const handleReorderDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleReorderDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return
    const newImages = [...images]
    const [draggedItem] = newImages.splice(draggedIndex, 1)
    newImages.splice(dropIndex, 0, draggedItem)
    onChange(newImages)
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`relative w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
          isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileSelect}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Processing & Uploading...</p>
          </div>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <UploadCloud className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Click or drag & drop to upload</p>
            <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
          </>
        )}
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div
              key={`${img}-${idx}`}
              className="group relative aspect-square rounded-xl border bg-white overflow-hidden shadow-sm"
              draggable
              onDragStart={(e) => handleReorderDragStart(e, idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleReorderDrop(e, idx)}
            >
              <img src={img} alt={`Product ${idx + 1}`} className="object-contain w-full h-full p-2" />
              
              {/* Overlays */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <div className="flex justify-between">
                  <div className="cursor-grab active:cursor-grabbing p-1.5 bg-white/20 hover:bg-white/40 rounded backdrop-blur-sm text-white">
                    <Move className="h-4 w-4" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(idx)
                    }}
                    className="p-1.5 bg-destructive/80 hover:bg-destructive rounded backdrop-blur-sm text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPrimary(idx)
                    }}
                    className="w-full py-1.5 bg-white/90 hover:bg-white text-black text-xs font-semibold rounded shadow-sm backdrop-blur-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Star className="h-3 w-3" />
                    Make Primary
                  </button>
                )}
              </div>
              
              {/* Primary Badge */}
              {idx === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-1 border border-primary-foreground/20">
                  <Star className="h-3 w-3 fill-current" /> Primary
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isCropperOpen && (
        <ImageCropper
          isOpen={isCropperOpen}
          imageSrc={rawImageSrc}
          onClose={() => setIsCropperOpen(false)}
          onCrop={handleCropSave}
        />
      )}
    </div>
  )
}
