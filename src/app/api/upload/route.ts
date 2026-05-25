import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import path from "path"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.name) || ".jpg"
    const filename = `upload-${uniqueSuffix}${ext}`

    const blob = await put(filename, file, {
      access: "public",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}

