import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto("http://localhost:3000/pay/test-uni", { waitUntil: "networkidle" });
  await mobile.screenshot({ path: "C:/Users/LENOVO/Desktop/development/dues_payment_system/.tmp-landing-mobile.png", fullPage: true });

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desktop.goto("http://localhost:3000/pay/test-uni", { waitUntil: "networkidle" });
  await desktop.screenshot({ path: "C:/Users/LENOVO/Desktop/development/dues_payment_system/.tmp-landing-desktop.png", fullPage: true });

  await browser.close();
  console.log("done");
}

main();
