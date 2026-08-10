"use client"

export const dynamic = "force-dynamic"

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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans relative overflow-hidden w-full px-4 sm:px-6">
      <Toaster position="top-right" richColors />

      {/* Decorative Grid Line Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Modern Floating Mesh Gradient Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-orange-600/20 to-rose-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-blue-600/15 to-purple-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] w-[350px] h-[350px] rounded-full bg-orange-500/5 blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[480px] relative z-10 space-y-6 py-10">
        
        {/* Secure Tag Indicator */}
        <div className="flex items-center space-x-2 bg-white/[0.02] backdrop-blur-md border border-white/[0.06] py-1.5 px-3.5 rounded-full w-fit mx-auto shadow-sm">
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-[10px] font-bold tracking-wider text-slate-300 uppercase">Secure ERP Gateway</span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Glassmorphism Card Wrapper */}
          <Card className="border-white/[0.08] bg-slate-900/30 backdrop-blur-2xl text-white shadow-[0_24px_80px_-15px_rgba(0,0,0,0.6)] rounded-[32px] overflow-hidden p-2 sm:p-4 border relative">
            
            {/* Ambient card interior glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

            <CardHeader className="pb-4 pt-6 text-center space-y-3 relative z-10">
              <div className="flex flex-col items-center space-y-2.5">
                <div className="p-2.5 bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/[0.06] shadow-inner flex items-center justify-center">
                  <img 
                    src="/assets/logo/bosq-login.jpg" 
                    alt="BOSQ Logo" 
                    className="h-12 w-auto object-contain select-none rounded-md"
                  />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-wider uppercase text-white bg-clip-text bg-gradient-to-b from-white to-slate-200">
                    BOSQ & AYN MUSK
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs mt-1 font-medium">
                    AYN Musk for Furniture Co. L.L.C.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pb-6 pt-2 relative z-10">
              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-xs font-semibold tracking-wide">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 transition-colors duration-300 group-focus-within:text-orange-500" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@bosq.ae" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-white/[0.02] border-white/[0.07] hover:border-white/[0.12] text-white placeholder-slate-500 focus-visible:ring-1 focus-visible:ring-orange-500/40 focus-visible:border-orange-500/60 rounded-xl text-sm transition-all"
                    required 
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300 text-xs font-semibold tracking-wide">
                    Password
                  </Label>
                  <a href="#" className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
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
                    className="pl-10 pr-10 h-11 bg-white/[0.02] border-white/[0.07] hover:border-white/[0.12] text-white placeholder-slate-500 focus-visible:ring-1 focus-visible:ring-orange-500/40 focus-visible:border-orange-500/60 rounded-xl text-sm transition-all"
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

            <CardFooter className="flex-col gap-4 pb-6 relative z-10">
              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold transition-all duration-300 rounded-xl shadow-[0_0_24px_rgba(241,116,35,0.2)] hover:shadow-[0_0_32px_rgba(241,116,35,0.4)] text-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
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
                  <span className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                  <span className="bg-[#0f172a]/90 backdrop-blur-md px-3.5 text-slate-500">
                    Corporate Single Sign-On
                  </span>
                </div>
              </div>

              {/* Microsoft SSO Button */}
              <Button 
                type="button"
                variant="outline" 
                onClick={() => toast.info("Outlook mail credentials enabled above.")}
                className="w-full h-11 border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.04] hover:text-white text-slate-300 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer"
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

        {/* Footer legalities */}
        <p className="text-center text-[10px] text-slate-500 font-medium">
          © {new Date().getFullYear()} BOSQ. All rights reserved. 
        </p>

      </div>
    </div>
  )
}
