// Browser-side image preparation for /api/upload.
// Vercel rejects request bodies over 4.5 MB (HTTP 413) before the upload route runs, so large
// photos are scaled down and re-encoded here first. Small images are sent unchanged.

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024
const MAX_DIMENSION = 2400
const PASSTHROUGH_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "") || "image"
}

async function decode(blob: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob)
    } catch {
      // fall through to <img> decoding
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = "async"
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Returns a file that fits the upload limit: unchanged when already small enough,
 * otherwise resized (longest side ≤ 2400 px) and compressed to WebP/JPEG.
 */
export async function prepareImageForUpload(input: Blob, fileName?: string): Promise<File> {
  const name = fileName || (input instanceof File ? input.name : "image.jpg")
  if (input.size <= MAX_UPLOAD_BYTES && PASSTHROUGH_TYPES.includes(input.type)) {
    return input instanceof File ? input : new File([input], name, { type: input.type })
  }

  let image: CanvasImageSource & { width: number; height: number }
  try {
    image = await decode(input)
  } catch {
    throw new Error("This image format can't be read. Please use a JPG, PNG or WebP image.")
  }

  let scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
  let quality = 0.85
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const ctx = canvas.getContext("2d")
    if (!ctx) break
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    // WebP keeps transparency; browsers without WebP encoding return PNG, so fall back to JPEG
    let blob = await toBlob(canvas, "image/webp", quality)
    let ext = "webp"
    if (!blob || blob.type !== "image/webp") {
      blob = await toBlob(canvas, "image/jpeg", quality)
      ext = "jpg"
    }
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      return new File([blob], `${baseName(name)}.${ext}`, { type: blob.type })
    }
    quality = Math.max(0.5, quality - 0.1)
    scale *= 0.8
  }
  throw new Error("This image is too large to upload. Please use an image under 4 MB.")
}
