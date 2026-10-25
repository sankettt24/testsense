# Self-Learning QA Test Data AI Agent & Unified Platform

Powered by the **Google ADK (Agent Development Kit)**, this Self-Learning QA AI Agent acts as an intelligent, central bridge between plain-English natural language requests from QA testers, developers, and product teams to automated backend API collections, CI/CD test pipelines, and a vector-embedded feature intelligence knowledge base.

---

## 📌 Executive Summary & Multi-Team Architecture

Preparing test data, executing BDV (Build Verification Testing), mocking order APIs, and triggering mobile automation across cloud devices traditionally takes **15–30 minutes per test cycle**. QA testers across multiple platform teams manually search for Web IDs, manage separate Postman collections, run log verifications, and trigger device tests.

This **Self-Learning QA AI Agent & Unified Platform** centralizes QA workflows across **MCOM (Site & App)** and **BCOM (Bloomingdale's)**, converting plain-English requests into automated API collection calls, extracting **Request IDs**, verifying logs against **Sentinel**, and orchestrating pipeline runs on **LambdaTest (~80 mobile devices)**—reducing setup and execution time to **<10 seconds**.

### Platform & Team Breakdown

```
                         ┌─────────────────────────────────────────┐
                         │   Unified QA Test Data & AI Platform    │
                         └────────────────────┬────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│    MCOM Site     │                 │     MCOM App     │                 │  BCOM (Blooming) │
├──────────────────┤                 ├──────────────────┤                 ├──────────────────┤
│ • Shared Test    │                 │ • Shared Test    │                 │ • Isolated Test  │
│   Data with App  │                 │   Data with Site │                 │   Data & Cards   │
│ • MCOM API Coll. │                 │ • MCOM API Coll. │                 │ • BCOM API Coll. │
│ • MCOM Order Mock│                 │ • MCOM Order Mock│                 │ • BCOM Order Mock│
│ • Trans / Non-   │                 │ • Trans / Non-   │                 │ • Trans / Non-   │
│   Trans BDV      │                 │   Trans BDV      │                 │   Trans BDV      │
└──────────────────┘                 └──────────────────┘                 └──────────────────┘
```

* **MCOM Site & App Teams**: Share unified core test data (Web IDs, Sandbox Cards, Shipping/Billing Addresses, SUPC/PZO offers), with platform-specific execution targets.
* **BCOM (Bloomingdale's) Team**: Uses isolated, BCOM-specific test data sets (B-Money, Bloomingdale's card credentials, BCOM PDP Web IDs, and distinct API collections).

---

## 💡 Key Platform Capabilities

### 1. Instant Multi-Brand Data Retrieval
Automatically retrieves verified Sandbox Cards (Visa, Mastercard, Macy's Loyalty, Prop Gold, Prop Platinum, BCOM cards) and Web IDs for requested product categories (`SHIP`, `BOPS`, `BOSS`, `GWP`, `VGC`, `EGC`, `2 TIER`, `PWP`, `3P`, `BT`, `LTL`, `WNM`).

### 2. Automated API Collections & Order Mocking
Executes real-time backend API endpoints and collection suites:
* **M/BMoney Add**: Fund target email accounts (`/mbmoneycard/add`).
* **Star Money Setup**: Load reward dollars onto loyalty cards (`/loyalty/setup`).
* **SUPC Offers & Campaigns**: Add SUPC offer codes (`/offer/addOffers`) and configure campaigns (`/campaign/setup`).
* **Order Mocking Collections**: Dedicated isolated collections for **BCOM** and **MCOM** to mock order creation, checkout validation, and payment processing payloads.

### 3. BDV (Build Verification Testing) & Sentinel Log Verification
Automates Build Verification Testing (BDV) workflows across transactional and non-transactional channels:
* **Transactional (Trans) Collections**: Separate collections for BCOM Trans and MCOM Trans.
* **Non-Transactional (Non-Trans) Collections**: Separate collections for BCOM Non-Trans and MCOM Non-Trans.
* **Sentinel Log Verification**: The agent triggers the requested collection, extracts the returned **Request ID**, and automatically queries the **Sentinel Platform** to verify transaction logs and confirm build stability.

### 4. Pipeline & LambdaTest Multi-Device Execution (~80 Devices)
Direct natural language triggers for **GitLab CI/CD Pipelines** and **LambdaTest** execution across a shared pool of **~80 real devices**:
* **Supported Mobile Teams**: **BCOM iOS**, **MCOM iOS**, **MCOM Android**.
* **Workflow**: Parses target platform (`BCOM iOS`, `MCOM iOS`, `MCOM Android`), Git branch (`e.g. spatil`), environment (`e.g. mcom-170`), and device model to trigger automation suites seamlessly.

**Example Pipeline Prompt:**
> *"Trigger the BDV Trans pipeline for MCOM iOS using branch spatil in environment mcom-170 on LambdaTest"*

### 5. Team-Level Feature Intelligence & Vector Ingestion Dashboard
Centralized feature knowledge base covering **all platforms** (BCOM, MCOM Site, MCOM App):
* **Historical Feature Repository**: Stores historical feature specs, visual assets (screenshots, video recordings), acceptance criteria (AC), and edge-case test scenarios.
* **Team-Level Ingestion Dashboard**: Dedicated dashboard equipped with team-level access control and data management. 
  - **MCOM Team**: Can add, update, or delete feature specs, ACs, and visual assets specifically for MCOM Site and App.
  - **BCOM Team**: Can independently manage feature data specifically for BCOM.
  - **Vector Chunking**: Converts uploaded feature specifications into optimal text chunks and vector embeddings stored in the vector database for fast, accurate natural language queries.

**Example Prompts:**
> *"I want to add M-Money in this account sanket123@gmail.com"*  
> *"Generate the SUPC code"*  
> *"Add Star Money reward dollars to card 6035340001257605"*

### 3. Continuous Learning (Shared Knowledge Base)
Any team (QA, Dev, Product) can push new Web IDs, SUPC codes, or test cards via a single API, updating the AI's memory instantly without redeploying code.

### 4. New Feature Intelligence Capability
Onshore Product and Development teams can upload new feature specifications directly to the AI knowledge base, including:
* Feature Description & Business Requirements
* Expected Behavior & Acceptance Criteria
* Test Scenarios & Edge Cases to Cover
* Known Limitations & Visual Assets (Screenshots / Recordings)

**Example QA Prompts for Feature Intelligence:**
> *"What is the expected behavior for Feature X?"*  
> *"Generate test scenarios for the new loyalty enhancement."*  
> *"Show me how new ABD looks like in new feature."*

---

## 🛡️ Security Layer & Data Leakage Protections

The agent incorporates multi-layered security guardrails directly into `agent.py`:

1. **Anti-Prompt Poisoning Defense**:
   - Every input string passed to tools is pre-scanned using regex pattern matching (`_check_prompt_injection()`).
   - Automatically blocks prompt injection attacks, system prompt extraction attempts, jailbreaks (DAN mode), script tags (`<script>`), and command injection payloads before tool invocation.

2. **Internal API Key & Secret Redaction**:
   - Tool execution results pass through an automated masking engine (`_mask_secrets()`).
   - All internal API keys (`x-macys-apikey`), secret bearer tokens, private authorization headers, and corporate secrets are automatically scrubbed and replaced with `[REDACTED_API_KEY]` before being returned to the user interface.

3. **Hardened System Guardrails**:
   - System prompt instructions strictly forbid the LLM from outputting internal system rules, environment secrets, or private corporate API keys even if explicitly requested by a user prompt.

---

## 🔮 Upcoming Features (Roadmap / To Be Added)

1. **Mocking the Order API**:
   * Automated generation of mocked response payloads for order creation, checkout validation, and payment processing endpoints for isolated offline testing.

2. **Pipeline Triggering in LambdaTest**:
   * Direct natural language triggers to execute cross-browser and mobile automation test suites on **LambdaTest** by inspecting available execution instances.
   * **Example Prompt:**
     > *"Trigger the pipeline for PDP using branch spatil and add the parameters for MCOM iOS in environment mcom-170"*
   * **Workflow:** The agent inspects available LambdaTest instances, validates requested target parameters (`feature=PDP`, `branch=spatil`, `channel=MCOM iOS`, `environment=mcom-170`), and automatically triggers the test pipeline.

3. **New Feature Knowledge & Data Ingestion System**:
   * Real-time knowledge ingestion pipeline allowing product managers, developers, and QA engineers to upload feature specs, acceptance criteria, test coverage guidelines, and visual reference assets (screenshots & video recordings).

---

## 📈 Quantifiable Benefits

* **Time Savings**: Reduces test data setup and BDV log verification from **30 minutes to <10 seconds**.
* **80-Device Orchestration**: Instant automated execution across LambdaTest device fleets for BCOM iOS, MCOM iOS, and MCOM Android.
* **Sentinel Log Automation**: Automated Request ID extraction and Sentinel log verification.
* **Team-Isolated Feature Intelligence**: Team-partitioned Vector Ingestion Dashboard for BCOM, MCOM Site, and MCOM App features.

---

## 📁 Project Structure

```
qa_ai_agent/
├── multi_tool_agent/
│   └── agent.py          # ADK Agent definition, tool functions, security layer, and parameter validation
├── server.py             # FastAPI REST API wrapper for cloud deployment (Render, Vercel, Cloud Run)
├── vercel.json           # Vercel serverless configuration
├── render.yaml           # Render web service configuration
├── requirements.txt      # Python package dependencies (google-adk, requests, aiohttp, urllib3, fastapi, uvicorn)
└── README.md             # Complete project setup and feature documentation
```

---

## ⚙️ Available Agent Tools & Parameters

The agent automatically validates input parameters before triggering any tool or API endpoint.

| Tool Name | Endpoint / Function | Required Parameters | Optional Parameters & Defaults | Description |
|---|---|---|---|---|
| `add_m_money` | `POST /loyaltyautomation/mbmoneycard/add` | `email` | `amount="30"`, `environment="mcom-131"`, `no_of_cards="4"` | Adds M-Money (Macy's Money) or B-Money (Bloomingdale's Money) gift cards to user profile |
| `setup_star_money` | `POST /loyaltyautomation/loyalty/setup` | `card_number` | `reward_money="10"` | Adds Star Money rewards to Macy's loyalty card (MCOM channel only) |
| `get_supc_details` | `GET /promotions/supc/416870` | None | `environment="mcom-170"` | Fetches promotion details for SUPC offer code |
| `get_pzo_details` | `GET /promotions/supc/19932757` | None | `environment="mcom-170"` | Fetches promotion details for PZO offer code |
| `fetch_qa_test_data` | Internal Knowledge Base | `category` | None | Retrieves Web IDs, Zip codes, Credit Cards, Gift Cards, Addresses, etc. |

---

## 📚 QA Knowledge Base Categories

When calling `fetch_qa_test_data`, the following categories can be queried:

* **Web IDs / Product PDPs**: `SHIP`, `BOPS`, `BOSS`, `GWP`, `VGC`, `EGC`, `2 TIER`, `PWP`, `3P`, `COLOR & SIZE PDP`, `CHANEL PDP`, `BT`, `LTL`, `WNM`
* **Payment & Loyalty**: `CREDIT CARDS`, `MACY'S CARDS` (Prop Gold, Prop Platinum, Amex, Amex BT), `PAYPAL`, `GIFT CARDS` (with Card Number, CID, Amount), `SANDBOX CARDS`
* **Addresses**: `ADDRESS`, `SHIPPING ADDRESS`

---

## 🛠️ Prerequisites & Installation

1. **Python 3.10+** installed.
2. Install project dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and set your `GOOGLE_API_KEY`:
   ```bash
   cp .env.example .env
   ```
   Or set it directly in your terminal:
   ```bash
   export GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY_HERE"
   ```

---

## 🚀 Running the Agent

Make sure your working directory is the `qa_ai_agent` root folder:

```bash
cd /path/to/qa_ai_agent
```

### 1. Interactive Terminal Mode
```bash
adk run multi_tool_agent
```

### 3. FastAPI Web Server & Web UI Mode
```bash
python3 server.py
```
* Serves the REST API (`/run`, `/apps/.../sessions`) and interactive Web UI at `http://localhost:8000/app` (or `http://localhost:8000/`).

### 4. Session Persistence & Multi-Chat History
The platform includes built-in persistent session management:
* **Refresh Resilience**: When users refresh the page, the active session and full chat history (messages, tool calls, execution outputs) are automatically restored without loss of context.
* **Multi-Chat Switching**: Users can view all previous conversations in the sidebar's **Chat History** list, click any session to immediately switch between them, and resume context with the agent.
* **Auto-Titled Sessions**: Sessions are automatically and smartly named based on the user's initial prompt.
* **Session Lifecycle**: Easily start a fresh conversation with **+ New Chat** (available in the header and sidebar), copy the Session ID, or delete old sessions.
* **Hybrid Storage**: Synchronized between browser `localStorage` and server-backed persistence (`sessions_store.json`), supporting multi-user isolation by User Identifier.

---

## 🌐 Cloud Hosting & Deployment Guide

This Google ADK agent includes all required configuration files (`server.py`, `Dockerfile`, `render.yaml`, `vercel.json`) to deploy to any cloud platform.

### Option 1: Google Cloud Run (Recommended for Production & Free Tier)

Google Cloud Run is a serverless platform that automatically scales to zero when idle (100% free for typical QA usage).

```bash
cd qa_ai_agent

gcloud run deploy testsense-qa-agent \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"
```

* **Live Web UI**: `https://<YOUR-CLOUD-RUN-URL>/app`
* **Live REST API**: `https://<YOUR-CLOUD-RUN-URL>/run`

---

### Option 2: Render (Free Managed Cloud Hosting)

1. Push your code to GitHub / GitLab.
2. Create a new **Web Service** on [Render.com](https://dashboard.render.com/).
3. Connect your repository and select `qa_ai_agent` as the root directory.
4. Render will automatically build using [`render.yaml`](file:///Users/2457196/Desktop/gemi/qa_ai_agent/render.yaml) or use:
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `python3 server.py`
5. Add `GOOGLE_API_KEY` under **Environment Variables**.

---

### Option 3: Docker Container / VM / AWS EC2 / DigitalOcean

#### 1. Build Docker Image:
```bash
docker build -t testsense-qa-agent .
```

#### 2. Run Docker Container:
```bash
docker run -d \
  -p 8080:8080 \
  -e GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY" \
  --name testsense-agent \
  testsense-qa-agent
```
* **Web UI URL**: `http://<YOUR_VM_IP>:8080/app`

---

### Option 4: Vercel Serverless Functions

Deploy as a serverless function using Vercel CLI:

```bash
vercel
```
* Set `GOOGLE_API_KEY` under Vercel Project Settings $\rightarrow$ Environment Variables.

---

## 🔒 SSL & Corporate Proxy Note

`agent.py` automatically patches `ssl`, `aiohttp`, and `urllib3` to bypass SSL verification errors (`verify=False`) when firing requests through corporate proxy networks.

