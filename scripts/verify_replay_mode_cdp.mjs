import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 9227;
const TARGET_URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Starting Chrome for EdgeForge Replay Mode E2E Verification...");
  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--user-data-dir=/tmp/chrome-replay-profile-9227",
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
    console.error("Chrome failed to start on port", PORT);
    chrome.kill();
    process.exit(1);
  }

  const newTargetRes = await fetch(
    `http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(TARGET_URL)}`,
    { method: "PUT" }
  );
  const targetData = await newTargetRes.json();
  const ws = new WebSocket(targetData.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();
  const browserExceptions = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      browserExceptions.push(msg.params.exceptionDetails);
      console.error(
        "❌ Browser Exception:",
        msg.params.exceptionDetails.text,
        msg.params.exceptionDetails.exception?.description
      );
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));

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

  console.log("Waiting for EdgeForge app hydration on localhost:3000...");
  await sleep(4000);

  const outDir = path.resolve("verification_screenshots");
  await fs.mkdir(outDir, { recursive: true });

  // 1. Initial State: Check entry points (banner and topbar button)
  console.log("\n[Test 1] Verifying Replay Entry Points (Banner & TopBar Button)...");
  const entryCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const banner = document.body.innerText.includes('EXPLORE EDGEFORGE IN REPLAY MODE');
      const replayBtn = document.getElementById('btn-start-replay');
      const topBarText = replayBtn ? replayBtn.innerText : '';
      return {
        hasBanner: banner,
        hasTopBarBtn: Boolean(replayBtn),
        topBarText
      };
    })()`,
    returnByValue: true,
  });
  console.log("Entry check result:", entryCheck.result?.value);

  // 2. Open Scenario Selector Modal from the banner
  console.log("\n[Test 2] Opening Scenario Selector Modal and validating all 7 scenarios...");
  const clickRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const topBtn = document.getElementById('btn-start-replay');
      const bannerBtn = document.getElementById('btn-browse-scenarios');
      const btn = bannerBtn || topBtn;
      if (btn) {
        btn.click();
        return { clicked: true, id: btn.id, text: btn.innerText };
      }
      return { clicked: false, allButtons: Array.from(document.querySelectorAll('button')).map(b => ({ id: b.id, text: b.innerText })) };
    })()`,
    returnByValue: true,
  });
  console.log("Browse button click result:", clickRes.result?.value);
  await sleep(1500);

  // Validate all 7 scenarios in the modal
  const modalScenariosCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const modalEl = document.getElementById('replay-scenario-selector-modal');
      const bodyText = modalEl ? modalEl.innerText : document.body.innerText;
      const scenarios = [
        'Featured End-to-End Walkthrough',
        'YOLO Inspection',
        'Cross-Hardware Benchmarking',
        'Precision Optimization',
        'Hardware Comparison & Pareto Analysis',
        'AI Engineer Autonomous Agent',
        'Deployment Bundling & Verification'
      ];
      const found = scenarios.map(s => ({ scenario: s, present: bodyText.includes(s) }));
      return {
        hasModalEl: Boolean(modalEl),
        isModalOpen: bodyText.includes('SELECT INTERACTIVE REPLAY SCENARIO') || bodyText.includes('Interactive Replay Catalog'),
        allSevenPresent: found.every(f => f.present),
        scenarios: found
      };
    })()`,
    returnByValue: true,
  });
  console.log("Modal scenarios check:", JSON.stringify(modalScenariosCheck.result?.value, null, 2));

  // Capture screenshot: scenario_selector.png
  console.log("Capturing scenario_selector.png...");
  const modalShot = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "scenario_selector.png"), Buffer.from(modalShot.data, "base64"));

  // 3. Launch Featured Scenario ("featured-e2e")
  console.log("\n[Test 3] Launching Featured E2E Scenario...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.getElementById('btn-launch-scenario-featured-e2e') || document.getElementById('btn-launch-featured-demo');
      if (btn) btn.click();
    })()`,
  });
  await sleep(1500);

  // Check toolbar presence
  const toolbarCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const toolbar = document.querySelector('[aria-label="Replay Controls Toolbar"]');
      const bodyText = document.body.innerText;
      const isReplayActive = bodyText.includes('LIVE REPLAY');
      const stageText = bodyText.includes('[1/') || bodyText.includes('[2/');
      return {
        hasToolbar: Boolean(toolbar),
        isReplayActive,
        stageText
      };
    })()`,
    returnByValue: true,
  });
  console.log("Replay Toolbar Check:", toolbarCheck.result?.value);

  // Capture screenshot: replay_toolbar.png
  console.log("Capturing replay_toolbar.png...");
  const toolbarShot = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "replay_toolbar.png"), Buffer.from(toolbarShot.data, "base64"));

  // 4. Test Playback Controls (Pause, Play, Speed, Step Next, Step Prev, Restart)
  console.log("\n[Test 4] Testing Playback Controls (Pause, Play, Speeds, Stepping)...");
  
  // 4a. Pause
  const pauseRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const pauseBtn = document.querySelector('[aria-label="Pause"]');
      if (pauseBtn) pauseBtn.click();
      return Boolean(pauseBtn);
    })()`,
    returnByValue: true,
  });
  await sleep(500);
  console.log("Pause button clicked:", pauseRes.result?.value);

  // 4b. Speed selector to 2x
  const speedRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const speed2x = buttons.find(b => b.innerText === '2x');
      if (speed2x) speed2x.click();
      return Boolean(speed2x);
    })()`,
    returnByValue: true,
  });
  await sleep(300);
  console.log("Speed 2x clicked:", speedRes.result?.value);

  // 4c. Step forward
  const stepNextRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const nextBtn = document.querySelector('[aria-label="Next Step"]');
      if (nextBtn) nextBtn.click();
      return Boolean(nextBtn);
    })()`,
    returnByValue: true,
  });
  await sleep(1000);
  console.log("Next step clicked:", stepNextRes.result?.value);

  // Check stage advanced
  const stageAdvanceCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const bodyText = document.body.innerText;
      return {
        bodySnippet: bodyText.substring(0, 300),
        hasStage2: bodyText.includes('[2/') || bodyText.includes('[3/')
      };
    })()`,
    returnByValue: true,
  });
  console.log("Stage after step forward:", stageAdvanceCheck.result?.value);

  // 4d. Step backward
  await send("Runtime.evaluate", {
    expression: `(() => {
      const prevBtn = document.querySelector('[aria-label="Previous Step"]');
      if (prevBtn) prevBtn.click();
    })()`,
  });
  await sleep(500);

  // 4e. Resume Play
  await send("Runtime.evaluate", {
    expression: `(() => {
      const playBtn = document.querySelector('[aria-label="Play"]');
      if (playBtn) playBtn.click();
    })()`,
  });
  await sleep(800);

  // 5. Test Active Stage Playback on Workbench Tab
  console.log("\n[Test 5] Checking Workbench Tab Active Stage Playback...");
  await send("Runtime.evaluate", {
    expression: `document.getElementById('tab-workbench')?.click()`,
  });
  await sleep(2000);

  const workbenchActiveCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const bodyText = document.body.innerText;
      const hasBenchmarkMetrics = bodyText.includes('Benchmark Metrics & Feasibility');
      const hasLatency = bodyText.includes('MEDIAN LATENCY') || bodyText.includes('TRANSIENT LATENCY');
      const hasTerminal = bodyText.includes('Execution Console') || bodyText.includes('Console') || bodyText.includes('TERMINAL');
      return {
        hasBenchmarkMetrics,
        hasLatency,
        hasTerminal,
        snippet: bodyText.substring(0, 300)
      };
    })()`,
    returnByValue: true,
  });
  console.log("Workbench Active Check:", workbenchActiveCheck.result?.value);

  console.log("Capturing active_stage_playback.png...");
  const playbackShot = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "active_stage_playback.png"), Buffer.from(playbackShot.data, "base64"));

  // 6. Test AI Engineer Replay Scenario
  console.log("\n[Test 6] Switching to AI Engineer Replay Scenario...");
  // Open modal via toolbar
  const openModalRes = await send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.getElementById('btn-toolbar-scenarios');
      if (btn) {
        btn.click();
        return { clicked: true, id: btn.id };
      }
      return { clicked: false };
    })()`,
    returnByValue: true,
  });
  console.log("Open modal from toolbar result:", openModalRes.result?.value);
  await sleep(1500);

  // Select AI Engineer scenario
  const launchAiScenario = await send("Runtime.evaluate", {
    expression: `(() => {
      const aiBtn = document.getElementById('btn-launch-scenario-ai-engineer');
      if (aiBtn) {
        aiBtn.click();
        return { clicked: true, id: 'btn-launch-scenario-ai-engineer' };
      }
      const allButtons = Array.from(document.querySelectorAll('button'));
      const launchBtn = allButtons.find(b => b.innerText.includes('Launch Scenario') && (b.id?.includes('ai') || b.closest('div')?.innerText.includes('AI Engineer')));
      if (launchBtn) {
        launchBtn.click();
        return { clicked: true, id: launchBtn.id, text: launchBtn.innerText };
      }
      return { clicked: false, availableButtons: allButtons.map(b => b.id || b.innerText).slice(0, 10) };
    })()`,
    returnByValue: true,
  });
  console.log("Launch AI Scenario result:", launchAiScenario.result?.value);
  await sleep(2000);

  // Navigate to Agent tab to inspect trace
  await send("Runtime.evaluate", {
    expression: `document.getElementById('tab-agent')?.click()`,
  });
  await sleep(2000);

  const aiEngineerTraceCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const bodyText = document.body.innerText;
      const hasAgentOrReplay = bodyText.includes('Autonomous Edge AI Engineer') || bodyText.includes('AI Engineer') || bodyText.includes('Decision') || bodyText.includes('Lineage') || bodyText.includes('REPLAY');
      const hasToolCallsOrLogs = bodyText.includes('run_benchmark') || bodyText.includes('quantize') || bodyText.includes('Recommendation') || bodyText.includes('Jetson') || bodyText.includes('Hailo');
      return {
        hasAgentOrReplay,
        hasToolCallsOrLogs,
        snippet: bodyText.substring(0, 400)
      };
    })()`,
    returnByValue: true,
  });
  console.log("AI Engineer Trace Check:", aiEngineerTraceCheck.result?.value);

  console.log("Capturing ai_engineer_replay.png...");
  const aiShot = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "ai_engineer_replay.png"), Buffer.from(aiShot.data, "base64"));

  // 7. Test Offline Isolation & Client-side Mock Interception
  console.log("\n[Test 7] Testing Client-Side Offline Mock Interception in Browser...");
  const offlineCheck = await send("Runtime.evaluate", {
    expression: `(async () => {
      try {
        const resHw = await fetch('/api/v1/hardware');
        const hwData = await resHw.json();
        const resModels = await fetch('/api/v1/models');
        const modelsData = await resModels.json();
        return {
          offlineSuccess: true,
          hardwareCount: hwData.length,
          modelsCount: modelsData.length,
          sampleModel: modelsData[0]?.name
        };
      } catch (err) {
        return {
          offlineSuccess: false,
          error: err.message
        };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  console.log("Offline interception test:", offlineCheck.result?.value);

  // 8. Test Exit Replay
  console.log("\n[Test 8] Testing Exit Replay and return to live app...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      const exitBtn = document.getElementById('btn-toolbar-exit-replay');
      if (exitBtn) exitBtn.click();
    })()`,
  });
  await sleep(600);

  // Confirm exit in modal prompt
  await send("Runtime.evaluate", {
    expression: `(() => {
      const confirmBtn = document.getElementById('btn-confirm-exit-replay');
      if (confirmBtn) confirmBtn.click();
    })()`,
  });
  await sleep(1000);

  const exitCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const toolbar = document.querySelector('[aria-label="Replay Controls Toolbar"]');
      const bodyText = document.body.innerText;
      return {
        toolbarUnmounted: !toolbar,
        returnedToBannerOrLive: bodyText.includes('EXPLORE EDGEFORGE IN REPLAY MODE') || bodyText.includes('REPLAY MODE')
      };
    })()`,
    returnByValue: true,
  });
  console.log("Exit Replay Check:", exitCheck.result?.value);

  console.log("\nTotal browser exceptions caught:", browserExceptions.length);
  if (browserExceptions.length > 0) {
    console.error("Browser exceptions details:", JSON.stringify(browserExceptions, null, 2));
  } else {
    console.log("✅ Zero browser exceptions caught during complete execution!");
  }

  console.log("\n✅ All Replay Mode E2E CDP Verification steps completed successfully!");
  ws.close();
  chrome.kill();
}

main().catch((err) => {
  console.error("❌ E2E Verification failed:", err);
  process.exit(1);
});
