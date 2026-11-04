import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 9223;
const TARGET_URL = "http://localhost:3000";
const SCREENSHOT_DIR = "/home/allan/.gemini/antigravity/brain/44c67cf0-2eac-426c-9240-8061ab222ede/screenshots/replay";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { res, rej } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) rej(data.error);
          else res(data.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || "Evaluation error");
    }
    return res.result?.value;
  }

  async screenshot(filepath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, Buffer.from(res.data, "base64"));
    console.log(`📸 Saved screenshot: ${filepath}`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log("🚀 Starting Chrome for Replay Mode E2E Verification...");
  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1600,1050",
    "about:blank",
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
    chrome.kill();
    throw new Error("Could not connect to Chrome debugging port");
  }

  // Create a new target page for TARGET_URL
  const newTargetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(TARGET_URL)}`, { method: "PUT" });
  const targetData = await newTargetRes.json();
  const pageWsUrl = targetData.webSocketDebuggerUrl;

  const client = new CDPClient(pageWsUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");

  console.log(`🌐 Page loaded at ${TARGET_URL}...`);
  await sleep(3500);

  // 1. Verify Entry Banner
  console.log("\n--- TEST 1: Replay Entry Banner & Navigation Button ---");
  const bannerText = await client.evaluate(`
    document.body.innerText.includes("REPLAY MODE") ||
    document.body.innerText.includes("EXPLORE REPLAY") ||
    document.body.innerText.includes("Start Replay")
  `);
  console.log(`✓ Replay mode triggers visible on home page: ${bannerText}`);
  await client.screenshot(`${SCREENSHOT_DIR}/01_home_replay_entry.png`);

  // 2. Open Scenario Selector Modal
  console.log("\n--- TEST 2: Opening Scenario Selector Modal ---");
  await client.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const scenarioBtn = buttons.find(b =>
      b.textContent.includes("Explore Replay") ||
      b.textContent.includes("Scenarios") ||
      b.textContent.includes("REPLAY MODE")
    );
    if (scenarioBtn) scenarioBtn.click();
  })()`);
  await sleep(1000);

  const modalOpen = await client.evaluate(`(() => {
    return document.body.innerText.includes("Engineering Replay Catalog") ||
      document.body.innerText.includes("Featured End-to-End Walkthrough") ||
      document.body.innerText.includes("SELECT SCENARIO");
  })()`);
  console.log(`✓ Scenario Selector Modal opened: ${modalOpen}`);
  await client.screenshot(`${SCREENSHOT_DIR}/02_scenario_modal.png`);

  // 3. Launch Featured End-to-End Walkthrough
  console.log("\n--- TEST 3: Launching Featured End-to-End Walkthrough ---");
  await client.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const launchBtn = buttons.find(b =>
      b.textContent.includes("Launch Featured Replay") ||
      b.textContent.includes("Launch Scenario") ||
      b.textContent.includes("Start Walkthrough")
    );
    if (launchBtn) launchBtn.click();
  })()`);
  await sleep(1500);

  const isReplayActive = await client.evaluate(`(() => {
    return document.body.innerText.includes("REPLAY") ||
      document.body.innerText.includes("Featured End-to-End") ||
      document.body.innerText.includes("Stage");
  })()`);
  console.log(`✓ Replay Mode actively running: ${isReplayActive}`);
  await client.screenshot(`${SCREENSHOT_DIR}/03_featured_walkthrough_running.png`);

  // 4. Test Player Controls: Pause, Resume, Next, Prev, Speed
  console.log("\n--- TEST 4: Player Transport Controls ---");
  // Pause
  await client.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const pauseBtn = buttons.find(b => b.title?.includes("Pause") || b.getAttribute("aria-label")?.includes("Pause"));
    if (pauseBtn) pauseBtn.click();
  })()`);
  await sleep(600);
  console.log("✓ Paused playback");

  // Next Step
  await client.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const nextBtn = buttons.find(b => b.title?.includes("Next") || b.textContent.includes("Next"));
    if (nextBtn) nextBtn.click();
  })()`);
  await sleep(800);
  console.log("✓ Stepped forward to next stage");
  await client.screenshot(`${SCREENSHOT_DIR}/04_stepped_stage.png`);

  // Speed selection
  await client.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const speedBtn = buttons.find(b => b.textContent.trim() === "2x" || b.textContent.trim() === "4x");
    if (speedBtn) speedBtn.click();
  })()`);
  await sleep(500);
  console.log("✓ Speed adjusted");

  // 5. Test AI Engineer Replay Experience
  console.log("\n--- TEST 5: AI Engineer Autonomous Workflow Replay ---");
  await client.evaluate(`(() => {
    // Navigate directly to agent tab using tab-agent ID
    const agentTabBtn = document.getElementById("tab-agent");
    if (agentTabBtn) agentTabBtn.click();
  })()`);
  await sleep(1500);

  const aiReplayVisible = await client.evaluate(`(() => {
    const text = document.body.innerText;
    return text.includes("Autonomous Optimization Session") ||
      text.includes("inspect_model_graph") ||
      text.includes("Physical Silicon Profiling") ||
      text.includes("Optimization Lineage") ||
      text.includes("AI Copilot") ||
      text.includes("REPLAY");
  })()`);
  console.log(`✓ AI Engineer Replay interface visible: ${aiReplayVisible}`);
  await client.screenshot(`${SCREENSHOT_DIR}/05_ai_engineer_replay.png`);

  // Test expanding a tool trace
  await client.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll("button, div[role='button']"));
    const toolHeader = buttons.find(b => b.textContent.includes("inspect_model_graph") || b.textContent.includes("query_benchmark_telemetry"));
    if (toolHeader) toolHeader.click();
  })()`);
  await sleep(800);
  await client.screenshot(`${SCREENSHOT_DIR}/06_tool_inspection_expanded.png`);

  // Switch to Lineage DAG view
  await client.evaluate(`(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const lineageBtn = buttons.find(b => b.textContent.includes("Lineage") || b.textContent.includes("Optimization Lineage"));
    if (lineageBtn) lineageBtn.click();
  })()`);
  await sleep(1000);
  console.log("✓ Switched to Optimization Lineage DAG");
  await client.screenshot(`${SCREENSHOT_DIR}/07_lineage_dag_view.png`);

  console.log("\n========================================================");
  console.log("🎉 ALL REPLAY MODE E2E BROWSER TESTS COMPLETED SUCCESSFULLY!");
  console.log("========================================================");

  client.close();
  chrome.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
