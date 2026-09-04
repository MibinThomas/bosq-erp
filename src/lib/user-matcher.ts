/**
 * Robust user matcher for client assignments, bulk imports, and system mapping.
 * Handles non-breaking spaces (\u00A0), email lookups, name normalization, and partial matches.
 */
export function findUserMatch(dbUsers: any[], rawInput?: string | null): any | null {
  if (!rawInput || typeof rawInput !== "string") return null
  
  // Clean whitespace and replace non-breaking spaces (\u00A0)
  const clean = rawInput.replace(/\u00A0/g, " ").trim().toLowerCase()
  if (!clean) return null

  // 1. Direct ID match
  let matched = dbUsers.find(u => u.id && u.id.toLowerCase() === clean)
  if (matched) return matched

  // 2. Email exact match
  matched = dbUsers.find(u => u.email && u.email.trim().toLowerCase() === clean)
  if (matched) return matched

  // 3. Name exact match (normalized whitespace)
  matched = dbUsers.find(u => {
    if (!u.name) return false
    const uName = u.name.replace(/\u00A0/g, " ").trim().toLowerCase()
    return uName === clean
  })
  if (matched) return matched

  // 4. Name without special characters or extra punctuation
  const cleanNoSpec = clean.replace(/[^a-z0-9]/g, "")
  if (cleanNoSpec) {
    matched = dbUsers.find(u => {
      if (!u.name) return false
      const uNameNoSpec = u.name.replace(/[^a-z0-9]/g, "").toLowerCase()
      return uNameNoSpec === cleanNoSpec
    })
    if (matched) return matched
  }

  // 5. Match email prefix (e.g. "jipsa" matching "jipsa@bosq.in")
  matched = dbUsers.find(u => {
    if (!u.email) return false
    const emailPrefix = u.email.split("@")[0].trim().toLowerCase()
    return emailPrefix === clean || (cleanNoSpec && cleanNoSpec === emailPrefix.replace(/[^a-z0-9]/g, ""))
  })
  if (matched) return matched

  // 6. Substring / Partial Name match if unambiguous
  const partialMatches = dbUsers.filter(u => {
    if (!u.name) return false
    const uName = u.name.replace(/\u00A0/g, " ").trim().toLowerCase()
    return uName.includes(clean) || clean.includes(uName)
  })
  if (partialMatches.length === 1) return partialMatches[0]

  return null
}
