import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/tmp/chromium", args: ["--no-sandbox", "--headless=new", "--use-gl=swiftshader", "--disable-gpu"] });
const p = await b.newPage();
await p.goto("about:blank");
console.log(await p.evaluate(() => navigator.userAgent));
await b.close();
