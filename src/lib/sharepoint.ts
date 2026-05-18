import { Client } from "@microsoft/microsoft-graph-client"
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials"
import { ClientSecretCredential } from "@azure/identity"

// This is a service for SharePoint integration.
// In a real application, these environment variables would be securely configured.
// When variables are missing, it falls back to mock storage for local testing.

const hasCredentials = !!(
  process.env.AZURE_TENANT_ID &&
  process.env.AZURE_CLIENT_ID &&
  process.env.AZURE_CLIENT_SECRET &&
  process.env.SHAREPOINT_SITE_ID &&
  process.env.SHAREPOINT_DRIVE_ID
)

export async function getGraphClient() {
  if (!hasCredentials) {
    return null
  }

  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID || "",
    process.env.AZURE_CLIENT_ID || "",
    process.env.AZURE_CLIENT_SECRET || ""
  )

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"]
  })

  return Client.initWithMiddleware({
    debugLogging: false,
    authProvider
  })
}

export async function createClientFolder(companyName: string) {
  if (!hasCredentials) {
    console.warn("SharePoint credentials are not configured. Falling back to mock folder creation.")
    // Simulated SharePoint folder ID
    return `mock-folder-id-${Buffer.from(companyName).toString("hex").substring(0, 8)}`
  }

  const client = await getGraphClient()
  if (!client) throw new Error("Could not initialize Graph client")
  
  const siteId = process.env.SHAREPOINT_SITE_ID
  const driveId = process.env.SHAREPOINT_DRIVE_ID // The Documents library
  
  try {
    // 1. Check if folder exists
    // 2. If not, create folder
    const folder = {
      name: companyName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename"
    }

    const result = await client
      .api(`/sites/${siteId}/drives/${driveId}/root/children`)
      .post(folder)

    return result.id
  } catch (error) {
    console.error("Error creating SharePoint folder:", error)
    throw error
  }
}

export async function uploadQuotationPdf(companyName: string, quotationNumber: string, pdfBuffer: Buffer) {
  if (!hasCredentials) {
    console.warn("SharePoint credentials are not configured. Falling back to mock PDF upload.")
    // Simulated SharePoint URL
    return `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(companyName)}/Quotations/${quotationNumber}.pdf`
  }

  const client = await getGraphClient()
  if (!client) throw new Error("Could not initialize Graph client")
  
  const siteId = process.env.SHAREPOINT_SITE_ID
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  
  try {
    const fileName = `${quotationNumber}.pdf`
    const path = `/Clients/${companyName}/Quotations/${fileName}`
    
    // Use large file upload session for files > 4MB, 
    // but standard upload is fine for most generated PDFs
    const result = await client
      .api(`/sites/${siteId}/drives/${driveId}/root:${path}:/content`)
      .put(pdfBuffer)

    return result.webUrl
  } catch (error) {
    console.error("Error uploading PDF to SharePoint:", error)
    throw error
  }
}

