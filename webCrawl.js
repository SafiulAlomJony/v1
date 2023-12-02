const puppeteer = require("puppeteer-extra");

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const blockResourcesPlugin =
  require("puppeteer-extra-plugin-block-resources")();
puppeteer.use(blockResourcesPlugin);
puppeteer.use(StealthPlugin());
require("dotenv").config();

const webCrawl = async (
  res,
  email,
  ua,
  header,
  pp,
  cookie,
  method,
  postData
) => {
  function isJson(item) {
    let value = typeof item !== "string" ? JSON.stringify(item) : item;
    try {
      value = JSON.parse(value);
    } catch (e) {
      return false;
    }

    return typeof value === "object" && value !== null;
  }

  if (method !== "GET") {
    if (isJson(postData)) {
      try {
        postData = decodeURIComponent(postData);
      } catch (e) {
        console.log(e);
      }
    }
  }

  proxy = pp.split("@");
  let auth = proxy[0].replace("http://", "");
  auth = auth.split(":");

  let server = "";
  if (pp) {
    server = "--proxy-server=" + proxy[1];
  }

  const browser = await puppeteer.launch({
    args: [
      `--no-sandbox`,
      `--disable-setuid-sandbox`,
      `--disable-dev-shm-usage`,
      `--single-process`,
      `--no-zygote`,
      `--window-size=1920,1080`,
      server,
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    headless: true,
  });

  const page = await browser.newPage();
  if (ua) {
    await page.setUserAgent(ua);
  }
  if (pp) {
    page.authenticate({ username: auth[0], password: auth[1] });
  }
  blockResourcesPlugin.blockedTypes.add("image");
  blockResourcesPlugin.blockedTypes.add("stylesheet");
  blockResourcesPlugin.blockedTypes.add("other");
  blockResourcesPlugin.blockedTypes.add("media");

  let url =
    "https://accounts.google.com/v3/signin/identifier?continue=https://myaccount.google.com?service=accountsettings&flowName=GlifWebSignIn";

  const navigationPromise = page.waitForNavigation();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await navigationPromise;
  console.log("Email: " + email);
  await page.waitForSelector('input[type="email"]');
  // Clear the existing value in the email input field
  await page.$eval('input[type="email"]', (input) => (input.value = ""));
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email);
  const [button] = await page.$x("//span[contains(., 'Next')]");
  if (button) {
    await Promise.all([navigationPromise, button.click()]);
  }

  async function waitForDynamicCondition(page, condition, timeout) {
    const startTime = Date.now();
    let isConditionMet = false;

    while (Date.now() - startTime < timeout) {
      isConditionMet = await condition(page);

      if (isConditionMet) {
        break;
      }

      // Wait for a short interval before checking again
      await page.waitForTimeout(500);
    }

    if (!isConditionMet) {
      console.error(
        `Condition not met within the specified timeout of ${timeout} milliseconds.`
      );
    }
  }

  // Usage:
  await waitForDynamicCondition(
    page,
    (page) => !page.url().includes("identifier"),
    60000
  ); // Wait for up to 60 seconds

  let status = "Ok";

  if (!page.url().includes("identifier")) {
    status = "disabled";
    console.log("Account Disabled");
  } else {
    status = "verify";
    console.log("Account Verify");
  }

  res.send({ status: status });
  await browser.close();
};

module.exports = { webCrawl };
