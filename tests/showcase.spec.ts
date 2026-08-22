import { expect, test } from "@playwright/test";

const demoName = "Interactive Floydee Connect prototype";
const localBaseUrl = `http://127.0.0.1:${process.env.MOBILE_RUNTIME_TEST_PORT ?? 4174}`;

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

test("desktop cover keeps the copy close to the unchanged phone demo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const geometry = await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>(".showcase-hero")?.getBoundingClientRect();
    const demo = document.querySelector<HTMLElement>(".showcase-demo")?.getBoundingClientRect();
    const cover = document.querySelector<HTMLElement>(".showcase-layout")?.getBoundingClientRect();
    return { hero, demo, cover, viewportHeight: window.innerHeight };
  });

  expect(geometry.hero).toBeTruthy();
  expect(geometry.demo).toBeTruthy();
  expect(geometry.cover).toBeTruthy();
  expect(geometry.hero!.top).toBeLessThan(geometry.demo!.top + 180);
  expect(geometry.cover!.height).toBeLessThanOrEqual(geometry.viewportHeight);
});

test("desktop demo column has a subtle surface and separator without changing the phone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const demo = page.getByRole("complementary", { name: demoName });
  await expect(demo).toBeVisible();
  expect(await demo.evaluate((element) => getComputedStyle(element, "::before").backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
  expect(await demo.evaluate((element) => getComputedStyle(element, "::after").width)).toBe("1px");
  await expect(page.frameLocator(`iframe[title="${demoName}"]`).getByTestId("phone-frame")).toBeVisible();
});

test("mobile layout stays readable and contained", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Helps you plan." })).toBeVisible();
  await expect(page.getByRole("complementary", { name: demoName }).locator("iframe")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("first touch scroll focuses the prototype once and leaves subsequent scrolling native", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(localBaseUrl);
  await expect(page.locator(".showcase-loader")).toBeHidden();
  const demo = page.getByRole("complementary", { name: demoName });
  await page.evaluate(() => window.scrollTo(0, 260));
  await expect(demo).toHaveAttribute("data-mobile-focus", "true");
  await expect(page.frameLocator(`iframe[title="${demoName}"]`).locator(".prototype-entry")).toHaveAttribute("data-mobile-focus", "true");
  await expect(demo).toHaveAttribute("data-demo-activated", "false");
  expect(await demo.locator(".showcase-phone").evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThan(700);
  const focusedScrollY = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollBy(0, 260));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(focusedScrollY);
  await page.getByRole("button", { name: "Start exploring the Floydee Connect prototype" }).click();
  await expect(demo).toHaveAttribute("data-demo-activated", "true");
  await context.close();
});

test("mobile focus is instant when reduced motion is preferred", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(localBaseUrl);
  await expect(page.locator(".showcase-loader")).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 260));
  const demo = page.getByRole("complementary", { name: demoName });
  await expect(demo).toHaveAttribute("data-mobile-focus", "true");
  expect(await demo.evaluate((element) => getComputedStyle(element).transitionProperty)).toBe("none");
  await context.close();
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
