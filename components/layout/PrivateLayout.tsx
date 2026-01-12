import BottomNavigation from "../BottomNavigation"

type PrivateLayoutProps = {
  title?: string
  children: React.ReactNode
}

export default function PrivateLayout({ children }: PrivateLayoutProps) {
  return (
    <div className="grid h-dvh grid-rows-[1fr_60px] gap-4 overflow-hidden min-w-[360px] mx-auto border-x border-zinc-200 bg-white">
      {children}
      <BottomNavigation />
    </div>
  )
}
