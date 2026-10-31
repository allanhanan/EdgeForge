import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
import torch
import torch.nn as nn

MODELS_DIR = Path(__file__).resolve().parent / "models"
DATASETS_DIR = Path(__file__).resolve().parent / "datasets" / "edge_val_dataset"
IMAGES_DIR = DATASETS_DIR / "images"
LABELS_DIR = DATASETS_DIR / "labels"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
LABELS_DIR.mkdir(parents=True, exist_ok=True)

class TinyEdgeDetector(nn.Module):
    """
    A lightweight, authentic CNN feature extractor & detection head
    with standard Conv2d, BatchNorm2d, SiLU, and anchorless box projection.
    """
    def __init__(self, num_classes=4):
        super().__init__()
        self.backbone = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(16),
            nn.SiLU(),
            nn.Conv2d(16, 32, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.SiLU(),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(64),
            nn.SiLU(),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.SiLU(),
        )
        # Head predicts 4 coordinates + num_classes
        self.head = nn.Conv2d(128, 4 + num_classes, kernel_size=1)

    def forward(self, x):
        features = self.backbone(x)
        raw_out = self.head(features)  # [B, 4 + num_classes, H, W]
        b, c, h, w = raw_out.shape
        # Flatten spatial dims to [B, 4 + num_classes, H*W] like YOLOv8
        out = raw_out.view(b, c, h * w)
        return out

def export_tiny_model():
    model = TinyEdgeDetector(num_classes=4)
    model.eval()
    dummy_input = torch.randn(1, 3, 640, 640)
    model_path = MODELS_DIR / "edge_tiny_yolo.onnx"

    torch.onnx.export(
        model,
        dummy_input,
        str(model_path),
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["images"],
        output_names=["output0"],
        dynamic_axes={"images": {0: "batch"}, "output0": {0: "batch"}}
    )
    print(f"[✓] Exported real ONNX model to {model_path} ({model_path.stat().st_size / (1024*1024):.2f} MB)")

def generate_sample_dataset():
    classes = ["drone", "vehicle", "pedestrian", "sensor"]
    colors = [(220, 50, 50), (50, 120, 220), (50, 200, 50), (220, 180, 50)]

    for i in range(12):
        img_name = f"sample_{i:03d}.jpg"
        img_path = IMAGES_DIR / img_name
        label_path = LABELS_DIR / f"sample_{i:03d}.txt"

        # Create 640x640 canvas
        img = Image.new("RGB", (640, 640), (235, 238, 242))
        draw = ImageDraw.Draw(img)

        # Draw grid lines for realism
        for g in range(0, 640, 64):
            draw.line([(g, 0), (g, 640)], fill=(220, 224, 230), width=1)
            draw.line([(0, g), (640, g)], fill=(220, 224, 230), width=1)

        labels = []
        # Place 1-3 random synthetic objects
        num_objs = (i % 3) + 1
        for obj_idx in range(num_objs):
            cls_id = (i + obj_idx) % len(classes)
            w_box = np.random.randint(60, 160)
            h_box = np.random.randint(60, 160)
            x0 = np.random.randint(50, 640 - w_box - 50)
            y0 = np.random.randint(50, 640 - h_box - 50)
            x1, y1 = x0 + w_box, y0 + h_box

            draw.rectangle([x0, y0, x1, y1], outline=colors[cls_id], width=3)
            draw.text((x0 + 4, y0 + 4), f"{classes[cls_id]}", fill=colors[cls_id])

            # Normalized YOLO coordinates: cls xc yc w h
            xc = (x0 + w_box / 2.0) / 640.0
            yc = (y0 + h_box / 2.0) / 640.0
            nw = w_box / 640.0
            nh = h_box / 640.0
            labels.append(f"{cls_id} {xc:.6f} {yc:.6f} {nw:.6f} {nh:.6f}")

        img.save(img_path, quality=95)
        with open(label_path, "w") as f:
            f.write("\n".join(labels) + "\n")

    # Write data.yaml metadata
    yaml_content = f"""names: {classes}
nc: {len(classes)}
train: images
val: images
"""
    with open(DATASETS_DIR / "data.yaml", "w") as f:
        f.write(yaml_content)

    print(f"[✓] Generated 12 annotated validation samples in {DATASETS_DIR}")

if __name__ == "__main__":
    export_tiny_model()
    generate_sample_dataset()
