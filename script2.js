import { chromium } from "playwright";

export default async function runAutomation(co, oId) {
  if (!co || !oId) throw new Error("Missing co or oId");

  const HR_USERNAME = process.env.HR_USERNAME;
  const HR_PASSWORD = process.env.HR_PASSWORD;
  const SECURITY_ANSWER = process.env.SECURITY_ANSWER || "Rehan";

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const targetUrl = `https://www.hralliance.net/onboard/ValidateI9.aspx?co=${co}&oid=${oId}`;

  try {
    await page.goto(targetUrl, { waitUntil: "networkidle" });
    const pageContent = (await page.textContent("body")) || "";

    if (
      pageContent.includes(
        "You are not allowed to view the page that you requested."
      )
    ) {
      // login flow...
      await page.goto("https://www.hralliance.net/Dashboard2.aspx", {
        waitUntil: "networkidle",
      });
      await page.fill("#user", HR_USERNAME);
      await page.fill("#password", HR_PASSWORD);
      await page.click("#submit");
    }

    if (page.url().includes("UserActionRequiredNewDesign.aspx")) {
      await page.fill("#ans", SECURITY_ANSWER);
      await page.click("button.nv-btn-primary");
      await page.waitForTimeout(2000);
    }

    await page.goto(targetUrl, { waitUntil: "networkidle" });

    // Example: click the target button
    // await page.click('button#yourButtonSelector');

    await browser.close();

    return {
      success: true,
      co,
      oId,
      message: "Automation completed successfully",
    };
  } catch (err) {
    await browser.close();
    return { success: false, co, oId, message: err.message };
  }
}
