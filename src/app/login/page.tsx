import { Metadata } from "next"
import Image from "next/link" // placeholder
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Login - BOSQ ERP",
  description: "Login to the BOSQ ERP Quotation System",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8 space-y-2">
          <div className="h-12 w-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
            BQ
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">BOSQ ERP</h1>
          <p className="text-sm text-muted-foreground">Quotation Management System</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="name@bosq.ae" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input id="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button className="w-full">Sign in</Button>
            
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            <Button variant="outline" className="w-full">
              Microsoft Entra ID
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
