import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from PIL import Image

def box_iou(box1: np.ndarray, box2: np.ndarray) -> float:
    """
    Calculate IoU between two boxes in [x1, y1, x2, y2] format.
    """
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
    area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])
    union = area1 + area2 - intersection
    if union <= 0:
        return 0.0
    return float(intersection / union)

def compute_ap(recalls: np.ndarray, precisions: np.ndarray) -> float:
    """
    Compute Average Precision (AP) using 101-point interpolation (COCO style).
    """
    mrec = np.concatenate(([0.0], recalls, [1.0]))
    mpre = np.concatenate(([0.0], precisions, [0.0]))
    
    # Compute the precision envelope
    for i in range(mpre.size - 1, 0, -1):
        mpre[i - 1] = np.maximum(mpre[i - 1], mpre[i])
        
    # 101-point interpolation
    recall_levels = np.linspace(0.0, 1.0, 101)
    interpolated_precisions = np.interp(recall_levels, mrec, mpre)
    return float(np.mean(interpolated_precisions))

def evaluate_detection_map(
    predictions_per_image: List[List[Dict[str, Any]]],
    ground_truth_per_image: List[List[Dict[str, Any]]],
    num_classes: int,
    iou_thresholds: Optional[List[float]] = None
) -> Dict[str, float]:
    """
    Compute real mAP@50 and mAP@50:95.
    predictions_per_image: List of detections per image.
        Each detection is {'box': [x1, y1, x2, y2], 'score': float, 'class_id': int}
    ground_truth_per_image: List of ground truths per image.
        Each gt is {'box': [x1, y1, x2, y2], 'class_id': int}
    """
    if iou_thresholds is None:
        iou_thresholds = list(np.arange(0.50, 0.96, 0.05))

    ap_per_iou = []

    for iou_thresh in iou_thresholds:
        aps_per_class = []
        for c in range(num_classes):
            all_scores = []
            all_tp = []
            total_gt = 0

            for preds, gts in zip(predictions_per_image, ground_truth_per_image):
                c_preds = [p for p in preds if p["class_id"] == c]
                c_gts = [g for g in gts if g["class_id"] == c]
                total_gt += len(c_gts)

                if not c_preds:
                    continue

                # Sort predictions by score descending
                c_preds.sort(key=lambda x: x["score"], reverse=True)
                matched_gt = set()

                for p in c_preds:
                    all_scores.append(p["score"])
                    p_box = np.array(p["box"])
                    best_iou = 0.0
                    best_gt_idx = -1

                    for idx, g in enumerate(c_gts):
                        if idx in matched_gt:
                            continue
                        g_box = np.array(g["box"])
                        iou = box_iou(p_box, g_box)
                        if iou > best_iou:
                            best_iou = iou
                            best_gt_idx = idx

                    if best_iou >= iou_thresh and best_gt_idx != -1:
                        all_tp.append(1)
                        matched_gt.add(best_gt_idx)
                    else:
                        all_tp.append(0)

            if total_gt == 0:
                continue

            if not all_scores:
                aps_per_class.append(0.0)
                continue

            # Sort by scores
            sort_indices = np.argsort(all_scores)[::-1]
            tp = np.array(all_tp)[sort_indices]
            fp = 1 - tp

            acc_tp = np.cumsum(tp)
            acc_fp = np.cumsum(fp)
            recalls = acc_tp / total_gt
            precisions = acc_tp / (acc_tp + acc_fp)

            ap = compute_ap(recalls, precisions)
            aps_per_class.append(ap)

        if aps_per_class:
            ap_per_iou.append(float(np.mean(aps_per_class)))
        else:
            ap_per_iou.append(0.0)

    map50 = ap_per_iou[0] if ap_per_iou else 0.0
    map50_95 = float(np.mean(ap_per_iou)) if ap_per_iou else 0.0

    return {
        "map50": round(map50, 4),
        "map50_95": round(map50_95, 4),
    }

def parse_yolo_annotations(
    label_path: Path, img_width: int, img_height: int
) -> List[Dict[str, Any]]:
    """
    Parse YOLO formatted text file: class x_center y_center width height
    Returns boxes in absolute pixel coordinates [x1, y1, x2, y2]
    """
    if not label_path.exists():
        return []

    boxes = []
    with open(label_path, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 5:
                class_id = int(parts[0])
                xc, yc, w, h = map(float, parts[1:5])
                x1 = (xc - w / 2.0) * img_width
                y1 = (yc - h / 2.0) * img_height
                x2 = (xc + w / 2.0) * img_width
                y2 = (yc + h / 2.0) * img_height
                boxes.append({
                    "class_id": class_id,
                    "box": [x1, y1, x2, y2]
                })
    return boxes

def parse_coco_annotations(
    coco_json_path: Path
) -> Tuple[Dict[str, List[Dict[str, Any]]], List[str]]:
    """
    Parse COCO format JSON annotations file.
    Returns:
        (image_name_to_boxes, class_names_list)
        where each box is {'class_id': int, 'box': [x1, y1, x2, y2]}
    """
    if not coco_json_path.exists():
        return {}, []

    try:
        with open(coco_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return {}, []

    categories = data.get("categories", [])
    cat_id_to_idx = {}
    class_names = []
    for idx, cat in enumerate(sorted(categories, key=lambda c: c.get("id", 0))):
        cat_id_to_idx[cat["id"]] = idx
        class_names.append(cat.get("name", f"class_{idx}"))

    img_id_to_name = {}
    for img in data.get("images", []):
        img_id_to_name[img["id"]] = Path(img.get("file_name", "")).name

    annotations_by_filename: Dict[str, List[Dict[str, Any]]] = {}
    for ann in data.get("annotations", []):
        img_id = ann.get("image_id")
        filename = img_id_to_name.get(img_id)
        if not filename:
            continue
        
        bbox = ann.get("bbox", [])
        if len(bbox) >= 4:
            x, y, w, h = bbox[:4]
            x1 = float(x)
            y1 = float(y)
            x2 = float(x + w)
            y2 = float(y + h)
            cat_id = ann.get("category_id", 0)
            class_id = cat_id_to_idx.get(cat_id, 0)

            if filename not in annotations_by_filename:
                annotations_by_filename[filename] = []
            annotations_by_filename[filename].append({
                "class_id": class_id,
                "box": [x1, y1, x2, y2]
            })

    return annotations_by_filename, class_names

def preprocess_image_for_yolo(
    image_path: Path, input_shape: Tuple[int, int] = (640, 640)
) -> Tuple[np.ndarray, float, Tuple[int, int]]:
    """
    Letterbox resizing and normalization for YOLO input.
    """
    img = Image.open(image_path).convert("RGB")
    orig_w, orig_h = img.size
    target_w, target_h = input_shape

    scale = min(target_w / orig_w, target_h / orig_h)
    new_w, new_h = int(orig_w * scale), int(orig_h * scale)
    resized_img = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

    canvas = Image.new("RGB", (target_w, target_h), (114, 114, 114))
    pad_x = (target_w - new_w) // 2
    pad_y = (target_h - new_h) // 2
    canvas.paste(resized_img, (pad_x, pad_y))

    arr = np.array(canvas, dtype=np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))  # HWC -> CHW
    arr = np.expand_dims(arr, axis=0)  # BCHW
    return arr, scale, (pad_x, pad_y)

def postprocess_yolo_output(
    output_tensor: np.ndarray,
    conf_thresh: float = 0.25,
    iou_thresh: float = 0.45,
    scale: float = 1.0,
    pad: Tuple[int, int] = (0, 0),
    orig_shape: Tuple[int, int] = (640, 640)
) -> List[Dict[str, Any]]:
    """
    Postprocess YOLO output tensor [1, 84, 8400] or [1, 8400, 84] to boxes with NMS.
    """
    preds = np.squeeze(output_tensor)
    if preds.shape[0] < preds.shape[1]:  # [84, 8400] -> transpose to [8400, 84]
        preds = preds.T

    boxes = preds[:, :4]
    scores_all = preds[:, 4:]
    class_ids = np.argmax(scores_all, axis=1)
    max_scores = np.max(scores_all, axis=1)

    mask = max_scores >= conf_thresh
    boxes = boxes[mask]
    class_ids = class_ids[mask]
    scores = max_scores[mask]

    if len(boxes) == 0:
        return []

    # Convert cx, cy, w, h on canvas back to original image coordinates
    pad_x, pad_y = pad
    x1 = (boxes[:, 0] - boxes[:, 2] / 2.0 - pad_x) / scale
    y1 = (boxes[:, 1] - boxes[:, 3] / 2.0 - pad_y) / scale
    x2 = (boxes[:, 0] + boxes[:, 2] / 2.0 - pad_x) / scale
    y2 = (boxes[:, 1] + boxes[:, 3] / 2.0 - pad_y) / scale

    orig_w, orig_h = orig_shape
    x1 = np.clip(x1, 0, orig_w)
    y1 = np.clip(y1, 0, orig_h)
    x2 = np.clip(x2, 0, orig_w)
    y2 = np.clip(y2, 0, orig_h)

    # Simple class-aware NMS
    results = []
    unique_classes = np.unique(class_ids)
    for c in unique_classes:
        c_mask = class_ids == c
        c_boxes = np.column_stack([x1[c_mask], y1[c_mask], x2[c_mask], y2[c_mask]])
        c_scores = scores[c_mask]

        indices = np.argsort(c_scores)[::-1]
        keep = []
        while len(indices) > 0:
            current = indices[0]
            keep.append(current)
            if len(indices) == 1:
                break
            ious = np.array([box_iou(c_boxes[current], c_boxes[idx]) for idx in indices[1:]])
            remaining = np.where(ious <= iou_thresh)[0]
            indices = indices[remaining + 1]

        for k in keep:
            results.append({
                "class_id": int(c),
                "score": float(c_scores[k]),
                "box": [float(c_boxes[k][0]), float(c_boxes[k][1]), float(c_boxes[k][2]), float(c_boxes[k][3])]
            })

    return results
