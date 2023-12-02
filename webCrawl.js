const puppeteer = require("puppeteer-extra");
// const blockResourcesPlugin =
//   require("puppeteer-extra-plugin-block-resources")();
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
// puppeteer.use(blockResourcesPlugin);
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
      `--disable-setuid-sandbox`,
      `--no-sandbox`,
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
    headless: "new",
  });

  const page = await browser.newPage();
  if (ua) {
    await page.setUserAgent(ua);
  }
  if (pp) {
    page.authenticate({ username: auth[0], password: auth[1] });
  }
  // blockResourcesPlugin.blockedTypes.add("image");
  // blockResourcesPlugin.blockedTypes.add("stylesheet");
  // blockResourcesPlugin.blockedTypes.add("other");
  // blockResourcesPlugin.blockedTypes.add("media");
  let url =
    "https://accounts.google.com/v3/signin/identifier?continue=https://myaccount.google.com?service=accountsettings&flowName=GlifWebSignIn";
  const urls = new URL(url);
  let domain = urls.hostname;
  let cookies = [];

  cookie =
    cookie.lastIndexOf(";") == cookie.length - 1
      ? cookie.substring(0, cookie.length - 1)
      : cookie;
  if (cookie) {
    cookie.split(/\s*;\s*/).forEach(function (pair) {
      let data = {};
      pair = pair.split(/\s*=\s*/);
      var name = pair[0];
      var value = pair.splice(1).join("=");
      data["name"] = name;
      data["value"] = value;
      data["domain"] = domain;
      cookies.push(data);
    });
  }

  await page.setCookie(...cookies);
  const navigationPromise = page.waitForNavigation();
  await page.goto(url);
  await navigationPromise;
  await page.waitForSelector('input[type="email"]');
  // Clear the existing value in the email input field
  await page.$eval('input[type="email"]', (input) => (input.value = ""));
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', email);
  const [button] = await page.$x("//span[contains(., 'Next')]");
  if (button) {
    // Click the button
    await Promise.all([navigationPromise, button.click()]);
  }

  await page.waitForTimeout(10000);

  // async function waitForDynamicCondition(page, condition, timeout) {
  //   const startTime = Date.now();
  //   let isConditionMet = false;

  //   while (Date.now() - startTime < timeout) {
  //     isConditionMet = await condition(page);

  //     if (isConditionMet) {
  //       break;
  //     }

  //     // Wait for a short interval before checking again
  //     await page.waitForTimeout(1000);
  //   }

  //   if (!isConditionMet) {
  //     console.error(
  //       `Condition not met within the specified timeout of ${timeout} milliseconds.`
  //     );
  //   }
  // }

  // await waitForDynamicCondition(
  //   page,
  //   (page) => !page.url().includes("identifier"),
  //   6000
  // ); // Wait for up to 6 seconds
  let status = "Ok";

  if (page.url().includes("challenge")) {
    status = "verify";
    console.log("Account Verify");
  } else if (page.url().includes("identifier")) {
    status = "not exists";
    console.log("Account Not Found");
  } else {
    console.log(page.url());
    status = "disabled";
    console.log("Account Disabled");
  }
  let result = `{}`;
  result = JSON.parse(result);
  result[email] = status;
  res.send(result);
  await browser.close();
};

module.exports = { webCrawl };
