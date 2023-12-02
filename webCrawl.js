const puppeteer = require("puppeteer-extra");

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
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
  await page.waitForSelector('[aria-label*="@gmail.com"]', {
    visible: true,
  });
  
  let status = "Ok";
  if (page.url().includes("/rejected?")) {
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
