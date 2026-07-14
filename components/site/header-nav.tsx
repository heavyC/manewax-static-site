"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
    { href: "/shop", label: "Shop" },
    { href: "/information", label: "Information" },
];

export function HeaderNav() {
    const pathname = usePathname();

    return (
        <nav className="hidden md:flex items-center justify-self-center space-x-3">
            {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${isActive
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-slate-100 text-slate-900 border border-slate-200"
                            }`}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
