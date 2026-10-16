import "./lib/error-capture";

import { timingSafeEqual } from "node:crypto";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

function desktopRequestIsAuthorized(request: Request): boolean {
  const expected = process.env["TIME_TRACKER_DESKTOP_FRONTEND_TOKEN"];
  if (!expected) return true;

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("hours_desktop_session="));
  if (!cookie) return false;

  const supplied = cookie.slice("hours_desktop_session=".length);
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const requestUrl = new URL(request.url);
      if (requestUrl.pathname === "/healthz") {
        return Response.json({ status: "ok" });
      }
      if (!desktopRequestIsAuthorized(request)) {
        return Response.json({ detail: "Desktop session required" }, { status: 401 });
      }
      if (requestUrl.pathname.startsWith("/api/")) {
        const upstreamBase = process.env["API_INTERNAL_URL"] || "http://localhost:8000";
        const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, upstreamBase);
        const proxiedRequest = new Request(upstreamUrl, request);
        const desktopToken = process.env["TIME_TRACKER_DESKTOP_API_TOKEN"];
        if (desktopToken) proxiedRequest.headers.set("x-hours-desktop-token", desktopToken);
        proxiedRequest.headers.set("x-forwarded-host", requestUrl.host);
        proxiedRequest.headers.set("x-forwarded-proto", requestUrl.protocol.replace(":", ""));
        return await fetch(proxiedRequest);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
