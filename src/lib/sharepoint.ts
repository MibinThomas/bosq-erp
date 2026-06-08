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
    
    // Use ensureFolderStructure to create Clients folder and the client subfolder safely
    await ensureFolderStructure(client, config.sharepoint_site_id, config.sharepoint_drive_id, companyName)
    
    const sanitizedCompany = sanitizeClientName(companyName)
    
    // Fetch the folder to get its ID
    const folderResult = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:/Clients/${sanitizedCompany}`)
      .get()

    return folderResult.id
  } catch (error) {
    console.error("Error creating SharePoint folder:", error)
    throw error
  }
}

export function sanitizeClientName(name: string): string {
  return name.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
}

export function getBaseQuotationFolder(identifier: string): string {
  if (!identifier) return ""
  // Extract base project number (e.g. "P2230-1_Client" -> "P2230", "BOQ_P2230" -> "P2230", "ID2230" -> "ID2230")
  // It looks for a sequence of letters followed directly by numbers (e.g. P, ID, BOQ)
  const match = identifier.match(/(?:BOQ_)?([a-zA-Z]+\d+)/i)
  if (match) {
    return match[1].toUpperCase()
  }
  return identifier
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
  
  // Extract base quotation number ensuring revisions go into the main folder
  const quotationGroupFolder = getBaseQuotationFolder(sanitizedFilename)

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
  
  // Clean the provided folder name to ensure revisions go to the root base folder
  const cleanGroupFolder = quotationGroupFolder ? getBaseQuotationFolder(quotationGroupFolder) : ""
  
  const fallbackPath = cleanGroupFolder
    ? `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(sanitizedCompany)}/Quotations/${cleanGroupFolder}/${sanitizedFilename}.xlsx`
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
    
    await ensureFolderStructure(client, config.sharepoint_site_id, config.sharepoint_drive_id, companyName, cleanGroupFolder)
    
    const fileName = `${sanitizedFilename}.xlsx`
    const path = cleanGroupFolder 
      ? `/Clients/${sanitizedCompany}/Quotations/${cleanGroupFolder}/${fileName}`
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

export async function renameClientFolder(oldCompanyName: string, newCompanyName: string) {
  const { config, hasCreds } = await getSharePointConfig()
  
  if (!hasCreds) {
    console.warn("SharePoint credentials are not configured. Mocking rename.")
    return true
  }

  const oldSanitized = sanitizeClientName(oldCompanyName)
  const newSanitized = sanitizeClientName(newCompanyName)

  if (oldSanitized === newSanitized) {
    return true // No actual change in sanitized name
  }

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )
    
    // Check if the old folder exists
    try {
      await client.api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:/Clients/${oldSanitized}`).get()
    } catch (err: any) {
      if (err.statusCode === 404) {
        // Old folder doesn't exist, nothing to rename
        return true
      }
      throw err
    }

    // Attempt to rename
    await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:/Clients/${oldSanitized}`)
      .patch({
        name: newSanitized,
        "@microsoft.graph.conflictBehavior": "fail"
      })

    return true
  } catch (error: any) {
    console.error("Error renaming SharePoint folder:", error)
    if (error.statusCode === 409 || error.code === 'nameAlreadyExists') {
        throw new Error("SHAREPOINT_FOLDER_EXISTS")
    }
    throw error
  }
}

export async function migrateClientFolderToClientsDir(companyName: string) {
  const { config, hasCreds } = await getSharePointConfig()
  if (!hasCreds) return { success: false, reason: "No credentials" }

  const sanitizedCompany = sanitizeClientName(companyName)

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )

    // 1. Check if the folder exists at the root
    let rootFolderId = null
    try {
      const rootFolder = await client
        .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:/${sanitizedCompany}`)
        .get()
      rootFolderId = rootFolder.id
    } catch (err: any) {
      if (err.statusCode === 404) {
        return { success: false, reason: "Folder not found at root" }
      }
      throw err
    }

    // 2. Ensure "Clients" folder exists
    try {
      await client
        .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:/Clients`)
        .get()
    } catch (err: any) {
      if (err.statusCode === 404) {
        await client
          .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root/children`)
          .post({
            name: "Clients",
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail"
          })
      } else {
        throw err
      }
    }

    // Get Clients folder ID
    const clientsFolder = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:/Clients`)
      .get()

    // 3. Check if folder already exists in Clients/
    try {
      await client
        .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:/Clients/${sanitizedCompany}`)
        .get()
      // Exists in destination! We cannot move it because of conflict.
      return { success: false, reason: "Folder already exists in Clients directory" }
    } catch (err: any) {
      if (err.statusCode !== 404) {
        throw err
      }
    }

    // 4. Move folder to Clients/
    await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/items/${rootFolderId}`)
      .patch({
        parentReference: {
          id: clientsFolder.id
        }
      })

    return { success: true, moved: true }
  } catch (error) {
    console.error(`Error migrating folder for ${companyName}:`, error)
    return { success: false, error }
  }
}

export async function migrateQuotationToGroupFolder(companyName: string, fileNameWithExtension: string, groupFolder: string) {
  const { config, hasCreds } = await getSharePointConfig()
  if (!hasCreds) return { success: false, reason: "No credentials" }

  const sanitizedCompany = sanitizeClientName(companyName)
  const cleanGroupFolder = getBaseQuotationFolder(groupFolder)

  if (!cleanGroupFolder) return { success: false, reason: "Invalid group folder" }

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )

    // Ensure the target group folder exists
    await ensureFolderStructure(client, config.sharepoint_site_id, config.sharepoint_drive_id, companyName, cleanGroupFolder)

    // Get the target folder ID
    const targetFolder = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:/Clients/${sanitizedCompany}/Quotations/${cleanGroupFolder}`)
      .get()

    // Find the file in the parent Quotations folder (where it might be scattered)
    let fileItem = null
    try {
      fileItem = await client
        .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/root:/Clients/${sanitizedCompany}/Quotations/${fileNameWithExtension}`)
        .get()
    } catch (err: any) {
      if (err.statusCode === 404) {
        // Might already be in the right folder or somewhere else
        return { success: false, reason: "File not found in root Quotations folder" }
      }
      throw err
    }

    // Move the file into the group folder
    const result = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${config.sharepoint_drive_id}/items/${fileItem.id}`)
      .patch({
        parentReference: {
          id: targetFolder.id
        }
      })

    return { success: true, newUrl: result.webUrl }
  } catch (error) {
    console.error(`Error moving ${fileNameWithExtension} to ${groupFolder}:`, error)
    return { success: false, error }
  }
}


