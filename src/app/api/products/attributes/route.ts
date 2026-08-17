import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/authOptions"
import { hasPermission } from "@/lib/rbac"
import { getSetting } from "@/lib/settings"

const ATTRIBUTE_KEYS: Record<string, string> = {
  legTypes: "product_attr_leg_types",
  tableTopFinishes: "product_attr_table_top_finishes",
  dimensions: "product_attr_dimensions",
  chairTypes: "product_attr_chair_types",
  finishMaterials: "product_attr_finish_materials",
  storageOptions: "product_attr_storage_options",
  warranties: "product_attr_warranties",
}

const DEFAULT_ATTRIBUTES: Record<string, string[]> = {
  legTypes: ["Zen X Closed White", "Zen X Closed Black", "Loop Leg White", "Loop Leg Black", "A-Leg White", "A-Leg Black", "Wooden Leg Beech", "Wooden Leg Walnut"],
  tableTopFinishes: ["White", "Black", "Beech Wood", "Walnut Wood", "Oak Wood", "Grey Laminate"],
  dimensions: ["1200x600mm", "1400x700mm", "1600x800mm", "1800x900mm", "2000x1000mm", "1200x1200mm (2-Seater)", "2400x1200mm (4-Seater)"],
  chairTypes: ["High Back", "Medium Back", "Visitor", "Executive", "Task Chair", "Ergonomic Mesh"],
  finishMaterials: ["Powder Coated Steel", "MFC", "Laminate", "Wood Veneer", "Fabric Mesh", "Genuine Leather"],
  storageOptions: ["Mobile Pedestal", "Fixed Pedestal", "Wire Manager", "Cable Tray", "Partition Screen", "None"],
  warranties: ["1 Year", "2 Years", "3 Years", "5 Years", "10 Years", "Lifetime"],
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Fetch distinct attribute values from Product table
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        legType: true,
        tableTopFinish: true,
        dimensions: true,
        chairType: true,
        finishMaterial: true,
        storageOptions: true,
        warranty: true,
      }
    })

    const dbLegs = new Set<string>()
    const dbTableTops = new Set<string>()
    const dbDims = new Set<string>()
    const dbChairs = new Set<string>()
    const dbFinishes = new Set<string>()
    const dbStorage = new Set<string>()
    const dbWarranties = new Set<string>()

    for (const p of products) {
      if (p.legType) dbLegs.add(p.legType.trim())
      if (p.tableTopFinish) dbTableTops.add(p.tableTopFinish.trim())
      if (p.dimensions) dbDims.add(p.dimensions.trim())
      if (p.chairType) dbChairs.add(p.chairType.trim())
      if (p.finishMaterial) dbFinishes.add(p.finishMaterial.trim())
      if (p.storageOptions) dbStorage.add(p.storageOptions.trim())
      if (p.warranty) dbWarranties.add(p.warranty.trim())
    }

    // 2. Fetch custom attribute values from SystemSetting
    const customAttributes: Record<string, string[]> = {}

    for (const [typeKey, settingKey] of Object.entries(ATTRIBUTE_KEYS)) {
      const settingVal = await getSetting(settingKey)
      let customArr: string[] = []
      if (settingVal) {
        try {
          customArr = JSON.parse(settingVal)
        } catch {
          customArr = settingVal.split(",").map(s => s.trim()).filter(Boolean)
        }
      }

      const defaultArr = DEFAULT_ATTRIBUTES[typeKey] || []
      const mergedSet = new Set<string>([...defaultArr, ...customArr])

      if (typeKey === "legTypes") dbLegs.forEach(v => mergedSet.add(v))
      if (typeKey === "tableTopFinishes") dbTableTops.forEach(v => mergedSet.add(v))
      if (typeKey === "dimensions") dbDims.forEach(v => mergedSet.add(v))
      if (typeKey === "chairTypes") dbChairs.forEach(v => mergedSet.add(v))
      if (typeKey === "finishMaterials") dbFinishes.forEach(v => mergedSet.add(v))
      if (typeKey === "storageOptions") dbStorage.forEach(v => mergedSet.add(v))
      if (typeKey === "warranties") dbWarranties.forEach(v => mergedSet.add(v))

      customAttributes[typeKey] = Array.from(mergedSet).filter(Boolean).sort()
    }

    return NextResponse.json({
      success: true,
      attributes: customAttributes
    })
  } catch (error) {
    console.error("Failed to fetch product attributes:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role || ""
    const isSuperAdmin = userRole === "SUPER_ADMIN"

    const canManage = isSuperAdmin || (await hasPermission(userId, "PRODUCTS", "manage")) || (await hasPermission(userId, "PRODUCTS", "create"))
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage product attributes" }, { status: 403 })
    }

    const body = await request.json()
    const { attributeType, value } = body

    if (!attributeType || !ATTRIBUTE_KEYS[attributeType]) {
      return NextResponse.json({ error: "Invalid attribute type" }, { status: 400 })
    }

    if (!value || !value.trim()) {
      return NextResponse.json({ error: "Attribute value is required" }, { status: 400 })
    }

    const cleanVal = value.trim()
    const settingKey = ATTRIBUTE_KEYS[attributeType]

    const existingSetting = await prisma.systemSetting.findUnique({
      where: { key: settingKey }
    })

    let currentList: string[] = DEFAULT_ATTRIBUTES[attributeType] || []
    if (existingSetting?.value) {
      try {
        currentList = JSON.parse(existingSetting.value)
      } catch {
        currentList = existingSetting.value.split(",").map(s => s.trim()).filter(Boolean)
      }
    }

    if (currentList.some(v => v.toLowerCase() === cleanVal.toLowerCase())) {
      return NextResponse.json({ error: `Attribute "${cleanVal}" already exists in ${attributeType}.` }, { status: 400 })
    }

    const newList = [...currentList, cleanVal]

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(newList) },
      create: { key: settingKey, value: JSON.stringify(newList) }
    })

    await prisma.activityLog.create({
      data: {
        userId,
        action: "CREATED_PRODUCT_ATTRIBUTE",
        entityType: "PRODUCT",
        entityId: settingKey,
        details: `Added new attribute "${cleanVal}" to ${attributeType}`
      }
    })

    return NextResponse.json({ success: true, attributeType, value: cleanVal, attributes: newList })
  } catch (error) {
    console.error("Failed to create attribute:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role || ""
    const isSuperAdmin = userRole === "SUPER_ADMIN"

    const canEdit = isSuperAdmin || (await hasPermission(userId, "PRODUCTS", "edit")) || (await hasPermission(userId, "PRODUCTS", "manage"))
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit product attributes" }, { status: 403 })
    }

    const body = await request.json()
    const { attributeType, oldValue, newValue } = body

    if (!attributeType || !ATTRIBUTE_KEYS[attributeType] || !oldValue || !newValue || !newValue.trim()) {
      return NextResponse.json({ error: "Missing required parameters (attributeType, oldValue, newValue)" }, { status: 400 })
    }

    const cleanOld = oldValue.trim()
    const cleanNew = newValue.trim()
    const settingKey = ATTRIBUTE_KEYS[attributeType]

    // 1. Update SystemSetting list
    const existingSetting = await prisma.systemSetting.findUnique({
      where: { key: settingKey }
    })

    let currentList: string[] = DEFAULT_ATTRIBUTES[attributeType] || []
    if (existingSetting?.value) {
      try {
        currentList = JSON.parse(existingSetting.value)
      } catch {
        currentList = existingSetting.value.split(",").map(s => s.trim()).filter(Boolean)
      }
    }

    const updatedList = currentList.map(v => (v.toLowerCase() === cleanOld.toLowerCase() ? cleanNew : v))
    if (!updatedList.includes(cleanNew)) {
      updatedList.push(cleanNew)
    }

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(updatedList) },
      create: { key: settingKey, value: JSON.stringify(updatedList) }
    })

    // 2. Cascade update matching product fields
    const productFieldMap: Record<string, string> = {
      legTypes: "legType",
      tableTopFinishes: "tableTopFinish",
      dimensions: "dimensions",
      chairTypes: "chairType",
      finishMaterials: "finishMaterial",
      storageOptions: "storageOptions",
      warranties: "warranty",
    }

    const targetField = productFieldMap[attributeType]
    if (targetField) {
      await (prisma.product as any).updateMany({
        where: { [targetField]: cleanOld },
        data: { [targetField]: cleanNew }
      })
    }

    await prisma.activityLog.create({
      data: {
        userId,
        action: "UPDATED_PRODUCT_ATTRIBUTE",
        entityType: "PRODUCT",
        entityId: settingKey,
        details: `Renamed attribute in ${attributeType} from "${cleanOld}" to "${cleanNew}"`
      }
    })

    return NextResponse.json({ success: true, attributeType, oldValue: cleanOld, newValue: cleanNew, attributes: updatedList })
  } catch (error) {
    console.error("Failed to update attribute:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role || ""
    const isSuperAdmin = userRole === "SUPER_ADMIN"

    const canDelete = isSuperAdmin || (await hasPermission(userId, "PRODUCTS", "delete")) || (await hasPermission(userId, "PRODUCTS", "manage"))
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete product attributes" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const attributeType = searchParams.get("attributeType")
    const value = searchParams.get("value")

    if (!attributeType || !ATTRIBUTE_KEYS[attributeType] || !value) {
      return NextResponse.json({ error: "Missing required parameters (attributeType, value)" }, { status: 400 })
    }

    const cleanVal = value.trim()
    const settingKey = ATTRIBUTE_KEYS[attributeType]

    // 1. Remove from SystemSetting list
    const existingSetting = await prisma.systemSetting.findUnique({
      where: { key: settingKey }
    })

    let currentList: string[] = DEFAULT_ATTRIBUTES[attributeType] || []
    if (existingSetting?.value) {
      try {
        currentList = JSON.parse(existingSetting.value)
      } catch {
        currentList = existingSetting.value.split(",").map(s => s.trim()).filter(Boolean)
      }
    }

    const updatedList = currentList.filter(v => v.toLowerCase() !== cleanVal.toLowerCase())

    await prisma.systemSetting.upsert({
      where: { key: settingKey },
      update: { value: JSON.stringify(updatedList) },
      create: { key: settingKey, value: JSON.stringify(updatedList) }
    })

    // 2. Clear field from products if set
    const productFieldMap: Record<string, string> = {
      legTypes: "legType",
      tableTopFinishes: "tableTopFinish",
      dimensions: "dimensions",
      chairTypes: "chairType",
      finishMaterials: "finishMaterial",
      storageOptions: "storageOptions",
      warranties: "warranty",
    }

    const targetField = productFieldMap[attributeType]
    if (targetField) {
      await (prisma.product as any).updateMany({
        where: { [targetField]: cleanVal },
        data: { [targetField]: null }
      })
    }

    await prisma.activityLog.create({
      data: {
        userId,
        action: "DELETED_PRODUCT_ATTRIBUTE",
        entityType: "PRODUCT",
        entityId: settingKey,
        details: `Deleted attribute "${cleanVal}" from ${attributeType}`
      }
    })

    return NextResponse.json({ success: true, attributeType, value: cleanVal, attributes: updatedList })
  } catch (error) {
    console.error("Failed to delete attribute:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
