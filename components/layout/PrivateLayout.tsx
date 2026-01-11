import BottomNavigation from "../BottomNavigation"
import MobileShell from "./MobileShell"
import PrivateNav from "./PrivateNav"

type PrivateLayoutProps = {
  title?: string
  children: React.ReactNode
}

export default function PrivateLayout({ title, children }: PrivateLayoutProps) {
  return (
    <div className="grid h-dvh grid-rows-[1fr_60px] gap-4 overflow-hidden min-w-[360px] mx-auto border-x border-zinc-200 bg-white">
      {children}
      <BottomNavigation />
    </div>
  )
}
