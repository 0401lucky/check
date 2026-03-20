import { Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/80 bg-card/90 shadow-sm transition-transform group-hover:-translate-y-0.5">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Status Wall
            </div>
            <span className="text-lg font-semibold tracking-tight">
              AI 状态监控
            </span>
          </div>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            管理后台
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
