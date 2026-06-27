import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/** Debounced autosave hook for authoring modules with flush-on-exit support. */
export function useAutosave(module: string, data: unknown, enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSaved = useRef<string>("");
  const dataRef = useRef(data);
  const [status, setStatus] = useState<AutosaveStatus>("idle");

  dataRef.current = data;

  const save = useCallback(async () => {
    const payload = dataRef.current;
    const serialized = JSON.stringify(payload);
    if (serialized === lastSaved.current) return;
    setStatus("saving");
    try {
      await api(`/authoring/${module}`, {
        method: "PUT",
        body: serialized,
      });
      lastSaved.current = serialized;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [module]);

  const saveImmediate = useCallback(async () => {
    clearTimeout(timer.current);
    await save();
  }, [save]);

  useEffect(() => {
    if (!enabled) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save().catch(() => setStatus("error"));
    }, 600);
    return () => clearTimeout(timer.current);
  }, [data, enabled, save]);

  useEffect(() => {
    if (!enabled) return;

    const flush = () => {
      const serialized = JSON.stringify(dataRef.current);
      if (serialized === lastSaved.current) return;
      void save();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [enabled, save]);

  return { save: saveImmediate, status };
}
