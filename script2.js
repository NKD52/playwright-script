import { chromium } from "playwright";

export default async function runAutomation(
  co,
  oId,
  creatorName,
  creatorEmail,
  creatorPhone
) {
  if (!co || !oId) throw new Error("Missing co or oId");

  const HR_USERNAME = process.env.HR_USERNAME;
  const HR_PASSWORD = process.env.HR_PASSWORD;
  const SECURITY_ANSWER = process.env.SECURITY_ANSWER;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const targetUrl = `https://www.hralliance.net/onboard/ValidateI9.aspx?co=${co}&oid=${oId}`;

  try {
    // --- INITIAL LOAD ---
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    const pageContent = (await page.textContent("body")) || "";

    // --- LOGIN REQUIRED ---
    if (
      pageContent.includes(
        "You are not allowed to view the page that you requested."
      )
    ) {
      await page.goto("https://www.hralliance.net/Dashboard2.aspx", {
        waitUntil: "networkidle",
      });

      await page.fill("#user", HR_USERNAME);
      await page.fill("#password", HR_PASSWORD);
      await page.click("#submit");

      await page.waitForLoadState("networkidle");
    }

    // --- SECURITY QUESTION PAGE ---
    if (page.url().includes("UserActionRequiredNewDesign.aspx")) {
      await page.fill("#ans", SECURITY_ANSWER);
      await page.click("button.nv-btn-primary");
      await page.waitForTimeout(2000);
    }

    // Reload target page now that we are authenticated
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    //
    // -----------------------------------------------------------
    // 1) CLICK "BEGIN E-VERIFY CASE"
    // -----------------------------------------------------------
    //
    await page.waitForSelector('button:has-text("Begin E-Verify Case")', {
      timeout: 15000,
    });
    await page.click('button:has-text("Begin E-Verify Case")');

    //
    // -----------------------------------------------------------
    // 2) WAIT FOR THE POPUP DIALOG
    // The dialog title is: "Submit Initial E-Verify Case"
    // -----------------------------------------------------------
    //
    await page.waitForSelector(
      'span.ui-dialog-title:has-text("Submit Initial E-Verify Case")',
      {
        timeout: 15000,
      }
    );

    //
    // -----------------------------------------------------------
    // 3) FILL FIELDS INSIDE DIALOG
    // -----------------------------------------------------------
    //

    await page.fill("#case_creator_name", creatorName);
    await page.fill("#case_creator_email_address", creatorEmail);
    await page.fill("#case_creator_phone_number", creatorPhone);

    //
    // -----------------------------------------------------------
    // 4) CLICK "Submit" INSIDE THE DIALOG
    // -----------------------------------------------------------
    //
    await page.click('.ui-dialog-buttonset button:has-text("Submit")');

    // (Optional) wait for the submit request/response to finish
    await page.waitForTimeout(2000);

    await browser.close();

    return {
      success: true,
      co,
      oId,
      message: "E-Verify case submitted successfully",
    };
  } catch (err) {
    await browser.close();
    return { success: false, co, oId, message: err.message };
  }
}
