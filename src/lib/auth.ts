import crypto from "crypto"

/**
 * Hashes a plain text password using Node.js pbkdf2Sync.
 * Returns a string formatted as "salt:hash".
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return `${salt}:${hash}`
}

/**
 * Verifies a plain text password against a stored "salt:hash" string.
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  if (!storedValue || !storedValue.includes(":")) return false
  const [salt, hash] = storedValue.split(":")
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
  return hash === checkHash
}
