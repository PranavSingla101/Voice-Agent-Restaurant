---
name: Voice Agent Complete Setup Guide
overview: Complete step-by-step guide to build a voice agent with LiveKit Agents, Deepgram STT/TTS, Groq LLM, and RAG. Includes all account creation, API key setup, manual configuration, code implementation, testing, and deployment steps.
todos:
  - id: setup-accounts
    content: "Create all required accounts: LiveKit Cloud, Deepgram, Groq, Render, Vercel. Get all API keys and credentials."
    status: pending
  - id: setup-env
    content: Create .env file with all API keys and configuration values from account setup
    status: pending
    dependencies:
      - setup-accounts
  - id: prepare-docs
    content: Add company PDF documents to data/company_docs/ directory
    status: pending
  - id: fix-rag
    content: Fix backend/rag.py to handle collection existence checks and error handling
    status: pending
    dependencies:
      - setup-env
  - id: fix-ingest
    content: Fix backend/ingest.py to handle existing collections and add progress indicators
    status: pending
    dependencies:
      - fix-rag
  - id: run-ingest
    content: Run python backend/ingest.py to index company documents into ChromaDB
    status: pending
    dependencies:
      - fix-ingest
      - prepare-docs
  - id: create-token-server
    content: Create backend/token_server.py FastAPI endpoint for LiveKit token generation with CORS
    status: pending
    dependencies:
      - setup-env
  - id: rewrite-agent
    content: Rewrite backend/agent.py with proper LiveKit Agents API using AgentSession, Deepgram STT/TTS plugins, and Groq LLM integration
    status: pending
    dependencies:
      - run-ingest
  - id: update-requirements
    content: Add fastapi and uvicorn to requirements.txt if not present
    status: pending
  - id: frontend-env
    content: Create frontend/.env.local with LiveKit URL and token endpoint configuration
    status: pending
    dependencies:
      - setup-accounts
  - id: build-frontend
    content: Build frontend/app/page.tsx with LiveKit components for room connection, microphone, and audio playback
    status: pending
    dependencies:
      - frontend-env
  - id: test-locally
    content: "Test complete flow locally: start token server, agent, and frontend. Verify end-to-end conversation works."
    status: pending
    dependencies:
      - create-token-server
      - rewrite-agent
      - build-frontend
  - id: deploy-backend
    content: "Deploy backend to Render: configure service, add environment variables, deploy and verify"
    status: pending
    dependencies:
      - test-locally
  - id: deploy-frontend
    content: "Deploy frontend to Vercel: configure project, add environment variables, deploy and verify"
    status: pending
    dependencies:
      - deploy-backend
  - id: test-production
    content: "Test production deployment: verify frontend connects, agent responds, RAG works, and full conversation flow"
    status: pending
    dependencies:
      - deploy-frontend
---

# Voice Agent Complete Setup & Implementation Guide

## Architecture Overview

```
[Next.js Frontend (Vercel)]
    ↕ WebRTC (LiveKit Client SDK)
[LiveKit Cloud (WebSocket/WebRTC)]
    ↕ Agent Protocol
[Python Agent Backend (Render)]
    ├── STT: Deepgram
    ├── LLM: Groq (Llama 3)
    ├── TTS: Deepgram
    └── RAG: LlamaIndex + ChromaDB (Local)
```

---

## PHASE 1: Account Setup & API Keys (Manual Steps)

### Step 1.1: Create LiveKit Cloud Account

**Action Required:**

1. Go to https://cloud.livekit.io/
2. Click "Sign Up" or "Get Started"
3. Sign up with email or GitHub account
4. Verify your email if required

**After Account Creation:**

1. Log into LiveKit Cloud dashboard
2. Click "Create Project" or "New Project"
3. Enter project name (e.g., "voice-agent")
4. Select region closest to you
5. **IMPORTANT:** Copy these values immediately:

   - **LiveKit URL** (looks like `wss://your-project.livekit.cloud`)
   - **API Key** (found in Settings → Keys)
   - **API Secret** (found in Settings → Keys - click to reveal)

6. Save these in a secure location (you'll need them for `.env` file)

**Note:** LiveKit Cloud has a generous free tier. Check your plan limits in the dashboard.

---

### Step 1.2: Create Deepgram Account & Get API Key

**Action Required:**

1. Go to https://www.deepgram.com/
2. Click "Sign Up" or "Get Started"
3. Create account (email or Google/GitHub)
4. Verify email if required

**After Account Creation:**

1. Log into Deepgram dashboard
2. Navigate to "API Keys" section (usually in Settings or Account)
3. Click "Create API Key"
4. Give it a name (e.g., "voice-agent-stt-tts")
5. **Copy the API key immediately** (you won't see it again)
6. Save it securely

**Note:** Deepgram offers ~$200 free credit for new users, which is plenty for development and portfolio projects.

**Verify Access:**

- Check your account balance/credits in the dashboard
- Ensure STT and TTS features are enabled (should be by default)

---

### Step 1.3: Create Groq Account & Get API Key

**Action Required:**

1. Go to https://console.groq.com/
2. Click "Sign Up" or "Get Started"
3. Sign up with email or Google account
4. Verify email if required

**After Account Creation:**

1. Log into Groq Console
2. Navigate to "API Keys" section
3. Click "Create API Key"
4. Give it a name (e.g., "voice-agent-llm")
5. **Copy the API key immediately**
6. Save it securely

**Note:** Groq has a free tier with rate limits. Check limits in the dashboard.

**Verify Models Available:**

- Go to "Models" section
- Confirm access to `llama-3.1-70b-versatile` or `llama-3.1-8b-instant`
- Note the rate limits (requests per minute)

---

### Step 1.4: (Optional) Create OpenAI Account for Fallback

**Action Required:**

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to "API Keys" section
4. Click "Create new secret key"
5. Copy and save the key

**Note:** This is optional - only needed if you want OpenAI as a fallback. Groq should be sufficient for the project.

---

### Step 1.5: Create Render Account (for Backend Hosting)

**Action Required:**

1. Go to https://render.com/
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended) or email
4. Verify email if required

**After Account Creation:**

1. Connect your GitHub account (if not done during signup)
2. Go to Dashboard
3. **Note:** You'll configure deployment later, but having the account ready helps

**Note:** Render has a free tier with limitations. For production, you may need a paid plan.

---

### Step 1.6: Create Vercel Account (for Frontend Hosting)

**Action Required:**

1. Go to https://vercel.com/
2. Click "Sign Up"
3. Sign up with GitHub (recommended) or email
4. Verify email if required

**After Account Creation:**

1. Connect your GitHub account (if not done during signup)
2. Go to Dashboard
3. **Note:** You'll deploy frontend later, but having the account ready helps

**Note:** Vercel has a generous free tier perfect for Next.js apps.

---

## PHASE 2: Local Development Setup

### Step 2.1: Verify Python Environment

**Action Required:**

1. Open terminal in project directory: `C:\Users\LENOVO\Documents\project\VA`
2. Verify virtual environment exists: `dir va` (should show `va` folder)
3. Activate virtual environment:

   - **Windows CMD:** `va\Scripts\activate.bat`
   - **Windows PowerShell:** `va\Scripts\Activate.ps1`

4. Verify Python version: `python --version` (should be 3.8+)
5. Verify pip: `pip --version`

---

### Step 2.2: Update Requirements File

**Action Required:**

1. Open `requirements.txt` in your editor
2. Verify these packages are present:
   ```
   livekit-agents
   livekit
   deepgram-sdk
   llama-index
   chromadb
   python-dotenv
   openai
   groq
   fastapi
   uvicorn
   ```

3. If `fastapi` and `uvicorn` are missing, add them (needed for token server)

**Install/Update Packages:**

1. With virtual environment activated, run:
   ```
   pip install -r requirements.txt
   ```

2. Wait for installation to complete
3. Verify no errors

---

### Step 2.3: Create Environment Variables File

**Action Required:**

1. In project root (`C:\Users\LENOVO\Documents\project\VA`), open `.env` file
2. Add the following content (replace with YOUR actual keys from Phase 1):
```env
# LiveKit Configuration (from Step 1.1)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here

# Deepgram Configuration (from Step 1.2)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Groq Configuration (from Step 1.3)
GROQ_API_KEY=your_groq_api_key_here

# OpenAI Configuration (Optional - from Step 1.4)
OPENAI_API_KEY=your_openai_api_key_here

# Company Information
COMPANY_NAME=ACME Corp
```


**Important:**

- Replace ALL placeholder values with your actual keys
- Do NOT commit `.env` to git (it should be in `.gitignore`)
- Double-check all keys are correct (typos will cause connection failures)

---

### Step 2.4: Prepare Company Documents

**Action Required:**

1. Navigate to `data/company_docs/` directory
2. Replace `example.pdf` placeholder with actual PDF documents
3. You can add multiple PDFs - the system will index all of them
4. **Recommended:** Add at least one real PDF for testing (can be a company handbook, FAQ, product documentation, etc.)

**Note:** If you don't have company docs yet, you can:

- Create a simple text file with Q&A content
- Use any PDF document for testing
- The system will work with any PDF content

---

## PHASE 3: Backend Code Implementation

### Step 3.1: Fix RAG System (`backend/rag.py`)

**Current Issue:** Assumes collection exists, will crash if not created

**Implementation:**

- Add collection existence check
- Create collection if it doesn't exist
- Add error handling for empty results
- Add logging for debugging

**Code Changes:**

- Wrap collection access in try/except
- Check if collection exists before accessing
- Return empty string if no results found
- Add print/logging statements

---

### Step 3.2: Fix Document Ingestion (`backend/ingest.py`)

**Current Issue:** Will fail if collection already exists

**Implementation:**

- Check if collection exists before creating
- Handle case where collection already exists
- Add option to clear and reindex
- Add progress indicators

**Code Changes:**

- Check collection existence with try/except
- If exists, either update or clear and recreate
- Add print statements for progress
- Handle empty directory case

**Manual Action After Implementation:**

1. Run: `python backend/ingest.py`
2. Verify output shows "✅ Company knowledge indexed"
3. Check for any errors
4. If successful, ChromaDB collection is ready

---

### Step 3.3: Create Token Server (`backend/token_server.py`)

**New File to Create:**

- FastAPI application
- Endpoint: `POST /token` that generates LiveKit access tokens
- Accepts room name and participant name
- Returns signed token with proper permissions
- Handles CORS for frontend

**Implementation Details:**

- Use `livekit` SDK to generate tokens
- Token should allow: joining room, publishing audio, subscribing to audio
- Set appropriate expiration (e.g., 6 hours)
- Return JSON response with token

**Manual Action After Implementation:**

1. Start token server: `uvicorn backend.token_server:app --reload --port 8000`
2. Test endpoint: Open browser to `http://localhost:8000/docs`
3. Try POST `/token` endpoint with test data
4. Verify token is returned

---

### Step 3.4: Rewrite Agent (`backend/agent.py`)

**Current Issue:** Uses incorrect API (VoiceAssistant doesn't exist in that form)

**Implementation:**

- Use proper LiveKit Agents framework
- Implement `AgentSession` with plugins
- Configure Deepgram STT plugin
- Configure Deepgram TTS plugin
- Integrate Groq LLM
- Add RAG context retrieval
- Handle conversation flow

**Key Components:**

- Import: `from livekit.agents import AgentSession, JobContext`
- Import: `from livekit.plugins import deepgram, groq`
- Create agent entry point function
- Handle room connection
- Process user speech → STT → RAG → LLM → TTS → audio output

**Code Structure:**

- Main entry point connects to LiveKit
- Message handler calls RAG before LLM
- System prompt includes dynamic context
- Proper error handling throughout

**Manual Action After Implementation:**

1. Ensure ingest.py has been run first
2. Start agent: `python backend/agent.py`
3. Verify it connects to LiveKit (check logs)
4. Keep it running (it will wait for room connections)

---

## PHASE 4: Frontend Implementation

### Step 4.1: Create Frontend Environment File

**Action Required:**

1. Navigate to `frontend/` directory
2. Create `.env.local` file
3. Add:
```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_TOKEN_ENDPOINT=http://localhost:8000/token
```


**Important:**

- Replace `your-project.livekit.cloud` with your actual LiveKit URL
- For local dev, token endpoint is `localhost:8000`
- For production, this will be your Render backend URL

---

### Step 4.2: Build Voice Agent UI (`frontend/app/page.tsx`)

**Current State:** Default Next.js template

**Implementation:**

- Replace entire page with voice agent interface
- Use `@livekit/components-react` components
- Add "Start Conversation" button
- Implement room connection logic
- Add microphone permission handling
- Display connection status
- Add audio controls (mute, disconnect)

**Key Components to Use:**

- `PreJoin` component for initial setup
- `Room` component for active conversation
- `AudioTrack` component for agent audio playback
- `Controls` component for microphone controls

**UI Features:**

- Clean, modern design
- Connection status indicator
- Microphone button
- Disconnect button
- Loading states
- Error messages

**Manual Action After Implementation:**

1. Start frontend: `cd frontend && npm run dev`
2. Open browser to `http://localhost:3000`
3. Verify page loads without errors
4. Check browser console for any warnings

---

## PHASE 5: Local Testing

### Step 5.1: Start All Services

**Action Required (in separate terminals):**

**Terminal 1 - Token Server:**

```
cd C:\Users\LENOVO\Documents\project\VA
va\Scripts\activate
uvicorn backend.token_server:app --reload --port 8000
```

**Terminal 2 - Agent:**

```
cd C:\Users\LENOVO\Documents\project\VA
va\Scripts\activate
python backend/agent.py
```

**Terminal 3 - Frontend:**

```
cd C:\Users\LENOVO\Documents\project\VA\frontend
npm run dev
```

**Verify:**

- Token server running on port 8000
- Agent connected to LiveKit (check logs)
- Frontend running on port 3000

---

### Step 5.2: Test End-to-End Flow

**Manual Testing Steps:**

1. Open browser to `http://localhost:3000`
2. Click "Start Conversation" button
3. Grant microphone permission when prompted
4. Speak into microphone: "What is your company's return policy?"
5. Wait for agent response (should hear audio)
6. Continue conversation
7. Test disconnect button

**Expected Behavior:**

- Frontend connects to LiveKit room
- Agent joins room automatically
- Your speech is transcribed (STT)
- Agent searches RAG knowledge base
- Agent responds using LLM with context
- You hear agent's voice response (TTS)

**Troubleshooting:**

- Check browser console for errors
- Check token server logs
- Check agent logs
- Verify all API keys are correct in `.env`
- Ensure microphone permissions granted

---

## PHASE 6: Deployment Setup

### Step 6.1: Prepare Backend for Render

**Action Required:**

1. Create `render.yaml` in project root (optional, for Render dashboard config)
2. Create `Procfile` or `start.sh` for Render:

   - Should start both token server and agent
   - Or use separate services

**Render Configuration:**

- Service Type: Web Service
- Build Command: `pip install -r requirements.txt`
- Start Command: `python backend/agent.py` (or use process manager)
- Environment Variables: Add all from `.env` file
- Port: Set to 8000 (or configure as needed)

**Manual Actions:**

1. Push code to GitHub repository
2. In Render dashboard, click "New Web Service"
3. Connect GitHub repository
4. Configure build and start commands
5. Add all environment variables from `.env`
6. Deploy

**Note:** You may need separate Render services for token server and agent, or use a process manager like `supervisord`.

---

### Step 6.2: Deploy Frontend to Vercel

**Action Required:**

1. Push frontend code to GitHub (can be same repo or separate)
2. In Vercel dashboard, click "Add New Project"
3. Import GitHub repository
4. Configure:

   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`

**Environment Variables in Vercel:**

- `NEXT_PUBLIC_LIVEKIT_URL`: Your LiveKit Cloud URL
- `NEXT_PUBLIC_TOKEN_ENDPOINT`: Your Render backend URL (e.g., `https://your-app.onrender.com/token`)

**Manual Actions:**

1. Add environment variables in Vercel dashboard
2. Deploy
3. Get deployment URL
4. Update token endpoint if needed

---

### Step 6.3: Update Frontend Environment for Production

**Action Required:**

1. In `frontend/.env.local`, update:
   ```
   NEXT_PUBLIC_TOKEN_ENDPOINT=https://your-render-app.onrender.com/token
   ```

2. Redeploy frontend (or Vercel will auto-deploy)

---

## PHASE 7: Final Verification

### Step 7.1: Production Testing

**Manual Actions:**

1. Open deployed Vercel frontend URL
2. Test full conversation flow
3. Verify agent responds correctly
4. Check that RAG context is being used
5. Test error handling (disconnect, network issues)

---

### Step 7.2: Monitor & Debug

**Check:**

- Render logs for backend errors
- Vercel logs for frontend errors
- LiveKit Cloud dashboard for room activity
- Deepgram dashboard for usage/credits
- Groq dashboard for API usage

---

## File Structure Summary

```
VA/
├── backend/
│   ├── agent.py          # Main agent (LiveKit Agents)
│   ├── rag.py            # RAG search functionality
│   ├── ingest.py         # Document indexing
│   ├── token_server.py   # FastAPI token endpoint
│   └── __init__.py       # Make it a package
├── frontend/
│   ├── app/
│   │   ├── page.tsx      # Voice agent UI
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Styles
│   ├── .env.local        # Frontend env vars
│   └── package.json      # Dependencies
├── data/
│   └── company_docs/     # PDF documents
├── va/                   # Python virtual environment
├── .env                  # Backend env vars (NOT in git)
├── requirements.txt      # Python dependencies
└── README.md             # Setup instructions
```

---

## Critical Manual Actions Checklist

- [ ] Create LiveKit Cloud account, get URL/API Key/Secret
- [ ] Create Deepgram account, get API key
- [ ] Create Groq account, get API key
- [ ] (Optional) Create OpenAI account, get API key
- [ ] Create Render account
- [ ] Create Vercel account
- [ ] Fill `.env` file with all API keys
- [ ] Add company PDFs to `data/company_docs/`
- [ ] Run `python backend/ingest.py` to index documents
- [ ] Test locally: token server + agent + frontend
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Update frontend env vars with production URLs
- [ ] Test production deployment

---

## Troubleshooting Common Issues

**Agent won't connect:**

- Verify LiveKit URL, API Key, and Secret are correct
- Check agent logs for connection errors
- Ensure LiveKit Cloud project is active

**No audio/STT not working:**

- Verify Deepgram API key is correct
- Check Deepgram account has credits
- Verify microphone permissions in browser

**LLM not responding:**

- Verify Groq API key is correct
- Check Groq rate limits (may need to wait)
- Check agent logs for LLM errors

**RAG not finding context:**

- Ensure `ingest.py` was run successfully
- Check ChromaDB collection exists
- Verify PDFs are in `data/company_docs/`

**Frontend can't get token:**

- Verify token server is running
- Check CORS settings
- Verify token endpoint URL is correct