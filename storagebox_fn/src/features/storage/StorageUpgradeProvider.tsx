import { useMemo, useState, type ReactNode } from "react";
import { UpgradeStorageDialog } from "./UpgradeStorageDialog";
import { StorageUpgradeContext } from "./upgradeContext";

export function StorageUpgradeProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ openUpgrade: () => setIsOpen(true) }), []);
  return (
    <StorageUpgradeContext.Provider value={value}>
      {children}
      {isOpen && <UpgradeStorageDialog open onClose={() => setIsOpen(false)} />}
    </StorageUpgradeContext.Provider>
  );
}
