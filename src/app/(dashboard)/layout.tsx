import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { PermissionsProvider } from "@/components/providers/PermissionsProvider"
import { PageHeaderProvider } from "@/components/providers/PageHeaderContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PermissionsProvider>
      <PageHeaderProvider>
        <div className="flex h-screen overflow-hidden bg-muted/20">
          <Sidebar className="hidden md:flex" />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto overscroll-none p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </PageHeaderProvider>
    </PermissionsProvider>
  )
}
