"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  LogOut,
  Library,
  BarChart3,
  Tag,
  RefreshCw,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Productos", href: "/productos", icon: Package },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Ventas", href: "/ventas", icon: ShoppingCart },
  { name: "Actualizar", href: "/actualizar-precios", icon: RefreshCw },
  { name: "Combos", href: "/combos", icon: Tag },
  { name: "Reportes", href: "/reportes", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
          <Library className="text-zinc-950 w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">Libreria</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-emerald-500/10 text-emerald-500" 
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                isActive ? "text-emerald-500" : "text-zinc-500 group-hover:text-zinc-300"
              )} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-900 mt-auto">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Salir</span>
        </button>
      </div>
    </div>
  );
}
