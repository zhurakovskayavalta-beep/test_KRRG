"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Factory,
  Package,
  ClipboardList,
  Archive,
  Calculator,
  FileCode2,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
};

const navItems: NavItem[] = [
  { label: "Дашборд", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { label: "Клиенты", href: "/clients", icon: Users, enabled: true },
  { label: "Фабрики", href: "/factories", icon: Factory, enabled: true },
  { label: "Товары", href: "/products", icon: Package, enabled: true },
  { label: "Заказы", href: "/orders", icon: ClipboardList, enabled: true },
  { label: "Архив документов", href: "/documents", icon: Archive, enabled: true },
  { label: "Шаблоны", href: "/templates", icon: FileCode2, enabled: true },
  { label: "Финансы", href: "/finance", icon: Calculator, enabled: false },
  { label: "Настройки", href: "/settings", icon: Settings, enabled: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="border-b px-6 py-5">
        <Link href="/dashboard" className="text-lg font-semibold">
          Import ERP
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
                title="Будет доступно в следующих фазах"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider">скоро</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-6 py-3 text-xs text-muted-foreground">
        Фаза 2 + шаблоны
      </div>
    </aside>
  );
}
