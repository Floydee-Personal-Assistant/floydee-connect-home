import { expect, test } from "@playwright/test";

test("showcase introduces Floydee Connect alongside the interactive prototype", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Floydee Connect");
  await expect(page.getByRole("heading", { name: "Helps you plan." })).toBeVisible();
  await expect(page.getByRole("link", { name: "admin@floydee.com" })).toHaveAttribute("href", "mailto:admin@floydee.com");
  await expect(page.getByTestId("phone-frame")).toBeVisible();
});
