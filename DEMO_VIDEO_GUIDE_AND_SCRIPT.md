# EdgeForge — Demo Video Guide & Script (3 Minutes or Less)

**Target Video Length:** ~2 minutes 35 seconds (Strictly under the 3:00 cutoff)  
**Submission Track:** Push the Frontier  
**Meta Model:** Meta Muse Spark 1.3 (Meta Model API)  
**Tone:** Friendly, conversational, developer-to-developer. Clear and honest, zero jargon.

---

## 1. Quick Video Outline & Timing

| Timestamp | What's on Screen | What You're Saying | Goal |
| :---: | :--- | :--- | :--- |
| **0:00 – 0:15** | EdgeForge home screen & clean dashboard | Required opening line: what existed before vs. what we built this week | Friendly hook & clear context |
| **0:15 – 0:35** | Uploading & inspecting a real YOLO model | Seeing inside the model with the visual graph | Show ease of use |
| **0:35 – 1:05** | Running a benchmark on a Jetson Orin Nano | Discovering the speed & power bottleneck (38ms, 13W) | Relatable edge AI problem |
| **1:05 – 1:55** | Asking Meta Muse Spark (AI Engineer) to fix it | Muse Spark inspects the model, calls tools, and cuts speed in half without breaking accuracy | **Core Meta Model Demo** |
| **1:55 – 2:15** | Lineage tree & one-click deployment export | Reviewing the changes and exporting a ready-to-run Docker package | Real-world usefulness |
| **2:15 – 2:35** | Replay Mode on screen | Showing judges how they can click through and test it immediately without any setup | Instant judge verification |

---

## 2. Second-by-Second Video Script

### 0:00 – 0:15 | The Hook (Required Opening Line)
**Visual:**  
Start on the EdgeForge home screen (`http://localhost:3000`). Show the clean dark-mode dashboard with hardware status cards and recent benchmarks.

**Voiceover:**  
> *"Before this week, getting an AI model to run smoothly on real edge hardware meant wrestling with different vendor tools, broken drivers, and endless trial and error.*  
> *This week, we built EdgeForge: a developer workspace powered by Meta Muse Spark that lets you benchmark your model on real devices, see why it's running slow, and optimize it automatically."*

---

### 0:15 – 0:35 | Exploring the Model
**Visual:**  
Click on **Models** in the sidebar. Click into `yolov8n-defect-detector.onnx`. Scroll down to show the clean interactive operator graph. Click on a couple of layers to highlight them.

**Voiceover:**  
> *"Let’s say you have a vision model you want to deploy on a factory camera or a robot. You drop the model in, and EdgeForge immediately breaks down what's inside—showing every layer, operator, and tensor size so you don’t have to dig through complex logs."*

---

### 0:35 – 1:05 | Testing on Real Hardware (The Problem)
**Visual:**  
Click **Workbench** in the sidebar. Select the `Jetson Orin Nano` and click **Run Benchmark**.  
Watch the live progress bar and terminal output as real numbers roll in (`38.6ms`, `25.9 FPS`, `13.5W`).  
Click over to the **Compare** tab to show the tradeoff chart.

**Voiceover:**  
> *"Now we want to know: how does this actually perform on real hardware? In the Workbench, we select our Jetson Orin Nano and run a quick benchmark.*  
> *In just a few seconds, we get the real story: it's taking about 38 milliseconds per frame, pulling over 13 watts.*  
> *If we need 30 frames a second for smooth detection, we're missing our target. And if we just blindly compress the model, it gets faster, but detection accuracy falls off a cliff. Usually, this is where you lose days trying to tweak settings manually."*

---

### 1:05 – 1:55 | Meet Meta Muse Spark: Your AI Edge Engineer
⭐ **THE MAIN EVENT — SHOWCASE META'S MODEL RUNNING LIVE**

**Visual:**  
Click **AI Engineer** in the sidebar.  
Point out the badge: `Meta AI Engine · muse-spark-1.3 · Active`.  
Type in or click the recommended prompt:  
*"Make this YOLO model run under 25ms on the Jetson Orin Nano with minimal accuracy loss."*  
Hit Send.  
Watch the real-time reasoning stream.  
Click to expand **`Tool: inspect_model_graph`** and **`Tool: run_int8_quantization_plan`**.  
Show the tool call parameters, output, and the friendly decision summary card.

**Voiceover:**  
> *"This is where Meta Muse Spark steps in as our AI Engineer. Unlike a basic chat assistant that just gives generic tips, Muse Spark actually has hands.*  
> *It analyzes our real benchmark numbers, inspects the heavy layers of our model, and figures out an intelligent fix.*  
> *Watch what it does: it chooses an entropy calibration technique that compresses the heavy convolution layers to INT8, but automatically protects the sensitive detection head so we don't ruin accuracy.*  
> *Then it runs the optimization for us right inside the platform."*

---

### 1:55 – 2:15 | The Results & One-Click Deployment
**Visual:**  
Click into the **Optimization Lineage DAG** view to show the visual journey from baseline to optimized.  
Point to the final metrics card: `18.4ms` (down from 38ms), `54.3 FPS`, `11.4W`, with `81.2% mAP` preserved.  
Click **Export Bundle ZIP** or navigate to **Deployments** to show the generated Dockerfile, C++ wrapper, and verification check.

**Voiceover:**  
> *"The results speak for themselves: latency dropped from 38 milliseconds down to 18—more than twice as fast—while preserving over 99% of our original accuracy.*  
> *Every change is mapped out in this visual lineage tree. And when you're ready to deploy, EdgeForge generates a clean Dockerfile and ready-to-run code package that you can send straight to your device."*

---

### 2:15 – 2:35 | Replay Mode (For the Judges)
**Visual:**  
Click the **`▶ REPLAY MODE`** button in the top navigation bar.  
The modal pops up showing the 7 scenarios. Click **Launch Featured Replay**.  
Show the floating player toolbar at the bottom. Press the Pause button, click around to show the tabs remain 100% interactive, then resume.

**Voiceover:**  
> *"And here’s the best part: you don't need any special hardware or API keys to try this yourself.*  
> *We built a full interactive Replay Mode right into EdgeForge. Just click 'Replay Mode' on the home screen, pick a workflow, pause whenever you want, and click through the real interface.*  
> *EdgeForge brings Meta's Muse Spark to the physical world of edge robotics and AI hardware. Check out our open-source code on GitHub, and give the replay a spin. Thanks for watching!"*

---

## 3. Screen Recording Tips & Checklist

1. **Keep it under 3 minutes:**  
   Speaking naturally with the script above will take between **2:25 and 2:40**, leaving plenty of breathing room before the strict 3:00 cutoff.
2. **Resolution & Audio:**  
   - Record in full 1080p (1920x1080) in Google Chrome.  
   - Hide browser bookmarks (`Ctrl + Shift + B`).  
   - Use a clear microphone and speak with a friendly, relaxed voice.
3. **Show Real Software, Not Slides:**  
   - 100% of the video should be you navigating EdgeForge.  
   - No PowerPoint slides or static infographics needed.
4. **Where to Host:**  
   - Upload as an **Unlisted YouTube video** or a **public Loom link**.  
   - Make sure anyone with the link can view it without logging in.

---

## 4. Key Details for Your Submission Form

- **Project Name:** EdgeForge
- **One-Sentence Tagline:**  
  *A friendly developer studio powered by Meta Muse Spark that benchmarks, diagnoses, and optimizes AI models for real edge devices.*
- **Problem Statement Track:** Push the Frontier
- **Meta Model Used:** Meta Muse Spark 1.3 (`muse-spark-1.3` via Meta Model API)
- **Built This Week:**  
  - Real-time physical and simulated edge benchmarking engine.  
  - Autonomous AI Engineer powered by Meta Muse Spark with real tool calling.  
  - Smart INT8 calibration that recovers model accuracy.  
  - Visual optimization lineage tree.  
  - Ready-to-run edge deployment packaging with verified Docker artifacts.  
  - Complete, interactive Replay Mode with 7 pre-recorded workflows for instant judge evaluation.
