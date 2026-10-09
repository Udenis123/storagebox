import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import { PageSkeleton } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformStats } from "@/features/developer/hooks";
import { StorageBanner, StorageMeter } from "@/features/storage/StorageAlerts";
import { StorageUpgradeProvider } from "@/features/storage/StorageUpgradeProvider";
import { initialsOf } from "@/lib/format";
import { ADMIN_HOME } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { NAV_SECTIONS } from "./navigation";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  const { data: stats } = usePlatformStats(isAdmin);
  const pendingCount =
    (stats?.pendingCount ?? 0) + (stats?.storageRequestCount ?? 0);
  return (
    <nav className="grid gap-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="grid gap-1">
          <p className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {section.title}
          </p>
          {section.items
            .filter((item) => !item.isAdminOnly || isAdmin)
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-muted",
                  )
                }
              >
                <Icon className="size-5" />
                {label}
                {to === ADMIN_HOME && pendingCount > 0 && (
                  <span className="ml-auto rounded-full bg-tone-warning-bg px-2 py-0.5 text-xs font-bold text-tone-warning">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
        </div>
      ))}
    </nav>
  );
}

function UserCard() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl p-2">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
        {initialsOf(user.name)}
      </span>
      <div className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-semibold">{user.name}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {user.account.cloudName}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void logout()}
        aria-label="Sign out"
      >
        <LogOut />
      </Button>
    </div>
  );
}

export function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <StorageUpgradeProvider>
      <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
          <Link to="/" aria-label="StorageBox home" className="px-2 pt-1">
            <Logo />
          </Link>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <StorageMeter />
          <UserCard />
        </aside>

        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo />
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </header>
        {isMenuOpen && (
          <div className="fixed inset-x-0 top-[61px] bottom-0 z-30 grid content-start gap-6 overflow-y-auto bg-background p-4 lg:hidden">
            <SidebarNav onNavigate={() => setIsMenuOpen(false)} />
            <StorageMeter />
            <UserCard />
          </div>
        )}

        <main
          key={location.pathname}
          className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
        >
          <div className="mx-auto max-w-7xl animate-in fade-in-0 duration-200">
            <StorageBanner />
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </StorageUpgradeProvider>
  );
}
