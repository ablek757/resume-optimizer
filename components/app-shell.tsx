"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  MessageSquare,
  Mic,
  Zap,
  User,
  Shield,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  children: React.ReactNode;
}

const publicOnly = new Set(["/"]);

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/", label: "简历优化", icon: FileText },
  { href: "/applications", label: "投递追踪", icon: Briefcase },
  { href: "/interview", label: "AI 面试", icon: MessageSquare },
  { href: "/interview/review", label: "面试复盘", icon: Mic },
  { href: "/diagnose", label: "快速诊断", icon: Zap },
  { href: "/profile", label: "个人中心", icon: User },
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (publicOnly.has(pathname)) {
    return <>{children}</>;
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const sidebarContent = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={[
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
            {active && (
              <ChevronRight className="ml-auto h-4 w-4 opacity-60" />
            )}
          </Link>
        );
      })}
      {user?.isAdmin && (
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className={[
            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive("/admin")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          ].join(" ")}
        >
          <Shield className="h-[18px] w-[18px]" />
          后台管理
        </Link>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">简历 AI</span>
        </div>
        {sidebarContent}
        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">外观</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">简历 AI</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="菜单"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </header>

        {mobileOpen && (
          <div className="border-b border-border bg-card lg:hidden">
            {sidebarContent}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
