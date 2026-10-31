import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 9223;
const TARGET_URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Starting Chrome for deep interaction probe...");
  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1600,1200",
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
  const logs = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      errors.push(msg.params.exceptionDetails);
      console.error("🚨 Browser Runtime Exception:", msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
    } else if (msg.method === "Console.messageAdded") {
      logs.push(msg.params.message);
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

  console.log("Waiting 5s for hydration...");
  await sleep(5000);

  const outDir = path.resolve("verification_screenshots/deep");
  await fs.mkdir(outDir, { recursive: true });

  // 1. Check Compare Tab and charts
  console.log("Testing Compare Tab...");
  await send("Runtime.evaluate", { expression: `document.getElementById('tab-compare')?.click()` });
  await sleep(3000);

  // Scroll down to charts so ResizeObserver measures them with actual client dimensions
  await send("Runtime.evaluate", {
    expression: `(() => {
      window.scrollTo(0, document.body.scrollHeight);
    })()`
  });
  await sleep(1500);

  const compareChartsCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const svgs = document.querySelectorAll('.recharts-responsive-container svg');
      const scatters = document.querySelectorAll('.recharts-scatter');
      const bars = document.querySelectorAll('.recharts-bar');
      const dots = document.querySelectorAll('.recharts-scatter-symbol');
      const barRects = document.querySelectorAll('.recharts-bar-rectangle');
      return {
        svgCount: svgs.length,
        scatterCount: scatters.length,
        barCount: bars.length,
        scatterSymbols: dots.length,
        barRectangles: barRects.length
      };
    })()`,
    returnByValue: true
  });
  console.log("Compare Tab Chart DOM elements:", compareChartsCheck.result?.value);

  const shotCompare = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await fs.writeFile(path.join(outDir, "compare_full.png"), Buffer.from(shotCompare.data, "base64"));

  // 2. Test Experiments Tab and Modal
  console.log("Testing Experiments Tab & Inspection Modal...");
  await send("Runtime.evaluate", { expression: `document.getElementById('tab-experiments')?.click()` });
  await sleep(1500);

  // Click first inspect button
  await send("Runtime.evaluate", {
    expression: `(() => {
      const firstEye = document.querySelector('button[title="Inspect Details"]');
      if (firstEye) firstEye.click();
    })()`
  });
  await sleep(1500);

  const modalCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector('.fixed.inset-0');
      const svgs = modal ? modal.querySelectorAll('svg').length : 0;
      return {
        modalPresent: !!modal,
        svgs
      };
    })()`,
    returnByValue: true
  });
  console.log("Experiments modal check:", modalCheck.result?.value);

  const shotExpModal = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "experiment_modal.png"), Buffer.from(shotExpModal.data, "base64"));

  // Close modal
  await send("Runtime.evaluate", {
    expression: `(() => {
      const closeBtn = document.querySelector('.fixed.inset-0 button');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(800);

  // 3. Test Models Tab and Compatibility Matrix Modal
  console.log("Testing Models Tab Compatibility Modal...");
  await send("Runtime.evaluate", { expression: `document.getElementById('tab-models')?.click()` });
  await sleep(1500);

  // Click Check Hardware Compatibility Matrix button
  await send("Runtime.evaluate", {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const compatBtn = btns.find(b => b.innerText.includes('Compatibility Matrix'));
      if (compatBtn) compatBtn.click();
    })()`
  });
  await sleep(2000);

  const compatModalCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector('.fixed.inset-0');
      return {
        modalPresent: !!modal,
        text: modal ? modal.innerText.substring(0, 100) : ''
      };
    })()`,
    returnByValue: true
  });
  console.log("Compatibility matrix modal check:", compatModalCheck.result?.value);

  const shotCompatModal = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "model_compat_modal.png"), Buffer.from(shotCompatModal.data, "base64"));

  // Close modal
  await send("Runtime.evaluate", {
    expression: `(() => {
      const closeBtn = document.querySelector('.fixed.inset-0 button');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(800);

  // 4. Test Deployments Tab Export Action
  console.log("Testing Deployments Tab...");
  await send("Runtime.evaluate", { expression: `document.getElementById('tab-deployments')?.click()` });
  await sleep(1500);

  const exportClick = await send("Runtime.evaluate", {
    expression: `(() => {
      const exportBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Export Deployment Bundle'));
      if (exportBtn) {
        exportBtn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  const shotDeploy = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await fs.writeFile(path.join(outDir, "deployments_after_export.png"), Buffer.from(shotDeploy.data, "base64"));

  // Trigger Verify Locally sandbox run
  console.log("Testing Deployments Tab Verify Locally action...");
  const verifyClick = await send("Runtime.evaluate", {
    expression: `(() => {
      const verifyBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Verify Locally'));
      if (verifyBtn) {
        verifyBtn.click();
        return true;
      }
      return false;
    })()`,
    returnByValue: true
  });
  console.log("Clicked Verify Locally:", verifyClick.result?.value);
  await sleep(4000);

  const shotVerify = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await fs.writeFile(path.join(outDir, "deployments_after_verify.png"), Buffer.from(shotVerify.data, "base64"));

  console.log("Total browser runtime errors encountered:", errors.length);
  for (const err of errors) {
    console.error(" - ", err.text, err.exception?.description);
  }

  ws.close();
  chrome.kill();
  console.log("Done probe.");
}

run().catch(console.error);
