import prisma from "./prisma"

const DEFAULT_SETTINGS: Record<string, string> = {
  company_name: "BOSQ Office Furniture",
  company_address: "Dubai Design District, Dubai, UAE",
  company_trn: "100012345678903",
  company_email: "sales@bosq.ae",
  sharepoint_tenant_id: process.env.AZURE_TENANT_ID || "",
  sharepoint_client_id: process.env.AZURE_CLIENT_ID || "",
  sharepoint_client_secret: process.env.AZURE_CLIENT_SECRET || "",
  sharepoint_site_id: process.env.SHAREPOINT_SITE_ID || "",
  sharepoint_drive_id: process.env.SHAREPOINT_DRIVE_ID || "",
  client_assign_to_uploader: "true",
  client_allow_sales_executive_assignment: "true",
  client_access_request_default_assignment: "secondary",
  client_allow_request_again: "true",
  client_allow_admin_assignment: "true",
  client_default_admin_user_id: "",
  company_bank_details: "Bank Name: Emirates NBD\nAccount Name: BOSQ OFFICE FURNITURE TRADING LLC\nAccount No: 10158492048201\nIBAN: AE28020000010158492048201\nSWIFT / BIC: EBILAEADXXX\nBranch: Dubai Main Branch, UAE",
  company_disclaimer: "• All products supplied remain the property of BOSQ until paid in full.\n• Goods once delivered and accepted cannot be returned unless defective.\n• Quotation prices are subject to site measurements and confirmation of final specifications.",
}

export async function getSetting(key: string): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key }
    })
    if (setting && setting.value) {
      return setting.value
    }
  } catch (error) {
    console.error(`Error fetching system setting key ${key}:`, error)
  }
  
  // Fall back to environment variable or hardcoded default
  const envVal = getEnvValue(key)
  if (envVal) return envVal

  return DEFAULT_SETTINGS[key] || ""
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } }
    })
    for (const key of keys) {
      const match = settings.find(s => s.key === key)
      if (match && match.value) {
        result[key] = match.value
      } else {
        const envVal = getEnvValue(key)
        result[key] = envVal || DEFAULT_SETTINGS[key] || ""
      }
    }
  } catch (error) {
    console.error("Error fetching multiple settings:", error)
    for (const key of keys) {
      const envVal = getEnvValue(key)
      result[key] = envVal || DEFAULT_SETTINGS[key] || ""
    }
  }
  return result
}

function getEnvValue(key: string): string | null {
  switch (key) {
    case "sharepoint_tenant_id":
      return process.env.AZURE_TENANT_ID || null
    case "sharepoint_client_id":
      return process.env.AZURE_CLIENT_ID || null
    case "sharepoint_client_secret":
      return process.env.AZURE_CLIENT_SECRET || null
    case "sharepoint_site_id":
      return process.env.SHAREPOINT_SITE_ID || null
    case "sharepoint_drive_id":
      return process.env.SHAREPOINT_DRIVE_ID || null
    default:
      return null
  }
}
