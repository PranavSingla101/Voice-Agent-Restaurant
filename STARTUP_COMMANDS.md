# Startup Guide

## 1. Backend (Token Server)
Issues access tokens for the frontend.
```powershell
.\va\Scripts\Activate.ps1
uvicorn backend.token_server:app --reload --port 8000
```

## 2. Voice Agent
Runs the AI logic (OpenAI, AssemblyAI, Cartesia).
```powershell
.\va\Scripts\Activate.ps1
python backend/agent.py dev
```

## 3. Frontend
web interface.
```powershell
cd frontend
npm run dev
```

---
**Setup (One-time):**
```powershell
pip install -r requirements.txt
python backend/ingest.py
```
