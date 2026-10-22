"""Optional local-only visual smoke test: python qa_smoke.py (requires playwright + chromium)."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
html = (root / "index.html").read_text(encoding="utf-8")
out = root / "assets"
out.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    for width, height in [(1440, 900), (390, 844), (360, 800), (768, 1024), (1024, 768)]:
        page = browser.new_page(viewport={"width": width, "height": height})
        page.set_content(html)
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), f"Horizontal overflow at {width}"
        assert page.locator("#verdictText").inner_text() == "Eligible for signing"
        page.locator('[data-case="approval"]').click()
        assert page.locator("#verdictText").inner_text() == "Approval required"
        page.locator('[data-case="tampered"]').click()
        assert page.locator("#verdictText").inner_text() == "Execution blocked"
        assert page.locator("#executorStatus").inner_text() == "REJECTED"
        page.locator('[data-case="valid"]').click()
        assert page.locator("#verdictText").inner_text() == "Eligible for signing"
        if width <= 780:
            page.locator("#navToggle").click()
            assert page.locator("#navToggle").get_attribute("aria-expanded") == "true"
            page.locator('#primary-nav a[href="#mechanism"]').click()
            assert page.locator("#navToggle").get_attribute("aria-expanded") == "false"
        print(f"PASS {width}x{height}: layout + scenario + menu")
        page.close()
    browser.close()
