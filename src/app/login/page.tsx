"use client"

export const dynamic = "force-dynamic"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast, Toaster } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Building2,
  Layers,
  FileSpreadsheet,
  KeyRound,
  Send
} from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Forgot Password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetNotes, setResetNotes] = useState("")
  const [submittingReset, setSubmittingReset] = useState(false)

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail || !resetEmail.trim()) {
      toast.error("Please enter your corporate email address.")
      return
    }

    setSubmittingReset(true)
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          notes: resetNotes
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit password reset request.")
      }

      toast.success(data.message || "Password reset request sent to Super Admin!")
      setIsForgotModalOpen(false)
      setResetNotes("")
    } catch (err: any) {
      toast.error(err.message || "Failed to request password reset.")
    } finally {
      setSubmittingReset(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please enter both email and password")
      return
    }

    setLoading(true)
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false,
      })

      if (res?.error) {
        toast.error(res.error || "Invalid corporate credentials. Please try again.")
        setLoading(false)
      } else {
        toast.success("Authentication successful! Redirecting to workspace...")
        window.location.href = "/dashboard"
      }
    } catch (err) {
      console.error(err)
      toast.error("Connection error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex relative overflow-hidden font-sans select-none">
      <Toaster position="top-right" richColors />

      {/* Ambient Radial Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-600/15 via-orange-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] rounded-full bg-gradient-to-tl from-orange-600/15 via-amber-500/10 to-transparent blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Split Container */}
      <div className="w-full flex min-h-screen relative z-10">

        {/* LEFT PANEL: Enterprise Hero & Brand Showcase (Visible on lg screens) */}
        <div className="hidden lg:flex lg:w-7/12 flex-col justify-between p-12 lg:p-16 relative border-r border-white/[0.06] bg-slate-900/20 backdrop-blur-3xl overflow-hidden">
          
          {/* Subtle image backdrop blend */}
          <div className="absolute inset-0 opacity-15 bg-[url('/assets/images/login_hero.png')] bg-cover bg-center pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40 pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] p-2.5 px-4 rounded-2xl backdrop-blur-md shadow-xl">
              <img 
                src="/assets/logo/BOSQ.png" 
                alt="BOSQ ERP" 
                className="h-8 w-auto object-contain brightness-110"
              />
              <div className="h-4 w-[1px] bg-white/20" />
              <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">Enterprise Suite</span>
            </div>

            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-300">System Operational · 256-Bit SSL</span>
            </div>
          </div>

          {/* Center Showcase Content */}
          <div className="relative z-10 space-y-8 max-w-xl my-auto py-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Gen Office Furniture ERP Platform
            </div>

            <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.15] text-white">
              Precision Costing. <br />
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
                Seamless Operations.
              </span>
            </h1>

            <p className="text-slate-400 text-sm lg:text-base leading-relaxed font-normal">
              Streamlining BOSQ & AYN Musk operations with intelligent BOQ costing workflows, interactive client quotations, role-based access control, and SharePoint synchronization.
            </p>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-2 hover:border-amber-500/30 transition-all duration-300">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-white">Smart BOQ Engine</div>
                <div className="text-xs text-slate-400">Automated estimator cost breakdown & direct quotation conversion</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md space-y-2 hover:border-amber-500/30 transition-all duration-300">
                <div className="h-9 w-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-white">SharePoint & PDF Engine</div>
                <div className="text-xs text-slate-400">Instant Excel compilation and multi-tier PDF generation</div>
              </div>
            </div>
          </div>

          {/* Bottom Footer Info */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/[0.06] pt-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>AYN Musk for Furniture Co. L.L.C. · Dubai, UAE</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">v2.4 Enterprise Gateway</span>
          </div>
        </div>

        {/* RIGHT PANEL: Modern Authentication Form Container */}
        <div className="w-full lg:w-5/12 flex flex-col justify-between p-6 sm:p-10 lg:p-14 relative z-10 my-auto">
          
          {/* Mobile Header Logo */}
          <div className="flex lg:hidden items-center justify-between mb-8">
            <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.08] p-2 px-3.5 rounded-xl">
              <img 
                src="/assets/logo/BOSQ.png" 
                alt="BOSQ ERP" 
                className="h-7 w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] text-emerald-400 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ERP Portal
            </div>
          </div>

          <div className="w-full max-w-md mx-auto space-y-8 my-auto">
            
            {/* Form Title Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                Corporate Access Gateway
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome back
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">
                Enter your credentials to access your ERP workspace
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email Address Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-xs font-bold tracking-wide uppercase">
                  Corporate Email
                </Label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-amber-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@bosq.ae" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-slate-900/60 border-white/[0.08] hover:border-white/[0.16] text-white placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:border-amber-500 rounded-xl text-sm transition-all shadow-inner"
                    required 
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300 text-xs font-bold tracking-wide uppercase">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setResetEmail(email || "")
                      setIsForgotModalOpen(true)
                    }}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer bg-transparent border-0 p-0"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-amber-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-slate-900/60 border-white/[0.08] hover:border-white/[0.16] text-white placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:border-amber-500 rounded-xl text-sm transition-all shadow-inner"
                    required 
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-500 hover:text-slate-200 transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold transition-all duration-300 rounded-xl shadow-[0_4px_24px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_32px_rgba(245,158,11,0.4)] text-sm hover:scale-[1.005] active:scale-[0.995] cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Authenticating Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4 text-slate-950" />
                  </>
                )}
              </Button>
            </form>

            {/* SSO Divider */}
            <div className="relative w-full py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/[0.08]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-slate-950 px-3 text-slate-500">
                  Single Sign-On
                </span>
              </div>
            </div>

            {/* Microsoft Entra SSO Button */}
            <Button 
              type="button"
              variant="outline" 
              onClick={() => toast.info("Outlook credentials can be entered directly in the fields above.")}
              className="w-full h-11 border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:text-white text-slate-300 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 23 23" fill="currentColor">
                <rect x="0" y="0" width="10.5" height="10.5" fill="#F25022" />
                <rect x="12.5" y="0" width="10.5" height="10.5" fill="#7FBA00" />
                <rect x="0" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
                <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
              </svg>
              Sign in with Microsoft Entra ID
            </Button>

          </div>

          {/* Footer copyright */}
          <div className="text-center pt-8 text-[11px] text-slate-500 font-medium">
            © {new Date().getFullYear()} BOSQ & AYN Musk. All rights reserved.
          </div>

        </div>

      </div>

      {/* FORGOT PASSWORD REQUEST DIALOG MODAL */}
      <Dialog open={isForgotModalOpen} onOpenChange={setIsForgotModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-slate-100 font-sans p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <KeyRound className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-white">
                Request Password Reset
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Enter your corporate email address to submit a password reset request to the Super Admin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestPasswordReset} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Corporate Email Address <span className="text-rose-400">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="name@bosq.ae"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10 h-10 bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Reason / Request Notes (Optional)</Label>
              <Input
                placeholder="e.g. Forgot password, locked out of account..."
                value={resetNotes}
                onChange={(e) => setResetNotes(e.target.value)}
                className="h-10 bg-slate-950/80 border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsForgotModalOpen(false)}
                className="h-9 text-xs border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingReset}
                className="h-9 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5"
              >
                {submittingReset ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Submit Reset Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
