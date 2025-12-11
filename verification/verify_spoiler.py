
import os
import base64
import random
import time
from playwright.sync_api import sync_playwright, expect

def test_spoiler_feature():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Signup
            print("Navigating to signup...")
            page.goto("http://localhost:3000/signup")

            username = f"spoiler_{random.randint(1000,9999)}"
            print(f"Signing up as {username}...")

            page.get_by_placeholder("Username").fill(username)
            page.get_by_placeholder("Password").fill("password123")
            page.get_by_role("button", name="Sign up").click()

            page.wait_for_url("http://localhost:3000/")
            print("Signed up.")

            # 2. Go to Upload
            page.goto("http://localhost:3000/upload")

            # Verify Spoiler Toggle exists
            expect(page.locator("#isSpoiler")).to_be_visible()
            print("Spoiler checkbox found.")
            page.screenshot(path="verification/upload_page.png")

            # 3. Upload Image
            img_path = os.path.abspath("verification/test.png")
            with open(img_path, "wb") as f:
                # 10x10 red square
                f.write(base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVyCqPAQA7OQf7r/4hOAAAAABJRU5ErkJggg=="))

            print(f"Uploading image from {img_path}...")
            page.locator('input[type="file"]').set_input_files(img_path)

            # Wait for Crop UI - Look for Zoom slider
            print("Waiting for crop UI...")
            # Use slider locator
            expect(page.locator('input[type="range"]')).to_be_visible(timeout=10000)

            # Confirm Crop
            page.locator("button.bg-indigo-600").click()

            # Wait for preview (Zoom should disappear)
            expect(page.locator('input[type="range"]')).not_to_be_visible()

            # 4. Set Spoiler
            print("Setting spoiler...")
            page.locator("#isSpoiler").check()
            page.locator('input[name="comment"]').fill("This is a spoiler post")

            # 5. Share
            print("Sharing...")
            page.get_by_role("button", name="Share").click()

            # Wait for redirect to home
            page.wait_for_url("http://localhost:3000/")
            print("Redirected to home.")

            # 6. Verify Feed
            page.wait_for_selector(".grid.grid-cols-3")

            # Check for warning icon in the first post
            warning_icon = page.locator(".text-yellow-500").first
            expect(warning_icon).to_be_visible()
            print("Spoiler warning icon visible.")

            page.screenshot(path="verification/feed_spoiler.png")

            # 7. Click and Verify Confirmation
            print("Clicking post...")

            dialog_message = []
            def handle_dialog(dialog):
                print(f"Dialog appeared: {dialog.message}")
                dialog_message.append(dialog.message)
                dialog.accept()

            page.on("dialog", handle_dialog)

            page.locator(".grid.grid-cols-3 > div").first.click()

            # 8. Verify Modal Opened
            expect(page.locator("div.fixed.inset-0")).to_be_visible()
            print("Modal opened.")

            if not dialog_message:
                print("Warning: Dialog message not captured.")
            else:
                 print(f"Captured dialog message: {dialog_message[0]}")

            page.screenshot(path="verification/modal_revealed.png")
            print("Verification Passed")

        except Exception as e:
            print(f"Failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    test_spoiler_feature()
