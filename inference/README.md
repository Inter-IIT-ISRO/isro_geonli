# ISRO GeoNLI - Inference Engines

This directory contains the Python-based inference servers for the Visual Language Models (VLM) and Segmentation models.

## 📂 File Structure

```text
inference/
├── qwen/                      # Qwen-VL Model Service
│   ├── app.py                 # FastAPI server
│   ├── qwen_model.py          # Model class wrapper
│   ├── Dockerfile
│   └── requirements.txt
└── sam3/                      # SAM3 Segmentation Service
    ├── app.py                 # FastAPI server
    ├── sam3_model.py          # Model class wrapper
    ├── Dockerfile
    └── requirements.txt
