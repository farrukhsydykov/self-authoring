import { useCallback, useEffect, useRef } from "react";
import { api } from "./api";

/** Debounced autosave hook for authoring modules. */
export function useAutosave(module: string, data: unknown, enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSaved = useRef<string>("");

  const save = useCallback(async () => {
    const serialized = JSON.stringify(data);
    if (serialized === lastSaved.current) return;
    await api(`/authoring/${module}`, {
      method: "PUT",
      body: serialized,
    });
    lastSaved.current = serialized;
  }, [module, data]);

  useEffect(() => {
    if (!enabled) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save().catch(() => {});
    }, 1500);
    return () => clearTimeout(timer.current);
  }, [data, enabled, save]);

  return save;
}
