
import os
import time
from playwright.sync_api import sync_playwright, expect

def verify_edit_profile_dark(page):
    # Register and Login
    page.goto("http://localhost:3000/signup")
    timestamp = str(int(time.time()))
    username = f"user_{timestamp}"
    password = "password123"

    print(f"Signing up as {username}")

    page.fill("input[name='username']", username)
    page.fill("input[name='password']", password)
    page.click("button[type='submit']")

    # Wait for navigation after signup
    print("Waiting for navigation after signup...")
    try:
        page.wait_for_url(lambda u: u == "http://localhost:3000/" or "login" in u, timeout=10000)
    except Exception as e:
        print(f"Navigation timeout: {e}")
        page.screenshot(path="verification/signup_stuck.png")

    if "login" in page.url:
         print("Redirected to login, logging in...")
         page.fill("input[name='username']", username)
         page.fill("input[name='password']", password)
         page.click("button[type='submit']")
         page.wait_for_url("http://localhost:3000/", timeout=10000)

    # Enable Dark Mode first
    print("Enabling Dark Mode...")
    page.goto("http://localhost:3000/settings")
    page.get_by_role("button", name="Dark").click()
    time.sleep(1)

    # Go to profile
    print("Going to profile...")
    page.goto("http://localhost:3000/profile")

    # Click Edit Profile
    print("Clicking Edit Profile...")
    page.click("text=Edit Profile")

    # Wait for Edit Profile Modal/Page
    print("Waiting for 'Edit Profile' header...")
    expect(page.locator("h2", has_text="Edit Profile")).to_be_visible(timeout=10000)

    # Take screenshot
    print("Taking screenshot of Edit Profile in Dark Mode...")
    page.screenshot(path="verification/edit_profile_dark_after.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_edit_profile_dark(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_edit_profile.png")
        finally:
            browser.close()
