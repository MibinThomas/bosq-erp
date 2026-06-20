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

// Dynamically resolves library name/title to its drive ID if configured as a name
async function resolveDriveId(client: any, siteId: string, driveIdOrName: string): Promise<string> {
  if (!driveIdOrName) return ""
  
  // If it is already a SharePoint drive ID format (e.g. starts with b!), return it
  if (driveIdOrName.startsWith("b!")) {
    return driveIdOrName
  }

  try {
    const response = await client.api(`/sites/${siteId}/drives`).get()
    const drives = response.value || []
    
    // Match by name case-insensitive
    const exactMatch = drives.find(
      (d: any) => d.name.toLowerCase() === driveIdOrName.toLowerCase()
    )
    if (exactMatch) {
      console.log(`Resolved drive ID for "${driveIdOrName}": ${exactMatch.id}`)
      return exactMatch.id
    }

    // Match by fuzzy normalized name
    const fuzzyMatch = drives.find(
      (d: any) => d.name.toLowerCase().replace(/[^a-z0-9]/g, "") === driveIdOrName.toLowerCase().replace(/[^a-z0-9]/g, "")
    )
    if (fuzzyMatch) {
      console.log(`Resolved drive ID (fuzzy) for "${driveIdOrName}": ${fuzzyMatch.id}`)
      return fuzzyMatch.id
    }

    // Fallback: If we have drives, use the default Documents or first available
    const defaultDrive = drives.find((d: any) => d.name === "Documents") || drives[0]
    if (defaultDrive) {
      console.warn(`Drive "${driveIdOrName}" not found. Falling back to drive: "${defaultDrive.name}"`)
      return defaultDrive.id
    }
  } catch (err) {
    console.error("Error resolving SharePoint drive ID:", err)
  }

  return driveIdOrName
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
    
    const resolvedDrive = await resolveDriveId(client, config.sharepoint_site_id, config.sharepoint_drive_id)
    
    // Use ensureFolderStructure to create Clients folder and the client subfolder safely
    await ensureFolderStructure(client, config.sharepoint_site_id, resolvedDrive, companyName)
    
    const sanitizedCompany = sanitizeClientName(companyName)
    
    // Fetch the folder to get its ID
    const folderResult = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root:/Clients/${sanitizedCompany}`)
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

async function uploadFileChunked(
  client: any,
  siteId: string,
  driveId: string,
  itemPath: string,
  buffer: Buffer
) {
  if (buffer.length <= 4 * 1024 * 1024) {
    return await client
      .api(`/sites/${siteId}/drives/${driveId}/root:${itemPath}:/content`)
      .put(buffer)
  }

  const payload = {
    item: {
      "@microsoft.graph.conflictBehavior": "replace",
      name: itemPath.split("/").pop()
    }
  }

  const sessionResult = await client
    .api(`/sites/${siteId}/drives/${driveId}/root:${itemPath}:/createUploadSession`)
    .post(payload)

  const uploadUrl = sessionResult.uploadUrl
  if (!uploadUrl) {
    throw new Error("Failed to create upload session: no uploadUrl returned")
  }

  const chunkSize = 320 * 1024
  let offset = 0
  const totalLength = buffer.length
  let lastResult: any = null

  while (offset < totalLength) {
    const end = Math.min(offset + chunkSize, totalLength)
    const chunk = buffer.subarray(offset, end)
    const contentRange = `bytes ${offset}-${end - 1}/${totalLength}`

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": chunk.length.toString(),
        "Content-Range": contentRange
      },
      body: chunk as any
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to upload chunk ${contentRange}: ${response.statusText} - ${errorText}`)
    }

    lastResult = await response.json()
    offset = end
  }

  return lastResult
}

export async function uploadQuotationPdf(companyName: string, filenameBase: string, pdfBuffer: Buffer) {
  const { config, hasCreds } = await getSharePointConfig()
  const sanitizedCompany = sanitizeClientName(companyName)
  const sanitizedFilename = filenameBase.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
  
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
    
    const resolvedDrive = await resolveDriveId(client, config.sharepoint_site_id, config.sharepoint_drive_id)
    
    await ensureFolderStructure(client, config.sharepoint_site_id, resolvedDrive, companyName, quotationGroupFolder)
    
    const fileName = `${sanitizedFilename}.pdf`
    const path = quotationGroupFolder 
      ? `/Clients/${sanitizedCompany}/Quotations/${quotationGroupFolder}/${fileName}`
      : `/Clients/${sanitizedCompany}/Quotations/${fileName}`
    
    const result = await uploadFileChunked(
      client,
      config.sharepoint_site_id,
      resolvedDrive,
      path,
      pdfBuffer
    )

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
    
    const resolvedDrive = await resolveDriveId(client, config.sharepoint_site_id, config.sharepoint_drive_id)
    
    await ensureFolderStructure(client, config.sharepoint_site_id, resolvedDrive, companyName, cleanGroupFolder)
    
    const fileName = `${sanitizedFilename}.xlsx`
    const path = cleanGroupFolder 
      ? `/Clients/${sanitizedCompany}/Quotations/${cleanGroupFolder}/${fileName}`
      : `/Clients/${sanitizedCompany}/Quotations/${fileName}`
    
    const result = await uploadFileChunked(
      client,
      config.sharepoint_site_id,
      resolvedDrive,
      path,
      excelBuffer
    )

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
    return true
  }

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )
    
    const resolvedDrive = await resolveDriveId(client, config.sharepoint_site_id, config.sharepoint_drive_id)
    
    try {
      await client.api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root:/Clients/${oldSanitized}`).get()
    } catch (err: any) {
      if (err.statusCode === 404) {
        return true
      }
      throw err
    }

    await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root:/Clients/${oldSanitized}`)
      .patch({
        name: newSanitized
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

    const resolvedDrive = await resolveDriveId(client, config.sharepoint_site_id, config.sharepoint_drive_id)

    let rootFolderId = null
    try {
      const rootFolder = await client
        .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root:/${sanitizedCompany}`)
        .get()
      rootFolderId = rootFolder.id
    } catch (err: any) {
      if (err.statusCode === 404) {
        return { success: false, reason: "Folder not found at root" }
      }
      throw err
    }

    try {
      await client
        .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root:/Clients`)
        .get()
    } catch (err: any) {
      if (err.statusCode === 404) {
        await client
          .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root/children`)
          .post({
            name: "Clients",
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail"
          })
      } else {
        throw err
      }
    }

    const clientsFolder = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root:/Clients`)
      .get()

    try {
      await client
        .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root:/Clients/${sanitizedCompany}`)
        .get()
      return { success: false, reason: "Folder already exists in Clients directory" }
    } catch (err: any) {
      if (err.statusCode !== 404) {
        throw err
      }
    }

    await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/items/${rootFolderId}`)
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

export async function ensureClientDocumentsFolder(
  client: any, 
  siteId: string, 
  driveId: string, 
  companyName: string
) {
  const sanitizedCompany = sanitizeClientName(companyName)
  const folders = [
    "Clients", 
    `Clients/${sanitizedCompany}`, 
    `Clients/${sanitizedCompany}/Documents`
  ]
  
  for (const folderPath of folders) {
    try {
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

export async function uploadClientDocument(companyName: string, filename: string, fileBuffer: Buffer) {
  const { config, hasCreds } = await getSharePointConfig()
  const sanitizedCompany = sanitizeClientName(companyName)

  const fallbackPath = `https://sharepoint.bosq.ae/Clients/${encodeURIComponent(sanitizedCompany)}/Documents/${encodeURIComponent(filename)}`

  if (!hasCreds) {
    console.warn("SharePoint credentials are not configured. Mocking document upload.")
    return {
      webUrl: fallbackPath,
      id: "mock-id-" + Math.random().toString(36).substring(7)
    }
  }

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )
    
    const resolvedDrive = await resolveDriveId(client, config.sharepoint_site_id, config.sharepoint_drive_id)
    
    await ensureClientDocumentsFolder(client, config.sharepoint_site_id, resolvedDrive, companyName)
    
    const cleanFilename = filename.replace(/[\/\\:\*\?"<>\|]/g, "").trim()
    const path = `/Clients/${sanitizedCompany}/Documents/${cleanFilename}`
    
    const result = await uploadFileChunked(
      client,
      config.sharepoint_site_id,
      resolvedDrive,
      path,
      fileBuffer
    )

    return {
      webUrl: result.webUrl,
      id: result.id
    }
  } catch (error) {
    console.error("Error uploading client document to SharePoint:", error)
    throw error
  }
}

export async function deleteClientDocument(itemId: string) {
  const { config, hasCreds } = await getSharePointConfig()
  
  if (!hasCreds) {
    console.warn("SharePoint credentials are not configured. Mocking document deletion.")
    return true
  }

  if (itemId.startsWith("mock-id-")) return true

  try {
    const client = await getGraphClient(
      config.sharepoint_tenant_id,
      config.sharepoint_client_id,
      config.sharepoint_client_secret
    )
    
    const resolvedDrive = await resolveDriveId(client, config.sharepoint_site_id, config.sharepoint_drive_id)
    
    await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/items/${itemId}`)
      .delete()

    return true
  } catch (error: any) {
    if (error.statusCode === 404) return true
    console.error("Error deleting client document from SharePoint:", error)
    throw error
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

    const resolvedDrive = await resolveDriveId(client, config.sharepoint_site_id, config.sharepoint_drive_id)

    await ensureFolderStructure(client, config.sharepoint_site_id, resolvedDrive, companyName, cleanGroupFolder)

    const targetFolder = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root:/Clients/${sanitizedCompany}/Quotations/${cleanGroupFolder}`)
      .get()

    let fileItem = null
    try {
      fileItem = await client
        .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/root:/Clients/${sanitizedCompany}/Quotations/${fileNameWithExtension}`)
        .get()
    } catch (err: any) {
      if (err.statusCode === 404) {
        return { success: false, reason: "File not found in root Quotations folder" }
      }
      throw err
    }

    const result = await client
      .api(`/sites/${config.sharepoint_site_id}/drives/${resolvedDrive}/items/${fileItem.id}`)
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
