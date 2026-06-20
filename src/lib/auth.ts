import crypto from "crypto"

/**
 * Hashes a plain text password using Node.js pbkdf2Sync.
 * Returns a string formatted as "iterations:salt:hash".
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const iterations = 210000
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex")
  return `${iterations}:${salt}:${hash}`
}

/**
 * Verifies a plain text password against a stored hash string.
 * Supports legacy format "salt:hash" (1000 iterations) and new format "iterations:salt:hash".
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  if (!storedValue || !storedValue.includes(":")) return false
  const parts = storedValue.split(":")
  
  if (parts.length === 3) {
    const [iterationsStr, salt, hash] = parts
    const iterations = parseInt(iterationsStr, 10)
    if (isNaN(iterations)) return false
    const checkHash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex")
    return hash === checkHash
  } else if (parts.length === 2) {
    const [salt, hash] = parts
    const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
    return hash === checkHash
  }
  
  return false
}
