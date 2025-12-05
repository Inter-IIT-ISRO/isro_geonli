# Deployment Guide

## Prerequisites:

1. `python` 3.10+
1. `git` installed
1. `docker` and `docker-compose` installed
1. `OS`: Linux
1. Minimum GPU required: T4 with 15 GB VRAM

**NO EXTERNAL API USED** and no dependency conflicts because of docker.

## 1. Deploying using a single script:

Follow these steps to spawn the whole setup with a single file:

1. Change the working directory to `deployment`:
```bash
cd deployment
```
2. Run the `deploy-all.sh` script to spin up the whole setup:
```bash
./deploy-all.sh
```
3.  **Select Option 1** (Single Machine).
4.  The script will automatically:
    * Detect your IP address.
    * Download necessary models (Qwen, SAM3, BERT) if missing.
    * Build Docker containers for all services.
    * Start the application.
5.  Access the app at: `http://<YOUR_IP>:5173`

If this couldn't work, move to next method.

## 2. Distributed Deployment (Inference in GPU)
Use this if you have a separate server for Inference (GPU) and a lightweight server for the Web App.

1. Change the working directory to `deployment`:
```bash
cd deployment
```
2.  **On the Web Server (No GPU):**
    * Run `./deployment.sh` and **Select Option 2** (Core Only).
    * Enter the IP address and ports of your GPU machine when prompted.
3.  **On the GPU Machine (Inference Node):**
    * Run `./start-inference-node.sh`.
    * This script downloads models and starts the Docker containers for Qwen and SAM3 on ports 3000 and 8000.
4. Access the frontend at port 5173


## Limitation:
Only 1 user can use the platform at a time because of the GPU resource limitation. But it is scalable to much larger scale if GPU is available.

