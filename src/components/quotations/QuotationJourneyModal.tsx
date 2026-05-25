import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, FileDown, FolderOpen, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Log {
  id: string
  action: string
  entityType: string
  entityId: string
  details: string
  createdAt: string
  user: {
    name: string | null
    role: string
    email: string
  }
}

interface JourneyData {
  quotation: {
    id: string
    quotationNumber: string
    status: string
    sharepointUrl: string | null
  }
  boq: {
    boqNumber: string
    sharepointUrl: string | null
  } | null
  logs: Log[]
}

export function QuotationJourneyModal({ 
  quotationId, 
  open, 
  onOpenChange 
}: { 
  quotationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<JourneyData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (quotationId && open) {
      setLoading(true)
      fetch(`/api/quotations/${quotationId}/journey`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to load journey")
          return res.json()
        })
        .then(resData => {
          setData(resData)
          setError(null)
        })
        .catch(err => {
          setError(err.message)
          setData(null)
        })
        .finally(() => setLoading(false))
    }
  }, [quotationId, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Quotation Journey</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8 font-medium">{error}</div>
        ) : data ? (
          <div className="space-y-6 mt-2">
            {/* Header Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl bg-muted/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Quotation</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold font-mono text-primary">{data.quotation.quotationNumber}</p>
                  <Badge variant="outline">{data.quotation.status}</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.open(`/api/quotations/${data.quotation.id}/pdf`, "_blank")}>
                    <FileDown className="mr-2 h-3 w-3" /> PDF
                  </Button>
                  {data.quotation.sharepointUrl && (
                    <Button size="sm" variant="outline" className="h-8 text-xs text-yellow-700" onClick={() => window.open(data.quotation.sharepointUrl!, "_blank")}>
                      <FolderOpen className="mr-2 h-3 w-3" /> SharePoint
                    </Button>
                  )}
                </div>
              </div>
              
              {data.boq && (
                <div className="p-4 border rounded-xl bg-muted/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Origin BOQ</p>
                  <p className="text-lg font-bold font-mono">{data.boq.boqNumber}</p>
                  <div className="mt-4 flex gap-2">
                    {data.boq.sharepointUrl && (
                      <Button size="sm" variant="outline" className="h-8 text-xs text-green-700" onClick={() => window.open(data.boq?.sharepointUrl!, "_blank")}>
                        <ExternalLink className="mr-2 h-3 w-3" /> BOQ Excel
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="relative pl-6 border-l-2 border-muted-foreground/20 space-y-8 mt-8 pb-4">
              {data.logs.length === 0 && (
                <p className="text-muted-foreground text-sm">No activity logs found for this journey.</p>
              )}
              {data.logs.map((log, index) => (
                <div key={log.id} className="relative">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs rounded-sm">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "numeric", minute: "2-digit"
                        })}
                      </span>
                    </div>
                    
                    <p className="text-sm pt-1">{log.details}</p>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {log.user?.name || "System"} ({log.user?.role || "SYSTEM"})
                      </span>
                      <span className="text-xs text-muted-foreground border-l pl-2">
                        {log.entityType}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
