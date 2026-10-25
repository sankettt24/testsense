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
├── chroma_db/            # Persistent ChromaDB vector store (SQLite + HNSW cosine index)
├── multi_tool_agent/
│   ├── .env              # Environment secrets (GOOGLE_API_KEY)
│   └── agent.py          # ADK Agent definition, tool functions, security layer, and parameter validation
├── frontend/             # Dark-mode glassmorphic QA Web UI
│   ├── index.html        # Unified Chat & ChromaDB Vector Ingestion Dashboard
│   ├── style.css         # Modern styling, interactive media chips, and modal dialogs
│   ├── app.js            # Frontend logic, multi-session management, and ChromaDB explorer
│   └── logo.png          # TestSense AI application logo
├── rag_service.py        # ChromaDB vector store, specialized chunking, embeddings & hybrid search
├── rag_vector_store.json # Initial cold-start seed dataset (cards, Web IDs, and feature specs)
├── sessions_store.json   # Server-backed persistent JSON session database
├── server.py             # FastAPI REST API wrapper for cloud deployment (Render, Vercel, Cloud Run)
├── vercel.json           # Vercel serverless configuration
├── render.yaml           # Render web service configuration
├── Dockerfile            # Container configuration for Cloud Run / Docker deployments
├── requirements.txt      # Python dependencies (google-adk, chromadb, fastapi, uvicorn, etc.)
└── README.md             # Complete project setup and architecture documentation
```

---

## 🧠 ChromaDB RAG Vector Store & Feature Ingestion Architecture

The platform integrates a persistent **Retrieval-Augmented Generation (RAG)** architecture using **ChromaDB** to supply the AI Agent with up-to-date QA payment cards, Web IDs, test data, and feature intelligence without requiring model fine-tuning or code redeployments.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                       DATA INGESTION PIPELINE (RAG)                            │
└────────────────────────────────────────────────────────────────────────────────┘
       │                                 │                                 │
       ▼                                 ▼                                 ▼
 ┌───────────┐                     ┌───────────┐                     ┌───────────┐
 │ QA Cards  │                     │  Web IDs  │                     │  Feature  │
 │  & CVVs   │                     │ & TestData│                     │   Specs   │
 └─────┬─────┘                     └─────┬─────┘                     └─────┬─────┘
       │                                 │                                 │
       ▼                                 ▼                                 ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │               Specialized Chunking Engine (rag_service.py)                    │
 │   • Cards: chunk_card_item()     • Test Data: chunk_test_data_item()          │
 │   • Features: chunk_feature_item() (with Video & Screenshot URLs)             │
 └───────────────────────────────────────┬───────────────────────────────────────┘
                                         │
                                         ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │                    Embedding Vectorization Engine                             │
 │   • Model: Google GenAI gemini-embedding-001 (or 256-dim token fallback)     │
 │   • Output: 768 Dimensions (L2-Normalized for Cosine Stability)               │
 └───────────────────────────────────────┬───────────────────────────────────────┘
                                         │
                                         ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │                   ChromaDB Persistent Vector Store                            │
 │   • Storage Path: ./chroma_db (SQLite + HNSW Index)                           │
 │   • Collection: qa_knowledge_base | Metric: hnsw:space = cosine               │
 │   • Metadata: Flattened primitives + _full_meta_json (Lossless Roundtrip)     │
 └───────────────────────────────────────┬───────────────────────────────────────┘
                                         │
                                         ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │                     Hybrid Vector Search & Retrieval                          │
 │   • ChromaDB Cosine Distance Query + Exact Keyword / ID Overlap Boosting      │
 │   • Consumed by: fetch_qa_test_data & query_feature_knowledge Agent Tools     │
 └───────────────────────────────────────────────────────────────────────────────┘
```

### 1. Vector Database & Storage Engine
* **Technology**: **ChromaDB** initialized via `chromadb.PersistentClient(path="./chroma_db")`.
* **Collection Name**: `qa_knowledge_base`.
* **Distance Metric**: **Cosine Distance** (`metadata={"hnsw:space": "cosine"}`).
* **Cold-Start Auto-Migration**: If the vector store is empty on startup, it automatically loads and vectorizes the 43 initial seed records from `rag_vector_store.json` (19 cards, 21 test data items, 3 rich feature specifications).

### 2. Embedding Model & Vector Dimensions
* **Primary Embedding Model**: **Google GenAI `gemini-embedding-001`** accessed via the official `google.genai` SDK.
* **Vector Dimensions**: **768 Dimensions**. Every generated vector is $L_2$-normalized ($\|v\|_2 = 1.0$) to guarantee stability under cosine distance operations.
* **Fallback / Offline Vectorizer**: Deterministic token n-gram dense vectorizer generating normalized **256 Dimensions**. This ensures the agent functions reliably offline or in corporate proxy networks without HuggingFace SSL certificate blockages.
* **Custom Embedding Function**: Built as `GeminiChromaEmbeddingFunction(EmbeddingFunction)` in `rag_service.py`. This completely bypasses Chroma's default `ONNXMiniLM_L6_V2` model download, resolving corporate SSL proxy intercept issues.

### 3. Knowledge Base Structure (Entity Types)
The RAG database categorizes documents into three distinct entity types:

| Entity Type | Identifier | Schema & Attributes | Example Data |
|---|---|---|---|
| **Payment & Test Cards** | `card` | `card_type`, `card_number`, `cid`, `exp`, `amount`, `address`, `notes` | Prop Gold, Prop Platinum, Macy's Amex BT, Gift Cards ($20–$300), Sandbox Cards |
| **QA Test Data & Web IDs** | `test_data` | `category`, `product_id` (Web ID), `product_name`, `zip_code`, `description` | BOPS (86800), BOSS (8790118), SHIP (13638432), GWP (1494), Chanel Luxury PDP |
| **Feature Specifications** | `feature` | `name`, `platform`, `expected`, `issues` (edge cases), `observe` (AC), `image_url`, `video_url` | BOPS Store Fulfillment, Star Money Rewards, M/B-Money Customer Funding |

### 4. Specialized Chunking & Ingestion Pipeline
Raw inputs are transformed through specialized chunking functions before vectorization:

1. **Card Chunking (`chunk_card_item`)**:
   - Isolates sensitive payment fields, structures CVV, expiration date, and billing address.
   - Appends contextual search keywords (e.g. `Prop Gold card number payment test card sandbox credit debit prop 6035340000050209`).
2. **Feature Chunking (`chunk_feature_item`)**:
   - Generates structured sections for `Feature Name`, `Platform Target`, `Expected Behavior & Business Requirements`, `Potential Edge Cases & Failure Modes`, and `Things to Observe (Acceptance Criteria)`.
   - Embeds direct links for video walkthroughs (`.mp4`, YouTube) and screenshot images (`.jpg`, `.png`).
3. **Test Data Chunking (`chunk_test_data_item`)**:
   - Formats order category (`BOPS`, `BOSS`, `SHIP`, `GWP`), Web ID, product name, and zip code.
4. **Metadata Flattening & Lossless Roundtrip**:
   - ChromaDB strictly enforces primitive types (`str`, `int`, `float`, `bool`) in its metadata dictionaries.
   - `to_chroma_metadata()` extracts flat fields for ChromaDB indexing and serializes the complete nested dictionary into `_full_meta_json`.
   - `from_chroma_doc()` deserializes `_full_meta_json` on retrieval, ensuring 100% data fidelity with zero attribute loss.

### 5. Hybrid Retrieval & Search Scoring
When an agent or user queries the RAG store:
1. An embedding vector is computed for the query string.
2. ChromaDB queries top candidates using cosine distance ($d \in [0, 2]$).
3. Cosine similarity is computed as $S_{\text{semantic}} = \max(0.0, 1.0 - d)$.
4. **Keyword & Identifier Boosting**:
   - **Exact Card / Web ID Match**: $+0.40$ boost if the exact number or ID is present.
   - **Exact Category / Platform Match**: $+0.25$ boost if category (e.g., `BOPS`, `Prop Gold`) matches.
   - **Keyword Hits**: Scaled up to $+0.35$ based on token overlap.
5. Total score: $S_{\text{total}} = \min(1.0, 0.65 \times S_{\text{semantic}} + S_{\text{keyword}} + S_{\text{id\_boost}})$.

### 6. Dashboard Data Breakdown & Selective Deletion
The interactive **RAG Knowledge Dashboard** at `/app` provides complete transparency and granular control:
* **"What's in ChromaDB?" Breakdown Tags**:
  - Displays dynamic item counts across **Categories** (`BOPS`, `BOSS`, `SHIP`, `GWP`, `3P`, `BT`, `LTL`, etc.), **Card Types** (`Prop Gold`, `Platinum`, `Amex`, `Gift Cards`), and **Platforms** (`MCOM`, `BCOM`).
  - **Click-to-Filter**: Clicking any tag instantly filters the documents explorer to inspect only matching items.
* **Selective Deletion (No "Delete All" Accidents)**:
  - Each vectorized card has an individual selection checkbox.
  - A floating selection toolbar displays `X Selected`, `Select All Visible`, `Deselect All`, and a danger-glow `Delete Selected` button.
  - Clicking `Delete Selected` opens a confirmation modal displaying the exact titles to be deleted before calling `POST /api/rag/documents/batch-delete`.
  - Individual items can also be deleted directly via `DELETE /api/rag/documents/{id}`.
* **Interactive Media Previews in Chat & Dashboard**:
  - Video walkthroughs and screenshot links render as interactive chips (`▶ Video Demo`, `🖼 Screenshot`).
  - Clicking any chip opens a high-definition preview modal with an embedded video player and screenshot viewer.

---

## 💾 Session Management & Multi-Chat Persistence Architecture

The agent features persistent session management allowing QA testers to refresh the browser, navigate between different testing sessions, or resume conversations without losing context.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                       SESSION SYNCHRONIZATION FLOW                             │
└────────────────────────────────────────────────────────────────────────────────┘
                                  
     Browser Client (UI)                                  Backend Server (FastAPI)
 ┌───────────────────────────┐                         ┌───────────────────────────┐
 │ • localStorage Cache      │                         │ • SESSIONS_DB (In-Memory) │
 │ • Active Session Tracker  │                         │ • sessions_store.json     │
 │ • Chat History Sidebar    │                         │   (Disk Persistence)      │
 └─────────────┬─────────────┘                         └─────────────┬─────────────┘
               │                                                     │
               │ 1. POST /apps/{app}/users/{user}/sessions           │
               ├────────────────────────────────────────────────────►│
               │    (Create or register session)                     │
               │                                                     │
               │ 2. POST /run { sessionId, newMessage }              │
               ├────────────────────────────────────────────────────►│
               │    (Appends User Event & AI Tool Responses)         │
               │                                                     │
               │ 3. Save sessions_store.json                         │
               │◄────────────────────────────────────────────────────┤
               │    (Returns ADK events & updates disk)              │
               │                                                     │
               │ 4. Page Refresh / Switch Session                    │
               │    (Replays messages, tool calls, and media chips)  │
               ▼                                                     ▼
```

### 1. Dual-Layer Storage Mechanism
* **Server-Side Persistent Store (`sessions_store.json`)**:
  - Every message, tool call (e.g. `fetch_qa_test_data`, `mock_bops_order`), tool response, and final model text response is recorded as an event object with timestamps and invocation IDs.
  - Automatically flushed to disk after every user turn to prevent data loss across server restarts.
* **Client-Side Cache (`localStorage`)**:
  - Caches session metadata (`id`, `title`, `updatedAt`, `messages`) under key `adk_sessions_cache_${userId}`.
  - Tracks the currently open conversation under `adk_active_session_id_${userId}`.
  - Automatically reconciles with the server on startup via `GET /apps/{appName}/users/{userId}/sessions`.

### 2. Key Capabilities
* **Refresh Resilience**: Refreshing the browser (`Cmd + Shift + R`) preserves the open conversation, chat bubbles, and interactive media chips.
* **Smart Auto-Titling**: New chats are dynamically renamed from the default *"New Chat"* to a 35-character summary of the user's first prompt (e.g. *"What is the card number for Prop Gold..."*).
* **Multi-Chat Switching**: Users can create new chats (**+ New Chat**), switch between old sessions in the sidebar history, or delete specific chat sessions.
* **Multi-User Isolation**: Sessions are namespaced by `userId` (e.g. `qa_tester_1`), allowing different testers or automated test runners to maintain isolated conversation histories.

---

## ⚙️ Available Agent Tools & Parameters

The agent automatically validates input parameters before triggering any tool, API endpoint, or vector query.

| Tool Name | Type / Endpoint | Required Parameters | Optional Parameters & Defaults | Description |
|---|---|---|---|---|
| `fetch_qa_test_data` | **ChromaDB RAG** | `category` | None | Semantic vector retrieval for Web IDs, Prop cards, Sandbox cards, and Gift cards from ChromaDB |
| `query_feature_knowledge` | **ChromaDB RAG** | `feature_query` | None | Retrieves feature specifications, expected behaviors, edge-case risks, ACs, and video/image walkthrough links |
| `add_m_money` | Postman API (`POST /mbmoneycard/add`) | `email` | `amount="30"`, `environment="mcom-131"`, `no_of_cards="4"` | Funds user accounts with M-Money (Macy's) or B-Money (Bloomingdale's) gift cards |
| `setup_star_money` | Postman API (`POST /loyalty/setup`) | `card_number` | `reward_money="10"` | Loads reward dollars onto Macy's loyalty cards (MCOM only) |
| `get_supc_details` | Postman API (`GET /promotions/supc/...`) | None | `environment="mcom-170"` | Fetches SUPC promotion code details |
| `get_pzo_details` | Postman API (`GET /promotions/supc/...`) | None | `environment="mcom-170"` | Fetches PZO promotion code details |
| `get_shipment_ref` | Postman API (`GET /orders/{id}`) | `customer_order_id` | None | Extracts `reservationId` from order details response wrapper |
| `mock_sth_order` | Order Mocking | `customer_order_id` | None | Mocks Ship To Home (STH) order payload and fulfillment |
| `mock_bops_order` | Order Mocking | `customer_order_id` | None | Mocks Buy Online Pickup In Store (BOPS) order payload |
| `mock_boss_order` | Order Mocking | `customer_order_id` | None | Mocks Buy Online Ship To Store (BOSS) order payload |
| `mock_sdd_order` | Order Mocking | `customer_order_id` | None | Mocks Same Day Delivery (SDD) order payload |
| `send_shpshpd_fulfillment` | Fulfillment Router | `customer_order_id` | `order_type="BOPS"` | Dispatches SHPSHPD fulfillment events to store systems |

---

## 📚 QA Knowledge Base Categories (ChromaDB)

When querying `fetch_qa_test_data` or browsing the ChromaDB Knowledge Base:

* **Web IDs / Product PDPs**: `SHIP`, `BOPS`, `BOSS`, `GWP`, `VGC`, `EGC`, `2 TIER`, `PWP`, `3P`, `COLOR & SIZE PDP`, `CHANEL PDP`, `BT - BIG TICKET`, `LTL`, `WNM`
* **Payment & Loyalty**: `CREDIT CARDS` (Visa, Mastercard, Amex, Discover), `MACY'S CARDS` (Prop Gold, Prop Platinum, Amex, Amex BT, Working BT), `PAYPAL`, `GIFT CARDS` ($20–$300), `SANDBOX CARDS`
* **Addresses**: `ADDRESS`, `SHIPPING ADDRESS` (San Francisco, Tyson's Corner, etc.)

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

### 2. FastAPI Web Server & ChromaDB Dashboard Mode
```bash
python3 server.py
```
* **Interactive Web App & Chat**: `http://localhost:8000/app` (or `http://localhost:8000/`)
* **ChromaDB Ingestion Dashboard**: Click the **RAG Dashboard** tab in the header
* **Interactive API Documentation**: `http://localhost:8000/docs` (Swagger UI)

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

