import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scrolls to the element named in the URL hash (react-router does not do this on client navigation). */
export function useHashScroll(): void {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, pathname]);
}
