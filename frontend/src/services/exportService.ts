import type { ExportRequest } from "@/lib/types";
import { apiDownload, queryString } from "./apiClient";

export interface ExportResult {
  filename: string;
  url: string;
}

export const exportService = {
  async exportXlsx(request: ExportRequest): Promise<ExportResult> {
    if (!request.from || !request.to) throw new Error("Export date range is required");
    const { blob, filename } = await apiDownload(
      `/exports/xlsx${queryString({
        start_date: request.from,
        end_date: request.to,
        project_id: request.project_id,
      })}`,
    );
    return { filename, url: URL.createObjectURL(blob) };
  },
};
