# Startup Guide

## 1. Backend (Token Server)
Issues access tokens for the frontend.
```powershell
.\voice_agent\Scripts\Activate.ps1
uvicorn backend.token_server:app --reload --port 8000
```

## 2. Voice Agent
Runs the AI logic (Groq, AssemblyAI, Cartesia).
```powershell
.\voice_agent\Scripts\Activate.ps1
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
