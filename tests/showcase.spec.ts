import { expect, test } from "@playwright/test";

test("showcase introduces Floydee Connect alongside the interactive prototype", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Floydee Connect");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByTestId("phone-frame")).toBeVisible();
  const phone = await page.getByTestId("phone-frame").boundingBox();
  expect(phone).not.toBeNull();
  expect(phone?.y).toBeLessThan(900);
  expect((phone?.y ?? 0) + (phone?.height ?? 0)).toBeLessThanOrEqual(900);
});

test("guided tour pauses for direct exploration and resumes after leaving the demo idle", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const demo = page.getByRole("complementary", { name: "Interactive Floydee Connect prototype" });
  await expect(demo).toHaveAttribute("data-tour-paused", "false");
  await demo.hover();
  await expect(demo).toHaveAttribute("data-tour-paused", "true");
  await page.mouse.move(20, 700);
  await expect(demo).toHaveAttribute("data-tour-paused", "false", { timeout: 5_000 });
});

test("guided tour follows the deliberate capture sequence", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const demo = page.getByRole("complementary", { name: "Interactive Floydee Connect prototype" });
  await expect(demo).toHaveAttribute("data-tour-stage", "capture");
  await expect(demo).toHaveAttribute("data-tour-stage", "recording", { timeout: 6_000 });
  await expect(page.getByText("Hover or tap the phone to take control.")).toBeVisible();
});

test("touch and reduced-motion visitors are not shown an autoplay tour", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("Guided preview", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Helps you plan." })).toBeVisible();
  await expect(page.getByRole("link", { name: "admin@floydee.com" })).toHaveAttribute("href", "mailto:admin@floydee.com");
  await expect(page.getByRole("heading", { name: "Capture the world around you" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build the planning layer with us." })).toBeVisible();
});

test("vertical wheel input over the phone continues through the page story", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("complementary", { name: "Interactive Floydee Connect prototype" }).hover();
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(page.locator(".showcase-story")).toHaveAttribute("data-revealed", "true");
});
