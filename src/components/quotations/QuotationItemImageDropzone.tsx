"use client"

import React, { useState, useRef, useCallback } from "react"
import {
  UploadCloud,
  X,
  Loader2,
  Image as ImageIcon,
  Crop,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle2,
  FileImage
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ImageCropper } from "@/components/ui/image-cropper"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml"
]

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

interface QuotationItemImageDropzoneProps {
  value: string | null | undefined
  onChange: (url: string) => void
  onRemove: () => void
  itemIndex: number
  disabled?: boolean
  className?: string
}

export function QuotationItemImageDropzone({
  value,
  onChange,
  onRemove,
  itemIndex,
  disabled = false,
  className
}: QuotationItemImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  
  // Image Cropper States
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)

  // Zoom Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validate File Format and Size
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const fileNameLower = file.name.toLowerCase()
    const isExtensionValid = ALLOWED_EXTENSIONS.some(ext => fileNameLower.endsWith(ext))
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type) || file.type.startsWith("image/")

    if (!isExtensionValid && !isMimeValid) {
      return {
        valid: false,
        error: "Invalid file format. Please upload JPG, PNG, WEBP, GIF, or SVG images."
      }
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: "File size exceeds 10MB limit. Please select a smaller file."
      }
    }

    return { valid: true }
  }

  // Upload File to Server API (/api/upload?type=product)
  const uploadFileToServer = async (fileOrBlob: File | Blob, originalFileName?: string): Promise<string> => {
    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      const filename = originalFileName || (fileOrBlob instanceof File ? fileOrBlob.name : "custom-product.jpg")
      formData.append("file", fileOrBlob, filename)

      const response = await fetch("/api/upload?type=product", {
        method: "POST",
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Upload failed with status code ${response.status}`)
      }

      const data = await response.json()
      if (!data.url) {
        throw new Error("Invalid response from upload server")
      }

      return data.url
    } catch (err: any) {
      console.error("[IMAGE UPLOAD ERROR]", err)
      const errorMsg = err.message || "Failed to upload image. Please check your connection and try again."
      setUploadError(errorMsg)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  // Process selected or dropped file
  const processFile = (file: File) => {
    setUploadError(null)
    const validation = validateFile(file)

    if (!validation.valid) {
      toast.error(validation.error || "File validation failed")
      setUploadError(validation.error || "File validation failed")
      return
    }

    setPendingFile(file)

    // Read Data URL for Cropper
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        setRawImageSrc(result)
        setIsCropperOpen(true)
      }
    }
    reader.onerror = () => {
      toast.error("Failed to read image file")
      setUploadError("Failed to read image file")
    }
    reader.readAsDataURL(file)
  }

  // Handle Drag Over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    e.dataTransfer.dropEffect = "copy"
    setIsDragging(true)
  }, [disabled])

  // Handle Drag Enter
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    setIsDragging(true)
  }, [disabled])

  // Handle Drag Leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  // Handle File Drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    if (files.length > 1) {
      toast.info("Multiple files detected. Uploading the first image.")
    }

    processFile(files[0])
  }, [disabled])

  // Handle Manual File Selection (Browse)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (files.length > 1) {
      toast.info("Multiple files selected. Uploading the first image.")
    }

    processFile(files[0])

    // Reset input value to allow re-selecting same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Save Cropped Image
  const handleCropSave = async (croppedBase64: string) => {
    setIsCropperOpen(false)

    try {
      // Convert base64 to blob
      const res = await fetch(croppedBase64)
      const croppedBlob = await res.blob()

      const uploadedUrl = await uploadFileToServer(
        croppedBlob,
        pendingFile?.name || `custom-product-item-${itemIndex + 1}.jpg`
      )

      onChange(uploadedUrl)
      setPendingFile(null)
      toast.success("Product image uploaded successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to upload cropped image")
    } finally {
      setRawImageSrc(null)
    }
  }

  // Retry Failed Upload
  const handleRetryUpload = async () => {
    if (!pendingFile) {
      toast.error("No pending file to retry. Please select an image file.")
      return
    }

    try {
      const uploadedUrl = await uploadFileToServer(pendingFile)
      onChange(uploadedUrl)
      setPendingFile(null)
      toast.success("Product image uploaded successfully!")
    } catch (err: any) {
      toast.error(err.message || "Retry failed. Please check network or file format.")
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Existing Image View */}
      {value ? (
        <div className="relative group shrink-0 h-24 w-24 sm:h-28 sm:w-28 border-2 border-border rounded-xl overflow-hidden bg-background shadow-xs transition-all hover:border-primary/60">
          <img
            src={value}
            alt={`Product ${itemIndex + 1}`}
            className="object-cover w-full h-full"
          />

          {/* Loading Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center p-1 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary mb-1" />
              <span className="text-[10px] font-semibold text-muted-foreground">Uploading...</span>
            </div>
          )}

          {/* Hover Actions Bar */}
          {!isUploading && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-1.5 transition-opacity duration-200">
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPreviewOpen(true)}
                  className="h-6 w-6 rounded-md bg-black/40 hover:bg-black/80 text-white cursor-pointer"
                  title="Preview full image"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove()}
                  className="h-6 w-6 rounded-md bg-red-600/80 hover:bg-red-600 text-white cursor-pointer"
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex gap-1 w-full mt-auto">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRawImageSrc(value)
                    setIsCropperOpen(true)
                  }}
                  className="text-[10px] h-6 px-1.5 flex-1 bg-white/90 hover:bg-white text-slate-900 font-semibold cursor-pointer"
                >
                  <Crop className="h-3 w-3 mr-1" /> Crop
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] h-6 px-1.5 flex-1 bg-white/90 hover:bg-white text-slate-900 font-semibold cursor-pointer"
                >
                  Change
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty Dropzone State */
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={cn(
            "relative shrink-0 h-24 w-24 sm:h-28 sm:w-28 border-2 border-dashed rounded-xl p-2 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 bg-muted/20 hover:bg-muted/40 hover:border-primary/50 text-center select-none",
            isDragging && "border-primary bg-primary/10 ring-2 ring-primary/30 scale-102",
            disabled && "opacity-50 cursor-not-allowed",
            isUploading && "pointer-events-none opacity-80"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-[10px] font-semibold text-primary">Uploading...</span>
            </div>
          ) : isDragging ? (
            <div className="flex flex-col items-center justify-center gap-1">
              <UploadCloud className="h-6 w-6 text-primary animate-bounce" />
              <span className="text-[10px] font-bold text-primary">Drop Image Here</span>
            </div>
          ) : (
            <>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <UploadCloud className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-center leading-none gap-0.5">
                <span className="text-[10px] font-bold text-foreground">Upload Image</span>
                <span className="text-[9px] text-muted-foreground">Drag & drop or click</span>
              </div>
              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 text-muted-foreground uppercase font-mono">
                JPG, PNG, WEBP
              </Badge>
            </>
          )}
        </div>
      )}

      {/* Upload Error Alert & Retry Action */}
      {uploadError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] max-w-xs animate-in fade-in">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate">{uploadError}</span>
          {pendingFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetryUpload}
              disabled={isUploading}
              className="h-6 px-2 text-[10px] border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0 font-bold"
            >
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={isCropperOpen}
        onClose={() => {
          setIsCropperOpen(false)
          setRawImageSrc(null)
        }}
        imageSrc={rawImageSrc}
        onCrop={handleCropSave}
      />

      {/* Full-Size Zoom Preview Modal */}
      {value && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-[600px] p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <FileImage className="h-4 w-4 text-primary" />
                Product Image Preview - Item #{itemIndex + 1}
              </DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[380px] bg-black/5 rounded-lg overflow-hidden flex items-center justify-center p-2 border border-border">
              <img src={value} alt="Full Preview" className="object-contain max-h-full max-w-full rounded" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
