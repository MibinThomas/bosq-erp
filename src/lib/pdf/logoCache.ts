import fs from "fs"
import path from "path"

let logoBase64Cache: string | null = null
let watermarkBase64Cache: string | null = null
let aynMuskLogoBase64Cache: string | null = null

export async function getLogoBase64(): Promise<string> {
  if (logoBase64Cache) return logoBase64Cache

  try {
    const pngLogoPath = path.join(process.cwd(), "public", "assets", "logo", "logo.png")
    if (fs.existsSync(pngLogoPath)) {
      const fileBuffer = fs.readFileSync(pngLogoPath)
      logoBase64Cache = `data:image/png;base64,${fileBuffer.toString("base64")}`
    } else {
      const logoPath = path.join(process.cwd(), "public", "assets", "logo", "BOSQ R LOGO.svg")
      if (fs.existsSync(logoPath)) {
        const fileBuffer = fs.readFileSync(logoPath)
        const sharp = (await import("sharp")).default
        const pngBuffer = await sharp(fileBuffer).png().toBuffer()
        logoBase64Cache = `data:image/png;base64,${pngBuffer.toString("base64")}`
      }
    }
  } catch (err) {
    console.error("Failed to load logo in cache:", err)
  }

  return logoBase64Cache || ""
}

export async function getWatermarkBase64(): Promise<string> {
  if (watermarkBase64Cache) return watermarkBase64Cache

  try {
    const watermarkPath = path.join(process.cwd(), "public", "assets", "logo", "Watermark.svg")
    if (fs.existsSync(watermarkPath)) {
      const fileBuffer = fs.readFileSync(watermarkPath)
      const sharp = (await import("sharp")).default
      const pngBuffer = await sharp(fileBuffer).png().toBuffer()
      watermarkBase64Cache = `data:image/png;base64,${pngBuffer.toString("base64")}`
    }
  } catch (err) {
    console.error("Failed to generate watermark in cache:", err)
  }

  return watermarkBase64Cache || ""
}

export async function getAynMuskLogoBase64(): Promise<string> {
  if (aynMuskLogoBase64Cache) return aynMuskLogoBase64Cache

  try {
    const aynMuskLogoPath = path.join(process.cwd(), "public", "assets", "logo", "AYN Musk_PNG.png")
    if (fs.existsSync(aynMuskLogoPath)) {
      const fileBuffer = fs.readFileSync(aynMuskLogoPath)
      aynMuskLogoBase64Cache = `data:image/png;base64,${fileBuffer.toString("base64")}`
    }
  } catch (err) {
    console.error("Failed to read AYN Musk logo in cache:", err)
  }

  return aynMuskLogoBase64Cache || ""
}
