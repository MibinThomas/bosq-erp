import { Client } from "@microsoft/microsoft-graph-client"
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials"
import { ClientSecretCredential } from "@azure/identity"
import { getSettings } from "@/lib/settings"

// SharePoint helper module retrieving credentials dynamically from system settings

async function getSharePointConfig() {
  const config = await getSettings([
    "sharepoint_tenant_id",
    "sharepoint_client_id",
    "sharepoint_client_secret",
    "sharepoint_site_id",
    "sharepoint_drive_id"
  ])
  
  const hasCreds = !!(
    config.sharepoint_tenant_id &&
    config.sharepoint_client_id &&
    config.sharepoint_client_secret &&
    config.sharepoint_site_id &&
    config.sharepoint_drive_id
  )
  
  return { config, hasCreds }
}

export async function getGraphClient(tenantId: string, clientId: string, clientSecret: string) {
  const credential = new ClientSecretCredential(
    tenantId,
    clientId,
    clientSecret
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
  const { config, hasCreds } = await getSharePointConfig()
  
  if (!hasCreds) {
    console.warn("SharePoint credentials are not configured. Falling back to mock folder creation.")
    return `mock-folder-id-${Buffer.from(companyName).toString("hex").substring(0, 8)}`
  }

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )
    
    const folder = {
      name: companyName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename"
    }

    const result = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root/children`)
      .post(folder)

    return result.id
  } catch (error) {
    console.error("Error creating SharePoint folder:", error)
    throw error
  }
}

export async function uploadQuotationPdf(companyName: string, quotationNumber: string, pdfBuffer: Buffer) {
  const { config, hasCreds } = await getSharePointConfig()
  
  if (!hasCreds) {
    console.warn("SharePoint credentials are not configured. Falling back to mock PDF upload.")
    return `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(companyName)}/Quotations/${quotationNumber}.pdf`
  }

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )
    
    const fileName = `${quotationNumber}.pdf`
    const path = `/Clients/${companyName}/Quotations/${fileName}`
    
    const result = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:${path}:/content`)
      .put(pdfBuffer)

    return result.webUrl
  } catch (error) {
    console.error("Error uploading PDF to SharePoint:", error)
    throw error
  }
}
