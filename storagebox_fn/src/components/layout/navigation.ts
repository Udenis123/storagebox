import { Activity, BookOpen, FolderOpen, KeyRound, LayoutDashboard, Settings, ShieldCheck, Webhook, type LucideIcon } from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; isAdminOnly?: boolean };

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Storage",
    items: [
      { to: "/overview", label: "Overview", icon: LayoutDashboard },
      { to: "/library", label: "Media Library", icon: FolderOpen },
    ],
  },
  {
    title: "Developers",
    items: [
      { to: "/keys", label: "API Keys", icon: KeyRound },
      { to: "/webhooks", label: "Webhooks", icon: Webhook },
      { to: "/docs", label: "API Docs", icon: BookOpen },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/activity", label: "Activity", icon: Activity },
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/admin", label: "Admin", icon: ShieldCheck, isAdminOnly: true },
    ],
  },
];
