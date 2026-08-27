import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, notes } = body

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    })

    if (!user) {
      // Return friendly generic message for security
      return NextResponse.json({
        success: true,
        message: "If an account exists with that email, a password reset request has been submitted to the Super Admin."
      })
    }

    // Check if there is already a PENDING request for this user
    const existingPending = await prisma.passwordResetRequest.findFirst({
      where: {
        userId: user.id,
        status: "PENDING"
      }
    })

    if (existingPending) {
      return NextResponse.json({
        success: true,
        message: "A password reset request is already pending approval by the Super Admin."
      })
    }

    // Create PasswordResetRequest
    const resetRequest = await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        userEmail: user.email || cleanEmail,
        userName: user.name || "User",
        status: "PENDING",
        notes: notes || "Forgot password request from login page"
      }
    })

    // Notify Super Admin users
    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN", deletedAt: null },
      select: { id: true }
    })

    for (const sa of superAdmins) {
      await prisma.notification.create({
        data: {
          userId: sa.id,
          title: "Password Reset Request",
          message: `User ${user.name || user.email} has requested a password reset.`,
          type: "SYSTEM",
          link: "/settings/access-control"
        }
      })
    }

    // Audit Log
    await prisma.accessControlLog.create({
      data: {
        userId: user.id,
        targetUserId: user.id,
        action: "REQUEST_PASSWORD_RESET",
        details: `Submitted password reset request for ${user.email}`
      }
    })

    return NextResponse.json({
      success: true,
      message: "Password reset request submitted successfully! Your Super Admin has been notified."
    })
  } catch (error: any) {
    console.error("POST /api/auth/request-password-reset failed:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
