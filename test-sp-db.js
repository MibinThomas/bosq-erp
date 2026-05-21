require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const { ClientSecretCredential } = require("@azure/identity");

const prisma = new PrismaClient();

async function run() {
  try {
    const keys = [
      "sharepoint_tenant_id",
      "sharepoint_client_id",
      "sharepoint_client_secret",
      "sharepoint_site_id",
      "sharepoint_drive_id"
    ];

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } }
    });

    const getVal = (k) => {
      const match = settings.find(s => s.key === k);
      return match && match.value ? match.value : process.env[k.replace('sharepoint_', 'AZURE_').toUpperCase()];
    }

    const tenantId = getVal("sharepoint_tenant_id");
    const clientId = getVal("sharepoint_client_id");
    const clientSecret = getVal("sharepoint_client_secret");
    const siteId = getVal("sharepoint_site_id");
    const driveId = getVal("sharepoint_drive_id");

    console.log("Found Credentials in DB/Env:");
    console.log("Tenant ID length:", tenantId?.length);
    console.log("Client ID length:", clientId?.length);
    console.log("Secret length:", clientSecret?.length);
    console.log("Secret starts with:", clientSecret ? clientSecret.substring(0, 3) + "..." : "null");
    
    if (!tenantId || !clientId || !clientSecret || !siteId || !driveId) {
       console.log("MISSING SOME CREDENTIALS!");
       await prisma.$disconnect();
       return;
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ["https://graph.microsoft.com/.default"]
    });

    const client = Client.initWithMiddleware({ debugLogging: false, authProvider });

    console.log("Testing connection to site drives...");
    const res = await client.api(`/sites/${siteId}/drives`).get();
    console.log("Success! Drives found:", res.value.length);

  } catch (err) {
    console.error("ERROR CONNECTING TO SHAREPOINT:");
    console.error(err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
