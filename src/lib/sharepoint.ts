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

export function sanitizeClientName(name: string): string {
  return name.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
}

export async function ensureFolderStructure(
  client: any, 
  siteId: string, 
  driveId: string, 
  companyName: string,
  quotationGroupFolder?: string
) {
  const sanitizedCompany = sanitizeClientName(companyName)
  const folders = [
    "Clients", 
    `Clients/${sanitizedCompany}`, 
    `Clients/${sanitizedCompany}/Quotations`
  ]
  
  if (quotationGroupFolder) {
    folders.push(`Clients/${sanitizedCompany}/Quotations/${quotationGroupFolder}`)
  }

  for (const folderPath of folders) {
    try {
      // Check if folder exists
      await client
        .api(`/sites/${siteId}/drives/${driveId}/root:/${folderPath}`)
        .get()
    } catch (err: any) {
      if (err.statusCode === 404) {
        const pathParts = folderPath.split("/")
        const folderName = pathParts.pop()
        const parentPath = pathParts.join("/")
        
        const endpoint = parentPath 
          ? `/sites/${siteId}/drives/${driveId}/root:/${parentPath}:/children`
          : `/sites/${siteId}/drives/${driveId}/root/children`
          
        // Create folder if it doesn't exist
        await client.api(endpoint).post({
          name: folderName,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail"
        })
      } else {
        throw err
      }
    }
  }
}

export async function uploadQuotationPdf(companyName: string, filenameBase: string, pdfBuffer: Buffer) {
  const { config, hasCreds } = await getSharePointConfig()
  const sanitizedCompany = sanitizeClientName(companyName)
  const sanitizedFilename = filenameBase.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
  
  // Extract base quotation number (e.g. "I2230" from "I2230_Acme Corp" or "I2230-1_Acme Corp")
  const match = sanitizedFilename.match(/^([A-Z0-9]+)(?:-\d+)?_/)
  const quotationGroupFolder = match ? match[1] : ""

  const fallbackPath = quotationGroupFolder
    ? `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(sanitizedCompany)}/Quotations/${quotationGroupFolder}/${sanitizedFilename}.pdf`
    : `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(sanitizedCompany)}/Quotations/${sanitizedFilename}.pdf`

  if (!hasCreds) {
    console.warn("SharePoint credentials are not configured. Falling back to mock PDF upload.")
    return fallbackPath
  }

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )
    
    // Ensure all directories are created
    await ensureFolderStructure(client, config.sharepoint_site_id, config.sharepoint_drive_id, companyName, quotationGroupFolder)
    
    const fileName = `${sanitizedFilename}.pdf`
    const path = quotationGroupFolder 
      ? `/Clients/${sanitizedCompany}/Quotations/${quotationGroupFolder}/${fileName}`
      : `/Clients/${sanitizedCompany}/Quotations/${fileName}`
    
    const result = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:${path}:/content`)
      .put(pdfBuffer)

    return result.webUrl
  } catch (error) {
    console.error("Error uploading PDF to SharePoint:", error)
    throw error
  }
}

export async function uploadBoqExcel(companyName: string, filenameBase: string, excelBuffer: Buffer, quotationGroupFolder?: string) {
  const { config, hasCreds } = await getSharePointConfig()
  const sanitizedCompany = sanitizeClientName(companyName)
  const sanitizedFilename = filenameBase.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
  
  const fallbackPath = quotationGroupFolder
    ? `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(sanitizedCompany)}/Quotations/${quotationGroupFolder}/${sanitizedFilename}.xlsx`
    : `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(sanitizedCompany)}/Quotations/${sanitizedFilename}.xlsx`

  if (!hasCreds) {
    console.warn("SharePoint credentials are not configured. Falling back to mock Excel upload.")
    return fallbackPath
  }

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )
    
    await ensureFolderStructure(client, config.sharepoint_site_id, config.sharepoint_drive_id, companyName, quotationGroupFolder)
    
    const fileName = `${sanitizedFilename}.xlsx`
    const path = quotationGroupFolder 
      ? `/Clients/${sanitizedCompany}/Quotations/${quotationGroupFolder}/${fileName}`
      : `/Clients/${sanitizedCompany}/Quotations/${fileName}`
    
    const result = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:${path}:/content`)
      .put(excelBuffer)

    return result.webUrl
  } catch (error) {
    console.error("Error uploading Excel to SharePoint:", error)
    throw error
  }
}
