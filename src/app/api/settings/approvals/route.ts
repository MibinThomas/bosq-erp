import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { authOptions } from "@/lib/authOptions"
import { APPROVAL_MODULES, APPROVAL_MODULE_SETTING, getWorkflow, isApprovalModuleEnabled } from "@/lib/approval-engine"
import { CUSTOMER_SEGMENTS } from "@/lib/approval-policy"

export const dynamic = "force-dynamic"

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  if (user.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden: Only Super Admin can manage approvals." }, { status: 403 }) }
  }
  return { user: user as { id: string; name?: string } }
}

// GET: master switch, each module's workflow, and the lists the editor needs
export async function GET() {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const [masterEnabled, roles, users, departmentRows] = await Promise.all([
    isApprovalModuleEnabled(),
    prisma.role.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, email: true, role: true, department: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, department: { not: null } },
      select: { department: true },
      distinct: ["department"],
    }),
  ])

  const workflows = []
  for (const m of APPROVAL_MODULES) {
    workflows.push({ ...m, workflow: m.available ? await getWorkflow(m.module) : null })
  }

  const roleNames = Array.from(new Set(["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "MANAGER", ...roles.map((r) => r.name)]))
  return NextResponse.json({
    masterEnabled,
    workflows,
    roles: roleNames,
    users,
    departments: departmentRows.map((d) => d.department).filter(Boolean),
    customerSegments: CUSTOMER_SEGMENTS,
  })
}

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().finite().min(0).nullable()
)

const SaveSchema = z.object({
  masterEnabled: z.boolean(),
  workflow: z.object({
    module: z.string(),
    enabled: z.boolean(),
    levels: z.array(z.object({
      rank: z.number().int().min(1),
      name: z.string().trim().min(1, "Every level needs a name"),
      approverRoles: z.array(z.string()).default([]),
      approverUserIds: z.array(z.string()).default([]),
    })).min(1, "Add at least one approval level"),
    rules: z.array(z.object({
      name: z.string().trim().min(1, "Every rule needs a name"),
      isActive: z.boolean().default(true),
      levelRank: z.number().int().min(1),
      minDiscountPct: optionalNumber,
      minAmount: optionalNumber,
      maxMarginPct: z.preprocess(
        (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
        z.number().finite().min(-100).max(100).nullable()
      ),
      customerSegments: z.array(z.string()).default([]),
      departments: z.array(z.string()).default([]),
      projectKeyword: z.string().trim().nullable().optional(),
    })),
  }),
})

// PUT: save the master switch and one module's workflow (levels and rules are replaced)
export async function PUT(request: Request) {
  const auth = await requireSuperAdmin()
  if (auth.error) return auth.error

  const parsed = SaveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid approval settings" }, { status: 400 })
  }
  const { masterEnabled, workflow } = parsed.data
  const moduleDef = APPROVAL_MODULES.find((m) => m.module === workflow.module)
  if (!moduleDef?.available) {
    return NextResponse.json({ error: "This module isn't available for approvals yet." }, { status: 400 })
  }

  const ranks = workflow.levels.map((l) => l.rank)
  if (new Set(ranks).size !== ranks.length) {
    return NextResponse.json({ error: "Each approval level must have a different rank." }, { status: 400 })
  }
  for (const l of workflow.levels) {
    if (l.approverRoles.length === 0 && l.approverUserIds.length === 0) {
      return NextResponse.json({ error: `Level "${l.name}" needs at least one approver role or user.` }, { status: 400 })
    }
  }
  for (const r of workflow.rules) {
    if (!ranks.includes(r.levelRank)) {
      return NextResponse.json({ error: `Rule "${r.name}" points to a level that doesn't exist.` }, { status: 400 })
    }
  }

  const before = await getWorkflow(workflow.module)
  const wasEnabled = await isApprovalModuleEnabled()

  await prisma.$transaction(async (tx) => {
    await tx.systemSetting.upsert({
      where: { key: APPROVAL_MODULE_SETTING },
      update: { value: masterEnabled ? "true" : "false" },
      create: { key: APPROVAL_MODULE_SETTING, value: masterEnabled ? "true" : "false" },
    })
    const wf = await tx.approvalWorkflow.upsert({
      where: { module: workflow.module },
      update: { enabled: workflow.enabled },
      create: { module: workflow.module, name: `${moduleDef.label} approval`, enabled: workflow.enabled },
    })
    await tx.approvalRule.deleteMany({ where: { workflowId: wf.id } })
    await tx.approvalLevel.deleteMany({ where: { workflowId: wf.id } })
    const levelIdByRank = new Map<number, string>()
    for (const l of workflow.levels) {
      const created = await tx.approvalLevel.create({
        data: {
          workflowId: wf.id,
          rank: l.rank,
          name: l.name,
          approverRoles: l.approverRoles,
          approverUserIds: l.approverUserIds,
        },
      })
      levelIdByRank.set(l.rank, created.id)
    }
    for (const r of workflow.rules) {
      await tx.approvalRule.create({
        data: {
          workflowId: wf.id,
          levelId: levelIdByRank.get(r.levelRank)!,
          name: r.name,
          isActive: r.isActive,
          minDiscountPct: r.minDiscountPct,
          minAmount: r.minAmount,
          maxMarginPct: r.maxMarginPct,
          customerSegments: r.customerSegments,
          departments: r.departments,
          projectKeyword: r.projectKeyword || null,
        },
      })
    }
    await tx.activityLog.create({
      data: {
        userId: auth.user.id,
        action: "APPROVAL_SETTINGS_UPDATED",
        entityType: "APPROVAL_SETTINGS",
        entityId: wf.id,
        details: [
          wasEnabled !== masterEnabled ? `Approval Module turned ${masterEnabled ? "ON" : "OFF"}.` : null,
          before.enabled !== workflow.enabled ? `${moduleDef.label} approvals turned ${workflow.enabled ? "ON" : "OFF"}.` : null,
          `${moduleDef.label}: ${workflow.levels.length} level(s), ${workflow.rules.length} rule(s).`,
        ].filter(Boolean).join(" "),
      },
    })
  })

  return NextResponse.json({ success: true, masterEnabled, workflow: await getWorkflow(workflow.module) })
}
