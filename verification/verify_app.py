
import os
import time
from playwright.sync_api import sync_playwright

def verify_pages():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context with storage state if possible, but we don't have login creds easily.
        # We will check public pages or pages that redirect to login.
        # Ideally, we want to check that the UI for upload renders correctly (e.g. Cropper).
        # But Cropper requires selecting a file.

        # We can try to access /diary/new, /upload, etc. but they will redirect to login.
        # However, checking that they redirect confirms the server is up.
        # We can also check /login page.

        page = browser.new_page()

        # Wait for server to start
        base_url = "http://localhost:3000"
        max_retries = 30
        for i in range(max_retries):
            try:
                page.goto(base_url, timeout=3000)
                break
            except:
                time.sleep(1)

        print(f"Server started at {base_url}")

        # Check Homepage (Feed)
        page.goto(base_url)
        page.screenshot(path="verification/home.png")
        print("Home screenshot taken")

        # Check Login Page
        page.goto(f"{base_url}/login")
        page.screenshot(path="verification/login.png")
        print("Login screenshot taken")

        # Note: We cannot easily test authenticated upload flows without a valid session.
        # We rely on the build check passing and code review.
        # The visual verification here is limited to ensuring the app didn't crash.

        browser.close()

if __name__ == "__main__":
    verify_pages()
