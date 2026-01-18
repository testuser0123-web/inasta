from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to verification page
    page.goto("http://localhost:3000/verify-delete")

    # Wait for content
    expect(page.get_by_text("Verification Page")).to_be_visible()

    # Check for own comment
    own_comment_container = page.locator("div.group", has=page.get_by_text("My Comment"))
    expect(own_comment_container).to_be_visible()

    delete_button = own_comment_container.get_by_role("button", name="Delete comment")

    # Hover to show button
    own_comment_container.hover()
    expect(delete_button).to_be_visible()

    # Screenshot with hover
    page.screenshot(path="verification/verification.png")

    # Check for other comment
    other_comment_container = page.locator("div.group", has=page.get_by_text("Other Comment"))
    expect(other_comment_container).to_be_visible()

    other_delete_button = other_comment_container.get_by_role("button", name="Delete comment")

    other_comment_container.hover()
    expect(other_delete_button).not_to_be_visible()

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
