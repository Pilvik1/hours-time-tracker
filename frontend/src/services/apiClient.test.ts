import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiDownload, apiRequest, queryString } from "./apiClient";

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("sends authenticated JSON requests through the same-origin API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "entry-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest<{ id: string }>("/time-entries", {
        method: "POST",
        body: JSON.stringify({ description: "Analysis" }),
      }),
    ).resolves.toEqual({ id: "entry-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/time-entries",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.any(Headers),
      }),
    );
  });

  it("preserves API validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "start_date must not be after end_date" }), {
          status: 422,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(apiRequest("/time-entries")).rejects.toEqual(
      expect.objectContaining<Partial<ApiError>>({
        status: 422,
        detail: "start_date must not be after end_date",
      }),
    );
  });

  it("downloads the backend-generated workbook filename", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Blob(["xlsx"]), {
          headers: { "content-disposition": 'attachment; filename="timesheet_2026.xlsx"' },
        }),
      ),
    );

    const result = await apiDownload("/exports/xlsx?start_date=2026-09-28&end_date=2026-10-04");
    expect(result.filename).toBe("timesheet_2026.xlsx");
    expect(result.blob.size).toBe(4);
  });

  it("omits empty query values while retaining booleans", () => {
    expect(queryString({ project_id: null, billable: false, page: 0, search: "" })).toBe(
      "?billable=false&page=0",
    );
  });
});
