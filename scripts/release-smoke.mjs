import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseURL = process.env.NASAB_BASE_URL ?? "http://127.0.0.1:8080";
const screenshots = resolve(process.cwd(), "screenshots");

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // The development server is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Nasab did not become ready at ${baseURL}`);
}

await waitForServer();
await mkdir(screenshots, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    for (const path of ["/", "/privacy", "/terms", "/login", "/app"]) {
      const response = await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
      if (!response?.ok())
        throw new Error(`${viewport.name} ${path} returned ${response?.status()}`);
      if (!(await page.locator("body").innerText()).trim())
        throw new Error(`${viewport.name} ${path} rendered blank`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      if (overflow) throw new Error(`${viewport.name} ${path} has horizontal overflow`);
    }

    await page.goto(`${baseURL}/app`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Contoh Al-Falah", exact: true }).click();
    await page.locator(".react-flow").waitFor({ state: "visible" });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: resolve(screenshots, `release-${viewport.name}.png`),
      fullPage: false,
    });

    if (errors.length) throw new Error(`${viewport.name} console errors:\n${errors.join("\n")}`);
    results.push({ viewport: viewport.name, routes: 5, editor: true, errors: 0 });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ ok: true, results }, null, 2));
