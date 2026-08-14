"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

  const handleSwatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file must be smaller than 10MB")
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setCropSource(reader.result)
        setCropperOpen(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Material Name is required")
      return
    }

    const finalCategory = "Custom"
    const finalCode = code.trim() ? code.trim().toUpperCase() : `CUST-${Math.floor(1000 + Math.random() * 9000)}`

    setSubmitting(true)
    try {
      if (saveTarget === "MASTER_LIBRARY" && isAuthorizedToSaveLibrary) {
        // Save to central library API
        const res = await fetch("/api/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
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
        toast.success(`Saved "${name}" to Master Material Library & Quotation!`)

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
          name: name.trim(),
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-border">
        {/* Header */}
        <DialogHeader className="pb-3 border-b bg-muted/20 -mx-6 -mt-6 p-6 shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2.5 text-foreground">
            <div className="h-9 w-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <span>Create Custom Material & Finish</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Add project-specific swatches or add new finishes to the master library.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col p-6 space-y-6">
          {/* Streamlined 2-Column Split Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start flex-1">
            {/* Left Column (42% Width): Swatch Image Hub */}
            <div className="md:col-span-5 space-y-3 bg-muted/20 p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <ImageIcon className="h-3.5 w-3.5 text-orange-500" />
                  Material Image
                </span>
                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  1:1 Square Ratio
                </span>
              </div>

              {/* Main Swatch Image Upload Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Material Swatch Image *</Label>
                  {swatchUrl && (
                    <button type="button" onClick={() => setSwatchUrl("")} className="text-[10px] text-destructive hover:underline font-medium">
                      Remove
                    </button>
                  )}
                </div>

                {swatchUrl ? (
                  <div className="relative group rounded-xl border-2 border-orange-500/30 bg-card p-2 flex flex-col items-center justify-center overflow-hidden shadow-xs">
                    <div className="h-44 w-full rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center relative">
                      <img src={swatchUrl} alt="Swatch preview" className="max-h-full max-w-full object-contain" />
                      
                      {/* Hover Overlay Crop Action */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 backdrop-blur-xs">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setCropSource(swatchUrl)
                            setCropperOpen(true)
                          }}
                          className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold h-8 px-3 gap-1.5"
                        >
                          <Crop className="h-3.5 w-3.5" /> Adjust & Crop
                        </Button>
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between mt-2 pt-2 border-t text-[11px] text-muted-foreground">
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Swatch Ready
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCropSource(swatchUrl)
                          setCropperOpen(true)
                        }}
                        className="h-6 text-[11px] text-orange-600 hover:text-orange-700 px-2 font-medium"
                      >
                        <Crop className="h-3 w-3 mr-1" /> Re-crop
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 w-full rounded-xl border-2 border-dashed border-border hover:border-orange-500/50 bg-card hover:bg-muted/30 transition-all flex flex-col items-center justify-center text-center p-4 relative cursor-pointer group">
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">Upload Swatch Image</p>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-[180px]">
                      Click or drag photo. Includes instant square cropper tool.
                    </p>
                    <Input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleSwatchUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (58% Width): Material Name, Code, and Save Location Cards */}
            <div className="md:col-span-7 space-y-5">
              {/* Material Name & Material Code */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-foreground font-semibold">Material Name *</Label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Custom Grey Felt, Walnut Veneer, Matte Black Fabric"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-foreground font-semibold">Material Code (Optional)</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="AUTO-GENERATED IF EMPTY (E.G. CUST-2394)"
                    className="text-xs h-9 font-mono uppercase"
                  />
                </div>
              </div>

              {/* Save Location Options */}
              <div className="space-y-2 pt-3 border-t">
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Save Location Option</span>
                  <span className="text-[10px] font-normal text-muted-foreground">Select material scope</span>
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1: Current Quotation Only */}
                  <div
                    onClick={() => setSaveTarget("QUOTE_ONLY")}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 relative ${
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
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
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
                    className={`p-3.5 rounded-xl border text-xs transition-all flex items-start gap-3 relative ${
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
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                        {isAuthorizedToSaveLibrary 
                          ? "Permanent master library entry. Reusable for all future quotations." 
                          : "Restricted: Requires Manager or Admin role."}
                      </p>
                    </div>
                  </div>
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

      {/* Image Cropper Modal */}
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
    </Dialog>
  )
}
