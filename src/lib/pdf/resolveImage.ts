import fs from "fs";
import path from "path";

export async function resolveImageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  
  // Handle Base64 Data URIs natively
  if (url.startsWith("data:")) {
    if (url.startsWith("data:image/webp") || url.startsWith("data:image/svg+xml")) {
      try {
        const base64Data = url.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const sharp = (await import("sharp")).default;
        const convertedBuffer = await sharp(buffer).png().toBuffer();
        return `data:image/png;base64,${convertedBuffer.toString("base64")}`;
      } catch (e) {
        console.error("Failed to convert data URI image:", e);
      }
    }
    return url; // Return standard format data URIs as-is
  }
  
  // External images (HTTP/HTTPS)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        let fileBuffer = Buffer.from(arrayBuffer);
        const contentType = res.headers.get('content-type') || "";
        
        // @react-pdf/renderer does not support WEBP, convert it
        if (contentType.includes('webp') || url.toLowerCase().endsWith('.webp')) {
          const sharp = (await import("sharp")).default;
          const convertedBuffer = await sharp(fileBuffer).png().toBuffer();
          return `data:image/png;base64,${convertedBuffer.toString("base64")}`;
        }
        
        // For all other formats (JPG, PNG), we still convert to Base64 
        // to bypass react-pdf CORS and network fetching issues entirely.
        let mime = "image/jpeg";
        if (contentType.includes("png") || url.toLowerCase().endsWith(".png")) mime = "image/png";
        return `data:${mime};base64,${fileBuffer.toString("base64")}`;
      }
    } catch (e) {
      console.error("Failed to fetch/process external image:", url, e);
    }
    return url; // Final fallback, though unlikely to render if fetch failed
  }
  
  // Local images (/uploads/...)
  if (url.startsWith("/")) {
    try {
      const filePath = path.join(process.cwd(), "public", url);
      if (fs.existsSync(filePath)) {
        let fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).substring(1).toLowerCase();
        
        // @react-pdf/renderer does not support WEBP, automatically convert it
        if (ext === "webp") {
          const sharp = (await import("sharp")).default;
          const convertedBuffer = await sharp(fileBuffer).png().toBuffer();
          return `data:image/png;base64,${convertedBuffer.toString("base64")}`;
        }
        
        const mime = ext === "png" ? "image/png" : "image/jpeg";
        return `data:${mime};base64,${fileBuffer.toString("base64")}`;
      }
    } catch (e) {
      console.error("Failed to read local image:", url, e);
    }
  }
  return null;
}
