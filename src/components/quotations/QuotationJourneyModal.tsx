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
      <DialogContent className="max-w-[95vw] md:max-w-[900px] w-full max-h-[85vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-8 py-5 border-b shrink-0 bg-muted/10">
          <DialogTitle className="text-2xl font-bold tracking-tight">Quotation Journey</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto overflow-x-hidden px-5 md:px-8 py-8 flex-1 bg-muted/5 w-full">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-12 font-medium text-lg">{error}</div>
          ) : data ? (
            <div className="space-y-10">
              {/* Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-2">Final Quotation</p>
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3 w-full">
                    <p className="text-2xl font-bold font-mono text-primary break-words w-full">{data.quotation.quotationNumber}</p>
                    <Badge variant="outline" className="text-sm px-3 py-1 bg-background shrink-0">{data.quotation.status}</Badge>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button size="sm" variant="default" className="text-sm" onClick={() => window.open(`/api/quotations/${data.quotation.id}/pdf`, "_blank")}>
                      <FileDown className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                    {data.quotation.sharepointUrl && (
                      <Button size="sm" variant="outline" className="text-sm text-yellow-700 hover:text-yellow-800 hover:bg-yellow-50" onClick={() => window.open(data.quotation.sharepointUrl!, "_blank")}>
                        <FolderOpen className="mr-2 h-4 w-4" /> SharePoint
                      </Button>
                    )}
                  </div>
                </div>
                
                {data.boq && (
                  <div className="p-6 border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-sm text-muted-foreground font-semibold uppercase tracking-wider mb-2">Origin BOQ</p>
                    <div className="flex items-start justify-between w-full">
                      <p className="text-2xl font-bold font-mono break-words w-full">{data.boq.boqNumber}</p>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      {data.boq.sharepointUrl && (
                        <Button size="sm" variant="outline" className="text-sm text-green-700 hover:text-green-800 hover:bg-green-50" onClick={() => window.open(data.boq?.sharepointUrl!, "_blank")}>
                          <ExternalLink className="mr-2 h-4 w-4" /> BOQ Excel
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="mt-10">
                <h3 className="text-lg font-semibold mb-6 tracking-tight">Activity Timeline</h3>
                <div className="relative pl-8 border-l-2 border-muted-foreground/20 space-y-8 pb-4 ml-4">
                  {data.logs.length === 0 && (
                    <p className="text-muted-foreground text-sm">No activity logs found for this journey.</p>
                  )}
                  {data.logs.map((log, index) => (
                    <div key={log.id} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[41px] top-5 h-4 w-4 rounded-full bg-primary ring-4 ring-background shrink-0" />
                      
                      <div className="p-5 border rounded-xl bg-card shadow-sm space-y-3 hover:shadow-md transition-shadow w-full">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 w-full">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider bg-muted text-muted-foreground border-transparent">
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-sm font-medium text-muted-foreground border-l pl-3">
                              {log.entityType}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground font-medium sm:text-right shrink-0">
                            {new Date(log.createdAt).toLocaleString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "numeric", minute: "2-digit"
                            })}
                          </span>
                        </div>
                        
                        <p className="text-base text-foreground leading-relaxed pt-1 break-words">
                          {log.details}
                        </p>
                        
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-sm font-medium bg-muted/50 px-3 py-1 rounded-md text-foreground">
                            {log.user?.name || "System"} <span className="text-muted-foreground font-normal ml-1">({log.user?.role || "SYSTEM"})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
