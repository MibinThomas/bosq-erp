"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast, Toaster } from "sonner"
import { Loader2, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 font-sans items-stretch w-full">
      <Toaster position="top-right" richColors />

      {/* Left Side: Modern Workspace Branding Hero Section (58% on large/medium screens, full height) */}
      <div 
        className="w-full md:w-[58%] min-h-[40vh] sm:min-h-[45vh] md:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-cover bg-center overflow-hidden border-b md:border-b-0 md:border-r border-slate-900 select-none shrink-0"
        style={{ backgroundImage: "url('/assets/images/login_hero.png')" }}
      >
        {/* Soft dark overlay for text readability */}
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1.5px]" />
        
        {/* Top Header Tag */}
        <div className="relative z-10 flex items-center space-x-3 bg-slate-900/60 backdrop-blur-md border border-white/10 w-fit py-2 px-4 rounded-xl shadow-lg">
          <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-extrabold shadow-md shadow-orange-950/50 text-sm">
            BQ
          </div>
          <span className="font-bold text-white text-xs tracking-widest uppercase">BOSQ ERP Portal</span>
        </div>

        {/* Brand Value statement */}
        <div className="relative z-10 bg-slate-900/70 backdrop-blur-xl border border-white/15 p-6 sm:p-8 lg:p-10 rounded-3xl max-w-xl shadow-2xl space-y-3 sm:space-y-4 mt-12 md:mt-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-600/20 border border-orange-500/30 text-orange-400 text-[10px] font-semibold uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3" /> Secure Corporate Access
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Premium Design. Engineered for Workspace Excellence.
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Manage your high-end catalog products, client details, interactive BOQs, and compile quotation PDFs instantly inside one cohesive corporate dashboard.
          </p>
        </div>
      </div>

      {/* Right Side: Responsive Login Form (42% on large/medium screens, centered vertically) */}
      <div className="w-full md:w-[42%] flex flex-col justify-center items-center p-6 sm:p-12 md:p-14 lg:p-16 bg-slate-950 relative overflow-hidden min-h-[55vh] md:min-h-screen">
        
        {/* Sleek abstract glowing background shapes behind form */}
        <div className="absolute top-1/4 right-1/4 h-[300px] w-[300px] bg-orange-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 h-[300px] w-[300px] bg-slate-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-8">
          
          {/* Logo and Brand Title Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <img 
              src="/assets/logo/bosq logo.jpg" 
              alt="BOSQ Logo" 
              className="h-16 object-contain filter brightness-105 select-none"
            />
            <div className="space-y-1">
              <h1 className="text-xl font-bold tracking-tight text-white uppercase">Quotation Management Portal</h1>
              <p className="text-xs text-slate-400">AYN Musk for Furniture Co. L.L.C.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-slate-800/80 bg-slate-900/40 backdrop-blur-xl text-white shadow-2xl rounded-3xl p-3 border">
              
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold">Sign in</CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-1">
                  Enter your credentials below to access your workspace.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4 pb-6">
                
                {/* Email input field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 text-xs font-semibold">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@bosq.ae" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 bg-slate-950/80 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-1 focus-visible:ring-orange-600 focus-visible:border-orange-600 rounded-xl text-sm"
                      required 
                    />
                  </div>
                </div>

                {/* Password input field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-300 text-xs font-semibold">Password</Label>
                    <a href="#" className="text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors">
                      Forgot Password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 bg-slate-950/80 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-1 focus-visible:ring-orange-600 focus-visible:border-orange-600 rounded-xl text-sm"
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex-col gap-4">
                
                {/* Standard credentials sign in button */}
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-all duration-300 rounded-xl shadow-lg shadow-orange-950/20 text-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
                
                {/* Corporate SSO Divider */}
                <div className="relative w-full py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-800/80" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                    <span className="bg-slate-900/90 px-3 text-slate-500">
                      Corporate Single Sign-On
                    </span>
                  </div>
                </div>
                
                {/* Microsoft Entra ID SSO Button */}
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => toast.info("Outlook mail credentials enabled above.")}
                  className="w-full h-11 border-slate-800 bg-slate-950/30 hover:bg-slate-900 hover:text-white text-slate-300 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 23 23" fill="currentColor">
                    <rect x="0" y="0" width="10.5" height="10.5" fill="#F25022" />
                    <rect x="12.5" y="0" width="10.5" height="10.5" fill="#7FBA00" />
                    <rect x="0" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
                    <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
                  </svg>
                  Sign in with Microsoft Entra ID
                </Button>
              </CardFooter>
            </Card>
          </form>
          
        </div>
      </div>
    </div>
  )
}
