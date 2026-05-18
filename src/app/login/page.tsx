"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast, Toaster } from "sonner"
import { Loader2, ShieldAlert } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please enter email and password")
      return
    }

    setLoading(true)
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (res?.error) {
        toast.error(res.error || "Invalid corporate credentials")
        setLoading(false)
      } else {
        toast.success("Successfully authenticated!")
        window.location.href = "/dashboard"
      }
    } catch (err) {
      console.error(err)
      toast.error("Outlook connection failed. Try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <Toaster position="top-right" richColors />
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8 space-y-2">
          <div className="h-12 w-12 rounded-lg bg-orange-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-orange-950">
            BQ
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">BOSQ ERP</h1>
          <p className="text-sm text-slate-400">Quotation Management System</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Card className="border-slate-800 bg-slate-950 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Sign in</CardTitle>
              <CardDescription className="text-slate-400">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@bosq.ae" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-orange-600 focus-visible:border-orange-600"
                  required 
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300">Password</Label>
                  <a href="#" className="text-sm font-medium text-orange-500 hover:underline">
                    Forgot?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-white focus-visible:ring-orange-600 focus-visible:border-orange-600"
                  required 
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-all duration-200 py-6"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-950 px-2 text-slate-500">
                    Corporate SSO
                  </span>
                </div>
              </div>
              
              <Button 
                type="button"
                variant="outline" 
                onClick={() => toast.info("Outlook mail credentials enabled above.")}
                className="w-full border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white"
              >
                Microsoft Entra ID
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
