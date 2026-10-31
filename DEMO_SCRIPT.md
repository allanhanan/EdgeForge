# EdgeForge: 3-Minute Hackathon Demo Script

> **Meta Global AI Developer Hackathon 2026** — *Theme: Push the Frontier*  
> Format: 3-Minute Live Video Presentation / Stage Demo  
> Target Persona: AI Systems Engineers, Edge Hardware Architects, Hackathon Judges

---

## Quick Reference Summary

| Timestamp | Section | Visual / Screen Action | Key Talking Point |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:30** | The Edge Deployment Dilemma | EdgeForge Dashboard landing page | The chaos of fragmented silicon toolchains and unverified claims |
| **0:30 – 1:15** | Hardware Discovery & Real Benchmarking | Silicon Grid & Live Benchmark execution | Real bare-metal latency on Intel i7 & NVIDIA RTX 4060 vs. marketing TOPS |
| **1:15 – 1:55** | INT8 Quantization & mAP Evaluation | Model optimization panel & mAP metrics | 73.7% size reduction with verified dataset precision retention |
| **1:55 – 2:35** | Meta AI Deployment Engineer | Meta Agent chat tab with observable trace | Meta Muse Spark orchestrates 17 tools to identify Pareto winner |
| **2:35 – 3:00** | Standalone Deployment Bundle Export | Export Modal & Terminal smoke test | Zero-friction portable deployment ZIP with verified `infer.py` |

---

## Detailed Demo Walkthrough

### Part 1: The Edge Deployment Dilemma & Introduction (0:00 – 0:30)

#### Screen Action:
- Open browser at `http://localhost:3000`.
- Display the clean, futuristic EdgeForge dashboard.
- Mouse over the top banner: **"EdgeForge: Vendor-Neutral Edge AI Intelligence Platform"**.
- Point to the connected local silicon cards: **Intel Core i7-14700HX** and **NVIDIA GeForce RTX 4060 Laptop GPU**.

#### Voiceover / Presenter Talking Points:
> *"Every machine learning engineer knows this pain: you train a state-of-the-art vision model, but deploying it to edge devices—whether an embedded Jetson robot, a Raspberry Pi gateway, or an Intel industrial PC—is a nightmare.*  
>  
> *You deal with fragmented vendor compilers, proprietary runtime formats, and spec sheets promising '40 TOPS' that deliver disappointing frame rates in production.*  
>  
> *Welcome to **EdgeForge**. Built for the Meta Global AI Developer Hackathon 2026, EdgeForge is a vendor-neutral edge AI benchmarking, optimization, and deployment intelligence platform."*

---

### Part 2: Silicon Auto-Discovery & Real ONNX Benchmarking (0:30 – 1:15)

#### Screen Action:
- Scroll down to the **Hardware Grid** view.
- Highlight the **ONLINE** status indicators on the local CPU (`Intel Core i7-14700HX`, 20 cores, AVX2, VNNI enabled) and local GPU (`NVIDIA RTX 4060 Laptop GPU`, 8GB VRAM, NVML driver 595.91).
- Click on the pre-loaded model: **Edge Tiny YOLO** (Input: `1x3x640x640`, 14 nodes, 397 KB).
- Click the **"Run Benchmark"** button with target: `Intel Core i7-14700HX (CPUExecutionProvider)`.
- Watch the live progress bar and execution logs stream in via Server-Sent Events (SSE).
- Results pop up: **Median Latency: 0.84 ms | 1,189.5 FPS | RSS: 65 MB**.
- Repeat or show the comparison row on the GPU: **0.90 ms | 1,111.9 FPS | 561 MB VRAM**.

#### Voiceover / Presenter Talking Points:
> *"EdgeForge doesn't simulate numbers or guess from marketing PDFs. As soon as it launches, it probes local silicon via direct hardware hooks—reading CPU vector instruction extensions and GPU memory via NVML.*  
>  
> *Let's benchmark our YOLO model on bare metal. We select our 20-core Intel Core i7 with ONNX Runtime's CPU Execution Provider and hit 'Run'.*  
>  
> *In real time, EdgeForge executes warmup iterations, synchronizes hardware execution, and records high-resolution nanosecond timestamps. In under two seconds, we see empirical ground truth: **0.84 milliseconds median latency** at over **1,100 frames per second** with a lean 65 megabyte memory footprint."*

---

### Part 3: Automated INT8 Quantization & mAP Accuracy Verification (1:15 – 1:55)

#### Screen Action:
- Click the **"Model Optimization"** tab.
- Click **"Apply INT8 Dynamic Quantization"**.
- Show the optimization output:
  - Original size: **0.38 MB (397 KB)**.
  - Optimized size: **0.10 MB (104 KB)**.
  - Size reduction: **-73.7%** (a 3.8x compression ratio).
- Click **"Evaluate Accuracy on Validation Set"**.
- Display the computed metrics:
  - **mAP@50: 0.854**
  - **mAP@50:95: 0.612**
  - **Accuracy Regression: 0.0%**.

#### Voiceover / Presenter Talking Points:
> *"Edge deployments rarely have the luxury of uncompressed float32 weights. With one click, EdgeForge triggers automated graph quantization.*  
>  
> *Notice our model footprint plummets from 397 kilobytes down to just 104 kilobytes—a **73.7% compression**.*  
>  
> *Crucially, EdgeForge protects engineers from quantization blindness. It immediately runs validation imagery through our integrated computer vision evaluator, calculating IoU matrices and 101-point interpolated mAP to verify that detection accuracy remains intact before any model ever touches a customer device."*

---

### Part 4: Meta AI Deployment Engineer in Action (1:55 – 2:35)

#### Screen Action:
- Click the **"Meta AI Copilot"** tab.
- Show the Meta provider badge: **"Meta Model API: Online (Meta Muse Spark / LLaMA)"**.
- In the prompt input box, submit the objective:
  `"I need to deploy this YOLO model on an edge robot. My hard constraints: latency must be under 30 ms, throughput at least 30 FPS, and power under 60 watts. Recommend the optimal Pareto configuration."`
- Watch the **Observable Agent Trace Timeline** expand step-by-step:
  1. `Thought: Probing available hardware and compatibility...`
  2. `Tool Call: list_hardware()` -> Returns local CPU/GPU and edge registry devices.
  3. `Tool Call: evaluate_constraints(...)` -> Eliminates violating configurations.
  4. `Tool Call: recommend_hardware(...)` -> Computes Pareto frontier.
- Show the generated Pareto chart with non-dominated frontier points and the selected **Winner Configuration**.

#### Voiceover / Presenter Talking Points:
> *"Now let's bring in our **Meta AI Deployment Engineer**, powered by Meta's frontier generative models.*  
>  
> *Instead of standard chat text, Meta AI acts as an autonomous agent equipped with **17 strongly typed tools**. We tell it: 'Deploy on an edge robot with under 30ms latency, at least 30 FPS, and under 60 watts.'*  
>  
> *Look at the live reasoning trace: Meta AI inspects the ONNX graph, queries connected silicon, filters out candidates that violate our power and latency constraints, and calculates the mathematical Pareto frontier.*  
>  
> *It selects the non-dominated winner, giving us a full technical justification of the trade-offs."*

---

### Part 5: Standalone Deployment Package Export & Local Smoke Test (2:35 – 3:00)

#### Screen Action:
- Click the **"Export Deployment Bundle"** button next to the winning configuration.
- A ZIP download is generated instantly (`edgeforge_bundle_<id>.zip`).
- Switch to a terminal window showing the extracted bundle contents:
  ```bash
  unzip -l edgeforge_bundle_18e93d8f.zip
  # Output shows: model.onnx, config.json, infer.py, requirements.txt, README.md
  ```
- Run the self-contained smoke test in the terminal:
  ```bash
  python infer.py --iterations 10
  ```
- Terminal outputs: `[✓] Benchmark complete. Median latency: 0.86 ms (1162.0 FPS)`.
- Return to the browser to conclude.

#### Voiceover / Presenter Talking Points:
> *"The final mile of edge AI is deployment. EdgeForge exports a zero-dependency, self-contained deployment bundle: verified ONNX weights, hardware configuration, and an optimized standalone `infer.py` script.*  
>  
> *We unzip it, run `python infer.py`, and immediately observe identical sub-millisecond execution with zero external framework dependencies.*  
>  
> *EdgeForge pushes the frontier of edge intelligence: vendor-neutral, empirically verified, and powered by Meta AI. Thank you!"*

---

## Technical Checklist for Presenters

Before recording or presenting live, ensure:
1. Backend is running: `curl http://localhost:8000/health` returns `{"status": "online"}`.
2. Frontend is running: `curl http://localhost:3000` returns HTTP 200.
3. Test suite passes: `PYTHONPATH=. .venv/bin/pytest backend/tests/ -v` (8 passed).
4. Terminal window is sized and positioned next to browser for Part 5 bundle execution.
