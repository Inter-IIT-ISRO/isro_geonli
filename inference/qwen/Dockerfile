FROM pytorch/pytorch:2.9.0-cuda12.6-cudnn9-devel

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    "unsloth @ git+https://github.com/unslothai/unsloth.git" \
    "unsloth_zoo" \
    "bitsandbytes" \
    "transformers" \
    "fastapi" \
    "uvicorn[standard]" \
    "gunicorn" \
    "Pillow" \
    "httpx" \
    "huggingface_hub" \
    "peft" \
    "accelerate" && \
    pip install --no-deps trl==0.22.2

COPY . .

EXPOSE 3000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "3000", "--workers", "1"]