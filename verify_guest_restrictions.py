from playwright.sync_api import sync_playwright
import time
import os

def verify_guest_restrictions():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            color_scheme='dark',
            viewport={'width': 1280, 'height': 720}
        )
        page = context.new_page()

        print("Navigating to login page...")
        page.goto("http://localhost:3000/login")

        print("Clicking 'Guest Login'...")
        # The text is "Guest Login (View Only)"
        try:
             page.click("button:has-text('Guest Login (View Only)')", timeout=5000)
        except Exception as e:
             print(f"Failed to click button: {e}")
             page.screenshot(path="verification/login_fail.png")
             return

        print("Waiting for navigation...")
        try:
             page.wait_for_url("http://localhost:3000/", timeout=10000)
        except Exception as e:
             print(f"Navigation failed or timed out: {e}")
             page.screenshot(path="verification/nav_fail.png")
             # Try reload if stuck?
             if page.url == "http://localhost:3000/login":
                  print("Still on login page.")
                  return

        print("Logged in as Guest.")

        # 1. Verify Video Thumbnails
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(3)

        if not os.path.exists("verification"):
            os.makedirs("verification")

        page.screenshot(path="verification/guest_feed_thumbnails.png")
        print("Screenshot of feed saved.")

        # 2. Verify Settings
        print("Accessing /settings...")
        page.goto("http://localhost:3000/settings")
        time.sleep(1)
        if page.url.rstrip('/') == "http://localhost:3000":
             print("SUCCESS: Redirected to home from settings.")
        else:
             print(f"FAILURE: At {page.url} (expected home)")

        # 3. My Page
        print("Accessing /profile...")
        page.goto("http://localhost:3000/profile")
        if page.get_by_text("Edit Profile").is_visible():
             print("FAILURE: Edit Profile visible.")
        else:
             print("SUCCESS: Edit Profile hidden.")

        # 4. Follow
        print("Checking Follow...")
        page.goto("http://localhost:3000/")

        user_link = page.locator("a[href^='/users/']").first
        if user_link.count() > 0:
             print("Clicking user link...")
             user_link.click()
             page.wait_for_load_state("networkidle")

             follow_btn = page.get_by_role("button", name="Follow")
             if follow_btn.is_visible():
                 if follow_btn.is_disabled():
                      print("SUCCESS: Follow button disabled.")
                 else:
                      print("FAILURE: Follow button enabled.")
             else:
                 print("Follow button not found (might be 'Following' or own profile).")
        else:
             print("No user links found.")

        browser.close()

if __name__ == "__main__":
    verify_guest_restrictions()
