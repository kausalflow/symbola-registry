// pdf.js's standard fonts and CMaps, served from /pdfjs/ so PDFs that do not
// embed their fonts (or use CJK encodings) render.
import { cpSync, mkdirSync } from "node:fs";

const from = new URL("../node_modules/pdfjs-dist/", import.meta.url).pathname;
const to = new URL("../public/pdfjs/", import.meta.url).pathname;
mkdirSync(to, { recursive: true });
cpSync(from + "standard_fonts", to + "standard_fonts", { recursive: true });
cpSync(from + "cmaps", to + "cmaps", { recursive: true });
console.log("copied pdf.js fonts and cmaps to public/pdfjs/");
