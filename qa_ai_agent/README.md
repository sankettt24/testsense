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
│   ├── .env                  # Google Gemini API key and environment secrets
│   └── agent.py              # ADK Agent definition, tool functions, security layer, and parameter validation
├── chroma_db/                # Persistent ChromaDB vector database index and SQLite store (gitignored)
├── frontend/                 # Web UI assets
│   ├── index.html            # Single Page Application (Chat + ChromaDB Vector Dashboard)
│   ├── style.css             # Vanilla CSS design system with glassmorphism & dark aesthetics
│   ├── app.js                # Frontend client logic, session synchronization, RAG explorer & media modal
│   └── logo.png              # Platform logo
├── rag_service.py            # ChromaDB RAG Manager, specialized chunkers, embedding engine & hybrid search
├── rag_vector_store.json     # Seed knowledge base catalog for cold-start database migration
├── sessions_store.json       # Persistent server-side session and event store
├── server.py                 # FastAPI REST API wrapper serving ADK agent, sessions & RAG endpoints
├── vercel.json               # Vercel serverless configuration
├── render.yaml               # Render web service configuration
├── requirements.txt          # Python package dependencies (google-adk, chromadb, fastapi, uvicorn, etc.)
└── README.md                 # Complete project architecture, setup, and technical documentation
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
| `get_shipment_ref` | `GET /orderdetails` | `customer_order_id` | None | Extracts `reservationId` and shipment reference from order wrapper response |
| `mock_sth_order` | `POST /ordermods` | `customer_order_id` | None | Mocks Standard Ship To Home (STH) order fulfillment payload |
| `mock_bops_order` | `POST /ordermods` | `customer_order_id` | None | Mocks Buy Online Pickup In Store (BOPS) order fulfillment payload |
| `mock_boss_order` | `POST /ordermods` | `customer_order_id` | None | Mocks Buy Online Ship To Store (BOSS) order fulfillment payload |
| `mock_sdd_order` | `POST /ordermods` | `customer_order_id` | None | Mocks Same Day Delivery (SDD) order fulfillment payload |
| `send_shpshpd_fulfillment` | Status Router | `customer_order_id` | `order_type="BOPS"` | Routes SHPSHPD status update event for specified order type |
| `fetch_qa_test_data` | ChromaDB RAG Vector Store | `category` | None | Semantic vector lookup for Web IDs, Test Cards, Gift Cards, and Addresses |
| `query_feature_knowledge` | ChromaDB RAG Vector Store | `feature_query` | None | Retrieves feature specifications, acceptance criteria, known edge cases, and media demo links |

---

## 🧠 Session Management & Persistent ChromaDB RAG Architecture

This platform implements a robust, enterprise-grade architecture for conversational session continuity and specialized RAG (Retrieval-Augmented Generation) vector storage.

### 1. How Session Storage Works (Two-Tier Architecture)

To guarantee that QA testers never lose test context across browser refreshes, network drops, or multi-task switching, sessions are managed across two synchronized layers:

```
┌────────────────────────────────────────────────────────┐
│             Client Layer (Browser localStorage)        │
│ • adk_user_sessions_${userId}  (Metadata & Messages)   │
│ • adk_active_session_id_${userId} (Current Pointer)    │
└───────────────────────────┬────────────────────────────┘
                            │
               Bidirectional Synchronization
                            │
┌───────────────────────────▼────────────────────────────┐
│            Server Layer (sessions_store.json)          │
│ • In-Memory SESSIONS_DB Cache                          │
│ • Disk Persisted JSON Store                            │
│ • Full Google ADK Event Stream Envelopes               │
└────────────────────────────────────────────────────────┘
```

#### A. Client-Side State (`frontend/app.js`)
* **Namespace Isolation**: Sessions are isolated by `userId` (e.g. `adk_user_sessions_qa_tester_1` and `adk_active_session_id_qa_tester_1`).
* **Instant Switching**: Selecting a chat in the sidebar rehydrates the full conversational history instantly without blocking network requests.
* **Smart Auto-Titling**: New chats are dynamically renamed from the user's initial prompt (e.g. *"Star Money Loyalty Rewards..."*) while maintaining a persistent UUID.

#### B. Server-Side Persistence (`server.py` & `sessions_store.json`)
* **ADK Event Envelopes**: When `/run` executes, every turn is recorded as a structured event containing:
  - User input text parts.
  - Model thought signatures and candidate text parts.
  - `functionCall` parameters (tool name and arguments).
  - `functionResponse` payloads (tool execution results).
* **Automatic Recovery**: If the client clears browser storage, `GET /apps/{appName}/users/{userId}/sessions` restores all historical sessions directly from `sessions_store.json`.

---

### 2. How RAG Is Stored (ChromaDB Architecture)

Instead of transient in-memory lists or static JSON files, the vector store is powered by **ChromaDB** running in persistent embedded mode:

* **Storage Path**: `./chroma_db/` directory managed via `chromadb.PersistentClient(path="./chroma_db")`.
* **Collection Name**: `qa_knowledge_base`.
* **Distance Metric**: Cosine space (`metadata={"hnsw:space": "cosine"}`).
  - ChromaDB computes cosine distance: $d \in [0, 2]$.
  - The cosine similarity score is computed as: $\text{Cosine Similarity} = 1.0 - d$.
* **Cold-Start Seed Migration**:
  - When the ChromaDB collection is empty upon launch (e.g., fresh container deployment), `RAGVectorStore` inspects `rag_vector_store.json`.
  - It automatically migrates and vectorizes the **43 default QA entities** (19 test cards, 21 Web IDs/SKUs, and 3 rich feature intelligence specifications).
* **Lossless Metadata Serialization**:
  - ChromaDB strictly requires primitive values (`str`, `int`, `float`, `bool`) in metadata dictionaries.
  - `to_chroma_metadata()` flattens primary attributes (`doc_id`, `entity_type`, `title`, `created_at`, `card_type`, `card_number`, `cid`, `exp`, `category`, `product_id`, `zip_code`, `platform`, `image_url`, `video_url`) for native ChromaDB filtering.
  - It stores the entire original payload as a JSON-serialized string in `_full_meta_json`.
  - `from_chroma_doc()` rehydrates the original structured dictionary losslessly on every retrieval.

---

### 3. Specialized Chunking & Data Ingestion Pipeline

Generic paragraph chunking causes severe semantic dilution when applied to structured QA data (e.g., mixing a CVV with product dimensions). TestSense AI utilizes **three distinct, entity-specific chunking strategies**:

```
                       ┌─────────────────────────┐
                       │  User / Dashboard Input │
                       └────────────┬────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Cards Chunking  │       │ Feature Chunking │       │Test Data Chunking│
│ (chunk_card_item)│       │(chunk_feature_item)│     │(chunk_test_data) │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│• Card Type & Num │       │• Feature Name    │       │• Category / Type │
│• CVV/CID & Expiry│       │• Target Platform │       │• Web ID / SKU    │
│• Balance & Limit │       │• Expected Logic  │       │• Product Name    │
│• Billing Address │       │• Edge Case Issues│       │• Store Zip Code  │
│• Channel Notes   │       │• What to Observe │       │• Full Details    │
│• Pay Keywords    │       │• Video/Img Links │       │• SKU Keywords    │
└────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │       Dense Embedding Engine         │
                 │   Google gemini-embedding-001 (768d) │
                 │      [Offline Fallback: 256d]        │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │     ChromaDB Collection Upsert       │
                 │ (Collection: qa_knowledge_base in    │
                 │  ./chroma_db with HNSW Cosine Index) │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │ Real-Time Dashboard Breakdown Sync   │
                 │ (Interactive Categories & Card Tags) │
                 └──────────────────────────────────────┘
```

#### A. Payment & Test Cards Strategy (`chunk_card_item`)
* Extracts: `card_type`, `card_number`, `cid`, `exp`, `amount`, `address`, and `notes`.
* Formats semantic chunk text with `[ENTITY: QA PAYMENT & TEST CARD]` header.
* Injects payment keywords (`sandbox`, `loyalty`, `credit`, `debit`, `prop`) to guarantee high-scoring retrieval for both exact card queries and fuzzy natural language prompts.

#### B. Feature Intelligence Strategy (`chunk_feature_item`)
* Extracts: `name`, `platform` (e.g. `MCOM Site & App`, `BCOM`), `expected` behavior, potential `issues` (edge cases), `observe` (acceptance criteria & what to look for), `image_url` (screenshots), and `video_url` (walkthrough demos).
* Formats semantic chunk text with `[ENTITY: FEATURE SPECIFICATION & QA INTELLIGENCE]` header.
* Enables the AI agent to give precise answers to questions like *"What are the potential edge cases for BOPS?"* and provide interactive video/image demo links.

#### C. QA Test Data & Web ID Strategy (`chunk_test_data_item`)
* Extracts: `category` (`BOPS`, `BOSS`, `SHIP`, `GWP`, `VGC`, `EGC`, `2 TIER`, `PWP`, `3P`, `BT`, `LTL`, `WNM`), `product_id`, `product_name`, `zip_code`, and `description`.
* Formats semantic chunk text with `[ENTITY: QA TEST DATA & WEB ID]` header.
* Maps product taxonomy and fulfillment rules to exact Web IDs.

---

### 4. Embedding Models, Dimensions & Fallback Architecture

| Parameter | Primary Cloud Vectorizer | Deterministic Fallback Vectorizer |
|---|---|---|
| **Model Name** | `gemini-embedding-001` | Internal Dense Token-Hash Vectorizer |
| **Provider** | Google GenAI (`google-genai` SDK) | Local CPU Python Runtime |
| **Embedding Dimensions** | **768 dimensions** | **256 dimensions** |
| **Normalization** | Euclidean L2 Norm ($\vec{v} / \|\vec{v}\|$) | Euclidean L2 Norm ($\vec{v} / \|\vec{v}\|$) |
| **Network Requirements** | HTTPS Outbound to Google APIs | 100% Offline / Zero Network Dependency |
| **Use Case** | Production cloud & standard dev runs | Corporate proxy, VPN with SSL intercept, offline testing |

#### A. Custom Chroma Embedding Function
To prevent ChromaDB from attempting to download external HuggingFace models (which fail behind enterprise firewalls with `[SSL: CERTIFICATE_VERIFY_FAILED]`), `rag_service.py` implements a custom embedding class:
```python
class GeminiChromaEmbeddingFunction(EmbeddingFunction):
    def name(self) -> str:
        return "gemini_chroma_ef"

    def __call__(self, input: Documents) -> Embeddings:
        return [generate_embedding(text) for text in input]
```

#### B. Deterministic Fallback Algorithm
If the Gemini API is unreachable, `fallback_text_embedding()` activates seamlessly:
* Computes unigram hash projections with position log-decay weighting ($w_i = 1.0 / (1.0 + \ln(i + 1))$).
* Extracts bigram contextual tokens ($w_{\text{bigram}} = w \times 0.8$) to capture adjacent word dependencies.
* Normalizes the vector onto a unit hypersphere ($\|\vec{v}\| = 1.0$) for cosine distance calculations.

---

### 5. Hybrid Retrieval & Scoring Formula

When a user prompt or API query is sent to ChromaDB via `rag_store.search(query, top_k)`:

1. **Cosine Vector Distance**: ChromaDB fetches the closest candidate embeddings using HNSW index.
   $$S_{\text{semantic}} = \max(0.0, 1.0 - d_{\text{cosine}})$$
2. **Lexical Token Overlap**: Tokenizes the query and evaluates term frequency across chunk text.
   $$S_{\text{keyword}} = \min\left(0.35, \frac{\text{Hits}}{|\text{Query Words}|} \times 0.35\right)$$
3. **Identifier Exact-Match Boost**:
   * Exact Card Number match: $+0.40$
   * Exact Web ID / Product ID match: $+0.40$
   * Category / Card Type / Platform exact match: $+0.25$
4. **Composite Score**:
   $$S_{\text{total}} = \min(1.0, (S_{\text{semantic}} \times 0.65) + S_{\text{keyword}} + S_{\text{id\_boost}})$$

---

### 6. Dashboard Composition Breakdown & Selective Deletion

The RAG Dashboard (`http://localhost:8000/app` $\rightarrow$ **RAG Dashboard**) gives QA testers real-time visibility and granular control over the vector database:

* **"What's in ChromaDB?" Content Breakdown**:
  * Real-time metrics endpoint `GET /api/rag/stats` aggregates counts across categories (`BOPS`, `BOSS`, `SHIP`, `GWP`, `VGC`, `EGC`, `3P`, `BT`, `LTL`, `WNM`), card types (`Prop Gold`, `Prop Platinum`, `Amex`, `Gift Cards`), and platforms.
  * Interactive breakdown tags allow testers to tap any category or card type to filter the explorer instantly.
* **Granular Selective Deletion**:
  * Individual document cards feature a dedicated deletion icon (`DELETE /api/rag/documents/{doc_id}`).
  * Multi-select checkboxes enable selecting specific documents to delete.
  * A floating batch actions bar displays the selection count, a master `Select All Visible` toggle, and a danger-glow **`Delete Selected`** button.
  * A modal confirmation dialog lists the exact document titles staged for removal (`POST /api/rag/documents/batch-delete`), preventing accidental bulk data loss.
* **Interactive Media Preview Modals**:
  * Video walkthroughs (`.mp4`, `.webm`, YouTube) and image assets (`.jpg`, `.png`, Unsplash) render as interactive action chips (`▶ Video Demo`, `🖼 Screenshot`).
  * Available in both the Dashboard Knowledge Explorer and inside chat messages, opening a high-resolution preview modal with inline playback and fullscreen external viewing.

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

