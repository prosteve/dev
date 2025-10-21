import React from 'react'
import SupabaseAuth from '~/src/components/SupabaseAuth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50 p-6">
          <header className="mb-6">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h1 className="text-2xl font-bold">SmartTenda</h1>
              <div>
                <SupabaseAuth />
              </div>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
