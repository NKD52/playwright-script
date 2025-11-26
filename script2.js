// script2.js (or wherever this lives)
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const AUTH_FILE = path.resolve("./auth.json"); // reuse same auth.json path

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

  // 🔹 Create context, loading auth.json if present
  let context;
  if (fs.existsSync(AUTH_FILE)) {
    console.log("🔄 Using saved auth state from auth.json");
    context = await browser.newContext({ storageState: AUTH_FILE });
  } else {
    console.log("🆕 No auth.json found, starting fresh context");
    context = await browser.newContext();
  }

  const page = await context.newPage();

  const targetUrl = `https://www.hralliance.net/onboard/ValidateI9.aspx?co=${co}&oid=${oId}`;

  try {
    // --- INITIAL LOAD ---
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    let pageContent = (await page.textContent("body")) || "";

    // --- LOGIN REQUIRED ---
    if (
      pageContent.includes(
        "You are not allowed to view the page that you requested."
      )
    ) {
      console.log("⚠️ Login required (or cookies invalid) – logging in…");

      await page.goto("https://www.hralliance.net/Dashboard2.aspx", {
        waitUntil: "networkidle",
      });

      await page.fill("#user", HR_USERNAME);
      await page.fill("#password", HR_PASSWORD);
      await page.click("#submit");

      await page.waitForLoadState("networkidle");
      console.log("🔐 Login complete");

      // update page content after login
      pageContent = (await page.textContent("body")) || "";

      // 🔸 Save fresh storage state after login
      await context.storageState({ path: AUTH_FILE });
      console.log("💾 Saved new auth state to auth.json");
    }

    // --- SECURITY QUESTION PAGE ---
    if (page.url().includes("UserActionRequiredNewDesign.aspx")) {
      console.log("🔒 Security question page detected");
      await page.fill("#ans", SECURITY_ANSWER);
      await page.click("button.nv-btn-primary");
      await page.waitForTimeout(2000);

      // 🔸 Save storage again after passing security
      await context.storageState({ path: AUTH_FILE });
      console.log("💾 Saved auth.json after security question");
    }

    // Reload target page now that we are authenticated
    console.log("↩️ Reloading I-9 page:", targetUrl);
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    //
    // -----------------------------------------------------------
    // 1) CLICK "BEGIN E-VERIFY CASE"
    // -----------------------------------------------------------
    //
    console.log('🟦 Waiting for "Begin E-Verify Case" button…');
    await page.waitForSelector('button:has-text("Begin E-Verify Case")', {
      timeout: 15000,
    });
    await page.click('button:has-text("Begin E-Verify Case")');
    console.log("👉 Clicked Begin E-Verify");

    //
    // -----------------------------------------------------------
    // 2) WAIT FOR THE POPUP DIALOG
    // -----------------------------------------------------------
    //
    await page.waitForSelector(
      'span.ui-dialog-title:has-text("Submit Initial E-Verify Case")',
      {
        timeout: 15000,
      }
    );
    console.log("🟩 E-Verify dialog visible");

    //
    // -----------------------------------------------------------
    // 3) FILL FIELDS INSIDE DIALOG
    // -----------------------------------------------------------
    //
    await page.fill("#case_creator_name", creatorName);
    await page.fill("#case_creator_email_address", creatorEmail);
    await page.fill("#case_creator_phone_number", creatorPhone);
    console.log("✏️ Filled creator info");

    //
    // -----------------------------------------------------------
    // 4) CLICK "Submit" INSIDE THE DIALOG
    // -----------------------------------------------------------
    //
    await page.click('.ui-dialog-buttonset button:has-text("Submit")');
    console.log("📤 Submitted E-Verify case");

    // Wait after submitting
    await page.waitForTimeout(2000);

    console.log("🔄 Refreshing page to check E-Verify result…");
    await page.goto(targetUrl, { waitUntil: "networkidle" });

    // Extract page text
    const bodyText = (await page.textContent("body")) || "";

    // The success indicator text (partial match is enough)
    const successText =
      "E-Verify is not required at this time for the following reason";

    // -----------------------------------------------------------
    // CHECK FOR SUCCESS MESSAGE
    // -----------------------------------------------------------
    if (bodyText.includes(successText)) {
      console.log(
        "E-Verify was already completed for this I9. No new case needed."
      );

      await browser.close();
      return {
        success: true,
        co,
        oId,
        message:
          "E-Verify completed previously. Message detected: E-Verify is not required.",
      };
    }

    // -----------------------------------------------------------
    // ANY OTHER MESSAGE = CAPTURE AND RETURN
    // -----------------------------------------------------------
    console.log("⚠️ Different message detected. Returning page snippet…");

    // Extract the visible DIV element by ID
    let messageHtml = "";
    try {
      const el = await page.$("#evCaseDisplay");
      if (el) messageHtml = await el.innerHTML();
    } catch {}

    // Close browser
    await browser.close();

    return {
      success: false,
      co,
      oId,
      message:
        "Unexpected E-Verify page message. Check 'details' field for actual message.",
      details: messageHtml || bodyText.slice(0, 500),
    };
  } catch (err) {
    console.error("❌ Automation error:", err);
    await browser.close();
    return { success: false, co, oId, message: err.message };
  }
}
