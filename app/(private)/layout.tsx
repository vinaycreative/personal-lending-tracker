import React from "react"
import PrivateLayout from "@/components/layout/PrivateLayout"

export default function layout({ children }: { children: React.ReactNode }) {
  return <PrivateLayout>{children}</PrivateLayout>
}
