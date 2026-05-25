import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import path from "path"
import { writeFile, mkdir } from "fs/promises"
import fs from "fs"

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

    // If no Vercel Blob token, fallback to local storage (for local dev)
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const uploadDir = path.join(process.cwd(), "public", "uploads")
      if (!fs.existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }
      
      const filePath = path.join(uploadDir, filename)
      await writeFile(filePath, buffer)
      return NextResponse.json({ url: `/uploads/${filename}` })
    }

    // Otherwise, upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}

