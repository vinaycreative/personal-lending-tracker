"use client"
import { Home, BarChart3, Building2, Settings, HandCoins } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

export default function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const navigationItems = [
    { name: "Dashboard", icon: Home, path: "/dashboard" },
    { name: "Add Loan", icon: HandCoins, path: "/add-loan" },
    { name: "Loans", icon: BarChart3, path: "/loans" },
    { name: "Reports", icon: Building2, path: "/reports" },
    { name: "Settings", icon: Settings, path: "/settings" },
  ]

  return (
    <div className="border-t border-gray-200 h-[60px] flex items-center ">
      <div className="max-w-md mx-auto flex items-center justify-around w-full px-4">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path || pathname.startsWith(item.path + "/")

          return (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 p-2 cursor-pointer transition-all duration-200"
            >
              <Icon className={`w-6 h-6 ${isActive ? "text-purple-600" : "text-gray-400"}`} />
              <span
                className={`text-xs font-medium transition-all duration-200 ${
                  isActive ? "text-purple-600 font-semibold" : "text-gray-400"
                }`}
              >
                {item.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
