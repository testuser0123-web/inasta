
import os
from playwright.sync_api import sync_playwright, expect

def verify_diary():
    # Read user info
    with open("user_info.txt", "r") as f:
        content = f.read().strip()
        username, diary_id = content.split(",")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Increase viewport size to see more
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        try:
            print(f"Navigating to login... User: {username}")
            page.goto("http://localhost:3000/login")

            # Fill login form
            # Check if we are redirected to login (if not already there)
            if "login" in page.url:
                # Use English placeholders based on screenshot
                page.get_by_placeholder("Username").fill(username)
                page.get_by_placeholder("Password").fill("password123")

                # Click login button
                page.get_by_role("button", name="Sign in").click()

                # Wait for navigation to home or dashboard
                page.wait_for_url("http://localhost:3000/", timeout=15000)
                print("Logged in successfully!")

            # Navigate to the specific diary page
            diary_url = f"http://localhost:3000/diary/{diary_id}"
            print(f"Navigating to {diary_url}")
            page.goto(diary_url)

            # Verify we are on the page
            expect(page.get_by_role("heading", level=1)).to_be_visible()

            # 1. Verify Comment Avatar
            # Wait for comments to load if they are async
            page.wait_for_selector("img[crossorigin='anonymous']", timeout=10000)

            # Take a screenshot of the whole page first
            page.screenshot(path="/home/jules/verification/diary_full.png")
            print("Screenshot taken: diary_full.png")

            # Check for the top padding/margin change
            container = page.locator(".max-w-4xl").first
            # We can't easily check computed styles in python playwright without eval
            # but we can rely on visual inspection of the screenshot.

            # Verify crossOrigin attribute on avatar
            images = page.locator("img").all()
            found_cross_origin = False
            for img in images:
                cross_origin = img.get_attribute("crossorigin")
                alt = img.get_attribute("alt")
                src = img.get_attribute("src")
                print(f"Image: src={src}, alt={alt}, crossOrigin={cross_origin}")
                if cross_origin == "anonymous":
                    found_cross_origin = True

            if found_cross_origin:
                print("Confirmed: crossOrigin='anonymous' is present on images.")
            else:
                print("WARNING: crossOrigin='anonymous' NOT found on any image.")

        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_diary()
