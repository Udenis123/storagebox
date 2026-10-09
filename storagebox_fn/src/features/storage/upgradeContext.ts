import { createContext, useContext } from "react";

export const StorageUpgradeContext = createContext<{ openUpgrade: () => void } | null>(null);

export function useStorageUpgrade() {
  const context = useContext(StorageUpgradeContext);
  if (!context) throw new Error("useStorageUpgrade must be used inside StorageUpgradeProvider");
  return context;
}
