"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { 
  Palette, 
  Upload, 
  Loader2, 
  Lock, 
  Check, 
  Crop,
  ImageIcon,
  FileCheck,
  BookmarkPlus
} from "lucide-react"
import { ImageCropper } from "@/components/ui/image-cropper"

export interface CustomMaterialData {
  id: string
  name: string
  code: string
  category: string
  colorFinish?: string | null
  description?: string | null
  swatchUrl?: string | null
  referenceImageUrl?: string | null
  brand?: string | null
  isCustomQuoteOnly?: boolean
}

export interface CreateCustomMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  userRole: string
  onSaveCustom: (material: CustomMaterialData) => void
  onSavedToLibrary?: (newMaterial: any) => void
}

export function CreateCustomMaterialModal({
  isOpen,
  onClose,
  userRole,
  onSaveCustom,
  onSavedToLibrary,
}: CreateCustomMaterialModalProps) {
  const isAuthorizedToSaveLibrary = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER", "DESIGN_TEAM"].includes(userRole)

  // Form State - Streamlined to Material Image, Name, Code
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [swatchUrl, setSwatchUrl] = useState("")
  const [saveTarget, setSaveTarget] = useState<"QUOTE_ONLY" | "MASTER_LIBRARY">("QUOTE_ONLY")
  const [submitting, setSubmitting] = useState(false)

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropSource, setCropSource] = useState<string | null>(null)

  const compressSwatchImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const size = 300
        canvas.width = size
        canvas.height = size

        if (ctx) {
          const minDim = Math.min(img.width, img.height)
          const sx = (img.width - minDim) / 2
          const sy = (img.height - minDim) / 2
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
          resolve(canvas.toDataURL("image/jpeg", 0.85))
        } else {
          resolve(dataUrl)
        }
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })
  }

  const handleSwatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image file must be smaller than 15MB")
      return
    }
    const reader = new FileReader()
    reader.onloadend = async () => {
      if (typeof reader.result === "string") {
        const compressed = await compressSwatchImage(reader.result)
        setSwatchUrl(compressed)
        setCropSource(compressed)
        toast.success("Swatch image uploaded & optimized!")
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const rawCode = code.trim()
    const rawName = name.trim()

    if (!swatchUrl && !rawCode && !rawName) {
      toast.error("Please upload a swatch image or enter a material code/name")
      return
    }

    const finalCode = rawCode ? rawCode.toUpperCase() : ""
    const finalName = rawName
    const finalCategory = "Custom"

    setSubmitting(true)
    try {
      if (saveTarget === "MASTER_LIBRARY" && isAuthorizedToSaveLibrary) {
        // Save to central library API
        const res = await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: finalName,
            code: finalCode,
            category: finalCategory,
            description: null,
            swatchUrl: swatchUrl || null,
            brand: null,
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || "Failed to save material to library")
        }

        const libraryItem = await res.json()
        toast.success(`Saved "${finalName}" to Master Material Library & Quotation!`)

        if (onSavedToLibrary) {
          onSavedToLibrary(libraryItem)
        }

        onSaveCustom({
          id: libraryItem.id,
          name: libraryItem.name,
          code: libraryItem.code,
          category: libraryItem.category,
          swatchUrl: libraryItem.swatchUrl || null,
          isCustomQuoteOnly: false,
        })
      } else {
        // Save for current quotation only (client-side unique item)
        const customItem: CustomMaterialData = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: finalName,
          code: finalCode,
          category: finalCategory,
          swatchUrl: swatchUrl || null,
          isCustomQuoteOnly: true,
        }

        onSaveCustom(customItem)
        toast.success(`Custom material "${name}" added to quotation!`)
      }

      onClose()
      // Reset form
      setName("")
      setCode("")
      setSwatchUrl("")
      setSaveTarget("QUOTE_ONLY")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to create custom material")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-border shadow-2xl p-0">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
              <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <span>Create Custom Material & Finish</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Add project-specific swatches or add new finishes to the master library.
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* 1. Material Swatch Image Upload Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-orange-500" />
                  Material Swatch Image *
                </Label>
                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  1:1 Square Ratio
                </span>
              </div>

              {swatchUrl ? (
                <div className="relative group rounded-xl border-2 border-orange-500/30 bg-muted/20 p-3 flex items-center justify-between gap-4">
                  <div className="h-20 w-20 rounded-lg overflow-hidden bg-background border flex items-center justify-center shrink-0">
                    <img src={swatchUrl} alt="Swatch preview" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> Swatch Image Ready
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Cropped to square aspect ratio for PDF export.</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCropSource(swatchUrl)
                          setCropperOpen(true)
                        }}
                        className="h-7 text-xs font-semibold text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100 gap-1 px-2.5"
                      >
                        <Crop className="h-3 w-3" /> Adjust & Crop
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSwatchUrl("")}
                        className="h-7 text-xs text-destructive hover:text-destructive px-2"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <label 
                  htmlFor="swatch-file-input-id"
                  className="h-32 w-full rounded-xl border-2 border-dashed border-border hover:border-orange-500/50 bg-card hover:bg-muted/30 transition-all flex flex-col items-center justify-center text-center p-4 relative cursor-pointer group"
                >
                  <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-1.5 group-hover:scale-110 transition-transform">
                    <Upload className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Upload Swatch Image</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Click anywhere to browse photo from your device.
                  </p>
                  <input
                    id="swatch-file-input-id"
                    type="file"
                    accept="image/*"
                    onChange={handleSwatchUpload}
                    onClick={(e) => { (e.target as any).value = "" }}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {/* 2. Material Name & Code Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-semibold">Material Name (Optional)</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Custom Grey Felt, Walnut Veneer"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-semibold">Material Code (Optional)</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. OAK-01, MAT-100 (Optional)"
                  className="text-xs h-9 font-mono uppercase"
                />
              </div>
            </div>

            {/* 3. Save Location Option Cards */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Save Location Option</span>
                <span className="text-[10px] font-normal text-muted-foreground">Select material scope</span>
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Card 1: Current Quotation Only */}
                <div
                  onClick={() => setSaveTarget("QUOTE_ONLY")}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 relative ${
                    saveTarget === "QUOTE_ONLY"
                      ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 shadow-xs"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                    saveTarget === "QUOTE_ONLY" ? "border-orange-500 bg-orange-500 text-white" : "border-muted-foreground"
                  }`}>
                    {saveTarget === "QUOTE_ONLY" && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground flex items-center gap-1">
                      <FileCheck className="h-3.5 w-3.5 text-orange-600" />
                      Save for Current Quotation Only
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      Temporary swatch for this project only. Does not modify master library.
                    </p>
                  </div>
                </div>

                {/* Card 2: Master Library */}
                <div
                  onClick={() => {
                    if (isAuthorizedToSaveLibrary) {
                      setSaveTarget("MASTER_LIBRARY")
                    } else {
                      toast.info("Requires Manager or Admin role to add materials to the central master library.")
                    }
                  }}
                  className={`p-3 rounded-xl border text-xs transition-all flex items-start gap-3 relative ${
                    !isAuthorizedToSaveLibrary 
                      ? "opacity-60 bg-muted/20 cursor-not-allowed border-border" 
                      : saveTarget === "MASTER_LIBRARY"
                        ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 shadow-xs cursor-pointer"
                        : "border-border bg-card hover:bg-muted/40 cursor-pointer"
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                    saveTarget === "MASTER_LIBRARY" ? "border-orange-500 bg-orange-500 text-white" : "border-muted-foreground"
                  }`}>
                    {saveTarget === "MASTER_LIBRARY" && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <BookmarkPlus className="h-3.5 w-3.5 text-orange-600" />
                        Save to Material Library
                      </p>
                      {!isAuthorizedToSaveLibrary && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                      {isAuthorizedToSaveLibrary 
                        ? "Permanent master library entry. Reusable for all future quotations." 
                        : "Restricted: Requires Manager or Admin role."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <DialogFooter className="pt-4 border-t flex justify-between items-center shrink-0">
              <span className="text-xs text-muted-foreground">
                {saveTarget === "MASTER_LIBRARY" ? "Adding to central library & quotation" : "Attaching project custom swatch"}
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs h-9 px-4 flex items-center gap-1.5 shadow-sm"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {saveTarget === "MASTER_LIBRARY" ? "Save to Library & Add" : "Add to Quotation"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Modal rendered at root level with z-[99999] */}
      <ImageCropper
        isOpen={cropperOpen}
        imageSrc={cropSource}
        onClose={() => setCropperOpen(false)}
        onCrop={(croppedData) => {
          setSwatchUrl(croppedData)
          setCropperOpen(false)
          toast.success("Swatch image cropped successfully!")
        }}
      />
    </>
  )
}
