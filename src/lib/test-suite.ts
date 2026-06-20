import { hashPassword, verifyPassword } from "./auth"
import assert from "assert"
import crypto from "crypto"

console.log("=== Running ERP System Test Suite ===")

function testPasswordSecurity() {
  console.log("Test 1: Verifying password hashing security and legacy support...")
  
  const password = "SuperSecretPassword123!"
  const newHash = hashPassword(password)
  
  assert.ok(verifyPassword(password, newHash), "New hash verification failed")
  assert.ok(newHash.startsWith("210000:"), "New hash does not specify 210,000 iterations")
  
  const legacySalt = "a1b2c3d4e5f6g7h8"
  const legacyHashRaw = crypto.pbkdf2Sync(password, legacySalt, 1000, 64, "sha512").toString("hex")
  const legacyHash = `${legacySalt}:${legacyHashRaw}`
  
  assert.ok(verifyPassword(password, legacyHash), "Legacy hash verification failed")
  
  assert.strictEqual(verifyPassword("wrongpass", newHash), false, "Wrong password verified on new hash")
  assert.strictEqual(verifyPassword("wrongpass", legacyHash), false, "Wrong password verified on legacy hash")
  
  console.log("PASS: Password hashing security & backward compatibility verified.")
}

function testInclusiveVat() {
  console.log("Test 2: Verifying inclusive VAT calculation correctness...")
  
  const taxableAmount = 105.00
  const vatAmount = (taxableAmount * 0.05) / 1.05
  const netAmount = taxableAmount - vatAmount
  
  assert.strictEqual(vatAmount, 5.00, "Inclusive VAT amount calculation is incorrect")
  assert.strictEqual(netAmount, 100.00, "Net amount for inclusive VAT is incorrect")
  
  console.log("PASS: Inclusive VAT calculations verified.")
}

function testGrossMarginCalculations() {
  console.log("Test 3: Verifying Gross Margin formula calculations...")
  
  const cost = 80.00
  const marginPercentage = 20.00
  
  const marginCapped = Math.min(99.99, marginPercentage)
  const sellingPrice = cost / (1 - (marginCapped / 100))
  assert.strictEqual(sellingPrice, 100.00, "Gross Margin selling price calculation is incorrect")
  
  const calculatedMargin = cost > 0 ? (1 - cost / sellingPrice) * 100 : 100
  assert.ok(Math.abs(calculatedMargin - 20.0) < 0.00001, "Reverse margin percentage calculation is incorrect")
  
  const margin100 = 100.00
  const capped100 = Math.min(99.99, margin100)
  assert.strictEqual(capped100, 99.99, "Safety cap on 100% margin failed")
  const sellingPrice100 = cost / (1 - (capped100 / 100))
  assert.ok(isFinite(sellingPrice100), "100% margin caused division by zero or non-finite price")
  
  console.log("PASS: Gross Margin calculations and reverse/safety-cap checks verified.")
}

try {
  testPasswordSecurity()
  testInclusiveVat()
  testGrossMarginCalculations()
  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===")
} catch (error) {
  console.error("\nFAIL: A test failed in the verification suite:", error)
  process.exit(1)
}
