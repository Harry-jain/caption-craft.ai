# Backend API

## Setup

```bash
cd backend
pip install -r requirements.txt
```

## Run

```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Expects Ollama (llava:latest) at http://localhost:11434
- Expects DeepSeek R1.5B at http://localhost:11435
