"use client"

import { useState } from "react"
import { Plus, Trash2, Sparkles, Layers, Check, Palette, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface GeneratedVariant {
  id?: string
  productCode: string
  productName: string
  modelName: string
  availableColors: string
  costPrice: number
  unitPrice: number
  dealerPrice: number
  interiorPrice: number
  projectPrice: number
  specialPrice: number
  stock: number
}

interface VariantMatrixBuilderProps {
  masterName: string
  categoryName: string
  baseCostPrice: number
  margins: { dealer: number; interior: number; direct: number; online: number }
  onChangeVariants: (variants: GeneratedVariant[]) => void
}

export function VariantMatrixBuilder({
  masterName,
  categoryName,
  baseCostPrice,
  margins,
  onChangeVariants,
}: VariantMatrixBuilderProps) {
  // Configurator options state
  const [subModelsInput, setSubModelsInput] = useState<string>("High Back, Mid Back, Low Back")
  const [colorsInput, setColorsInput] = useState<string>("Black, Tan Brown, Cream")
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([])

  const calculateSegmentPrices = (cost: number) => {
    const dealer = Number((cost / (1 - margins.dealer / 100)).toFixed(2))
    const interior = Number((cost / (1 - margins.interior / 100)).toFixed(2))
    const direct = Number((cost / (1 - margins.direct / 100)).toFixed(2))
    const online = Number((cost / (1 - margins.online / 100)).toFixed(2))
    return { dealer, interior, direct, online }
  }

  const handleGenerateMatrix = () => {
    const models = subModelsInput
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
    const colors = colorsInput
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)

    if (models.length === 0 && colors.length === 0) return

    const prefix = (masterName || "PRD")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5)

    const list: GeneratedVariant[] = []

    const effectiveModels = models.length > 0 ? models : ["Standard"]
    const effectiveColors = colors.length > 0 ? colors : ["Standard"]

    effectiveModels.forEach(model => {
      effectiveColors.forEach(color => {
        const modelCodePart = model !== "Standard" ? model.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3) : ""
        const colorCodePart = color !== "Standard" ? color.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) : ""
        
        const skuParts = [prefix, modelCodePart, colorCodePart].filter(Boolean)
        const sku = skuParts.join("-")

        let varTitle = masterName || "Master Product"
        if (model !== "Standard") varTitle += ` ${model}`
        if (color !== "Standard") varTitle += ` - ${color}`

        const cost = baseCostPrice > 0 ? baseCostPrice : 200.0
        const seg = calculateSegmentPrices(cost)

        list.push({
          productCode: sku,
          productName: varTitle,
          modelName: model !== "Standard" ? model : "",
          availableColors: color !== "Standard" ? color : "",
          costPrice: cost,
          unitPrice: seg.direct,
          dealerPrice: seg.dealer,
          interiorPrice: seg.interior,
          projectPrice: seg.direct,
          specialPrice: seg.online,
          stock: 10,
        })
      })
    })

    setGeneratedVariants(list)
    onChangeVariants(list)
  }

  const handleUpdateVariantRow = (index: number, field: keyof GeneratedVariant, val: any) => {
    const updated = [...generatedVariants]
    let parsedVal = val
    if (field === "costPrice" || field === "unitPrice" || field === "stock") {
      const p = parseFloat(val)
      parsedVal = isNaN(p) ? 0 : p
    }

    updated[index] = { ...updated[index], [field]: parsedVal }

    if (field === "costPrice") {
      const cost = parsedVal as number
      const seg = calculateSegmentPrices(cost)
      updated[index].dealerPrice = seg.dealer
      updated[index].interiorPrice = seg.interior
      updated[index].projectPrice = seg.direct
      updated[index].unitPrice = seg.direct
      updated[index].specialPrice = seg.online
    }

    setGeneratedVariants(updated)
    onChangeVariants(updated)
  }

  const handleRemoveVariantRow = (index: number) => {
    const updated = generatedVariants.filter((_, i) => i !== index)
    setGeneratedVariants(updated)
    onChangeVariants(updated)
  }

  const handleAddCustomRow = () => {
    const prefix = (masterName || "PRD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5)
    const sku = `${prefix}-VAR-${generatedVariants.length + 1}`
    const cost = baseCostPrice > 0 ? baseCostPrice : 200.0
    const seg = calculateSegmentPrices(cost)

    const newVar: GeneratedVariant = {
      productCode: sku,
      productName: `${masterName || "Master Product"} Variant ${generatedVariants.length + 1}`,
      modelName: "Custom Model",
      availableColors: "Custom Color",
      costPrice: cost,
      unitPrice: seg.direct,
      dealerPrice: seg.dealer,
      interiorPrice: seg.interior,
      projectPrice: seg.direct,
      specialPrice: seg.online,
      stock: 5,
    }

    const updated = [...generatedVariants, newVar]
    setGeneratedVariants(updated)
    onChangeVariants(updated)
  }

  return (
    <div className="space-y-6">
      {/* Configurator Input Controls */}
      <div className="bg-muted/30 border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Configurable Variants Generator
          </h3>
          <span className="text-[10px] text-muted-foreground font-medium">
            Comma-separated values to auto-build variants matrix
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Sub-Models / Lines
            </label>
            <Input
              placeholder="e.g. High Back, Mid Back, Low Back"
              value={subModelsInput}
              onChange={(e) => setSubModelsInput(e.target.value)}
              className="text-xs bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" />
              Colors / Finishes
            </label>
            <Input
              placeholder="e.g. Black, Tan Brown, Cream, Walnut"
              value={colorsInput}
              onChange={(e) => setColorsInput(e.target.value)}
              className="text-xs bg-background"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={handleGenerateMatrix}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs cursor-pointer h-9 px-4 rounded-xl flex items-center gap-1.5 shadow"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate Variants Matrix ({generatedVariants.length > 0 ? "Re-generate" : "Build Matrix"})
          </Button>
        </div>
      </div>

      {/* Generated Variants Table */}
      {generatedVariants.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-primary" />
              Configured Variants ({generatedVariants.length})
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomRow}
              className="h-7 text-xs rounded-lg cursor-pointer"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Single Variant
            </Button>
          </div>

          <div className="border rounded-xl overflow-hidden bg-background">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">SKU Code</th>
                    <th className="p-3">Variant Name</th>
                    <th className="p-3">Sub-Model</th>
                    <th className="p-3">Color / Finish</th>
                    <th className="p-3 text-right">Cost (AED)</th>
                    <th className="p-3 text-right">Selling (AED)</th>
                    <th className="p-3 text-center">Stock</th>
                    <th className="p-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {generatedVariants.map((varItem, index) => (
                    <tr key={index} className="hover:bg-muted/20">
                      <td className="p-2.5">
                        <Input
                          value={varItem.productCode}
                          onChange={(e) => handleUpdateVariantRow(index, "productCode", e.target.value)}
                          className="h-8 text-xs font-mono font-bold w-32"
                        />
                      </td>
                      <td className="p-2.5">
                        <Input
                          value={varItem.productName}
                          onChange={(e) => handleUpdateVariantRow(index, "productName", e.target.value)}
                          className="h-8 text-xs font-medium"
                        />
                      </td>
                      <td className="p-2.5">
                        <Input
                          value={varItem.modelName}
                          onChange={(e) => handleUpdateVariantRow(index, "modelName", e.target.value)}
                          className="h-8 text-xs w-28"
                        />
                      </td>
                      <td className="p-2.5">
                        <Input
                          value={varItem.availableColors}
                          onChange={(e) => handleUpdateVariantRow(index, "availableColors", e.target.value)}
                          className="h-8 text-xs w-28"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <Input
                          type="number"
                          min="0"
                          value={varItem.costPrice}
                          onChange={(e) => handleUpdateVariantRow(index, "costPrice", e.target.value)}
                          className="h-8 text-xs text-right w-24 font-semibold"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <span className="font-bold text-primary font-mono text-xs">
                          AED {varItem.projectPrice?.toFixed(2) || "0.00"}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <Input
                          type="number"
                          min="0"
                          value={varItem.stock}
                          onChange={(e) => handleUpdateVariantRow(index, "stock", e.target.value)}
                          className="h-8 text-xs text-center w-20 font-bold"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveVariantRow(index)}
                          className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
