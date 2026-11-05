import type { Page } from "@playwright/test";

export async function smallVisibleText(page: Page) {
  return page.evaluate(() => {
    const issues: { element: string; size: number; minimum: number }[] = [];
    const seen = new Set<Element>();
    const text = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (text.nextNode()) {
      const element = text.currentNode.parentElement;
      if (!element || !text.currentNode.textContent?.trim() || seen.has(element)) continue;
      seen.add(element);
      if (element.closest("script, style, noscript, .sr-only, [hidden]")) continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width <= 1 || rect.height <= 1 || style.visibility === "hidden" || style.opacity === "0") continue;
      const minimum = element.closest(".sample-document") ? 12 : 13;
      const size = parseFloat(style.fontSize);
      if (size + 0.1 < minimum) issues.push({ element: `${element.tagName.toLowerCase()}.${element.className}`, size, minimum });
    }
    return issues;
  });
}
