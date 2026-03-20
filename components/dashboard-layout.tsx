import { Sidebar } from "./sidebar"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-8 py-8 max-w-[1500px]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Sidebar />
        <main className="lg:col-span-10 space-y-6">
          {children}
        </main>
      </div>
    </div>
  )
}
