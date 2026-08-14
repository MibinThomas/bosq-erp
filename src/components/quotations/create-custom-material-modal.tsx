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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { 
  Palette, 
  Upload, 
  X, 
  Loader2, 
  Lock, 
  Check, 
  Sparkles,
  FileImage,
  Layers,
  Crop
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

const CATEGORIES = [
  "Veneer",
  "Fabric",
  "Laminate",
  "Metal",
  "Glass",
  "Leather",
  "Paint",
  "Stone & Marble",
  "Powder Coat",
  "Other"
]

export function CreateCustomMaterialModal({
  isOpen,
  onClose,
  userRole,
  onSaveCustom,
  onSavedToLibrary,
}: CreateCustomMaterialModalProps) {
  const isAuthorizedToSaveLibrary = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER", "DESIGN_TEAM"].includes(userRole)

  // Form State
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [category, setCategory] = useState("Fabric")
  const [customCategory, setCustomCategory] = useState("")
  const [colorFinish, setColorFinish] = useState("")
  const [description, setDescription] = useState("")
  const [swatchUrl, setSwatchUrl] = useState("")
  const [referenceImageUrl, setReferenceImageUrl] = useState("")
  const [saveTarget, setSaveTarget] = useState<"QUOTE_ONLY" | "MASTER_LIBRARY">("QUOTE_ONLY")
  const [submitting, setSubmitting] = useState(false)

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<"swatch" | "reference">("swatch")

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
        setCropTarget("swatch")
        setCropperOpen(true)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setCropTarget("reference")
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

    const finalCategory = category === "Other" && customCategory.trim() ? customCategory.trim() : category
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
            description: description.trim() || (colorFinish ? `Color: ${colorFinish}` : null),
            swatchUrl: swatchUrl || null,
            brand: colorFinish.trim() || null,
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
          colorFinish: colorFinish.trim() || null,
          description: libraryItem.description || null,
          swatchUrl: libraryItem.swatchUrl || null,
          referenceImageUrl: referenceImageUrl || null,
          brand: libraryItem.brand || null,
          isCustomQuoteOnly: false,
        })
      } else {
        // Save for current quotation only (client-side unique item)
        const customItem: CustomMaterialData = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: name.trim(),
          code: finalCode,
          category: finalCategory,
          colorFinish: colorFinish.trim() || null,
          description: description.trim() || null,
          swatchUrl: swatchUrl || null,
          referenceImageUrl: referenceImageUrl || null,
          brand: colorFinish.trim() || null,
          isCustomQuoteOnly: true,
        }

        onSaveCustom(customItem)
        toast.success(`Custom material "${name}" added to quotation!`)
      }

      onClose()
      // Reset form
      setName("")
      setCode("")
      setCategory("Fabric")
      setCustomCategory("")
      setColorFinish("")
      setDescription("")
      setSwatchUrl("")
      setReferenceImageUrl("")
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
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Palette className="h-4 w-4 text-orange-500" />
            Create Custom Material & Finish
          </DialogTitle>
          <DialogDescription className="text-xs">
            Add custom finish details directly to your quotation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-1 space-y-4 overflow-y-auto flex-1">
          {/* Material Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-foreground font-semibold">Material Name *</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Custom Grey Felt, Walnut Veneer"
                className="text-xs h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-foreground font-semibold">Material Code (Optional)</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Auto-generated if empty (e.g. CUST-101)"
                className="text-xs h-9 font-mono uppercase"
              />
            </div>
          </div>

          {/* Category & Color / Finish Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-foreground font-semibold">Category *</Label>
              <Select value={category} onValueChange={(val) => val && setCategory(val)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-foreground font-semibold">Color / Finish Name (Optional)</Label>
              <Input
                value={colorFinish}
                onChange={(e) => setColorFinish(e.target.value)}
                placeholder="e.g. Matte Anthracite, Warm Sand"
                className="text-xs h-9"
              />
            </div>
          </div>

          {category === "Other" && (
            <div className="space-y-1">
              <Label className="text-xs text-foreground font-semibold">Custom Category Name *</Label>
              <Input
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Acoustic Panel, Mesh"
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs text-foreground font-semibold">Description / Remarks (Optional)</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 100% Wool composition, flame retardant treatment..."
              className="text-xs"
            />
          </div>

          {/* Swatch & Reference Image Upload Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
            {/* Swatch Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Swatch Image</Label>
                {swatchUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCropSource(swatchUrl)
                        setCropTarget("swatch")
                        setCropperOpen(true)
                      }}
                      className="text-[10px] text-orange-600 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <Crop className="h-2.5 w-2.5" /> Crop Image
                    </button>
                    <span className="text-[10px] text-muted-foreground">|</span>
                    <button type="button" onClick={() => setSwatchUrl("")} className="text-[10px] text-destructive hover:underline">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {swatchUrl ? (
                <div className="h-24 w-full rounded border bg-muted p-1 flex items-center justify-center overflow-hidden relative group">
                  <img src={swatchUrl} alt="Swatch preview" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-20 w-full rounded border border-dashed flex flex-col items-center justify-center text-xs text-muted-foreground bg-muted/20">
                  <Upload className="h-4 w-4 mb-1 text-muted-foreground" />
                  <span>Upload Swatch Image</span>
                </div>
              )}

              <Input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleSwatchUpload}
                className="text-xs h-8 file:mr-2 file:py-0.5 file:px-2 file:border-0 file:text-xs file:bg-muted"
              />
            </div>

            {/* Reference Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">Reference Image (Optional)</Label>
                {referenceImageUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCropSource(referenceImageUrl)
                        setCropTarget("reference")
                        setCropperOpen(true)
                      }}
                      className="text-[10px] text-orange-600 font-semibold hover:underline flex items-center gap-0.5"
                    >
                      <Crop className="h-2.5 w-2.5" /> Crop Image
                    </button>
                    <span className="text-[10px] text-muted-foreground">|</span>
                    <button type="button" onClick={() => setReferenceImageUrl("")} className="text-[10px] text-destructive hover:underline">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {referenceImageUrl ? (
                <div className="h-24 w-full rounded border bg-muted p-1 flex items-center justify-center overflow-hidden relative group">
                  <img src={referenceImageUrl} alt="Reference preview" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-20 w-full rounded border border-dashed flex flex-col items-center justify-center text-xs text-muted-foreground bg-muted/20">
                  <FileImage className="h-4 w-4 mb-1 text-muted-foreground" />
                  <span>Upload Ref Image</span>
                </div>
              )}

              <Input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleReferenceUpload}
                className="text-xs h-8 file:mr-2 file:py-0.5 file:px-2 file:border-0 file:text-xs file:bg-muted"
              />
            </div>
          </div>

          {/* Save Options Radio Section */}
          <div className="space-y-2 pt-3 border-t">
            <Label className="text-xs font-bold text-foreground">Save Location Option</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option 1: Current Quotation Only */}
              <div
                onClick={() => setSaveTarget("QUOTE_ONLY")}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                  saveTarget === "QUOTE_ONLY"
                    ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                  saveTarget === "QUOTE_ONLY" ? "border-orange-500 bg-orange-500 text-white" : "border-muted-foreground"
                }`}>
                  {saveTarget === "QUOTE_ONLY" && <Check className="h-2.5 w-2.5" />}
                </div>
                <div>
                  <p className="font-semibold text-foreground">Save for Current Quotation Only</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Temporary custom swatch for this project only. Does not modify master library.
                  </p>
                </div>
              </div>

              {/* Option 2: Save to Master Material Library */}
              <div
                onClick={() => {
                  if (isAuthorizedToSaveLibrary) {
                    setSaveTarget("MASTER_LIBRARY")
                  } else {
                    toast.info("Requires Manager or Admin role to add materials to the central master library.")
                  }
                }}
                className={`p-3 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${
                  !isAuthorizedToSaveLibrary 
                    ? "opacity-60 bg-muted/20 cursor-not-allowed border-border" 
                    : saveTarget === "MASTER_LIBRARY"
                      ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500 cursor-pointer"
                      : "border-border bg-card hover:bg-muted/40 cursor-pointer"
                }`}
              >
                <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                  saveTarget === "MASTER_LIBRARY" ? "border-orange-500 bg-orange-500 text-white" : "border-muted-foreground"
                }`}>
                  {saveTarget === "MASTER_LIBRARY" && <Check className="h-2.5 w-2.5" />}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-foreground">Save to Material Library</p>
                    {!isAuthorizedToSaveLibrary && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isAuthorizedToSaveLibrary 
                      ? "Permanent master library entry. Reusable for all future quotations." 
                      : "Restricted: Requires Manager or Admin role."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saveTarget === "MASTER_LIBRARY" ? "Save to Library & Add" : "Add to Quotation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={cropperOpen}
        imageSrc={cropSource}
        onClose={() => setCropperOpen(false)}
        onCrop={(croppedData) => {
          if (cropTarget === "swatch") {
            setSwatchUrl(croppedData)
          } else {
            setReferenceImageUrl(croppedData)
          }
          setCropperOpen(false)
          toast.success("Image cropped successfully!")
        }}
      />
    </Dialog>
  )
}
