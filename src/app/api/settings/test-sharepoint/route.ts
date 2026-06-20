import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/route"
import { NextResponse } from "next/server"
import { Client } from "@microsoft/microsoft-graph-client"
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials"
import { ClientSecretCredential } from "@azure/identity"

// Regex to check if secret matches a UUID format (Secret ID)
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = (session?.user as any)?.role
    if (!session || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    const body = await request.json()
    const { tenantId, clientId, clientSecret, siteId, driveId } = body

    if (!tenantId || !clientId || !clientSecret || !siteId) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required integration parameters (Tenant ID, Client ID, Client Secret, or Site ID)" 
      }, { status: 400 })
    }

    const trimmedSecret = String(clientSecret).trim()
    const isSecretId = UUID_REGEX.test(trimmedSecret)

    // Attempt to authenticate
    let client: Client
    try {
      const credential = new ClientSecretCredential(
        tenantId.trim(),
        clientId.trim(),
        trimmedSecret
      )

      const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ["https://graph.microsoft.com/.default"]
      })

      client = Client.initWithMiddleware({
        debugLogging: false,
        authProvider
      })
    } catch (authError: any) {
      return NextResponse.json({
        success: false,
        isSecretId,
        error: `Credential initialization failed: ${authError.message || authError}`
      })
    }

    // Try connection by listing drives
    try {
      const res = await client.api(`/sites/${siteId.trim()}/drives`).get()
      const drivesList = res.value || []

      const drives = drivesList.map((d: any) => ({
        id: d.id,
        name: d.name
      }))

      let resolvedDriveId = ""
      let resolvedDriveName = ""
      let resolutionLog = ""

      if (driveId) {
        const driveIdOrName = String(driveId).trim()

        if (driveIdOrName.startsWith("b!")) {
          resolvedDriveId = driveIdOrName
          const matched = drives.find((d: any) => d.id === driveIdOrName)
          resolvedDriveName = matched ? matched.name : "Unknown Library (by ID)"
          resolutionLog = "Used exact Drive ID format."
        } else {
          // Exact match
          const exact = drives.find(
            (d: any) => d.name.toLowerCase() === driveIdOrName.toLowerCase()
          )
          if (exact) {
            resolvedDriveId = exact.id
            resolvedDriveName = exact.name
            resolutionLog = `Resolved exact match for library name "${driveIdOrName}".`
          } else {
            // Fuzzy match
            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
            const fuzzy = drives.find(
              (d: any) => normalize(d.name) === normalize(driveIdOrName)
            )
            if (fuzzy) {
              resolvedDriveId = fuzzy.id
              resolvedDriveName = fuzzy.name
              resolutionLog = `Resolved fuzzy match for library name "${driveIdOrName}" (matched with "${fuzzy.name}").`
            } else {
              // Fallback
              const defaultDrive = drives.find((d: any) => d.name === "Documents") || drives[0]
              if (defaultDrive) {
                resolvedDriveId = defaultDrive.id
                resolvedDriveName = defaultDrive.name
                resolutionLog = `Library "${driveIdOrName}" not found. Falling back to default "${defaultDrive.name}".`
              }
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        drives,
        resolvedDriveId,
        resolvedDriveName,
        resolutionLog,
        message: "Successfully authenticated and connected to SharePoint site."
      })

    } catch (graphError: any) {
      console.error("Microsoft Graph Connection failed:", graphError)
      
      let errMsg = graphError.message || JSON.stringify(graphError)
      if (graphError.body) {
        try {
          const parsedBody = JSON.parse(graphError.body)
          if (parsedBody.error_description) {
            errMsg = parsedBody.error_description
          }
        } catch (_) {}
      }

      return NextResponse.json({
        success: false,
        isSecretId,
        error: errMsg
      })
    }

  } catch (err: any) {
    console.error("Connection diagnostics handler crashed:", err)
    return NextResponse.json({ 
      success: false, 
      error: err.message || "An unexpected error occurred during testing." 
    }, { status: 500 })
  }
}
