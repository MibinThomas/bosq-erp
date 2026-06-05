"use client"

import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/20 animate-bounce">
        <ShieldAlert size={48} className="stroke-[1.5]" />
        <div className="absolute -inset-0.5 -z-10 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 opacity-20 blur-lg"></div>
      </div>
      
      <h1 className="bg-gradient-to-r from-red-500 to-orange-600 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
        Access Denied
      </h1>
      
      <p className="mt-4 max-w-md text-base text-zinc-500 dark:text-zinc-400">
        You do not have the required permissions to view this page. If you believe this is an error, please contact your Super Admin to update your access control role or overrides.
      </p>
      
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
