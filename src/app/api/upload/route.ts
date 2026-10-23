import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import path from "path"
import { writeFile, mkdir } from "fs/promises"
import fs from "fs"
import crypto from "crypto"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Detects the image type from the file's first bytes (the browser-supplied type can't be trusted). */
function sniffImageType(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg"
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png"
  if (b.length >= 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString("ascii"))) return "image/gif"
  if (b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp"
  return null
}

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

    // SVG is not accepted: it can carry scripts that run when the file is opened
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File is too large (max 10 MB)." }, { status: 400 })
    }
    const head = Buffer.from(await file.slice(0, 16).arrayBuffer())
    const detectedType = sniffImageType(head)
    if (!detectedType) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, WebP or GIF images are allowed." }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    let folder = "products" // default folder
    if (type === "avatar") {
      folder = "avatars"
    } else if (type === "signature") {
      folder = "signatures"
    }

    const mimeToExt: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif"
    }
    const ext = mimeToExt[detectedType] || ".jpg"
    const randomId = crypto.randomBytes(16).toString("hex")
    const filename = `upload-${Date.now()}-${randomId}${ext}`

    // If no Vercel Blob token, check if we are on Vercel
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      if (process.env.VERCEL || process.env.VERCEL_ENV) {
        console.log("[UPLOAD API] Vercel environment detected but no BLOB_READ_WRITE_TOKEN found.");
        return NextResponse.json({ error: "Vercel Blob store is not configured. Please link a Blob store in your Vercel dashboard." }, { status: 500 })
      }

      console.log("[UPLOAD API] BLOB_READ_WRITE_TOKEN not found, falling back to local file system");
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      const uploadDir = path.join(process.cwd(), "public", "uploads", folder)
      if (!fs.existsSync(uploadDir)) {
        console.log("[UPLOAD API] Creating upload directory:", uploadDir);
        await mkdir(uploadDir, { recursive: true })
      }
      
      const filePath = path.join(uploadDir, filename)
      console.log("[UPLOAD API] Writing file to:", filePath);
      await writeFile(filePath, buffer)
      console.log("[UPLOAD API] File successfully written locally.");
      return NextResponse.json({ url: `/uploads/${folder}/${filename}` })
    }

    // Otherwise, upload to Vercel Blob
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    console.log("[UPLOAD API] Uploading to Vercel Blob...");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const blobPathname = `${folder}/${filename}`
    try {
      const blob = await put(blobPathname, buffer, {
        access: "public",
        contentType: detectedType,
      })
      return NextResponse.json({ url: blob.url })
    } catch (blobError: any) {
      console.error("[UPLOAD API] Vercel Blob upload failed:", blobError)
      if (blobError.message?.includes("store does not exist") || blobError.message?.includes("token") || blobError.message?.includes("unauthorized")) {
        return NextResponse.json({ 
          error: "Vercel Blob store is not linked or does not exist. Please go to your Vercel Project Dashboard, open the Storage tab, and link a Blob database to generate a valid BLOB_READ_WRITE_TOKEN." 
        }, { status: 500 })
      }
      throw blobError;
    }
  } catch (error: any) {
    console.error("Upload failed:", error)
    return NextResponse.json({ error: error.message || "Failed to upload image" }, { status: 500 })
  }
}

