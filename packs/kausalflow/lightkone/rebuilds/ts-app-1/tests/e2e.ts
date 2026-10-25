// End-to-end: the built app in Chromium, flows 1-13 of PRODUCT.md. Outside
// services (arXiv, Crossref, OpenAlex, Unpaywall, GitHub) are answered by
// mocks at the browser's network layer; everything else is the real app.
//
//   npm run build && node --experimental-transform-types tests/e2e.ts
// CHROMIUM=/path/to/chrome picks the browser (default: Playwright's).
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium, type BrowserContext, type Page, type Route } from "playwright";
import { FakeGitHub } from "./fake-github.ts";

const PORT = 4179;
const ORIGIN = `http://localhost:${PORT}`;
const fixtures = new URL("./fixtures/", import.meta.url).pathname;
const shots = new URL("../.dev/shots/", import.meta.url).pathname;
mkdirSync(shots, { recursive: true });
const pdf = (name: string) => readFileSync(fixtures + name);

const ARXIV_ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/1706.03762v7</id>
    <published>2017-06-12T17:57:34Z</published>
    <title>Attention Is All
      You Need</title>
    <summary>  The dominant sequence transduction models are based on complex recurrent or
convolutional neural networks &amp; attention.</summary>
    <author><name>Ashish Vaswani</name></author>
    <author><name>Noam Shazeer</name></author>
    <author><name>Niki Parmar</name></author>
    <arxiv:primary_category term="cs.CL"/>
  </entry>
</feed>`;

const CROSSREF: Record<string, unknown> = {
  "10.1234/qw.2021.42": {
    title: ["Quantum Widgets and Their Discontents"],
    author: [{ family: "Doe", given: "Jane" }, { family: "Roe", given: "John" }],
    issued: { "date-parts": [[2021, 3]] },
    "container-title": ["Journal of Widgetry"],
    type: "journal-article",
    DOI: "10.1234/qw.2021.42",
    volume: "12",
    page: "100-120",
    abstract: "<jats:p>We study widgets in the quantum regime.</jats:p>",
  },
  "10.5555/deep.2015": {
    title: ["Deep learning"],
    author: [{ family: "LeCun", given: "Yann" }, { family: "Bengio", given: "Yoshua" }, { family: "Hinton", given: "Geoffrey" }],
    issued: { "date-parts": [[2015]] },
    "container-title": ["Nature"],
    type: "journal-article",
    DOI: "10.5555/deep.2015",
  },
};

const gh = new FakeGitHub("me/papers");
const seen: string[] = [];
// Playwright's routes answer even when the context is offline: fail them too.
let offline = false;

async function mock(route: Route) {
  const req = route.request();
  const url = new URL(req.url());
  seen.push(url.href);
  if (offline && url.origin !== ORIGIN) return route.abort("internetdisconnected");
  if (req.method() === "OPTIONS" && url.origin !== ORIGIN) {
    return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, PUT, POST, DELETE" } });
  }
  if (url.host === "api.github.com") {
    const r = await gh.handle(req.method(), url, req.postData());
    return route.fulfill({ status: r.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: r.json === undefined ? "" : JSON.stringify(r.json) });
  }
  if (url.origin === ORIGIN && url.pathname === "/api/fetch") {
    const target = url.searchParams.get("url")!;
    if (target.startsWith("https://export.arxiv.org/api/query")) return route.fulfill({ status: 200, contentType: "application/atom+xml", body: ARXIV_ATOM });
    if (target === "https://arxiv.org/pdf/1706.03762") return route.fulfill({ status: 200, contentType: "application/pdf", body: pdf("attention.pdf") });
    if (target === "https://blog.example/post")
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<html><head><title>Notes on attention</title><meta name="author" content="Ada Writer"></head><body><nav>menu</nav><article><h1>Notes on attention</h1><p>Attention lets a model <strong>look back</strong>.</p><ul><li>one</li><li>two</li></ul><script>window.evil=1</script></article></body></html>`,
      });
    return route.fulfill({ status: 404, body: "not mocked" });
  }
  if (url.host === "api.crossref.org") {
    const doi = decodeURIComponent(url.pathname.replace(/^\/works\//, ""));
    const w = CROSSREF[doi];
    return route.fulfill({ status: w ? 200 : 404, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ message: w ?? {} }) });
  }
  if (["api.openalex.org", "api.unpaywall.org", "api.semanticscholar.org", "api.anthropic.com"].includes(url.host)) {
    return route.fulfill({ status: 404, headers: { "access-control-allow-origin": "*" }, body: "{}" });
  }
  if (url.origin === ORIGIN) return route.continue();
  return route.abort();
}

async function idbFile(page: Page, path: string): Promise<string | null> {
  return page.evaluate(
    (p) =>
      new Promise<string | null>((resolve) => {
        const r = indexedDB.open("lightkone-files", 1);
        r.onsuccess = () => {
          const g = r.result.transaction("files").objectStore("files").get(p);
          g.onsuccess = () => resolve(g.result ? new TextDecoder().decode(g.result) : null);
        };
      }),
    path,
  );
}

async function idbKeys(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const r = indexedDB.open("lightkone-files", 1);
        r.onsuccess = () => {
          const g = r.result.transaction("files").objectStore("files").getAllKeys();
          g.onsuccess = () => resolve(g.result as string[]);
        };
      }),
  );
}

const library = async (page: Page) => JSON.parse((await idbFile(page, "lightkone/library.json")) ?? "null");
const rows = (page: Page) => page.locator("li.paper");
const saved = async (page: Page) => {
  await page.evaluate(() => (window as any).lightkone.idle());
  await page.waitForFunction(() => document.querySelector(".status-text")?.textContent?.endsWith("Saved"), null, { timeout: 10_000 });
};
const step = (s: string) => console.log(`• ${s}`);

async function addPaste(page: Page, text: string) {
  await page.getByRole("button", { name: "Add paper", exact: true }).click();
  await page.getByLabel("Papers to add").fill(text);
  await page.locator("dialog .add-form button[type=submit]").click();
  await page.locator("dialog .report").waitFor({ timeout: 15_000 });
  const report = await page.locator("dialog .report").innerText();
  await page.locator("dialog header button[title=Close]").click();
  return report;
}

async function main() {
  const server = spawn("node_modules/.bin/vite", ["preview", "--port", String(PORT), "--strictPort"], { stdio: ["ignore", "pipe", "inherit"] });
  await new Promise<void>((resolve) => server.stdout!.on("data", (d) => String(d).includes(String(PORT)) && resolve()));
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  let ctx: BrowserContext | null = null;
  try {
    ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
    await ctx.route("**/*", mock);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    step("Front page links to the app");
    await page.goto(ORIGIN + "/");
    assert.equal(await page.locator("a.cta").getAttribute("href"), "/app/");

    step("Flow 1: a new library in this browser starts with two example papers");
    await page.goto(ORIGIN + "/app/");
    await rows(page).first().waitFor();
    assert.equal(await rows(page).count(), 2);
    await saved(page);
    const lib0 = await library(page);
    assert.equal(lib0.papers.length, 2);
    assert.deepEqual(lib0.papers[0].tags, ["Example"]);
    assert.match((await idbFile(page, "lightkone/library.bib"))!, /@inproceedings\{Vaswani2017-an,/);
    await page.screenshot({ path: shots + "1-examples.png" });
    await page.getByRole("button", { name: "Remove them" }).click();
    await page.getByText("No papers yet").waitFor();
    await saved(page);
    assert.equal((await library(page)).papers.length, 0);
    await page.reload();
    await page.getByText("No papers yet").waitFor();

    step("Flow 3: add by arXiv id and DOI; a free PDF is fetched and filed as Paperpile files it");
    let report = await addPaste(page, "https://arxiv.org/abs/1706.03762v7\ndoi:10.5555/deep.2015\nnot an identifier");
    assert.match(report, /Added 2/);
    assert.match(report, /Not added: 1/);
    await saved(page);
    let lib = await library(page);
    const att = lib.papers.find((p: any) => p.arxiv === "1706.03762");
    assert.equal(att.key, "Vaswani2017-an");
    assert.equal(att.title, "Attention Is All You Need");
    assert.deepEqual(att.authors, ["Vaswani, Ashish", "Shazeer, Noam", "Parmar, Niki"]);
    assert.equal(att.pdf, "papers/All Papers/VASWANI/Vaswani et al. 2017 - Attention Is All You Need.pdf");
    assert.ok((await idbKeys(page)).includes(att.pdf));
    const deep = lib.papers.find((p: any) => p.doi === "10.5555/deep.2015");
    assert.equal(deep.key, "LeCun2015-dl");
    assert.equal(deep.venue, "Nature");

    step("Flow 3: BibTeX paste; a duplicate is not added twice but gains what it lacked");
    report = await addPaste(
      page,
      `@article{Vaswani2017, title={Attention is All you Need}, author={Vaswani, Ashish}, year={2017}, keywords={transformers}, url={https://example.org/attn}}
@book{Knuth1984, title={The {\\TeX}book}, author={Donald E. Knuth}, year={1984}, publisher={Addison-Wesley}}`,
    );
    assert.match(report, /Added 1/);
    assert.match(report, /Already in the library: 1/);
    await saved(page);
    lib = await library(page);
    const att2 = lib.papers.find((p: any) => p.id === att.id);
    assert.deepEqual(att2.tags, ["transformers"]);
    assert.equal(att2.key, "Vaswani2017-an", "a key never changes");
    assert.equal(att2.url, "https://arxiv.org/abs/1706.03762", "existing fields are kept");
    assert.equal(lib.papers.find((p: any) => p.key === "Knuth1984").authors[0], "Knuth, Donald E.");

    step("Flow 3: a web page that is not a paper is saved as HTML plus Markdown");
    report = await addPaste(page, "https://blog.example/post");
    assert.match(report, /Added 1/);
    await saved(page);
    lib = await library(page);
    const post = lib.papers.find((p: any) => p.url === "https://blog.example/post");
    assert.equal(post.title, "Notes on attention");
    assert.match((await idbFile(page, post.markdown))!, /# Notes on attention[\s\S]*\*\*look back\*\*[\s\S]*- one\n- two/);
    assert.match((await idbFile(page, post.html))!, /<script>/);

    step("Flow 4: import a Paperpile .bib file; papers land in their folders");
    const bib = `@ARTICLE{Smith2019-ab,
  title    = "A study of {Paperpile} folders in practice",
  author   = "Smith, Anna and Jones, Bob",
  journal  = "J. Folders",
  year     =  2019,
  file     = "All Papers/Physics/QFT/Smith 2019 - A study.pdf;All Papers/SMITH/Smith 2019 - A study.pdf",
  keywords = "folders; doi:10.1/xyz"
}
@ARTICLE{Smith2019-ab2,
  title    = "Second study of folders, also in practice",
  author   = "Smith, Anna",
  year     =  2019,
  file     = "All Papers/ML/Smith 2019 - Second.pdf"
}`;
    await page.getByRole("button", { name: "Add paper", exact: true }).click();
    await page.locator("dialog input[type=file]").setInputFiles({ name: "paperpile.bib", mimeType: "application/x-bibtex", buffer: Buffer.from(bib) });
    await page.locator("dialog .report").waitFor();
    assert.match(await page.locator("dialog .report").innerText(), /Added 2/);
    await page.locator("dialog header button[title=Close]").click();
    await saved(page);
    lib = await library(page);
    assert.deepEqual(lib.papers.find((p: any) => p.key === "Smith2019-ab").folders, ["Physics/QFT"]);
    assert.deepEqual(lib.papers.find((p: any) => p.key === "Smith2019-ab").tags, ["folders"]);
    assert.deepEqual(lib.papers.find((p: any) => p.key === "Smith2019-ab2").folders, ["ML"], "a user's own ML folder is kept");
    await page.locator(".sidebar .folders").getByText("QFT").waitFor();

    step("Flow 5: add PDFs; identified by the DOI or arXiv id on the first page");
    await page.getByRole("button", { name: "Add paper", exact: true }).click();
    await page.locator("dialog input[type=file]").setInputFiles([
      { name: "widgets.pdf", mimeType: "application/pdf", buffer: pdf("withdoi.pdf") },
      { name: "notes.pdf", mimeType: "application/pdf", buffer: pdf("unknown.pdf") },
      { name: "attention-again.pdf", mimeType: "application/pdf", buffer: pdf("attention.pdf") },
    ]);
    await page.locator("dialog .report").waitFor({ timeout: 20_000 });
    report = await page.locator("dialog .report").innerText();
    assert.match(report, /Added 2/);
    assert.match(report, /Already in the library: 1/);
    await page.locator("dialog header button[title=Close]").click();
    await saved(page);
    lib = await library(page);
    const widgets = lib.papers.find((p: any) => p.doi === "10.1234/qw.2021.42");
    assert.equal(widgets.key, "Doe2021-qw");
    assert.equal(widgets.pdf, "papers/All Papers/DOE/Doe and Roe 2021 - Quantum Widgets and Their Discontents.pdf");
    assert.equal(widgets.fields.pages, "100--120");
    const notes = lib.papers.find((p: any) => p.title === "My Lecture Notes");
    assert.ok(notes?.pdf, "an unidentified PDF is kept under its own title");
    assert.equal(lib.papers.filter((p: any) => p.arxiv === "1706.03762").length, 1);

    step("Flow 6: search; side bar views are the same search with a filter");
    const search = page.getByLabel("Search papers");
    await search.fill("attention");
    await page.waitForFunction(() => document.querySelectorAll("li.paper").length === 2);
    await search.fill("attention year:2017");
    await page.waitForFunction(() => document.querySelectorAll("li.paper").length === 1);
    await search.fill("author:smith");
    await page.waitForFunction(() => document.querySelectorAll("li.paper").length === 2);
    await search.fill("");
    await page.locator(".sidebar .folders").getByText("QFT").click();
    await page.waitForFunction(() => document.querySelectorAll("li.paper").length === 1);
    await page.locator(".sidebar .views").getByText("All papers").click();
    await page.locator(".sidebar .tags").getByText("transformers").click();
    await page.waitForFunction(() => document.querySelectorAll("li.paper").length === 1);
    await page.locator(".sidebar .views").getByText("All papers").click();

    step("Flow 6: full text — a word only in a PDF finds the paper once its text is read");
    await search.fill("zymurgy");
    await page.getByText("have not been read for search yet").or(page.getByText("has not been read for search yet")).waitFor();
    assert.equal(await rows(page).count(), 0);
    await page.locator(".fulltext-note button").click();
    await page.waitForFunction(() => document.querySelectorAll("li.paper").length === 1, null, { timeout: 20_000 });
    assert.match(await rows(page).first().innerText(), /Quantum Widgets/);
    assert.match((await idbFile(page, `lightkone/text/${widgets.id}.txt`))!, /zymurgy/);
    await search.fill("");

    step("Flow 7: organize — folders, tags, star, notes, trash and restore, empty the trash");
    await rows(page).filter({ hasText: "Deep learning" }).click();
    await page.getByLabel("Add folders").fill("Reading/Classics");
    await page.getByLabel("Add folders").press("Enter");
    await page.getByLabel("Add tags").fill("review");
    await page.getByLabel("Add tags").press("Enter");
    await page.locator(".details .details-head .star").click();
    await page.locator("textarea.notes").fill("Read for the survey.");
    await page.locator(".details h2").click(); // blur commits the notes
    await saved(page);
    lib = await library(page);
    const deep2 = lib.papers.find((p: any) => p.id === deep.id);
    assert.deepEqual(deep2.folders, ["Reading/Classics"]);
    assert.deepEqual(deep2.tags, ["review"]);
    assert.equal(deep2.starred, true);
    assert.equal(deep2.notes, "Read for the survey.");
    await page.locator(".sidebar .views").getByText("Starred").click();
    await page.waitForFunction(() => document.querySelectorAll("li.paper").length === 1);
    await page.locator(".sidebar .views").getByText("All papers").click();
    await page.getByRole("button", { name: "Copy the citation key" }).or(page.locator(".details .key")).first().click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "LeCun2015-dl");

    await rows(page).filter({ hasText: "My Lecture Notes" }).click();
    await page.getByRole("button", { name: "Move to trash" }).click();
    await saved(page);
    assert.ok((await library(page)).papers.find((p: any) => p.id === notes.id).trashed);
    assert.ok(!(await idbFile(page, "lightkone/library.bib"))!.includes("My Lecture Notes"), "trash is left out of library.bib");
    await page.locator(".sidebar .views").getByText("Trash").click();
    await page.waitForFunction(() => document.querySelectorAll("li.paper").length === 1);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Empty trash" }).click();
    await page.getByText("No papers match.").waitFor();
    await saved(page);
    assert.equal((await library(page)).papers.find((p: any) => p.id === notes.id), undefined);
    assert.ok(!(await idbKeys(page)).includes(notes.pdf), "its PDF is deleted for good");
    await page.locator(".sidebar .views").getByText("All papers").click();

    step("Flow 8: read and highlight; highlights go to lightkone/annotations/<id>.json");
    await rows(page).filter({ hasText: "Attention Is All You Need" }).click();
    await page.locator(".details").getByRole("button", { name: "Read", exact: true }).click();
    await page.locator(".reader .textLayer span").first().waitFor({ timeout: 20_000 });
    await page.screenshot({ path: shots + "8-reader.png" });
    await page.evaluate(() => {
      const span = [...document.querySelectorAll(".reader .page[data-page='1'] .textLayer span")].find((s) => s.textContent?.includes("dominant"))!;
      const range = document.createRange();
      range.selectNodeContents(span);
      const sel = document.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
      span.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    await page.locator(".popover").getByRole("button", { name: "Highlight + note" }).click();
    await page.locator(".popover textarea").fill("Key claim");
    await page.locator(".popover").getByRole("button", { name: "Save" }).click();
    await page.locator(".hl").first().waitFor();
    await page.waitForFunction(async () => true);
    await page.waitForTimeout(500);
    const ann = JSON.parse((await idbFile(page, `lightkone/annotations/${att.id}.json`))!);
    assert.equal(ann.highlights.length, 1);
    assert.match(ann.highlights[0].text, /dominant sequence/);
    assert.equal(ann.highlights[0].note, "Key claim");
    assert.equal(ann.highlights[0].page, 1);
    await page.getByRole("button", { name: "Close reader (Esc)" }).click();
    await saved(page);
    lib = await library(page);
    assert.match(lib.papers.find((p: any) => p.id === att.id).opened, /^\d{4}-\d\d-\d\dT/, "Read records opened");
    await page.locator(".sidebar .views").getByText("Recently read").click();
    await page.waitForFunction(() => document.querySelectorAll("li.paper").length === 1);
    await page.locator(".sidebar .views").getByText("All papers").click();

    step("Flow 8: a saved web page opens as Markdown, or as its HTML with no scripts");
    await rows(page).filter({ hasText: "Notes on attention" }).click();
    await page.locator(".details").getByRole("button", { name: "Read", exact: true }).click();
    await page.locator(".reader article.markdown strong").getByText("look back").waitFor();
    await page.getByRole("button", { name: "Saved page" }).click();
    const frame = page.locator("iframe.saved-page");
    assert.equal(await frame.getAttribute("sandbox"), "");
    assert.equal(await page.frameLocator("iframe.saved-page").locator("h1").innerText(), "Notes on attention");
    await page.keyboard.press("Escape");

    step("Flow 9: tidy up — tidy finds duplicates, merging trashes the others");
    await rows(page).filter({ hasText: "Second study of folders" }).click();
    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator("form.edit label").filter({ hasText: "DOI" }).locator("input").fill("10.1234/QW.2021.42");
    await page.locator("form.edit button[type=submit]").click();
    await page.locator(".sidebar").getByText("Tidy up duplicates").click();
    await page.locator("dialog .group").first().waitFor();
    assert.match(await page.locator("dialog .tidy h3").first().innerText(), /1 group/);
    await page.locator("dialog .group").first().getByRole("button", { name: "Merge" }).click();
    await page.locator("dialog").getByText("No duplicates").waitFor();
    await page.locator("dialog header button[title=Close]").click();
    await saved(page);
    lib = await library(page);
    const merged = lib.papers.find((p: any) => p.id === widgets.id);
    assert.deepEqual(merged.folders, ["ML"], "the keeper (with the PDF) gained the other's folder");
    assert.ok(lib.papers.find((p: any) => p.key === "Smith2019-ab2").trashed);

    step("Flow 10: cite and export");
    await rows(page).filter({ hasText: "Quantum Widgets" }).click();
    await page.locator(".details").getByRole("button", { name: "Cite" }).click();
    await page.locator("dialog").getByRole("button", { name: "BibTeX" }).click();
    assert.match(await page.locator("dialog pre.cite-out").innerText(), /^@article\{Doe2021-qw,\n {2}title {4}= \{\{Quantum Widgets and Their Discontents\}\},\n {2}author {3}= \{Doe, Jane and Roe, John\},/);
    await page.locator("dialog").getByRole("button", { name: "APA 7" }).click();
    assert.equal(await page.locator("dialog pre.cite-out").innerText(), "Doe, J., & Roe, J. (2021). Quantum Widgets and Their Discontents. *Journal of Widgetry*, *12*, 100–120. https://doi.org/10.1234/qw.2021.42");
    await page.locator("dialog").getByRole("button", { name: "LaTeX \\cite" }).click();
    assert.equal(await page.locator("dialog pre.cite-out").innerText(), "\\cite{Doe2021-qw}");
    await page.locator("dialog header button[title=Close]").click();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export .bib", exact: true }).click()]);
    const exported = readFileSync(await download.path(), "utf8");
    assert.equal((exported.match(/^@/gm) ?? []).length, (await rows(page).count()));
    assert.match(exported, /@book\{Knuth1984,/);

    step("Command palette and help open");
    await page.keyboard.press("Control+k");
    await page.locator("dialog .palette li").first().waitFor();
    await page.keyboard.press("Escape");
    await page.locator("body").click({ position: { x: 700, y: 600 } });
    await page.keyboard.press("?");
    await page.locator("dialog").getByText("Searching").waitFor();
    await page.keyboard.press("Escape");

    step("Tier 2: settings backup round-trips, encrypted with a passphrase");
    await page.locator(".topbar button[title=Settings]").click();
    await page.locator("dialog input[placeholder='Contact email for open-access copies'], dialog input[type=email]").fill("me@uni.example");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.locator("dialog input[placeholder='Passphrase (recommended)']").fill("correct horse");
    const [backup] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export settings" }).click()]);
    const backupText = readFileSync(await backup.path(), "utf8");
    assert.ok(!backupText.includes("me@uni.example"), "encrypted");
    await page.locator("dialog header button[title=Close]").click();

    step("Flow 2: choose GitHub storage; every save is a commit");
    await page.locator(".topbar button[title=Settings]").click();
    await page.getByLabel("Storage").selectOption("github");
    await page.locator("dialog").getByRole("textbox", { name: "Repository", exact: true }).fill("me/papers");
    await page.locator("dialog").getByRole("textbox", { name: /^Fine-grained token/ }).fill("github_pat_test");
    await page.getByRole("button", { name: "Save and open" }).click();
    await page.getByText("No papers yet").waitFor();
    await page.waitForFunction(() => document.querySelector(".status-text")?.textContent?.includes("GitHub me/papers"));
    await addPaste(page, "1706.03762");
    await saved(page);
    const ghLib = JSON.parse(gh.text("lightkone/library.json")!);
    assert.equal(ghLib.papers[0].key, "Vaswani2017-an");
    assert.match(gh.text("lightkone/library.bib")!, /Vaswani2017-an/);
    assert.ok(gh.files.has(ghLib.papers[0].pdf), "the PDF is in the repository");
    assert.ok(!gh.text("lightkone/library.json")!.includes("github_pat_test"), "credentials never enter the library");

    step("Flow 12: another device saves; coming back to the tab picks it up, and saves merge");
    const other = JSON.parse(gh.text("lightkone/library.json")!);
    other.papers.push({ id: "otherdev1", key: "Other2020-xx", type: "misc", title: "Added on another device", authors: [], tags: [], added: "2020-01-01T00:00:00.000Z", fields: {}, folders: [] });
    other.papers[0].notes = "note from the other device";
    gh.put("lightkone/library.json", JSON.stringify(other, null, 1));
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.getByText("Added on another device").waitFor();
    await rows(page).filter({ hasText: "Attention" }).click();
    await page.getByLabel("Add tags").fill("from-this-device");
    await page.getByLabel("Add tags").press("Enter");
    await saved(page);
    const after = JSON.parse(gh.text("lightkone/library.json")!);
    assert.equal(after.papers[0].notes, "note from the other device");
    assert.deepEqual(after.papers[0].tags, ["from-this-device"]);

    step("Flow 11: sync a folder's .bib to GitHub");
    await page.getByLabel("Add folders").fill("Thesis");
    await page.getByLabel("Add folders").press("Enter");
    await saved(page);
    await page.locator(".topbar button[title=Settings]").click();
    await page.locator("dialog").getByRole("textbox", { name: /^GitHub token for synced/ }).fill("github_pat_sync");
    await page.getByRole("button", { name: "Save settings" }).click();
    await page.locator("dialog header button[title=Close]").click();
    await page.locator(".sidebar .folders").getByText("Thesis").click();
    await page.getByRole("button", { name: "Sync .bib of this folder" }).click();
    await page.locator("dialog").getByRole("textbox", { name: "Repository", exact: true }).fill("me/papers");
    await page.locator("dialog").getByRole("textbox", { name: /^Path in the repository/ }).fill("thesis/refs.bib");
    await page.locator("dialog").getByRole("button", { name: "Sync .bib" }).click();
    await saved(page);
    await page.waitForFunction(() => document.querySelector("#toast")?.textContent?.startsWith("Synced Thesis"), null, { timeout: 10_000 });
    assert.match(gh.text("thesis/refs.bib")!, /^@article\{Vaswani2017-an,/);
    assert.deepEqual(JSON.parse(gh.text("lightkone/library.json")!).bibSync, [{ folder: "Thesis", repo: "me/papers", path: "thesis/refs.bib" }]);
    await page.locator(".sidebar .views").getByText("All papers").click();

    step("Flow 13: make the AI app address; the MCP endpoint answers");
    await page.locator(".topbar button[title=Settings]").click();
    await page.getByRole("button", { name: "Make my AI app address" }).click();
    const addr = await page.locator("dialog code.address").innerText();
    assert.match(addr, new RegExp(`^${ORIGIN}/mcp/[A-Za-z0-9_-]{100,}$`));
    assert.ok(!addr.includes("github_pat_test"));
    await page.locator("dialog header button[title=Close]").click();
    const init = await fetch(addr, { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }).then((r) => r.json());
    assert.equal(init.result.tools.length, 7);

    step("Pass-through answers the site's own pages only");
    assert.equal((await fetch(`${ORIGIN}/api/fetch?url=https://example.org/`)).status, 403);

    step("Offline: the app opens with the library and the PDFs last opened, and saves later");
    await rows(page).filter({ hasText: "Attention" }).click();
    await page.locator(".details").getByRole("button", { name: "Read", exact: true }).click();
    await page.locator(".reader .textLayer span").first().waitFor({ timeout: 20_000 });
    await page.keyboard.press("Escape");
    await rows(page).filter({ hasText: "Attention" }).locator(".badge.offline").waitFor();
    await saved(page);
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 10_000 }).catch(() => page.reload());
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 10_000 });
    const commits = gh.commits.length;
    await ctx.setOffline(true);
    offline = true;
    await page.reload();
    await rows(page).first().waitFor({ timeout: 15_000 });
    assert.equal(await rows(page).count(), 2);
    await rows(page).filter({ hasText: "Added on another device" }).click();
    await page.locator(".details .details-head .star").click();
    await page.waitForFunction(() => document.querySelector(".status-text")?.textContent?.includes("Offline, saves later"), null, { timeout: 10_000 });
    await page.screenshot({ path: shots + "offline.png" });
    await rows(page).filter({ hasText: "Attention" }).click();
    await page.locator(".details").getByRole("button", { name: "Read", exact: true }).click();
    await page.locator(".reader .textLayer span").first().waitFor({ timeout: 20_000 });
    await page.keyboard.press("Escape");
    assert.equal(gh.commits.length, commits, "nothing written while offline");
    await ctx.setOffline(false);
    offline = false;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await saved(page);
    assert.equal(JSON.parse(gh.text("lightkone/library.json")!).papers.find((p: any) => p.id === "otherdev1").starred, true);

    step("Phone: the list, the details and the reader fit a narrow screen");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".details .back").click();
    await rows(page).first().click();
    await page.locator(".details.open").waitFor();
    assert.ok((await page.locator(".details").boundingBox())!.width <= 390);
    await page.screenshot({ path: shots + "phone-details.png" });
    await page.locator(".details .back").click();
    await page.getByRole("button", { name: "Menu" }).click();
    await page.locator(".sidebar").getByText("Starred").waitFor();
    await page.screenshot({ path: shots + "phone-menu.png" });

    step("Share target and bookmarklet open Add paper with the link");
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`${ORIGIN}/app/?share_title=x&share_text=${encodeURIComponent("Look: https://arxiv.org/abs/1706.03762")}`);
    assert.equal(await page.getByLabel("Papers to add").inputValue(), "https://arxiv.org/abs/1706.03762");

    if (errors.length) console.error("PAGE ERRORS", errors);
    assert.deepEqual(errors, [], "no page errors");
    console.log("\nAll end-to-end checks passed.");
  } catch (e) {
    const pages = ctx?.pages() ?? [];
    if (pages[0]) {
      await pages[0].screenshot({ path: shots + "failure.png" }).catch(() => undefined);
      console.error("URL", pages[0].url(), "\nLIST", await pages[0].locator("#list").innerText().catch(() => ""));
    }
    throw e;
  } finally {
    await ctx?.close();
    await browser.close();
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
