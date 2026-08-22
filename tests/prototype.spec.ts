import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?view=prototype");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
});

test("Notes lists voice and manual capture with inspectable detail", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /V1 scope and release trade-offs/i }).click();
  await expect(page.getByTestId("note-detail")).toBeVisible();
  await expect(page.getByText("Drafted", { exact: true })).toBeVisible();
  await expect(page.getByText("Proposed actions", { exact: true })).toBeVisible();
  await page.getByText("Transcript and source", { exact: true }).click();
  await expect(page.getByText("Transcript", { exact: true })).toBeVisible();
});

test("manual note is created as a reviewable draft", async ({ page }) => {
  await page.getByTestId("open-note-capture").click();
  await page.getByRole("button", { name: "Write a note" }).click();
  await page.getByLabel("Note title").fill("Clinic pilot context");
  await page.getByRole("textbox", { name: "Context" }).fill("Confirm the clinic handoff owner before Friday.");
  await page.getByTestId("create-manual-note").click();
  await expect(page.getByRole("heading", { name: "Clinic pilot context" })).toBeVisible();
  await page.getByText("Transcript and source", { exact: true }).click();
  await expect(page.getByText(/Manual source — Confirm the clinic handoff owner/i)).toBeVisible();
});

test("voice note uses a visible stop control before producing a draft", async ({ page }) => {
  await page.getByTestId("open-note-capture").click();
  await page.getByRole("button", { name: "Record a voice note" }).click();
  const captureSheet = page.getByTestId("bottom-sheet");
  await captureSheet.getByLabel("Start voice capture").click();
  await expect(captureSheet.getByLabel("Stop voice capture")).toBeVisible();
  await captureSheet.getByLabel("Stop voice capture").click();
  await page.getByRole("button", { name: /Review voice note/i }).click();
  await expect(page.getByRole("heading", { name: "Untitled voice note" })).toBeVisible();
  await page.getByText("Transcript and source", { exact: true }).click();
  await expect(page.getByText(/Voice note captured with visible controls/i)).toBeVisible();
});

test("the raised capture control separates a tap-to-choose from a hold-to-record", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  const capture = page.getByRole("button", { name: /Capture a note\. Tap for options/i });
  await capture.click();
  await expect(page.getByRole("heading", { name: "Capture a note" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record a voice note" })).toBeVisible();
  await page.getByTestId("sheet-overlay").last().click({ position: { x: 8, y: 8 } });

  const box = await capture.boundingBox();
  if (!box) throw new Error("Capture control was not measurable");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await expect(page.getByRole("button", { name: "Release to stop and review voice note" })).toBeVisible();
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Untitled voice note" })).toBeVisible({ timeout: 2_000 });
});

test("profile opens an accessible app drawer and Business context can switch to Personal", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("button", { name: /Floydee Innovations/i })).toBeVisible();
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  const drawer = page.getByTestId("app-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Capture & connections", { exact: true })).toBeVisible();
  await expect(drawer.getByRole("button", { name: /Family & sharing/i })).toBeVisible();
  await page.getByRole("button", { name: "Close profile and app menu" }).click();
  await page.getByRole("button", { name: /Floydee Innovations/i }).click();
  await page.getByRole("menuitem", { name: /Personal Space/i }).click();
  await expect(page.getByRole("button", { name: "Personal Space" })).toBeVisible();
  await expect(page.getByLabel("Floydee Connect", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: "Switch to Floydee Innovations" }).click();
  await expect(page.getByRole("button", { name: /Floydee Innovations/i })).toBeVisible();
});

test("bottom navigation has an integrated Capture destination and header search", async ({ page }) => {
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button")).toHaveCount(5);
  await expect(page.getByRole("button", { name: /Capture a note\. Tap for options/i })).toBeVisible();
  await page.getByRole("button", { name: "Search workspace" }).click();
  await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
  await page.getByLabel("Search this workspace").fill("Capture V1");
  await expect(page.getByText("Ship Capture V1", { exact: true })).toBeVisible();
});

test("derived note content is corrected and proposed actions are explicitly reviewed", async ({ page }) => {
  await page.getByRole("button", { name: /V1 scope and release trade-offs/i }).click();
  await page.getByText("Transcript and source", { exact: true }).click();
  await page.getByRole("button", { name: "Correct" }).click();
  await expect(page.getByText(/corrected by you/i)).toBeVisible();
  await page.getByRole("button", { name: /Create Jira task: own the import retry path/i }).click();
  await page.getByTestId("advance-note-action").click();
  await expect(page.getByTestId("note-detail")).toContainText("Ready to review");
});

test("export and controlled family sharing remain approval gated", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: "Use personal space" }).click();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByRole("button", { name: /V1 scope and release trade-offs/i }).click();
  await page.getByTestId("open-note-export").click();
  await page.getByRole("button", { name: "Prepare export" }).click();
  await expect(page.getByText(/Export ready/i)).toBeVisible();
  await page.getByTestId("open-note-share").click();
  await page.getByRole("button", { name: "Confirm recipient" }).click();
  const approve = page.getByTestId("approve-note-share");
  await expect(approve).toBeEnabled();
  await approve.click();
  await expect(page.getByText(/Controlled Family viewer link approved/i)).toBeVisible();
  await page.getByTestId("note-detail").getByText("Tags and sharing", { exact: true }).click();
  await expect(page.getByTestId("note-detail").getByText("Mira", { exact: true })).toBeVisible();
});

test("Family & sharing prepares phone invitations and uses controlled link channels", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: "Use personal space" }).click();
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: /Family & sharing.*Invite by phone/i }).click();
  await expect(page.getByText("Mira", { exact: true })).toBeVisible();
  await expect(page.getByText(/Pending/).first()).toBeVisible();
  await page.getByTestId("open-family-invite").click();
  await page.getByLabel("Phone number").fill("+91 98123 45678");
  await page.getByTestId("send-family-invite").click();
  await expect(page.getByText(/Invite ready for confirmation/i)).toBeVisible();
  await page.getByTestId("sheet-overlay").last().click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByRole("button", { name: /V1 scope and release trade-offs/i }).click();
  await page.getByTestId("open-note-share").click();
  for (const channel of ["Email", "WhatsApp", "Teams", "Slack"]) await expect(page.getByRole("button", { name: channel, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
  await page.getByLabel(/Authorized WhatsApp group or recipient/i).fill("Namma Health family group");
  await page.getByRole("button", { name: "Confirm recipient" }).click();
  await page.getByTestId("approve-note-share").click();
  await expect(page.getByText(/Controlled WhatsApp viewer link approved/i)).toBeVisible();
});

test("family access is note-scoped and revocation removes the shared note", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: "Use personal space" }).click();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByRole("button", { name: /V1 scope and release trade-offs/i }).click();
  await page.getByTestId("open-note-share").click();
  await page.getByRole("button", { name: "Confirm recipient" }).click();
  await page.getByTestId("approve-note-share").click();
  await page.getByTestId("note-detail").getByText("Tags and sharing", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Revoke" })).toBeVisible();
  await page.getByTestId("sheet-overlay").last().click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: /Family & sharing.*Invite by phone/i }).click();
  await page.getByRole("button", { name: "Shared with me" }).click();
  await expect(page.getByRole("button", { name: /V1 scope and release trade-offs/i })).toBeVisible();
  await page.getByRole("button", { name: "Family" }).click();
  await page.getByRole("button", { name: "Revoke" }).first().click();
  await page.getByRole("button", { name: "Shared with me" }).click();
  await expect(page.getByText(/No notes have been shared/i)).toBeVisible();
});

test("Notes keeps deterministic state previews and both phone frames", async ({ page }) => {
  await page.goto("/?theme=dark&state=stale");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(page.locator(".prototype-shell")).toHaveAttribute("data-fc-theme", "dark");
  await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible();
  await page.getByTestId("device-picker").click();
  await page.getByTestId("device-option-iphone").click();
  await expect(page.getByTestId("phone-frame")).toHaveAttribute("data-device", "iphone");
});

test("Goals and Ask are focused destinations", async ({ page }) => {
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ask" })).toBeVisible();
});

test("Projects organise optional goal and topic context, while Ask exposes source-backed workspace answers", async ({ page }) => {
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByRole("tab", { name: /Projects 3/i }).click();
  await expect(page.getByText("Capture V1", { exact: true })).toBeVisible();
  await page.getByText("Capture V1", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Capture V1" })).toBeVisible();
  await expect(page.getByText("Ship Capture V1", { exact: true })).toBeVisible();
  await page.getByTestId("sheet-overlay").last().click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByLabel("Ask your workspace").fill("Who is involved in Capture V1?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByText(/Aarav Rao is the confirmed engineering lead/i)).toBeVisible();
  await page.getByRole("button", { name: /Aarav Rao.*Engineering lead/i }).click();
  await expect(page.getByRole("heading", { name: "Aarav Rao" })).toBeVisible();
});

test("tasks, notes, and extracted actions keep editable people associations", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: /Open Verify Capture Lite playback/i }).click();
  await page.getByTestId("edit-task-people").click();
  await page.getByRole("button", { name: /Aarav Rao.*Engineering lead/i }).first().click();
  await page.getByTestId("save-people-association").click();
  await expect(page.getByText(/Owner · Aarav Rao/i)).toBeVisible();

  await page.getByTestId("sheet-overlay").last().click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByRole("button", { name: /V1 scope and release trade-offs/i }).click();
  await page.getByTestId("edit-note-people").click();
  await page.getByRole("button", { name: /Aarav Rao.*Engineering lead/i }).last().click();
  await page.getByTestId("save-people-association").click();
  await expect(page.getByText("People involved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Create Jira task: own the import retry path/i }).click();
  await page.getByTestId("edit-action-people").click();
  await expect(page.getByText("People involved", { exact: true })).toBeVisible();
});

test("Ask keeps pinned and recent workspace conversations", async ({ page }) => {
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByRole("button", { name: /Capture V1 delivery/i }).click();
  await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible();
  await expect(page.getByText("Pinned", { exact: true })).toBeVisible();
  await expect(page.getByText("Recent", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.getByRole("button", { name: "Ask New workspace chat" })).toBeVisible();
});

test("Ask keeps its microphone, input, and send controls above the fixed navigation", async ({ page }) => {
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  const composer = page.locator(".ask-composer");
  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(composer.getByRole("button", { name: "Start voice question" })).toBeVisible();
  await expect(composer.getByLabel("Ask your workspace")).toBeVisible();
  await expect(composer.getByRole("button", { name: "Send question" })).toBeVisible();
  const composerBox = await composer.boundingBox();
  const navigationBox = await navigation.boundingBox();
  expect(composerBox?.y).toBeLessThan(navigationBox?.y ?? 0);
  await page.locator(".floydee-scroll").evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect(composer).toBeVisible();
});

test("Business note access is directory and group scoped, while Project access remains desktop managed", async ({ page }) => {
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByRole("button", { name: /V1 scope and release trade-offs/i }).click();
  await page.getByTestId("open-note-share").click();
  await expect(page.getByRole("heading", { name: "Workspace access" })).toBeVisible();
  await page.getByRole("button", { name: "Groups" }).click();
  await page.getByRole("button", { name: /Engineering.*desktop-managed/i }).click();
  await page.getByTestId("grant-workspace-note-access").click();
  await page.getByTestId("note-detail").getByText("Tags and sharing", { exact: true }).click();
  await expect(page.getByTestId("note-detail").getByText("Engineering", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
  await page.getByTestId("sheet-overlay").last().click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByRole("tab", { name: /Projects 3/i }).click();
  await page.getByText("Capture V1", { exact: true }).click();
  await expect(page.getByText("Access & allocation", { exact: true })).toBeVisible();
  await expect(page.getByText(/desktop application/i)).toBeVisible();
});

test("Contacts & people keeps business sources scoped and allows suggested matches to be confirmed", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: /Contacts & people.*Permissioned people/i }).click();
  await expect(page.getByText("Approved work sources only in this workspace.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Phone contacts/i })).toBeDisabled();
  await page.getByRole("button", { name: "Business directory Permissioned source Connected" }).click();
  await expect(page.getByRole("button", { name: "Business directory Permissioned source Not connected" })).toBeVisible();
  await page.getByTestId("sheet-overlay").last().click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: /Floydee Innovations/i }).click();
  await page.getByRole("menuitem", { name: /Personal Space/i }).click();
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: /Contacts & people.*Permissioned people/i }).click();
  await page.getByRole("button", { name: "Email-derived people Permissioned source Not connected" }).click();
  await page.getByRole("button", { name: /Mira Shah.*Product design/i }).click();
  await page.getByRole("button", { name: "Confirm person link" }).click();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
});

test("engineering actions use a consistent review state and visible copy is product-native", async ({ page }) => {
  await page.getByRole("button", { name: /V1 scope and release trade-offs/i }).click();
  await page.getByRole("button", { name: /Create Jira task: own the import retry path/i }).click();
  await expect(page.getByTestId("advance-note-action")).toHaveText(/Mark ready to review/i);
  await page.getByTestId("advance-note-action").click();
  await expect(page.getByTestId("note-detail")).toContainText("Ready to review");
  const body = await page.locator("body").innerText();
  expect(body.toLowerCase()).not.toContain("synthetic");
  expect(body.toLowerCase()).not.toContain("prototype");
  expect(body.toLowerCase()).not.toContain("demo");
});

test("Home remains a calm overview while check-in timings open a task-only workspace", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("region", { name: "Schedule" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await expect(page.getByText("Needs attention", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Good morning", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("morning-checkin-list")).toHaveCount(0);
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: /Check-in timings.*Task-review moments/i }).click();
  await expect(page.getByRole("heading", { name: "Check-in timings" })).toBeVisible();
  await expect(page.getByLabel("Check-in time")).toHaveCount(3);
  await page.getByTestId("add-checkin-time").click();
  await expect(page.getByLabel("Check-in time")).toHaveCount(4);
  await page.getByLabel(/Remove 20:00 check-in/i).click();
  await page.getByTestId("preview-checkin").click();
  await expect(page.getByTestId("checkin-view")).toBeVisible();
  await expect(page.getByText("Here’s your plan for today.")).toBeVisible();
  await expect(page.getByTestId("checkin-view").getByText("Share the V1 scope decision with the team")).toHaveCount(0);
  await expect(page.getByTestId("checkin-view").getByText("Verify Capture Lite playback on Android")).toBeVisible();
});

test("Home calendar selects a day and opens the dedicated agenda", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("region", { name: "Schedule" })).toBeVisible();
  await page.getByRole("button", { name: "Wednesday, 19 August" }).click();
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeAttached();
  await expect(page.getByText("Close the data-retention decision for the pilot", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open calendar" }).click();
  const calendar = page.getByTestId("calendar-view");
  await expect(calendar).toBeVisible();
  await expect(calendar.getByText("Founder engineering stand-up", { exact: true }).first()).toBeVisible();
  await expect(calendar.getByRole("button", { name: /Founder engineering stand-up/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to Home" }).click();
  await expect(page.getByTestId("floydee-home")).toBeVisible();
});

test("Calendar supports month and year picking with a full date grid", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Open calendar" }).click();
  const calendar = page.getByTestId("calendar-view");
  await expect(calendar.getByLabel("August 2026 dates")).toBeVisible();
  await expect(calendar.getByText("Verify Capture Lite playback on Android", { exact: true }).first()).toBeVisible();
  await expect(calendar.getByText("Publish the onboarding flow for design review", { exact: true }).first()).toBeVisible();
  await calendar.locator("select").nth(0).selectOption("8");
  await expect(calendar.getByLabel("September 2026 dates")).toBeVisible();
  await calendar.locator("select").nth(1).selectOption("2027");
  await expect(calendar.getByLabel("September 2027 dates")).toBeVisible();
  await calendar.locator("select").nth(1).selectOption("2026");
  await calendar.locator("select").nth(0).selectOption("7");
  await calendar.getByRole("button", { name: /Tuesday, 18 August/i }).click();
  await expect(calendar.getByRole("heading", { name: "Today" })).toBeVisible();
});

test("Home and Calendar share manual task ordering and offer timing order", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  const homeFirst = page.getByLabel("Drag Verify Capture Lite playback on Android", { exact: true });
  const homeTarget = page.getByLabel("Drag Prepare the meeting-notes engineering handoff", { exact: true });
  const firstBox = await homeFirst.boundingBox();
  const targetBox = await homeTarget.boundingBox();
  if (!firstBox || !targetBox) throw new Error("Drag handles were not measurable");
  await expect(homeFirst).toBeVisible();
  await expect(homeTarget).toBeVisible();
  await page.getByRole("button", { name: "Manual order", exact: true }).click();
  await expect(page.getByRole("button", { name: "Time order", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open calendar" }).click();
  await expect(page.getByRole("button", { name: "Time order", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Time order", exact: true }).click();
  await expect(page.getByRole("button", { name: "Manual order", exact: true })).toBeVisible();
});

test("the earliest enabled check-in uses the morning greeting", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: /Check-in timings.*Task-review moments/i }).click();
  await page.getByTestId("preview-checkin").click();
  await expect(page.getByRole("heading", { name: "Good morning" })).toBeVisible();
  await expect(page.getByText("Here’s your plan for today.")).toBeVisible();
});

test("Home completes from the left control and defers only after a recommended time is chosen", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  const complete = page.getByLabel("Mark Share the V1 scope decision with the team done", { exact: true });
  await complete.click();
  await expect(page.getByLabel("Mark Share the V1 scope decision with the team not done", { exact: true })).toBeVisible();

  await page.getByLabel("Open Share the V1 scope decision with the team", { exact: true }).click();
  await page.getByRole("button", { name: /^Defer\b/ }).click();
  await expect(page.getByRole("heading", { name: "Defer task" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Tomorrow · 10:00/i })).toBeVisible();
  await page.getByRole("radio", { name: /Day after tomorrow · 16:00/i }).click();
  await page.getByRole("button", { name: /Defer to Day after tomorrow · 16:00/i }).click();
  await expect(page.getByText(/Deferred to Thursday, 20 Aug · 16:00/i)).toBeVisible();
  await expect(page.getByLabel("Open Share the V1 scope decision with the team", { exact: true })).toContainText("Thursday, 20 Aug · 16:00");
});

test("Defer uses a date selector for dates later than the recommended window", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  const task = page.getByLabel("Open Verify Capture Lite playback on Android", { exact: true });
  await task.click();
  await page.getByRole("button", { name: /^Defer\b/ }).click();
  await page.getByRole("button", { name: /Choose a later date/i }).click();
  const laterDate = page.getByLabel("Later date", { exact: true });
  await expect(laterDate).toBeVisible();
  await laterDate.fill("2026-08-24");
  await page.getByRole("button", { name: /Defer to Monday, 24 Aug/i }).click();
  await expect(page.getByText(/Deferred to Monday, 24 Aug/i)).toBeVisible();
});

test("Task detail supports manual notes and the task filter hides completed tasks", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByLabel("Hide completed tasks", { exact: true }).click();
  await expect(page.getByLabel("Open Verify Capture Lite playback on Android", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Show completed tasks", { exact: true })).toBeVisible();
  await page.getByLabel("Show completed tasks", { exact: true }).click();
  await page.getByLabel("Open Verify Capture Lite playback on Android", { exact: true }).click();
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await page.getByRole("button", { name: /Write a note/i }).click();
  await page.getByLabel("Title").fill("Playback decision");
  await page.getByLabel("Update", { exact: true }).fill("Android playback is verified; attach the result to the release checklist.");
  await page.getByRole("button", { name: /Save task note/i }).click();
  await expect(page.getByText("Playback decision", { exact: true })).toBeVisible();
});

test("Check-in supports task status, touch drag, manual task entry, and review-gated voice", async ({ page }) => {
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Open profile and app menu" }).click();
  await page.getByRole("button", { name: /Check-in timings.*Task-review moments/i }).click();
  await page.getByTestId("preview-checkin").click();
  const checkin = page.getByTestId("checkin-view");
  await checkin.getByLabel(/Mark Verify Capture Lite playback on Android not done/i).click();
  await expect(checkin.getByLabel(/Mark Verify Capture Lite playback on Android done/i)).toBeVisible();
  const firstHandle = checkin.getByLabel(/Drag Verify Capture Lite playback on Android/i);
  const target = checkin.getByLabel(/Drag Prepare the meeting-notes engineering handoff/i);
  await firstHandle.hover();
  await page.mouse.down();
  await target.hover();
  await page.mouse.up();
  await expect(checkin.locator("[data-checkin-task-id]").nth(1)).toContainText("Verify Capture Lite playback on Android");
  await page.getByTestId("checkin-add-task").click();
  await page.getByLabel("Manual task").fill("Review the India launch checklist");
  await page.getByRole("button", { name: /Add to Today/i }).click();
  await expect(checkin.getByText("Review the India launch checklist")).toBeVisible();
  await page.getByTestId("checkin-record-update").click();
  const voiceSheet = page.getByTestId("bottom-sheet");
  await voiceSheet.getByLabel("Start voice capture").click();
  await expect(voiceSheet.getByLabel("Stop voice capture")).toBeVisible();
  await voiceSheet.getByLabel("Stop voice capture").click();
  await voiceSheet.getByRole("button", { name: "Review proposed changes" }).click();
  await expect(page.getByRole("heading", { name: "Review voice tasks" })).toBeVisible();
  await page.getByRole("button", { name: "Discard and record again" }).click();
  await expect(checkin).toBeVisible();
});

test("Goals show parent and child outcomes with founder work kept in context", async ({ page }) => {
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
  await expect(page.getByText("Ship Capture V1", { exact: true })).toBeVisible();
  await page.getByText("Ship Capture V1", { exact: true }).click();
  await expect(page.getByTestId("bottom-sheet").getByRole("heading", { name: "Ship Capture V1" })).toBeVisible();
  await expect(page.getByText("Aligned work", { exact: true })).toBeVisible();
});

test("Goal creation keeps voice details reviewable before saving", async ({ page }) => {
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByTestId("open-goal-create").click();
  await expect(page.getByRole("button", { name: "Describe goal with voice" })).toBeVisible();
  await page.getByRole("button", { name: "Describe goal with voice" }).click();
  await expect(page.getByRole("button", { name: "Stop describing goal" })).toBeVisible();
  await page.getByRole("button", { name: "Stop describing goal" }).click();
  await page.getByRole("button", { name: "Use details" }).click();
  await expect(page.getByRole("textbox", { name: "Goal" })).toHaveValue("Ship the founder workspace pilot");
  await expect(page.getByLabel("Target date and time")).toHaveValue("2026-10-15T17:00");
  await expect(page.getByRole("button", { name: "Top-level goal" })).toHaveClass(/is-selected/);
});

test("Topics can become goals and task alignment stays user-correctable", async ({ page }) => {
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByRole("tab", { name: /Topics/i }).click();
  await page.getByText("Subscription packaging", { exact: true }).click();
  await page.getByTestId("convert-topic-goal").click();
  await page.getByRole("textbox", { name: "Goal" }).fill("Decide subscription packaging");
  await page.getByLabel("Desired outcome").fill("Choose the founder plan packaging for the pilot.");
  await page.getByLabel("Target date and time").fill("2026-09-15T16:00");
  await page.getByTestId("create-goal").click();
  await expect(page.getByRole("heading", { name: "Decide subscription packaging" })).toBeVisible();
  await page.getByTestId("sheet-overlay").last().click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByText("Triage pilot feedback from onboarding sessions", { exact: true }).click();
  await page.locator(".alignment-row").click();
  await page.getByText("Decide subscription packaging", { exact: true }).click();
  await expect(page.getByText("Alignment saved.")).toBeVisible();
});

test("Goals use clear target, timeline, and next-action language", async ({ page }) => {
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await expect(page.getByRole("tab", { name: /Goals 2/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Topics 2/i })).toBeVisible();
  await page.getByText("Ship Capture V1", { exact: true }).click();
  const sheet = page.getByTestId("bottom-sheet");
  await expect(sheet.getByText("Next action", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Timeline", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Target · 30 Sep", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Next signal", { exact: true })).toHaveCount(0);
});

test("Topics show their own activity and aligned work before conversion", async ({ page }) => {
  await page.getByRole("button", { name: "Goals", exact: true }).click();
  await page.getByRole("tab", { name: /Topics 2/i }).click();
  await page.getByText("Founder operations", { exact: true }).click();
  const sheet = page.getByTestId("bottom-sheet");
  await expect(sheet.getByText("Grouped context", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Activity timeline", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Aligned work", { exact: true })).toBeVisible();
  await expect(sheet.getByTestId("convert-topic-goal")).toBeVisible();
});
