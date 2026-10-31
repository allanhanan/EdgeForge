import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 9222;
const TARGET_URL = "http://localhost:3000";

const TABS = [
  "dashboard",
  "models",
  "datasets",
  "hardware",
  "workbench",
  "experiments",
  "compare",
  "agent",
  "deployments",
  "reports",
  "settings"
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Starting Headless Chrome for CDP tab verification...");
  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1600,1000",
    "about:blank"
  ]);

  let exited = false;
  chrome.on("exit", (code) => {
    exited = true;
    console.log(`Chrome process exited with code ${code}`);
  });

  // Wait for port to be ready
  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        console.log("Connected to Chrome DevTools Protocol at:", wsUrl);
        break;
      }
    } catch {
      // retry
    }
  }

  if (!wsUrl) {
    console.error("Failed to connect to Chrome remote debugging port.");
    chrome.kill();
    process.exit(1);
  }

  // Create a new target page
  const newTargetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(TARGET_URL)}`, { method: "PUT" });
  const targetData = await newTargetRes.json();
  const pageWsUrl = targetData.webSocketDebuggerUrl;

  const ws = new WebSocket(pageWsUrl);

  let idCounter = 1;
  const pending = new Map();
  const errors = [];
  const consoleMessages = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails);
      console.error("❌ Runtime Exception in Browser:", msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
    } else if (msg.method === "Console.messageAdded") {
      consoleMessages.push(msg.params.message);
      if (msg.params.message.level === "error") {
        console.warn("⚠️ Console Error:", msg.params.message.text);
      }
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
  await send("Console.enable");

  console.log("Waiting for full hydration...");
  await sleep(7000);

  const results = {};

  for (const tab of TABS) {
    console.log(`\n🔍 Verifying tab: [${tab}]`);
    
    // Click on the tab button
    const clickResult = await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.getElementById('tab-${tab}');
        if (!btn) return { success: false, error: 'Button tab-${tab} not found' };
        btn.click();
        return { success: true };
      })()`,
      returnByValue: true
    });

    if (!clickResult.result?.value?.success) {
      console.error(`Failed to click tab ${tab}:`, clickResult.result?.value?.error);
      results[tab] = { status: "FAIL", error: clickResult.result?.value?.error };
      continue;
    }

    // Wait for render / state change
    await sleep(2000);

    // Verify DOM content presence
    const domCheck = await send("Runtime.evaluate", {
      expression: `(() => {
        const main = document.querySelector('main');
        const text = main ? main.innerText.trim() : '';
        const buttons = main ? main.querySelectorAll('button').length : 0;
        const inputs = main ? main.querySelectorAll('input, select, textarea').length : 0;
        return {
          length: text.length,
          preview: text.substring(0, 140).replace(/\\n/g, ' '),
          buttons,
          inputs
        };
      })()`,
      returnByValue: true
    });

    const info = domCheck.result?.value;
    console.log(`   Rendered content length: ${info?.length} chars | Buttons: ${info?.buttons} | Inputs: ${info?.inputs}`);
    console.log(`   Preview: "${info?.preview}..."`);

    results[tab] = {
      status: info?.length > 10 ? "PASS" : "WARN_EMPTY",
      buttons: info?.buttons,
      inputs: info?.inputs,
      preview: info?.preview
    };

    // Capture screenshot of the tab
    const screenshot = await send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(screenshot.data, "base64");
    const outDir = path.resolve("verification_screenshots");
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(path.join(outDir, `tab_${tab}.png`), buffer);
  }

  console.log("\n============================================================");
  console.log("TAB VERIFICATION SUMMARY");
  console.log("============================================================");
  let allPass = true;
  for (const [tab, res] of Object.entries(results)) {
    console.log(`${res.status === "PASS" ? "✅" : "❌"} ${tab.padEnd(14)} : ${res.status} (Buttons: ${res.buttons}, Inputs: ${res.inputs})`);
    if (res.status !== "PASS") allPass = false;
  }

  console.log(`\nBrowser Runtime Exceptions: ${errors.length}`);
  if (errors.length > 0) {
    allPass = false;
    for (const err of errors) {
      console.error(` - ${err.text}: ${err.exception?.description}`);
    }
  }

  ws.close();
  chrome.kill();

  if (!allPass) {
    console.error("\n❌ Verification failed on one or more tabs!");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL 11 TABS VERIFIED SUCCESSFULLY WITH ZERO RUNTIME EXCEPTIONS!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
