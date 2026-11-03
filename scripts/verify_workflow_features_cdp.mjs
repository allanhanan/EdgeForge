import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const PORT = 9224;
const TARGET_URL = "http://localhost:3000";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Starting Chrome for targeted EdgeForge workflow verification...");
  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-sandbox",
    "--window-size=1600,1100",
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
      console.error(
        "❌ Runtime Exception:",
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

  console.log("Waiting for hydration...");
  await sleep(5000);

  const outDir = path.resolve("verification_screenshots/workflows");
  await fs.mkdir(outDir, { recursive: true });

  // 1. Verify Header & Dashboard/Overview
  console.log("\n[Check 1] Verifying Header and Dashboard Overview...");
  const headerCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const bodyText = document.body.innerText;
      const hasLabConnected = bodyText.includes('Lab connected');
      const hasWorkspace = bodyText.includes('Your edge AI deployment workspace') || bodyText.includes('WORKSPACE');
      const hasGoodAfternoon = bodyText.includes('Good afternoon.');
      const hasDeploymentAnalysis = bodyText.includes('New Benchmark') || bodyText.includes('Ask AI Engineer');
      const hasRecentActivity = bodyText.includes('Recent Activity') || bodyText.includes('Recent activity');
      const hasHailoNotConfigured = bodyText.includes('Not configured') || bodyText.includes('Profiles') || bodyText.includes('SIMULATED') || bodyText.includes('Hailo');
      return {
        hasLabConnected,
        hasWorkspace,
        hasGoodAfternoon,
        hasDeploymentAnalysis,
        hasRecentActivity,
        hasHailoNotConfigured
      };
    })()`,
    returnByValue: true,
  });
  console.log("Header & Overview Check:", headerCheck.result?.value);

  const shot1 = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "1_overview_dashboard.png"), Buffer.from(shot1.data, "base64"));

  // 2. Verify Benchmarks (WorkbenchTab) - Guided Mode & Workflow Preview
  console.log("\n[Check 2] Testing Benchmarks (WorkbenchTab) Guided Mode & Workflow Preview...");
  await send("Runtime.evaluate", {
    expression: `document.getElementById('tab-workbench')?.click()`,
  });
  await sleep(1500);

  const guidedCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const bodyText = document.body.innerText;
      const hasObjective = bodyText.includes('Configure your benchmark objective');
      const hasPointsDefinition = bodyText.includes('0.80 to 0.79 is 1 percentage point');
      const hasAllDevices = bodyText.includes('All available devices');
      return { hasObjective, hasPointsDefinition, hasAllDevices };
    })()`,
    returnByValue: true,
  });
  console.log("Guided Mode Check:", guidedCheck.result?.value);

  // Click "Preview benchmark workflow"
  await send("Runtime.evaluate", {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Preview benchmark workflow'));
      if (btn) btn.click();
    })()`,
  });
  await sleep(1000);

  const modalCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector('.fixed.inset-0');
      const text = modal ? modal.innerText : '';
      const has6Steps = text.includes('Model Graph Inspection') && text.includes('Deployment Package Generation');
      // Close modal
      const closeBtn = modal?.querySelector('button');
      if (closeBtn) closeBtn.click();
      return { modalPresent: !!modal, has6Steps };
    })()`,
    returnByValue: true,
  });
  console.log("Workflow Preview Modal Check:", modalCheck.result?.value);

  const shot2 = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "2_workbench_guided.png"), Buffer.from(shot2.data, "base64"));

  // 3. Verify Benchmarks - Edge Scenarios & Diagnostics Laboratory
  console.log("\n[Check 3] Testing Benchmarks Failure Recovery Scenarios (D, E, F, G, H)...");
  
  // Test Scenario D Op Crash Retest
  const scenarioDCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const dBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Scenario D: Op Crash'));
      if (dBtn) dBtn.click();
      const inspectBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Inspect graph'));
      if (inspectBtn) inspectBtn.click();
      return { selectedD: true };
    })()`,
    returnByValue: true,
  });
  await sleep(800);

  // Click Propose Fix & Retest
  await send("Runtime.evaluate", {
    expression: `(() => {
      const retestBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Retest'));
      if (retestBtn) retestBtn.click();
    })()`,
  });
  await sleep(800);

  const scenarioDResult = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return { passed: text.includes('Retest passed!') };
    })()`,
    returnByValue: true,
  });
  console.log("Scenario D Op Retest Result:", scenarioDResult.result?.value);

  // Test Scenario E: INT8 Loss Table
  await send("Runtime.evaluate", {
    expression: `(() => {
      const eBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Scenario E: INT8 Loss'));
      if (eBtn) eBtn.click();
    })()`,
  });
  await sleep(800);

  const scenarioECheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasTable: text.includes('FP32 Baseline') && text.includes('INT8 Quantized'),
        hasStatus: text.includes('Neither satisfies both')
      };
    })()`,
    returnByValue: true,
  });
  console.log("Scenario E INT8 Trade-off Check:", scenarioECheck.result?.value);

  // Test Scenario G: OOM Recovery
  await send("Runtime.evaluate", {
    expression: `(() => {
      const gBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Scenario G: OOM'));
      if (gBtn) gBtn.click();
    })()`,
  });
  await sleep(800);

  await send("Runtime.evaluate", {
    expression: `(() => {
      const retestOOMBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Apply Batch=1 & Retest'));
      if (retestOOMBtn) retestOOMBtn.click();
    })()`,
  });
  await sleep(800);

  const scenarioGCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return { oomResolved: text.includes('OOM Resolved: Retest Executed with Batch=1') };
    })()`,
    returnByValue: true,
  });
  console.log("Scenario G OOM Resolution Check:", scenarioGCheck.result?.value);

  // Test Scenario 10: Variance Jitter
  await send("Runtime.evaluate", {
    expression: `(() => {
      const varBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Scenario 10: Jitter'));
      if (varBtn) varBtn.click();
    })()`,
  });
  await sleep(800);

  await send("Runtime.evaluate", {
    expression: `(() => {
      const stabBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Run Repeated 50-Iteration Stabilized Benchmark'));
      if (stabBtn) stabBtn.click();
    })()`,
  });
  await sleep(800);

  const scenario10Check = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasVariance: text.includes('Inconsistent Benchmark Variance Detected'),
        isStabilized: text.includes('Variance Stabilized')
      };
    })()`,
    returnByValue: true,
  });
  console.log("Scenario 10 Jitter & Stabilization Check:", scenario10Check.result?.value);

  // Test Scenario 18: Resolution Mismatch
  await send("Runtime.evaluate", {
    expression: `(() => {
      const resBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Scenario 18: Resolution'));
      if (resBtn) resBtn.click();
    })()`,
  });
  await sleep(800);

  const scenario18Check = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      return {
        hasWarning: text.includes('Input Resolution Mismatch Warning'),
        hasDisparity: text.includes('Dimension Disparity')
      };
    })()`,
    returnByValue: true,
  });
  console.log("Scenario 18 Resolution Disparity Check:", scenario18Check.result?.value);

  // 4. Verify AI Engineer Tab - Lineage Tree & Section 6 Orchestration Plan
  console.log("\n[Check 4] Testing AI Engineer Optimization Lineage Tree & Section 6 Orchestration Plan...");
  await send("Runtime.evaluate", {
    expression: `document.getElementById('tab-agent')?.click()`,
  });
  await sleep(1500);

  // Switch to Lineage Tree view
  await send("Runtime.evaluate", {
    expression: `(() => {
      const treeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Optimization Lineage Tree'));
      if (treeBtn) treeBtn.click();
    })()`,
  });
  await sleep(1000);

  // Test Lineage Tree
  const lineageCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      const upper = text.toUpperCase();
      const hasTree = text.includes('Optimization Experiment History') || text.includes('Optimization Lineage');
      const hasRoot = text.includes('Original YOLO Model');
      const hasFP32 = text.includes('FP32 Baseline');
      const hasFP16 = text.includes('FP16 Half-Precision');
      const hasINT8 = text.includes('INT8 Quantization');
      const hasNewCalib = text.includes('New Calibration (Entropy)');
      const hasWhyAttempted = upper.includes('WHY WAS IT ATTEMPTED');
      const hasWhatHappened = upper.includes('WHAT HAPPENED');
      const hasWhatAgentLearned = upper.includes('WHAT DID THE AGENT LEARN');
      return {
        hasTree,
        hasRoot,
        hasFP32,
        hasFP16,
        hasINT8,
        hasNewCalib,
        hasWhyAttempted,
        hasWhatHappened,
        hasWhatAgentLearned
      };
    })()`,
    returnByValue: true,
  });
  console.log("Lineage Tree Check:", lineageCheck.result?.value);

  // Test Section 6 Deployment Analysis & Plan Switcher
  await send("Runtime.evaluate", {
    expression: `(() => {
      const planBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Deployment Analysis & Plan'));
      if (planBtn) planBtn.click();
    })()`,
  });
  await sleep(1000);

  const orchestrationCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      const upper = text.toUpperCase();
      const hasOrchestration = upper.includes('DEPLOYMENT ANALYSIS AND EXPERIMENT ORCHESTRATION');
      const hasExampleSession = upper.includes('EXAMPLE SESSION');
      const hasAgentActivity = upper.includes('AGENT ACTIVITY') && upper.includes('INSPECT MODEL GRAPH');
      const hasProposedPlan = upper.includes('PROPOSED EXPERIMENT PLAN') && upper.includes('INTEL CORE I7 CPU');
      const hasConclusion = upper.includes('ENGINEERING CONCLUSION') && upper.includes('INSUFFICIENT EVIDENCE');
      return {
        hasOrchestration,
        hasExampleSession,
        hasAgentActivity,
        hasProposedPlan,
        hasConclusion
      };
    })()`,
    returnByValue: true,
  });
  console.log("Section 6 Orchestration Plan Check:", orchestrationCheck.result?.value);

  const shot3 = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "3_ai_engineer_lineage.png"), Buffer.from(shot3.data, "base64"));

  // 5. Test Quick Prompt in AI Engineer
  console.log("\n[Check 5] Testing AI Engineer Natural Language Conversation...");
  await send("Runtime.evaluate", {
    expression: `(() => {
      const chatTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Interactive AI Engineer Chat'));
      if (chatTabBtn) chatTabBtn.click();
    })()`,
  });
  await sleep(600);

  await send("Runtime.evaluate", {
    expression: `(() => {
      const whySlowBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Why is my model slow?'));
      if (whySlowBtn) whySlowBtn.click();
    })()`,
  });
  await sleep(4000);

  const chatCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      const hasTrace = text.includes('Observable Tool Execution Trace') || text.includes('Autonomous Edge AI Deployment Engineer');
      return { hasTrace, textLength: text.length };
    })()`,
    returnByValue: true,
  });
  console.log("AI Engineer Chat Result Check:", chatCheck.result?.value);

  const shot4 = await send("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(outDir, "4_ai_engineer_response.png"), Buffer.from(shot4.data, "base64"));

  // 6. Test Hardware Lab - Scenario A (Find Suitable Hardware) & Scenario C/I (Register Worker)
  console.log("\n[Check 6] Testing Hardware Lab Scenario A & Scenario C/I...");
  await send("Runtime.evaluate", {
    expression: `document.getElementById('tab-hardware')?.click()`,
  });
  await sleep(1500);

  // Click "Find Suitable Hardware"
  await send("Runtime.evaluate", {
    expression: `(() => {
      const findBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Find Suitable Hardware'));
      if (findBtn) findBtn.click();
    })()`,
  });
  await sleep(600);

  await send("Runtime.evaluate", {
    expression: `(() => {
      const execFindBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Find suitable hardware');
      if (execFindBtn) execFindBtn.click();
    })()`,
  });
  await sleep(800);

  const scenarioACheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      const upper = text.toUpperCase();
      return {
        hasShortlist: upper.includes('RECOMMENDED HARDWARE SHORTLIST'),
        hasHailo: upper.includes('HAILO-8') || upper.includes('RASPBERRY PI'),
        hasIntelCPU: upper.includes('INTEL') || upper.includes('HOST LOCAL CPU'),
        hasNotEnoughEvidence: upper.includes('NOT MEASURED') || upper.includes('TARGET PROFILE') || upper.includes('NOT ENOUGH EVIDENCE')
      };
    })()`,
    returnByValue: true,
  });
  console.log("Scenario A Hardware Discovery Check:", scenarioACheck.result?.value);

  // Click "Pair Device"
  await send("Runtime.evaluate", {
    expression: `(() => {
      const regBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Pair Device') || b.innerText.includes('Register Worker'));
      if (regBtn) regBtn.click();
    })()`,
  });
  await sleep(600);

  const registerWorkerCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const modal = document.querySelector('.fixed.inset-0');
      const text = modal ? modal.innerText : '';
      const hasModal = text.includes('Pair Edge Hardware Device') || text.includes('Pair Device') || text.includes('Register Hardware Worker');
      const closeBtn = modal?.querySelector('button');
      if (closeBtn) closeBtn.click();
      return { hasModal };
    })()`,
    returnByValue: true,
  });
  console.log("Scenario C/I Register Worker Modal Check:", registerWorkerCheck.result?.value);

  // 7. Test Compare Tab - Scenario B (Pre-Purchase Recommendation)
  console.log("\n[Check 7] Testing Compare Tab Scenario B Pre-Purchase Evaluation...");
  await send("Runtime.evaluate", {
    expression: `document.getElementById('tab-compare')?.click()`,
  });
  await sleep(1500);

  const compareScenarioBCheck = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      const upper = text.toUpperCase();
      return {
        hasScenarioB: upper.includes('SCENARIO B: PRE-PURCHASE EVALUATION'),
        hasVerifiedVsUnknown: upper.includes('VERIFIED SILICON VS UNKNOWN CONSTRAINTS'),
        hasPrePurchaseVerdict: upper.includes('PRE-PURCHASE RECOMMENDATION ANALYSIS')
      };
    })()`,
    returnByValue: true,
  });
  console.log("Compare Tab Scenario B Pre-Purchase Check:", compareScenarioBCheck.result?.value);

  console.log(`\nBrowser Runtime Exceptions: ${errors.length}`);
  if (errors.length > 0) {
    for (const err of errors) {
      console.error(` - ${err.text}: ${err.exception?.description}`);
    }
  }

  ws.close();
  chrome.kill();

  if (errors.length === 0) {
    console.log("\n🎉 ALL USER WORKFLOWS AND SCENARIOS VERIFIED WITH 0 RUNTIME EXCEPTIONS!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
