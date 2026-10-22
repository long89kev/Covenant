from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
html=(ROOT/'index.html').read_text(encoding='utf-8').replace('<link rel="stylesheet" href="./styles.css"/>','<style>'+ (ROOT/'styles.css').read_text(encoding='utf-8')+'</style>').replace('<script src="./app.js"></script>','<script>'+ (ROOT/'app.js').read_text(encoding='utf-8')+'</script>')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width,height in [(1440,960),(1024,900),(768,960),(390,844),(360,800)]:
        page=browser.new_page(viewport={'width':width,'height':height}, device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda err: errors.append(str(err)))
        page.set_content(html, wait_until="load")
        page.wait_for_timeout(300)
        page.screenshot(path=str(ROOT/'assets'/f'dashboard_{width}.png'),full_page=True)
        assert page.locator('[data-view="dashboard"]').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'), f'Overflow dashboard {width}'
        if width<=840:
            page.locator('#menu-toggle').click()
            assert 'open' in (page.locator('#sidebar').get_attribute('class') or '')
            page.locator('.side-links [data-route="inspector"]').click()
        else:
            page.locator('.side-links [data-route="inspector"]').click()
        assert page.locator('[data-view="inspector"]').is_visible()
        assert 'Eligible' in page.locator('#i-gate').inner_text()
        page.locator('.scenario[data-scenario="tampered"]').click()
        assert 'Execution blocked' in page.locator('#i-gate').inner_text()
        assert 'REJECTED' in page.locator('#i-executor').inner_text()
        page.screenshot(path=str(ROOT/'assets'/f'inspector_tampered_{width}.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1'), f'Overflow inspector {width}'
        page.locator('.scenario[data-scenario="approval"]').click()
        assert 'Approval required' in page.locator('#i-gate').inner_text()
        if width==1440:
            page.screenshot(path=str(ROOT/'assets'/'inspector_pending_1440.png'),full_page=True)
            page.locator('.side-links [data-route="negotiation"]').click()
            page.screenshot(path=str(ROOT/'assets'/'negotiation_1440.png'),full_page=True)
            page.locator('.side-links [data-route="governance"]').click()
            page.screenshot(path=str(ROOT/'assets'/'governance_1440.png'),full_page=True)
            page.locator('.side-links [data-route="audit"]').click()
            page.locator('#audit-filter').select_option('rejected')
            assert page.locator('.audit-row:visible').count()==1
            page.screenshot(path=str(ROOT/'assets'/'audit_1440.png'),full_page=True)
        assert not errors, errors
        print(f'PASS {width}px: dashboard, inspector, switch valid/tampered/approval, no overflow')
        page.close()
    browser.close()

