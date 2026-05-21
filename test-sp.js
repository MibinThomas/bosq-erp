require('dotenv').config();
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const { ClientSecretCredential } = require("@azure/identity");

async function run() {
  try {
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const siteId = process.env.SHAREPOINT_SITE_ID;
    const driveId = process.env.SHAREPOINT_DRIVE_ID;

    console.log("Credentials length:", tenantId?.length, clientId?.length, clientSecret?.length, siteId?.length, driveId?.length);

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ["https://graph.microsoft.com/.default"]
    });

    const client = Client.initWithMiddleware({ debugLogging: false, authProvider });

    console.log("Testing connection to site drives...");
    const res = await client.api(`/sites/${siteId}/drives`).get();
    console.log("Success! Drives found:", res.value.length);
  } catch (err) {
    console.error("ERROR:");
    console.error(err);
  }
}
run();
