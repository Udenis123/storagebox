import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DOC_SECTIONS } from "./DocsContent";

function useActiveSection(): string {
  const [activeId, setActiveId] = useState<string>(DOC_SECTIONS[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    for (const section of DOC_SECTIONS) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);
  return activeId;
}

/** "On this page" list that follows the reader. */
export function DocsNav({ className }: { className?: string }) {
  const activeId = useActiveSection();
  return (
    <nav aria-label="Documentation sections" className={cn("grid content-start gap-0.5 text-sm", className)}>
      <p className="mb-2 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">On this page</p>
      {DOC_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={cn(
            "border-l-2 px-3 py-1.5 transition-colors",
            activeId === section.id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {section.title}
        </a>
      ))}
    </nav>
  );
}
