import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage system configurations and users.
        </p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="company" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>
                These details will be used in the generated PDF quotations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" defaultValue="BOSQ Office Furniture" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Address</Label>
                <Input id="address" defaultValue="Dubai Design District, Dubai, UAE" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trn">TRN</Label>
                <Input id="trn" defaultValue="100012345678903" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Support Email</Label>
                <Input id="email" defaultValue="sales@bosq.ae" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Users</CardTitle>
              <CardDescription>
                Add and manage system users and roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Add New User</Button>
              {/* User list table placeholder */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>
                Manage default terms for quotations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Add Terms</Button>
              {/* Terms list placeholder */}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integrations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SharePoint Integration</CardTitle>
              <CardDescription>
                Configure Microsoft Graph API credentials for SharePoint storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="tenantId">Tenant ID</Label>
                <Input id="tenantId" type="password" placeholder="Enter Tenant ID" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientId">Client ID</Label>
                <Input id="clientId" type="password" placeholder="Enter Client ID" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input id="clientSecret" type="password" placeholder="Enter Client Secret" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="siteId">SharePoint Site ID</Label>
                <Input id="siteId" placeholder="Enter Site ID" />
              </div>
              <Button>Save Credentials</Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
