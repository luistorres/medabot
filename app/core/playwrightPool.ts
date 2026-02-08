import { chromium, Browser, BrowserContext, Page } from "playwright";

const INFARMED_URL = "https://extranet.infarmed.pt/INFOMED-fo/pesquisa-avancada.xhtml";
const TTL_MS = 60_000; // 60 seconds

export interface WarmInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

let warmInstance: WarmInstance | null = null;
let warmupPromise: Promise<void> | null = null;
let createdAt = 0;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Fire-and-forget: launches Chromium and navigates to the INFARMED search form.
 * Safe to call multiple times — only one warmup runs at a time.
 */
export function warmupPlaywright(): void {
  if (warmupPromise || warmInstance) return;

  warmupPromise = (async () => {
    try {
      console.log("[playwrightPool] Warming up Chromium…");
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(INFARMED_URL, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('input[title$="Nome do Medicamento"]', { timeout: 15000 });

      warmInstance = { browser, context, page };
      createdAt = Date.now();
      console.log("[playwrightPool] Warm instance ready");

      // Auto-cleanup after TTL
      cleanupTimer = setTimeout(() => {
        if (warmInstance) {
          console.log("[playwrightPool] TTL expired — closing warm instance");
          warmInstance.browser.close().catch(() => {});
          warmInstance = null;
        }
      }, TTL_MS);
    } catch (err: any) {
      console.warn("[playwrightPool] Warmup failed:", err.message);
    } finally {
      warmupPromise = null;
    }
  })();
}

/**
 * Returns the warmed Playwright instance if available, consuming it (one-time use).
 * Awaits an in-progress warmup if one is running.
 * Returns null if expired, consumed, or warmup failed.
 */
export async function consumeWarmInstance(): Promise<WarmInstance | null> {
  // Wait for in-progress warmup
  if (warmupPromise) {
    await warmupPromise;
  }

  if (!warmInstance) return null;

  // Check TTL
  if (Date.now() - createdAt > TTL_MS) {
    console.log("[playwrightPool] Instance expired — discarding");
    warmInstance.browser.close().catch(() => {});
    warmInstance = null;
    return null;
  }

  // Consume (one-time use)
  const instance = warmInstance;
  warmInstance = null;
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }

  return instance;
}
