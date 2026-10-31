import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 9224;
const TARGET_URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Starting Chrome for mobile verification (375x812)...");
  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=375,812",
    "about:blank"
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!wsUrl) {
    console.error("Chrome failed to start on port", PORT);
    chrome.kill();
    process.exit(1);
  }

  const newTargetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(TARGET_URL)}`, { method: "PUT" });
  const targetData = await newTargetRes.json();
  const ws = new WebSocket(targetData.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();
  const errors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails);
    }
  };

  await new Promise((resolve) => ws.onopen = resolve);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send("Page.enable");
  await send("Runtime.enable");

  await sleep(4000);

  const outDir = path.resolve("verification_screenshots/mobile");
  await fs.mkdir(outDir, { recursive: true });

  const tabs = ["dashboard", "workbench", "compare"];
  for (const tab of tabs) {
    await send("Runtime.evaluate", { expression: `document.getElementById('tab-${tab}')?.click()` });
    await sleep(1500);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(outDir, `mobile_${tab}.png`), Buffer.from(shot.data, "base64"));
  }

  ws.close();
  chrome.kill();
  console.log("Mobile verification complete. Errors:", errors.length);
}

run().catch(console.error);
