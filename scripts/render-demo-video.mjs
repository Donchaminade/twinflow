#!/usr/bin/env node
/**
 * Renders examples/demo/public/demo/twinflow.mp4 from scripts/demo-video/stage.html.
 * Requires Chrome/Chromium and ffmpeg. Not part of the public UI.
 */
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = path.join(root, "scripts/demo-video/stage.html");
const framesDir = path.join(root, "scripts/demo-video/frames");
const out = path.join(root, "examples/demo/public/demo/twinflow.mp4");
const fps = 20;
const duration = 32;
const frames = fps * duration;

const chrome =
  process.env.CHROME_PATH ||
  "/usr/bin/google-chrome" ||
  "/usr/bin/google-chrome-stable";

async function run(cmd, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

async function main() {
  const puppeteer = await import("puppeteer-core");
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });
  await mkdir(path.dirname(out), { recursive: true });

  const browser = await puppeteer.default.launch({
    executablePath: chrome,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");

  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    await page.evaluate((time) => window.renderAt(time), t);
    const file = path.join(framesDir, `f${String(i).padStart(4, "0")}.png`);
    await page.screenshot({ path: file, type: "png" });
    if (i % 40 === 0) console.log(`frame ${i}/${frames}`);
  }
  await browser.close();

  await run("ffmpeg", [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(framesDir, "f%04d.png"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "20",
    "-movflags",
    "+faststart",
    out,
  ]);
  await rm(framesDir, { recursive: true, force: true });
  console.log(`wrote ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
