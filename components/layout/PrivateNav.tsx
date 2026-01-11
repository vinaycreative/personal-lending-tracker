'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Add Loan", href: "/add-loan" },
  { label: "Loans", href: "/loans" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
];

export default function PrivateNav() {
  const pathname = usePathname();

  return (
    <nav className="grid h-[60px] grid-cols-5 items-center border-t border-zinc-200 bg-white text-[12px] shadow-sm">
      {navItems.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/" || pathname.startsWith(item.href)
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex h-full flex-col items-center justify-center px-1 font-medium ${
              isActive ? "text-zinc-900" : "text-zinc-500"
            }`}
          >
            <span
              className={`h-1 w-8 rounded-full ${
                isActive ? "bg-zinc-900" : "bg-transparent"
              }`}
            />
            <span className="mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
