import { useEffect } from "react";
import { onChange } from "./changes";

// Reloads a page's data when a sync brings in changes from another device
export function useRemoteChanges(reload: () => void) {
  useEffect(() => onChange("remote", reload), [reload]);
}
