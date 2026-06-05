import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, ArrowRight } from "lucide-react"
import Link from "next/link"

export function ConsultantClients({ clients }: { clients: any[] }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          Recent Clients
        </CardTitle>
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="text-primary">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No clients found.</p>
        ) : (
          <div className="space-y-4">
            {clients.slice(0, 5).map((client) => (
              <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="flex flex-col">
                  <span className="font-medium text-sm truncate max-w-[200px]" title={client.companyName}>
                    {client.companyName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {client.contactPerson || "No Contact"} • {client.clientType || "Direct"}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {client.status === "Pending Approval" ? (
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 text-[10px]">
                      Pending Admin
                    </Badge>
                  ) : client.status === "Approved" ? (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 text-[10px]">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">{client.status}</Badge>
                  )}
                  <Link href={`/clients/${client.id}`}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 mt-1 text-muted-foreground hover:text-primary">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
