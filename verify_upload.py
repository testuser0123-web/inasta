
import os
import base64
from playwright.sync_api import sync_playwright, expect

def verify_upload(page):
    # Create a valid minimal PNG image (1x1 white pixel)
    # Signature: \x89PNG\r\n\x1a\n ...
    # Base64 of a 1x1 white pixel PNG
    minimal_png_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

    with open("dummy.jpg", "wb") as f:
        f.write(base64.b64decode(minimal_png_b64))

    # Navigate to upload page
    print("Navigating to /upload...")
    page.goto("http://localhost:3000/upload", timeout=60000)

    # Wait for file input
    print("Waiting for file input...")

    page.set_input_files('input[type="file"]', "dummy.jpg")
    print("File selected.")

    # Wait for cropper
    print("Waiting for cropper...")
    expect(page.get_by_label("Confirm crop")).to_be_visible(timeout=10000)

    # Confirm crop
    print("Confirming crop...")
    page.get_by_label("Confirm crop").click()

    # Wait for preview to appear (grid of images)
    print("Waiting for preview...")
    expect(page.locator("img[alt='Preview 0']")).to_be_visible(timeout=10000)

    # Fill comment
    page.fill("input[name='comment']", "Test post")

    # Submit
    print("Submitting form...")
    page.get_by_role("button", name="Share").click()

    # Verify loading state
    print("Verifying loading state...")
    # Verify that "Share" is GONE or button is disabled and text changed.
    # The text changes to "Processing..."
    expect(page.get_by_text("Processing...")).to_be_visible()

    # Take screenshot of the loading state
    print("Taking screenshot...")
    page.wait_for_timeout(500)

    page.screenshot(path="/home/jules/verification/upload_loading_state.png")
    print("Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            verify_upload(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
