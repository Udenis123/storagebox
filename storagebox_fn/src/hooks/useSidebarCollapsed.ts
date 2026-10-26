import { useCallback, useEffect, useState } from "react";

const SIDEBAR_COLLAPSED_KEY = "storagebox.sidebar-collapsed";

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

/** Desktop sidebar collapse state, remembered across visits. */
export function useSidebarCollapsed(): { isCollapsed: boolean; toggle: () => void } {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed ? "1" : "0");
    } catch {
      // Private browsing can block storage; the toggle still works for this visit.
    }
  }, [isCollapsed]);

  const toggle = useCallback(() => setIsCollapsed((current) => !current), []);
  return { isCollapsed, toggle };
}
