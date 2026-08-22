import { expect, test } from "@playwright/test";

const demoName = "Interactive Floydee Connect prototype";

test("showcase opens quickly with a separate live prototype", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Floydee Connect");
  await expect(page.locator(".showcase-loader")).toBeHidden();
  const demo = page.getByRole("complementary", { name: demoName });
  await expect(demo.locator("iframe")).toBeVisible();
  await expect(page.frameLocator(`iframe[title="${demoName}"]`).getByTestId("phone-frame")).toBeVisible();
});

test("clicking the visible phone unlocks direct exploration", async ({ page }) => {
  await page.goto("/");
  const demo = page.getByRole("complementary", { name: demoName });
  const callout = page.locator(".showcase-demo-callout");
  await expect(callout).toBeVisible();
  await expect(callout).toContainText("Click the phone to explore.");
  await page.getByRole("button", { name: "Start exploring the Floydee Connect prototype" }).click();
  await expect(demo).toHaveAttribute("data-demo-activated", "true");
  await expect(callout).toHaveCount(0);
  await expect(page.getByText("Hover or tap the phone to take control.")).toBeVisible();
});

test("guided tour advances inside the isolated prototype document", async ({ page }) => {
  await page.goto("/");
  const demo = page.getByRole("complementary", { name: demoName });
  const frame = page.frameLocator(`iframe[title="${demoName}"]`);
  await expect(demo).toHaveAttribute("data-tour-stage", "capture");
  await expect(frame.locator(".prototype-entry")).toHaveAttribute("data-tour-stage", "capture");
  await expect(demo).toHaveAttribute("data-tour-stage", "recording", { timeout: 6_000 });
  await expect(frame.locator(".prototype-entry")).toHaveAttribute("data-tour-stage", "recording");
});

test("reduced motion bypasses the visual loader animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const callout = page.locator(".showcase-demo-callout");
  await expect(callout).toBeVisible();
  expect(await callout.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test("public shell does not change the isolated prototype", async ({ page }) => {
  await page.goto("/");
  const frame = page.frameLocator(`iframe[title="${demoName}"]`);
  await expect(frame.locator(".prototype-shell")).toBeVisible();
  const size = await frame.locator("#today-heading").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(size).toBeLessThan(40);
  await page.getByRole("button", { name: "Start exploring the Floydee Connect prototype" }).click();
  await expect(frame.locator(".prototype-entry")).toHaveAttribute("data-tour-stage", "manual");
  await frame.locator(".nav-item").nth(1).click();
  await expect(frame.locator("#goals-heading")).toBeVisible();
});

test("cover, unified product story, and pilot close are the three page stops", async ({ page }) => {
  await page.goto("/");
  const order = await page.locator(".showcase > section, .showcase > footer").evaluateAll((elements) => elements.map((element) => element.tagName === "FOOTER" ? "footer" : element.className));
  expect(order).toEqual(["showcase-layout", "showcase-story", "showcase-closing"]);
  await expect(page.getByRole("heading", { name: "Capture what matters." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Understand the signal." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Protect the promise." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build the planning layer with us." })).toBeVisible();
});

test("page scroll remains native while the demo is still in presentation mode", async ({ page }) => {
  await page.goto("/");
  await page.mouse.move(50, 500);
  await page.mouse.wheel(0, 850);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("prototype-only query redirects to the standalone prototype document", async ({ page }) => {
  await page.goto("/?view=prototype&theme=light&state=default");
  await expect(page).toHaveURL(/prototype\.html\?theme=light&state=default$/);
  await expect(page.getByTestId("phone-frame")).toBeVisible();
});

test("complete device frames fit within standalone and embedded stages", async ({ page }) => {
  const fitsStage = async (locator: ReturnType<typeof page.locator>) => locator.evaluate((frame) => {
    const stage = frame.closest<HTMLElement>(".phone-stage");
    if (!stage) return false;
    const stageBox = stage.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    const style = getComputedStyle(stage);
    const top = stageBox.top + Number.parseFloat(style.paddingTop);
    const right = stageBox.right - Number.parseFloat(style.paddingRight);
    const bottom = stageBox.bottom - Number.parseFloat(style.paddingBottom);
    const left = stageBox.left + Number.parseFloat(style.paddingLeft);
    return frameBox.top >= top - 1 && frameBox.right <= right + 1 && frameBox.bottom <= bottom + 1 && frameBox.left >= left - 1;
  });

  await page.goto("/?view=prototype&theme=light&state=default");
  await expect(page.getByTestId("phone-frame")).toBeVisible();
  expect(await fitsStage(page.getByTestId("phone-frame"))).toBe(true);
  await page.getByTestId("device-picker").click();
  await page.getByTestId("device-option-pixel-10").click();
  await expect(page.getByTestId("phone-frame")).toHaveAttribute("data-device", "pixel-10");
  expect(await fitsStage(page.getByTestId("phone-frame"))).toBe(true);

  await page.goto("/");
  const embedded = page.frameLocator(`iframe[title="${demoName}"]`).getByTestId("phone-frame");
  await expect(embedded).toBeVisible();
  expect(await fitsStage(embedded)).toBe(true);
  await page.getByRole("button", { name: "Start exploring the Floydee Connect prototype" }).click();
  const embeddedPicker = page.frameLocator(`iframe[title="${demoName}"]`).getByTestId("device-picker");
  await embeddedPicker.click();
  await page.frameLocator(`iframe[title="${demoName}"]`).getByTestId("device-option-pixel-10").click();
  await expect(embedded).toHaveAttribute("data-device", "pixel-10");
  expect(await fitsStage(embedded)).toBe(true);
});
