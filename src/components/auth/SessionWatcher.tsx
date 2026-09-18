"use client"

import { useEffect, useRef } from "react"
import { useSession, signOut } from "next-auth/react"
import { toast } from "sonner"

export default function SessionWatcher() {
  const { data: session, status } = useSession()
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    if (status === "authenticated" && (session as any)?.error === "SESSION_TERMINATED") {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true
        toast.error(
          "Your session has been terminated because your account was logged into from another device or browser.",
          {
            duration: 8000,
            id: "session-terminated-toast",
          }
        )
        signOut({ callbackUrl: "/login?reason=session_terminated" })
      }
    }
  }, [session, status])

  return null
}
