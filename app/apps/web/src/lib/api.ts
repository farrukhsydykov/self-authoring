const API_BASE = "/api";

/** Reads the JWT from localStorage, falling back to the persisted auth store. */
function getAuthToken(): string | null {
  const direct = localStorage.getItem("token");
  if (direct) return direct;

  try {
    const auth = JSON.parse(localStorage.getItem("auth") ?? "{}") as {
      state?: { token?: string };
    };
    return auth.state?.token ?? null;
  } catch {
    return null;
  }
}

/** Formats API error payloads into a user-facing message. */
function formatApiError(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") return fallback;
  return fallback;
}

/** Typed fetch wrapper with JWT auth. */
export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body != null) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(formatApiError(err.error, res.statusText));
  }
  return res.json() as Promise<T>;
}
