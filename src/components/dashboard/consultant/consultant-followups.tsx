import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, Check } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export function ConsultantFollowUps({ followUps }: { followUps: any[] }) {

  const handleMarkAsDone = async (id: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "SENT", action: "UPDATE_STATUS" })
      })
      if (res.ok) {
        toast.success("Follow-up marked as done")
        // Ideally mutate or refresh data here. 
        // A simple window reload or using context will refresh the dash.
        window.location.reload()
      } else {
        toast.error("Failed to update status")
      }
    } catch (error) {
      console.error(error)
      toast.error("An error occurred")
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-purple-500" />
          Pending Follow-ups
        </CardTitle>
      </CardHeader>
      <CardContent>
        {followUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <span className="text-2xl mb-2">✅</span>
            <p className="text-sm text-muted-foreground">You are all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {followUps.slice(0, 5).map((q) => (
              <div key={q.id} className="flex flex-col p-3 rounded-lg border bg-purple-50/50 dark:bg-purple-900/10">
                <div className="flex justify-between items-start mb-2">
                  <Link href={`/quotations/${q.id}`} className="font-medium text-sm text-primary hover:underline truncate max-w-[200px]">
                    {q.client?.companyName}
                  </Link>
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 text-[10px]">Quote {q.quotationNumber}</Badge>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Pending Action
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs border-purple-200 hover:bg-purple-100 hover:text-purple-800"
                    onClick={() => handleMarkAsDone(q.id)}
                  >
                    <Check className="h-3 w-3 mr-1" /> Done
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
