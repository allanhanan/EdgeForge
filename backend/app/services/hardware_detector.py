import os
import platform
import subprocess
from datetime import datetime
from typing import Any, Dict, List, Optional
import psutil

try:
    import pynvml
    HAS_PYNVML = True
except ImportError:
    HAS_PYNVML = False

def detect_cpu_info() -> Dict[str, Any]:
    cpu_count_logical = psutil.cpu_count(logical=True) or 1
    cpu_count_physical = psutil.cpu_count(logical=False) or 1
    mem_total_mb = int(psutil.virtual_memory().total / (1024 * 1024))
    
    brand = platform.processor() or "x86_64 CPU"
    # Read /proc/cpuinfo if on Linux
    flags = []
    if os.path.exists("/proc/cpuinfo"):
        try:
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if line.startswith("model name"):
                        brand = line.split(":", 1)[1].strip()
                    elif line.startswith("flags"):
                        flags = line.split(":", 1)[1].strip().split()
        except Exception:
            pass

    has_avx2 = "avx2" in flags
    has_avx512 = any("avx512" in f for f in flags)
    has_vnni = any("vnni" in f for f in flags)

    return {
        "id": "cpu-local",
        "name": brand,
        "device_type": "cpu",
        "vendor": "Intel" if "Intel" in brand else ("AMD" if "AMD" in brand else "Generic"),
        "architecture": platform.machine(),
        "status": "ONLINE",
        "is_local": True,
        "compute_tops": 1.8,  # Approximate INT8 CPU throughput
        "memory_mb": mem_total_mb,
        "tdp_watts": 55.0,
        "cost_usd": 380.0,
        "supported_runtimes": ["onnxruntime_cpu", "openvino"],
        "supported_precisions": ["fp32", "int8"],
        "telemetry_supported": True,
        "details_json": {
            "cores_physical": cpu_count_physical,
            "cores_logical": cpu_count_logical,
            "has_avx2": has_avx2,
            "has_avx512": has_avx512,
            "has_vnni": has_vnni,
            "os": platform.system(),
            "os_release": platform.release(),
        }
    }

def detect_nvidia_gpu() -> Optional[Dict[str, Any]]:
    if not HAS_PYNVML:
        return None
    try:
        pynvml.nvmlInit()
        device_count = pynvml.nvmlDeviceGetCount()
        if device_count == 0:
            return None
        
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        name = pynvml.nvmlDeviceGetName(handle)
        if isinstance(name, bytes):
            name = name.decode("utf-8")
            
        mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
        vram_mb = int(mem_info.total / (1024 * 1024))
        
        try:
            driver_ver = pynvml.nvmlSystemGetDriverVersion()
            if isinstance(driver_ver, bytes):
                driver_ver = driver_ver.decode("utf-8")
        except Exception:
            driver_ver = "Unknown"

        try:
            power_limit_mw = pynvml.nvmlDeviceGetPowerManagementLimit(handle)
            tdp_watts = round(power_limit_mw / 1000.0, 1)
        except Exception:
            tdp_watts = 115.0

        pynvml.nvmlShutdown()

        return {
            "id": "nvidia-rtx4060-local",
            "name": name,
            "device_type": "gpu",
            "vendor": "NVIDIA",
            "architecture": "Ada Lovelace",
            "status": "ONLINE",
            "is_local": True,
            "compute_tops": 242.0,  # RTX 4060 Laptop tensor core INT8 TOPS
            "memory_mb": vram_mb,
            "tdp_watts": tdp_watts,
            "cost_usd": 1199.0,
            "supported_runtimes": ["onnxruntime_cuda", "tensorrt"],
            "supported_precisions": ["fp32", "fp16", "int8"],
            "telemetry_supported": True,
            "details_json": {
                "driver_version": driver_ver,
                "vram_mb": vram_mb,
                "cuda_supported": True,
            }
        }
    except Exception:
        return None

def get_edge_hardware_profiles() -> List[Dict[str, Any]]:
    return [
        {
            "id": "nvidia-jetson-orin-nano",
            "name": "NVIDIA Jetson Orin Nano (8GB)",
            "device_type": "soc",
            "vendor": "NVIDIA",
            "architecture": "Ampere (1024 CUDA + 32 Tensor Cores, 6-core ARM A78AE)",
            "status": "SIMULATED",
            "is_local": False,
            "compute_tops": 40.0,
            "memory_mb": 8192,
            "tdp_watts": 15.0,
            "cost_usd": 499.0,
            "supported_runtimes": ["tensorrt", "onnxruntime_cuda"],
            "supported_precisions": ["fp32", "fp16", "int8"],
            "telemetry_supported": False,
            "details_json": {
                "form_factor": "Embedded Module / DevKit",
                "recommended_for": "Robotics, Smart Cameras, Edge Gateways",
                "power_modes": ["7W", "15W"]
            }
        },
        {
            "id": "nvidia-jetson-agx-orin",
            "name": "NVIDIA Jetson AGX Orin (64GB)",
            "device_type": "soc",
            "vendor": "NVIDIA",
            "architecture": "Ampere (2048 CUDA + 64 Tensor Cores, 12-core ARM A78AE)",
            "status": "SIMULATED",
            "is_local": False,
            "compute_tops": 275.0,
            "memory_mb": 65536,
            "tdp_watts": 60.0,
            "cost_usd": 1999.0,
            "supported_runtimes": ["tensorrt", "onnxruntime_cuda"],
            "supported_precisions": ["fp32", "fp16", "int8"],
            "telemetry_supported": False,
            "details_json": {
                "form_factor": "Industrial Edge AI Supercomputer",
                "recommended_for": "Autonomous Vehicles, Multi-stream Video Analytics",
                "power_modes": ["15W", "30W", "50W", "60W"]
            }
        },
        {
            "id": "raspberry-pi-5",
            "name": "Raspberry Pi 5 (8GB)",
            "device_type": "soc",
            "vendor": "Raspberry Pi Foundation",
            "architecture": "ARM Cortex-A76 (Quad-core @ 2.4GHz)",
            "status": "SIMULATED",
            "is_local": False,
            "compute_tops": 0.8,
            "memory_mb": 8192,
            "tdp_watts": 12.0,
            "cost_usd": 80.0,
            "supported_runtimes": ["onnxruntime_cpu", "tflite"],
            "supported_precisions": ["fp32", "int8"],
            "telemetry_supported": False,
            "details_json": {
                "form_factor": "Single Board Computer",
                "recommended_for": "Low-cost Edge Sensing, Education, IoT Gateways",
                "power_modes": ["5W idle", "12W load"]
            }
        },
        {
            "id": "hailo-8-m2",
            "name": "Hailo-8 M.2 AI Acceleration Module",
            "device_type": "accelerator",
            "vendor": "Hailo",
            "architecture": "Hailo Structure-defined Dataflow Architecture",
            "status": "SIMULATED",
            "is_local": False,
            "compute_tops": 26.0,
            "memory_mb": 2048,
            "tdp_watts": 2.5,
            "cost_usd": 199.0,
            "supported_runtimes": ["hailo_rt"],
            "supported_precisions": ["int8"],
            "telemetry_supported": False,
            "details_json": {
                "form_factor": "M.2 Key M/B+M",
                "recommended_for": "Ultra-low Power High-FPS Computer Vision",
                "power_efficiency": "Up to 3 TOPS/W"
            }
        },
        {
            "id": "intel-npu-ultra",
            "name": "Intel Core Ultra NPU (Meteor Lake)",
            "device_type": "npu",
            "vendor": "Intel",
            "architecture": "Intel AI Boost NPU",
            "status": "SIMULATED",
            "is_local": False,
            "compute_tops": 11.5,
            "memory_mb": 4096,
            "tdp_watts": 5.0,
            "cost_usd": 350.0,
            "supported_runtimes": ["openvino"],
            "supported_precisions": ["fp16", "int8"],
            "telemetry_supported": False,
            "details_json": {
                "form_factor": "Integrated SoC NPU",
                "recommended_for": "Client AI, Background Blur, Speech Recognition"
            }
        },
        {
            "id": "qualcomm-snapdragon-x-elite",
            "name": "Qualcomm Snapdragon X Elite NPU",
            "device_type": "npu",
            "vendor": "Qualcomm",
            "architecture": "Qualcomm Hexagon NPU",
            "status": "SIMULATED",
            "is_local": False,
            "compute_tops": 45.0,
            "memory_mb": 16384,
            "tdp_watts": 15.0,
            "cost_usd": 999.0,
            "supported_runtimes": ["qnn", "onnxruntime_qnn"],
            "supported_precisions": ["fp16", "int8"],
            "telemetry_supported": False,
            "details_json": {
                "form_factor": "ARM Laptop SoC",
                "recommended_for": "On-device GenAI, Local Edge Copilot"
            }
        }
    ]

def detect_all_hardware() -> List[Dict[str, Any]]:
    devices = []
    
    # 1. Local CPU
    cpu_device = detect_cpu_info()
    devices.append(cpu_device)
    
    # 2. Local GPU
    gpu_device = detect_nvidia_gpu()
    if gpu_device:
        devices.append(gpu_device)
        
    # 3. Target Edge hardware profiles
    edge_profiles = get_edge_hardware_profiles()
    devices.extend(edge_profiles)
    
    return devices
