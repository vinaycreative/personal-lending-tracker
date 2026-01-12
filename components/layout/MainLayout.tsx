import React from "react"

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="max-w-md mx-auto overflow-auto px-4 pb-32 pt-6 space-y-5">{children}</main>
  )
}

export default MainLayout
