import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = (session?.user as any)?.id
    const userRole = (session?.user as any)?.role
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN"

    // Only Admin can edit other users. Normal users can only edit themselves.
    if (!isAdmin && currentUserId !== id) {
      return NextResponse.json({ error: "Forbidden: Cannot edit other users" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      phone,
      designation,
      department,
      image,
      signature,
      // Admin only fields
      role,
      isActive
    } = body

    const updateData: any = {
      name,
      phone,
      designation,
      department,
      image,
      signature
    }

    // Only admins can update the role and active status
    if (isAdmin) {
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) {
        updateData.isActive = isActive;
        updateData.status = isActive ? "Active" : "Inactive";
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        image: true,
        signature: true,
        role: true,
        isActive: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Failed to update user:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentUserId = (session?.user as any)?.id
    const userRole = (session?.user as any)?.role

    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN" && currentUserId !== id) {
      return NextResponse.json({ error: "Forbidden: Cannot view other users" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        image: true,
        signature: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Failed to fetch user:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
