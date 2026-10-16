import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("authenticated timer, manual entry, totals, persistence, and export workflow", async ({
  page,
  request,
}) => {
  const unauthenticated = await request.get("/api/settings");
  expect(unauthenticated.status()).toBe(401);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByPlaceholder("Password").fill("integration-test-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Week total")).toBeVisible();

  await page.getByRole("link", { name: "Projects" }).click();
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Northstar");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("cell", { name: "Northstar" })).toBeVisible();
  const projectsResponse = await page.context().request.get("/api/projects");
  expect(projectsResponse.ok()).toBe(true);
  const projects = await projectsResponse.json();
  const northstarProject = projects.find(
    (project: { name: string }) => project.name === "Northstar",
  );
  expect(northstarProject).toBeTruthy();

  await page.getByRole("link", { name: "Timer" }).click();
  await page.getByPlaceholder("What are you working on?").fill("Research synthesis");
  await page.locator("header").getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Northstar" }).click();
  await page.getByTitle("Comment").click();
  await page
    .getByPlaceholder("Optional longer explanation…")
    .fill("Reviewed findings and documented next steps");
  await page.getByRole("button", { name: "Start timer" }).click();
  await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();

  await page.reload();
  await expect(page.getByPlaceholder("What are you working on?")).toHaveValue("Research synthesis");
  await expect(page.getByRole("button", { name: "Stop timer" })).toBeVisible();
  await page.waitForTimeout(1_100);
  await page.getByRole("button", { name: "Stop timer" }).click();

  const editor = page.getByRole("dialog");
  const firstDay = page.locator('[data-testid^="calendar-day-"]').first();
  const dayTestId = await firstDay.getAttribute("data-testid");
  const calendarDate = dayTestId?.replace("calendar-day-", "");
  const dayBounds = await firstDay.boundingBox();
  expect(calendarDate).toBeTruthy();
  expect(dayBounds).not.toBeNull();
  if (!calendarDate || !dayBounds) throw new Error("Calendar grid did not render");

  // A single empty-grid click creates and selects a one-hour entry without opening the editor.
  await page.mouse.click(dayBounds.x + dayBounds.width / 2, dayBounds.y + 10 * 52 + 4);
  await expect(page.getByText("Untitled work", { exact: true })).toBeVisible();
  await expect(editor).not.toBeVisible();

  // The selected block opens for editing on the next deliberate click.
  await page.getByText("Untitled work", { exact: true }).click();
  await expect(editor).toBeVisible();
  await editor.getByLabel("Title").fill("Quick grid entry");
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Quick grid entry", { exact: true })).toBeVisible();

  // Releasing a drag saves the move without reopening the editor.
  const quickBlock = page.locator("[data-entry-id]").filter({ hasText: "Quick grid entry" });
  const quickBounds = await quickBlock.boundingBox();
  expect(quickBounds).not.toBeNull();
  if (!quickBounds) throw new Error("Quick-created calendar block did not render");
  await page.mouse.move(quickBounds.x + quickBounds.width / 2, quickBounds.y + 12);
  await page.mouse.down();
  await page.mouse.move(quickBounds.x + quickBounds.width / 2, quickBounds.y + 30, { steps: 3 });
  await page.mouse.up();
  await expect(editor).not.toBeVisible();

  // Exact duplicate intervals remain visible in separate side-by-side lanes.
  const overlapPayload = {
    date: calendarDate,
    start_time: "16:00:00",
    end_time: "17:00:00",
    project_id: northstarProject.id,
    billable: true,
    tags: [],
  };
  const firstOverlapResponse = await page.context().request.post("/api/time-entries", {
    data: { ...overlapPayload, description: "Parallel work A" },
  });
  const secondOverlapResponse = await page.context().request.post("/api/time-entries", {
    data: { ...overlapPayload, description: "Parallel work B" },
  });
  expect(firstOverlapResponse.status()).toBe(201);
  expect(secondOverlapResponse.status()).toBe(201);
  const firstOverlap = await firstOverlapResponse.json();
  const secondOverlap = await secondOverlapResponse.json();
  await page.reload();
  const firstOverlapBlock = page.locator(`[data-entry-id="${firstOverlap.id}"]`);
  const secondOverlapBlock = page.locator(`[data-entry-id="${secondOverlap.id}"]`);
  await expect(firstOverlapBlock).toBeVisible();
  await expect(secondOverlapBlock).toBeVisible();
  const firstOverlapBounds = await firstOverlapBlock.boundingBox();
  const secondOverlapBounds = await secondOverlapBlock.boundingBox();
  expect(firstOverlapBounds).not.toBeNull();
  expect(secondOverlapBounds).not.toBeNull();
  if (!firstOverlapBounds || !secondOverlapBounds) {
    throw new Error("Overlapping calendar blocks did not render");
  }
  expect(Math.abs(firstOverlapBounds.width - secondOverlapBounds.width)).toBeLessThan(2);
  expect(Math.abs(firstOverlapBounds.x - secondOverlapBounds.x)).toBeGreaterThan(4);
  expect(firstOverlapBounds.width).toBeLessThan(dayBounds.width * 0.55);
  await page.screenshot({ path: "../.e2e/week-calendar.png", fullPage: true });

  await page.getByRole("button", { name: "list" }).click();
  await expect(page.getByText("Research synthesis", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Reviewed findings and documented next steps", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: /New/ }).click();
  await editor.getByLabel("Title").fill("Manual draft");
  await editor.getByLabel("Comment").fill("Initial manual note");
  await editor.getByLabel("Start").fill("12:00");
  await editor.getByLabel("End").fill("13:30");
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Manual draft", { exact: true })).toBeVisible();

  await page.getByText("Manual draft", { exact: true }).click();
  await editor.getByLabel("Title").fill("Manual analysis");
  await editor.getByLabel("Comment").fill("Edited manual note");
  await editor.getByLabel("Start").fill("13:00");
  await editor.getByLabel("End").fill("15:00");
  await editor.getByRole("button", { name: "Save" }).click();

  await page.reload();
  await page.getByRole("button", { name: "list" }).click();
  const manualEntry = page.locator("li").filter({ hasText: "Manual analysis" });
  await expect(manualEntry.getByText("Manual analysis", { exact: true })).toBeVisible();
  await expect(manualEntry.getByText("Edited manual note", { exact: true })).toBeVisible();
  await expect(manualEntry.getByText("02:00", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Timesheet" }).click();
  await expect(page.getByRole("cell", { name: "Research synthesis" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Manual analysis" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Edited manual note" })).toBeVisible();
  await page.screenshot({ path: "../.e2e/timesheet.png", fullPage: true });

  const exportResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/exports/xlsx") && response.status() === 200,
  );
  await page.getByRole("button", { name: "Export Excel" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Export" }).click();
  const exportResponse = await exportResponsePromise;
  expect(exportResponse.headers()["content-type"]).toContain(
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  const workbookResponse = await page.context().request.get(exportResponse.url());
  expect(workbookResponse.ok()).toBe(true);
  await writeFile("../.e2e/timesheet.xlsx", await workbookResponse.body());

  await page.getByRole("link", { name: "Clients" }).click();
  await page.getByPlaceholder("New client name").fill("Example Client");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Example Client", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Tags" }).click();
  await page.getByPlaceholder("New tag").fill("research");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("research", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Reports" }).click();
  await expect(page.getByText("Hours by project")).toBeVisible();
  await expect(page.getByText("Northstar", { exact: true })).toBeVisible();
  await page.addStyleTag({ content: "[data-sonner-toaster] { display: none !important; }" });
  await page.screenshot({ path: "../.e2e/reports.png", fullPage: true });

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Name").fill("Ada Example");
  await page.getByLabel("Employer").fill("Example Company");
  await page.getByLabel("Timezone").click();
  await page.getByRole("option", { name: "UTC", exact: true }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Ada Example");
  await expect(page.getByLabel("Employer")).toHaveValue("Example Company");
  await expect(page.getByLabel("Timezone")).toContainText("UTC");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().request.get("/api/settings")).status()).toBe(401);
});
