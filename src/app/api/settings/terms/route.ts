import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const [paymentTerms, termsConditions] = await Promise.all([
      prisma.paymentTerm.findMany({ orderBy: { name: "asc" } }),
      prisma.termsCondition.findMany({ orderBy: { title: "asc" } })
    ])

    return NextResponse.json({ paymentTerms, termsConditions })
  } catch (error) {
    console.error("GET /api/settings/terms failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await request.json()
    const { type, name, title, description, content, isDefault } = body

    if (!type) {
      return NextResponse.json({ error: "Type is required ('payment' or 'condition')" }, { status: 400 })
    }

    if (type === "payment") {
      if (!name) {
        return NextResponse.json({ error: "Name is required for payment terms" }, { status: 400 })
      }
      
      // If setting as default, unset others first
      if (isDefault) {
        await prisma.paymentTerm.updateMany({
          data: { isDefault: false }
        })
      }

      const term = await prisma.paymentTerm.create({
        data: {
          name,
          description: description || "",
          isDefault: !!isDefault
        }
      })
      
      return NextResponse.json(term)
    } else if (type === "condition") {
      if (!title || !content) {
        return NextResponse.json({ error: "Title and content are required for terms & conditions" }, { status: 400 })
      }

      const cond = await prisma.termsCondition.create({
        data: {
          title,
          content,
          isDefault: !!isDefault
        }
      })
      
      return NextResponse.json(cond)
    } else {
      return NextResponse.json({ error: "Invalid type specified" }, { status: 400 })
    }
  } catch (error) {
    console.error("POST /api/settings/terms failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const id = searchParams.get("id")

    if (!type || !id) {
      return NextResponse.json({ error: "Type and ID are required" }, { status: 400 })
    }

    if (type === "payment") {
      await prisma.paymentTerm.delete({ where: { id } })
    } else if (type === "condition") {
      await prisma.termsCondition.delete({ where: { id } })
    } else {
      return NextResponse.json({ error: "Invalid type specified" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/settings/terms failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
