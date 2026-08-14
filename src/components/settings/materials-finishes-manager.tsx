"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { 
  Palette, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Loader2, 
  Image as ImageIcon,
  CheckCircle2,
  X,
  Upload,
  Layers,
  Tag,
  Crop
} from "lucide-react"
import { ImageCropper } from "@/components/ui/image-cropper"

export interface MaterialFinish {
  id: string
  name: string
  code: string
  category: string
  description?: string | null
  swatchUrl?: string | null
  brand?: string | null
  status: string
  createdAt: string
}

const DEFAULT_CATEGORIES = [
  "Wood Veneer",
  "Fabric",
  "Leather",
  "Metal",
  "Laminate",
  "Glass & Acrylic",
  "Marble & Stone",
  "Powder Coat Finish",
  "Other"
]

export function MaterialsFinishesManager({ userRole }: { userRole: string }) {
  const [materials, setMaterials] = useState<MaterialFinish[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<"add" | "edit">("add")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [formName, setFormName] = useState("")
  const [formCode, setFormCode] = useState("")
  const [formCategory, setFormCategory] = useState("Wood Veneer")
  const [customCategory, setCustomCategory] = useState("")
  const [formBrand, setFormBrand] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formSwatchUrl, setFormSwatchUrl] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)

  const isAuthorized = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER", "DESIGN_TEAM"].includes(userRole)

  // Image Cropper State
  const [cropperOpen, setCropperOpen] = useState(false)
  const [cropSource, setCropSource] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file must be smaller than 10MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropSource(reader.result)
        setCropperOpen(true)
      }
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/materials")
      if (res.ok) {
        const data = await res.json()
        setMaterials(data)
      } else {
        toast.error("Failed to load materials library")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to fetch materials")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAddModal = () => {
    setModalMode("add")
    setEditingId(null)
    setFormName("")
    setFormCode("")
    setFormCategory("Wood Veneer")
    setCustomCategory("")
    setFormBrand("")
    setFormDescription("")
    setFormSwatchUrl("")
    setShowModal(true)
  }

  const handleOpenEditModal = (item: MaterialFinish) => {
    setModalMode("edit")
    setEditingId(item.id)
    setFormName(item.name)
    setFormCode(item.code)
    if (DEFAULT_CATEGORIES.includes(item.category)) {
      setFormCategory(item.category)
      setCustomCategory("")
    } else {
      setFormCategory("Other")
      setCustomCategory(item.category)
    }
    setFormBrand(item.brand || "")
    setFormDescription(item.description || "")
    setFormSwatchUrl(item.swatchUrl || "")
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formCode.trim()) {
      toast.error("Material Name and Code are required")
      return
    }

    const finalCategory = formCategory === "Other" && customCategory.trim() ? customCategory.trim() : formCategory

    setSubmitting(true)
    try {
      const url = modalMode === "add" ? "/api/materials" : `/api/materials/${editingId}`
      const method = modalMode === "add" ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          code: formCode.trim(),
          category: finalCategory,
          brand: formBrand.trim() || null,
          description: formDescription.trim() || null,
          swatchUrl: formSwatchUrl || null
        })
      })

      if (res.ok) {
        toast.success(modalMode === "add" ? "Material finish added successfully!" : "Material finish updated!")
        setShowModal(false)
        fetchMaterials()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save material finish")
      }
    } catch (err: any) {
      console.error(err)
      toast.error("Error saving material finish")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the materials library?`)) return

    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success(`Deleted "${name}"`)
        fetchMaterials()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to delete material")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error deleting material")
    }
  }

  const filteredMaterials = materials.filter(m => {
    const matchesCategory = selectedCategory === "all" || m.category.toLowerCase() === selectedCategory.toLowerCase()
    const matchesSearch = !searchQuery.trim() || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.brand && m.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  // Unique categories in list
  const availableCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...materials.map(m => m.category)]))

  return (
    <Card className="bg-slate-950 border-slate-800 text-white shadow-2xl">
      <CardHeader className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <Palette className="text-orange-500 h-5 w-5" />
            Materials & Finishes Library
          </CardTitle>
          <CardDescription className="text-slate-400">
            Centralized swatch library for furniture veneers, fabrics, metals, and custom finishes.
          </CardDescription>
        </div>
        {isAuthorized && (
          <Button 
            onClick={handleOpenAddModal} 
            className="bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-2 font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add Material Finish
          </Button>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, name, brand, or description..."
              className="bg-slate-900 border-slate-800 text-slate-200 pl-9 focus-visible:ring-orange-600"
            />
          </div>

          <div className="w-full sm:w-56">
            <Select value={selectedCategory} onValueChange={(val) => val && setSelectedCategory(val)}>
              <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                <SelectItem value="all">All Categories ({materials.length})</SelectItem>
                {availableCategories.map(cat => {
                  const count = materials.filter(m => m.category === cat).length
                  return (
                    <SelectItem key={cat} value={cat}>
                      {cat} {count > 0 ? `(${count})` : ""}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
            <Palette className="mx-auto h-10 w-10 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Material Finishes Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery || selectedCategory !== "all" 
                ? "Try adjusting your search query or category filter." 
                : "Get started by adding your first material swatch code to the library."}
            </p>
            {isAuthorized && !searchQuery && selectedCategory === "all" && (
              <Button 
                onClick={handleOpenAddModal} 
                variant="outline" 
                size="sm" 
                className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add First Material
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMaterials.map(mat => (
              <div 
                key={mat.id}
                className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group"
              >
                <div>
                  {/* Swatch Image Preview */}
                  <div className="h-32 w-full bg-slate-950 flex items-center justify-center border-b border-slate-800/80 relative overflow-hidden">
                    {mat.swatchUrl ? (
                      <img 
                        src={mat.swatchUrl} 
                        alt={mat.name} 
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-600">
                        <ImageIcon className="h-8 w-8 mb-1" />
                        <span className="text-[10px]">No Swatch Image</span>
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900/90 text-orange-400 border border-slate-700 shadow-sm">
                      {mat.code}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">{mat.name}</h4>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {mat.category}
                      </span>
                      {mat.brand && (
                        <span className="px-2 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-900/50">
                          {mat.brand}
                        </span>
                      )}
                    </div>

                    {mat.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 pt-1 font-sans">
                        {mat.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {isAuthorized && (
                  <div className="p-3 pt-0 flex items-center justify-end gap-1.5 border-t border-slate-800/40 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(mat)}
                      className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 px-2"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(mat.id, mat.name)}
                      className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-orange-500" />
                  {modalMode === "add" ? "Add Material / Finish Swatch" : "Edit Material / Finish"}
                </h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
                {/* Name */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Material Name *</Label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Natural Oak Veneer, Grey Tweed Fabric"
                    className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-orange-600 text-xs"
                  />
                </div>

                {/* Code & Category Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Material Code *</Label>
                    <Input
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="e.g. OV-101, GF-205"
                      className="bg-slate-900 border-slate-800 text-slate-100 font-mono focus-visible:ring-orange-600 text-xs uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Category *</Label>
                    <Select value={formCategory} onValueChange={(val) => val && setFormCategory(val)}>
                      <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100 text-xs">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 text-xs">
                        {DEFAULT_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Category if "Other" */}
                {formCategory === "Other" && (
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-300">Custom Category Name *</Label>
                    <Input
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Acoustic Felt, Brass Inlay"
                      className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-orange-600 text-xs"
                    />
                  </div>
                )}

                {/* Brand / Manufacturer */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Brand / Manufacturer (Optional)</Label>
                  <Input
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Egger, Kvadrat, Formica"
                    className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-orange-600 text-xs"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-300">Description / Specifications (Optional)</Label>
                  <Textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Matte finish crown cut veneer with clear polyurethane coating..."
                    className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-orange-600 text-xs"
                  />
                </div>

                {/* Swatch Image Upload */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <Label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                    <span>Swatch Image</span>
                    {formSwatchUrl && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCropSource(formSwatchUrl)
                            setCropperOpen(true)
                          }}
                          className="text-[10px] text-orange-400 font-semibold hover:underline flex items-center gap-0.5"
                        >
                          <Crop className="h-2.5 w-2.5" /> Crop Image
                        </button>
                        <span className="text-[10px] text-slate-600">|</span>
                        <button 
                          type="button" 
                          onClick={() => setFormSwatchUrl("")}
                          className="text-[10px] text-red-400 hover:underline"
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </Label>

                  {formSwatchUrl ? (
                    <div className="h-28 w-full rounded-lg bg-slate-900 border border-slate-800 p-1 flex items-center justify-center overflow-hidden relative">
                      <img src={formSwatchUrl} alt="Swatch preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-24 w-full rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center text-xs text-slate-500 bg-slate-900/30">
                      <Upload className="h-5 w-5 mb-1 text-slate-500" />
                      <span>Upload Swatch Image</span>
                      <span className="text-[10px] text-slate-600">(PNG, JPG, WEBP max 5MB)</span>
                    </div>
                  )}

                  <Input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="bg-slate-900 border-slate-800 text-xs text-slate-400 file:bg-slate-800 file:text-slate-200 file:border-0 file:rounded file:px-2.5 file:py-1 file:mr-3 cursor-pointer"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={submitting || uploadingImage}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {modalMode === "add" ? "Save to Library" : "Update Material"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
