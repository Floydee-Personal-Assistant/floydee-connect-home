import { expect, test } from "@playwright/test";

test("showcase introduces Floydee Connect and opens the interactive prototype", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Floydee Connect");
  await expect(page.getByRole("heading", { name: "Make the work you promised visible." })).toBeVisible();
  await expect(page.getByRole("link", { name: "admin@floydee.com" })).toHaveAttribute("href", "mailto:admin@floydee.com");
  await page.getByRole("button", { name: /Explore the prototype/i }).click();
  await expect(page).toHaveURL(/view=prototype/);
  await expect(page.getByTestId("phone-frame")).toBeVisible();
  await page.getByRole("button", { name: "Overview" }).click();
  await expect(page.getByRole("heading", { name: "Make the work you promised visible." })).toBeVisible();
});
