"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Trophy,
  Settings,
  Menu,
  Upload,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard, color: "text-blue-500" },
  { href: "/fans", label: "お客様一覧・追加", icon: Users, color: "text-violet-500" },
  { href: "/logs", label: "売上記録", icon: ClipboardList, color: "text-emerald-500" },
  { href: "/ranking", label: "ランキング", icon: Trophy, color: "text-amber-500" },
  { href: "/import", label: "インポート", icon: Upload, color: "text-cyan-500" },
  { href: "/settings", label: "設定", icon: Settings, color: "text-slate-500" },
];

function NavContent({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b">
        <Link href="/" className="flex items-center gap-2.5" onClick={onItemClick}>
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg leading-none block">O.M.E FanScore</span>
            <span className="text-[10px] text-muted-foreground leading-none">ファンスコア管理</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary border-l-[3px] border-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-0.5"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary" : item.color)} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-[10px] text-muted-foreground text-center">
          O.M.E FanScore v1.0
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <NavContent onItemClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold">O.M.E FanScore</span>
        </div>
      </div>
      <div className="md:hidden h-16" />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r bg-card">
        <NavContent />
      </aside>
    </>
  );
}
