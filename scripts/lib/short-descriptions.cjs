// The description rules live in src/lib/short-descriptions.ts (shared with the app).
// Node 23.6+ loads TypeScript files directly (type stripping), so the converters reuse them as-is.
// The converters expect the family functions to always return text, so a generic fallback is applied.
const path = require("path")
const lib = require(path.join(__dirname, "..", "..", "src", "lib", "short-descriptions.ts"))

const fallback = (text, name) => text || (name ? `${name}.` : "")

module.exports = {
  chairShortDescription: lib.chairShortDescription,
  stockItemShortDescription: (args) => fallback(lib.stockItemShortDescription(args), args.name),
  priceListShortDescription: (args) =>
    fallback(lib.priceListShortDescription(args), args.model ? `${args.model} — ${args.layout || ""}`.trim() : ""),
  generateShortDescription: lib.generateShortDescription,
  isPlaceholderDescription: lib.isPlaceholderDescription,
}
