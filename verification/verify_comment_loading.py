import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Emulate dark mode as per memory
        context = browser.new_context(color_scheme='dark')
        page = context.new_page()

        try:
            # Note: We can't easily replicate the entire auth/db state to reproduce the infinite spinner bug
            # without a running backend and specific data state (post without comments in feed).
            # However, we can verify that the Feed component renders and doesn't crash with the new useEffect.
            # We'll visit the home page.

            print("Navigating to home page...")
            page.goto("http://localhost:3000")

            # Wait for feed to load
            print("Waiting for feed...")
            page.wait_for_selector("div.grid.grid-cols-3", timeout=10000)

            # Take a screenshot of the feed to ensure basic rendering
            page.screenshot(path="verification/feed_render.png")
            print("Screenshot taken: verification/feed_render.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
