import { Client } from "@microsoft/microsoft-graph-client"
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials"
import { ClientSecretCredential } from "@azure/identity"

// This is a placeholder service for SharePoint integration.
// In a real application, these environment variables would be securely configured.

export async function getGraphClient() {
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
  const client = await getGraphClient()
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
  const client = await getGraphClient()
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
