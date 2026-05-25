import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import path from "path"
import { writeFile, mkdir } from "fs/promises"
import fs from "fs"

export async function POST(request: Request) {
  try {
    console.log("[UPLOAD API] Starting upload request...");
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log("[UPLOAD API] Unauthorized: No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.log("[UPLOAD API] Session found for user:", session.user?.email);

    const formData = await request.formData()
    console.log("[UPLOAD API] Parsed formData");
    const file = formData.get("file") as File | null;
    
    if (!file) {
      console.log("[UPLOAD API] No file found in formData");
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }
    console.log("[UPLOAD API] File found:", file.name, file.type, file.size);

    // Generate unique filename
    const filename = file.name ? `upload-${Date.now()}-${file.name}` : `upload-${Date.now()}.jpg`;

    // If no Vercel Blob token, check if we are on Vercel
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      if (process.env.VERCEL || process.env.VERCEL_ENV) {
        console.log("[UPLOAD API] Vercel environment detected but no BLOB_READ_WRITE_TOKEN found.");
        return NextResponse.json({ error: "Vercel Blob store is not configured. Please link a Blob store in your Vercel dashboard." }, { status: 500 })
      }

      console.log("[UPLOAD API] BLOB_READ_WRITE_TOKEN not found, falling back to local file system");
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const uploadDir = path.join(process.cwd(), "public", "uploads")
      if (!fs.existsSync(uploadDir)) {
        console.log("[UPLOAD API] Creating upload directory:", uploadDir);
        await mkdir(uploadDir, { recursive: true })
      }
      
      const filePath = path.join(uploadDir, filename)
      console.log("[UPLOAD API] Writing file to:", filePath);
      await writeFile(filePath, buffer)
      console.log("[UPLOAD API] File successfully written locally.");
      return NextResponse.json({ url: `/uploads/${filename}` })
    }

    // Otherwise, upload to Vercel Blob
    console.log("[UPLOAD API] Uploading to Vercel Blob...");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error: any) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: error.message || "Failed to upload image" }, { status: 500 })
  }
}

