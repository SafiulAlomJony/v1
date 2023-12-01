const puppeteer = require("puppeteer-extra");

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
require("dotenv").config();

const webCrawl = async (res, url, ua, header, pp, cookie, method, postData) => {
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
    headless: true,
  });

  try {
    const page = await browser.newPage();
    if (ua) {
      await page.setUserAgent(ua);
    }
    if (pp) {
      page.authenticate({ username: auth[0], password: auth[1] });
    }

    // enable request interception
    let lastRedirectResponse = undefined;
    await page.setRequestInterception(true);

    // add header for the navigation requests
    page.on("request", (request) => {
      // Do nothing in case of non-navigation requests.
      if (!request.isNavigationRequest()) {
        request.continue();
        return;
      }

      if (
        ["image", "stylesheet", "font", "script"].indexOf(
          request.resourceType()
        ) !== -1
      ) {
        request.abort();
        return;
      }

      let newHeaders = JSON.parse(header);

      const headers = request.headers();

      for (const [key, value] of Object.entries(newHeaders)) {
        headers[key] = value;
      }

      let data = {};

      if (method !== "GET") {
        data["method"] = method;
        data["postData"] = postData;
      }

      let newReq = Object.assign(data, { headers });

      request.continue(newReq);
    });

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
    const response = await page.goto(url);
    const headers = JSON.stringify(response.headers());
    const statusCode = Number(response.status());
    let content = await response.text();
    const finalUrl = response.url();
    let result =
      '{"statusCode":' +
      statusCode +
      ',"headers":' +
      headers +
      ',"body":' +
      JSON.stringify(content) +
      "}";
    result = JSON.parse(result);
    if (finalUrl) {
      result["finalUrl"] = finalUrl;
    }
    res.send(result);
  } catch (e) {
    let result = `{"error":${JSON.stringify(e)},"body":""}`;
    res.send(JSON.parse(result));
  } finally {
    await browser.close();
  }
};

module.exports = { webCrawl };
