const express = require("express");
const bodyParser = require("body-parser");
const { webCrawl } = require("./webCrawl");
const app = express();

const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(function (err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400) {
    console.error("Bad JSON");
    res.send('{"error":"Invalid Request Data"}');
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to Scrape Master!");
});

app.get("/v1", (req, res) => {
  res.send("Gmail Checker v1 Running!\nLast Update: 11:04am 02/12/2023");
});

app.post("/v1", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  let data = req.body;
  // let url = data.url ? decodeURI(data.url) : "https://example.com";
  let headers = data.headers ? data.headers : {};
  let ua = headers["user-agent"]
    ? decodeURIComponent(headers["user-agent"])
    : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";
  let email = data.email ? data.email : "example@gmail.com";
  let cookie = headers["cookie"] ? headers["cookie"] : "";
  let header = headers
    ? JSON.stringify(headers)
    : '{"X-Powered-By": "Cloudflare"}';
  let proxy = data.proxy ? decodeURIComponent(data.proxy) : "";
  let method = data.method ? data.method.toUpperCase() : "GET";
  webCrawl(res, email, ua, header, proxy, cookie, method, data.data);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
