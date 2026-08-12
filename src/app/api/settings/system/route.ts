import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { hasPermission } from "@/lib/rbac"

const SETTING_KEYS = [
  "company_name",
  "company_address",
  "company_trn",
  "company_email",
  "sharepoint_tenant_id",
  "sharepoint_client_id",
  "sharepoint_client_secret",
  "sharepoint_site_id",
  "sharepoint_drive_id",
  "client_assign_to_uploader",
  "client_allow_sales_executive_assignment",
  "quotation_header_logo",
  "quotation_footer_logo",
  "quotation_watermark_logo",
  "quotation_promotional_image",
  "company_bank_details",
  "company_disclaimer_title",
  "company_disclaimer",
  "company_seal",
  "enable_workstation_configurator"
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canView = await hasPermission(userId, "SETTINGS", "view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view settings" }, { status: 403 })
    }

    const settings = await getSettings(SETTING_KEYS)
    return NextResponse.json(settings)
  } catch (error) {
    console.error("GET /api/settings/system failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }
    const userId = (session.user as any).id
    const canEdit = await hasPermission(userId, "SETTINGS", "edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit settings" }, { status: 403 })
    }

    const body = await request.json()

    // Save each key in db SystemSetting model
    for (const key of SETTING_KEYS) {
      if (body[key] !== undefined) {
        await prisma.systemSetting.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]) }
        })
      }
    }

    // Log this settings change activity
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATED_SYSTEM_SETTINGS",
        entityType: "SYSTEM_SETTING",
        entityId: "SYSTEM",
        details: "Updated system, company details, or SharePoint integration keys"
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/settings/system failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
