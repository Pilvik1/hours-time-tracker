const configuredBase = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
export const API_BASE_URL = (configuredBase || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
  ) {
    super(typeof detail === "string" ? detail : `Request failed with status ${status}`);
    this.name = "ApiError";
  }
}

function notifyUnauthorized(path: string) {
  if (typeof window !== "undefined" && !path.startsWith("/auth/")) {
    window.dispatchEvent(new CustomEvent("time-tracker:unauthorized"));
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized(path);
    let detail: unknown = response.statusText;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      detail = payload.detail ?? payload;
    } catch {
      // A non-JSON proxy error is still represented by status and statusText.
    }
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiDownload(path: string): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  if (!response.ok) {
    if (response.status === 401) notifyUnauthorized(path);
    let detail: unknown = response.statusText;
    try {
      detail = ((await response.json()) as { detail?: unknown }).detail ?? detail;
    } catch {
      // Preserve the HTTP status when a reverse proxy returns text or HTML.
    }
    throw new ApiError(response.status, detail);
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "timesheet.xlsx";
  return { blob: await response.blob(), filename };
}

export function queryString(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}
