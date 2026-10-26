import { Suspense, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { PageSkeleton } from "@/components/shared/States";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformStats } from "@/features/developer/hooks";
import { StorageBanner, StorageMeter } from "@/features/storage/StorageAlerts";
import { StorageUpgradeProvider } from "@/features/storage/StorageUpgradeProvider";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { initialsOf } from "@/lib/format";
import { ADMIN_HOME } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { NAV_SECTIONS } from "./navigation";

type SidebarProps = { isCollapsed?: boolean };

/** Shows the label as a tooltip only while the sidebar is collapsed to icons. */
function CollapsedTooltip({ label, isCollapsed, children }: { label: string; isCollapsed: boolean; children: React.ReactElement }) {
  if (!isCollapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="block" />}>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarNav({ isCollapsed = false, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  const { data: stats } = usePlatformStats(isAdmin);
  const pendingCount =
    (stats?.pendingCount ?? 0) + (stats?.storageRequestCount ?? 0);
  return (
    <nav className="grid gap-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="grid gap-1">
          {isCollapsed ? (
            <span className="mx-auto mb-1 h-px w-6 bg-border" aria-hidden />
          ) : (
            <p className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {section.title}
            </p>
          )}
          {section.items
            .filter((item) => !item.isAdminOnly || isAdmin)
            .map(({ to, label, icon: Icon }) => {
              const hasPending = to === ADMIN_HOME && pendingCount > 0;
              return (
                <CollapsedTooltip key={to} label={label} isCollapsed={isCollapsed}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    aria-label={isCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors",
                        isCollapsed && "justify-center px-0",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-muted",
                      )
                    }
                  >
                    <Icon className="size-5 shrink-0" />
                    {!isCollapsed && label}
                    {hasPending &&
                      (isCollapsed ? (
                        <span className="absolute top-2 right-2 size-2 rounded-full bg-tone-warning" />
                      ) : (
                        <span className="ml-auto rounded-full bg-tone-warning-bg px-2 py-0.5 text-xs font-bold text-tone-warning">
                          {pendingCount}
                        </span>
                      ))}
                  </NavLink>
                </CollapsedTooltip>
              );
            })}
        </div>
      ))}
    </nav>
  );
}

function UserCard({ isCollapsed = false }: SidebarProps) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const signOut = (
    <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sign out">
      <LogOut />
    </Button>
  );
  const avatar = (
    <span
      title={isCollapsed ? `${user.name} · ${user.account.cloudName}` : undefined}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
    >
      {initialsOf(user.name)}
    </span>
  );

  if (isCollapsed) {
    return (
      <div className="grid justify-items-center gap-2">
        {avatar}
        {signOut}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl p-2">
      {avatar}
      <div className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-semibold">{user.name}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {user.account.cloudName}
        </span>
      </div>
      {signOut}
    </div>
  );
}

export function AppLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isCollapsed, toggle } = useSidebarCollapsed();
  const location = useLocation();
  const ToggleIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <StorageUpgradeProvider>
      <div
        className={cn(
          "min-h-dvh lg:grid lg:transition-[grid-template-columns] lg:duration-200",
          isCollapsed ? "lg:grid-cols-[4.75rem_1fr]" : "lg:grid-cols-[17rem_1fr]",
        )}
      >
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh flex-col gap-6 overflow-hidden border-r bg-sidebar py-4 lg:flex",
            isCollapsed ? "px-2" : "px-4",
          )}
        >
          <div className={cn("flex items-center gap-2 pt-1", isCollapsed ? "flex-col" : "justify-between px-2")}>
            <Link to="/" aria-label="StorageBox home">
              <Logo isCompact={isCollapsed} />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ToggleIcon />
            </Button>
          </div>
          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            <SidebarNav isCollapsed={isCollapsed} />
          </div>
          <StorageMeter isCompact={isCollapsed} />
          <UserCard isCollapsed={isCollapsed} />
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
