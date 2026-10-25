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
├── data.txt              # Test card, customer profiles, and Web ID source dataset (zero JSON dependency)
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
* **Cold-Start Auto-Seeding**: If the vector store is empty on startup (e.g. fresh deployment or new server environment), it automatically parses and vectorizes all records directly from `data.txt` (Macy's Proprietary cards, Amex cards, customer profiles, generic cards, gift cards, and Web IDs) with **zero dependency on any legacy JSON file**.

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

### 4. Specialized Chunking & Ingestion Pipeline (How Chunks are Formed)

Standard RAG architectures rely on naive text splitters (such as fixed 500-character or sentence-based recursive chunkers). In QA automation and test data intelligence, generic splitters fail because:
* They slice credit card numbers from their respective CVVs, expiration dates, and billing addresses.
* They separate product Web IDs from their required zip codes and order fulfillment rules (e.g., separating BOPS Web IDs from store zip `22102`).
* They decouple feature specifications from their acceptance criteria, failure modes, and demo video / screenshot asset links.

To solve this, **TestSense AI** uses a **Domain-Specific Semantic Chunking Engine** in [`rag_service.py`](file:///Users/2457196/Desktop/gemi/qa_ai_agent/rag_service.py) with three distinct chunking templates:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               SPECIALIZED CHUNKING SCHEMAS                                      │
├───────────────────────────────┬─────────────────────────────────┬───────────────────────────────┤
│    1. Feature Chunking        │     2. Payment Card Chunking    │    3. Test Data Chunking      │
│     (chunk_feature_item)      │        (chunk_card_item)        │    (chunk_test_data_item)     │
├───────────────────────────────┼─────────────────────────────────┼───────────────────────────────┤
│ • Entity Header               │ • Entity Header                 │ • Entity Header               │
│ • Feature Name & Platform     │ • Card Type & Account Number    │ • Order Category (BOPS/SHIP)  │
│ • Expected Behavior & Specs   │ • CVV / CID & Expiry Date       │ • Web ID / SKU & Product Name │
│ • Observed Issues & Gotchas   │ • Available Balance / Value     │ • Applicable Store Zip Code   │
│ • Acceptance Criteria (AC)    │ • Associated Billing Address    │ • Fulfillment Details         │
│ • Embedded Video & Image URLs │ • Usage Notes & Channels        │ • Domain Keyword Boost Tokens │
│ • Domain Keyword Boost Tokens │ • Domain Keyword Boost Tokens   │                               │
└───────────────────────────────┴─────────────────────────────────┴───────────────────────────────┘
```

#### A. Feature Specifications (`chunk_feature_item`)
Combines business requirements, edge cases, acceptance criteria, and rich media asset links into a single unified chunk:
```text
[ENTITY: QA FEATURE INTELLIGENCE]
Feature Name: BOPS Same-Day Store Fulfillment Flow
Target Platform / Channel: MCOM Site & App
Expected Behavior & Business Requirements:
Customer chooses 'Pick Up In Store', selects store by zip (e.g. 22102), and completes checkout. Reservation ID is generated, and status moves from RESERVED -> SHPSHPD once store fulfills.
Potential Issues & Edge Cases Faced:
Inventory mismatch between warehouse and physical store can cause cancellation; reservationId wrapper response missing in order mods payload if order is STH.
Things to Observe & Acceptance Criteria:
Check that reservation ID is non-empty; verify SHPSHPD status update event completes with 200 HTTP response code; inspect store hours in confirmation email.
Image / Screenshot Link: https://images.unsplash.com/photo-1555421689-491a97ff2040?w=800
Video Demo / Walkthrough Link: https://www.w3schools.com/html/mov_bbb.mp4
Keywords: BOPS Same-Day Store Fulfillment Flow feature acceptance criteria test scenario edge cases observation MCOM Site & App
```
* **Why this works**: When a QA engineer asks *"What can go wrong during BOPS store fulfillment?"* or *"Show me the demo for BOPS"*, cosine similarity matches across the `Expected Behavior`, `Potential Issues`, and `Things to Observe` sections, returning the exact criteria alongside the direct video and screenshot links in one query.

#### B. Payment & Test Cards (`chunk_card_item`)
Ensures credit cards, gift cards, and loyalty credentials retain complete context without number fragmentation:
```text
[ENTITY: QA PAYMENT & TEST CARD]
Card Type: Prop Gold
Card Number: 6035340000050209
CVV / CID: 655
Expiration: 07/29
Associated Billing Address: 680 Folsom Street 100, SAN FRANCISCO, CA 94107
Notes: Verified working in mcom-170 checkout flow
Keywords: Prop Gold card number payment test card sandbox credit debit prop 6035340000050209
```
* **Why this works**: Captures the complete account number with synthetic keywords (`sandbox`, `credit`, `prop`, `payment`), allowing natural queries like *"can you give me macys card"* or exact numerical queries (`"6035340000050209"`) to match with high confidence.

#### C. QA Test Data & Web IDs (`chunk_test_data_item`)
Tailored for order categories, product SKUs, and store fulfillment rules:
```text
[ENTITY: QA TEST DATA & WEB ID]
Category / Order Type: BOPS
Product Web ID / SKU: 86800
Product Name: Men's Classic Wool Winter Overcoat
Applicable Zip Code / Location: 22102
Description & Details: Verified in mcom-131 for pickup testing
Keywords: BOPS web id product id test data 86800 Men's Classic Wool Winter Overcoat
```
* **Why this works**: Links category types (`BOPS`, `BOSS`, `SHIP`, `GWP`, `3P`, `BT`, `LTL`) directly with valid Web IDs and store zip codes (e.g. `22102`), giving automated order mocking and manual testers immediate copy-paste data.

#### D. Metadata Flattening & Lossless Roundtrip Serialization
ChromaDB strictly requires flat primitive types (`str`, `int`, `float`, `bool`) in metadata dictionaries. To maintain 100% attribute fidelity:
* `to_chroma_metadata()`: Extracts indexed flat fields for filtering, and serializes the complete nested dictionary into a `_full_meta_json` string.
* `from_chroma_doc()`: Deserializes `_full_meta_json` upon retrieval, ensuring zero data loss for nested URLs, timestamps, and extended attributes.

---

### 5. Hybrid Retrieval & Search Scoring

When an agent or user queries the RAG store:
1. An embedding vector is computed for the query string using `gemini-embedding-001` (768 dimensions).
2. ChromaDB queries top candidates using cosine distance ($d \in [0, 2]$).
3. Cosine similarity is computed as $S_{\text{semantic}} = \max(0.0, 1.0 - d)$.
4. **Keyword & Identifier Boosting**:
   - **Exact Card / Web ID Match**: $+0.40$ boost if the exact number or ID is present.
   - **Exact Category / Platform Match**: $+0.25$ boost if category (e.g., `BOPS`, `Prop Gold`) matches.
   - **Keyword Hits**: Scaled up to $+0.35$ based on token overlap.
5. Total score: $S_{\text{total}} = \min(1.0, 0.65 \times S_{\text{semantic}} + S_{\text{keyword}} + S_{\text{id\_boost}})$.

---

### 6. RAG Ingestion Dashboard: How Data is Displayed & Controlled

The **RAG Ingestion Dashboard** (accessible at `/app` by clicking the **RAG Dashboard** button in the header) provides a real-time visual control center for ChromaDB:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           RAG KNOWLEDGE DASHBOARD ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. REAL-TIME METRICS COUNTERS                                                                   │
│    [ 43 ChromaDB Vectors ]  [ 3 Features ]  [ 19 Cards & Payment ]  [ 21 Web IDs & TestData ]   │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. KNOWLEDGE INGESTION HUB (SPECIALIZED FORMS)                                                  │
│    [ New Feature Tab ]     [ New Card Tab ]     [ Test Data / Web ID Tab ]                      │
│    ↳ Input fields tailored to chunking schema → [ Vectorize & Store in ChromaDB ]              │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. SEMANTIC CHROMADB SEARCH TESTER                                                              │
│    [ Query: 'can you give me macys card' ] → [ Search Vectors ]                                 │
│    ↳ Displays Cosine Match Score (e.g. 96.4%), Entity Type Badge, and Raw Vector Chunk Text    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. "WHAT'S IN CHROMADB?" COMPOSITION BREAKDOWN                                                  │
│    [ All (43) ] [ Features (3) ] [ Cards (19) ] [ Test Data (21) ]                              │
│    [ BOPS (6) ] [ SHIP (4) ] [ BOSS (3) ] [ Prop Gold (2) ] [ Amex (2) ] [ Visa (3) ] ...       │
│    ↳ Click any tag to instantly filter document cards in the explorer                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 5. CHROMADB KNOWLEDGE BASE INDEX (DOCUMENT CARDS GRID)                                          │
│    ┌──────────────────────────────────┐      ┌──────────────────────────────────┐               │
│    │ ☑ [FEATURE]  BOPS Store Fulfill  │      │ ☑ [CARD]  Prop Gold (..5020)     │               │
│    │ Badges: MCOM Site & App          │      │ Badges: Exp: 07/29 | CVV: 655    │               │
│    │ ┌──────────────────────────────┐ │      │ ┌──────────────────────────────┐ │               │
│    │ │ Monospace Chunk Preview Box  │ │      │ │ Monospace Chunk Preview Box  │ │               │
│    │ └──────────────────────────────┘ │      │ └──────────────────────────────┘ │               │
│    │ [▶ Video Demo] [🖼 Screenshot]   │      │ [🗑 Delete Document]             │               │
│    └──────────────────────────────────┘      └──────────────────────────────────┘               │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 6. SELECTION & GRANULAR DELETION TOOLBAR                                                        │
│    [☑ Select All Visible (43)]  [✓ 2 Selected]  [🗑 Delete Selected (2)]  [✕ Clear]             │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### How Chunks Appear on the Dashboard

1. **Real-Time Metrics Grid**:
   - Four glowing counters at the top query `GET /api/rag/stats` to show vector distribution across `Features`, `Cards`, and `Web IDs / Test Data`.

2. **Specialized Ingestion Forms**:
   - The **Knowledge Ingestion Hub** offers three segmented tabs (`New Feature`, `New Card`, `Test Data / Web ID`).
   - Each tab exposes form fields matching its exact chunking rules (e.g. Expected Behavior, Edge Cases, Video Link, Card CVV, Store Zip).
   - Submitting the form calls `POST /api/rag/ingest`, which chunks the input, embeds it with Google GenAI, saves it to ChromaDB, and immediately refreshes the cards.

3. **Semantic Search Playground**:
   - QA testers can test retrieval quality in real-time before running test cases.
   - Submitting a query calls `POST /api/rag/query`, displaying:
     - Cosine similarity percentage score (e.g. `96.4% Match`).
     - Entity category badge.
     - Document ID and the **exact chunk text** returned by ChromaDB.

4. **"What's in ChromaDB?" Category Breakdown**:
   - Analyzes all vectors in ChromaDB to dynamically build filter chips (`BOPS (6)`, `SHIP (4)`, `Prop Gold (2)`, `Amex (2)`, `Gift Card (3)`).
   - Clicking any chip filters the document cards in real-time.

5. **Visual Document Cards Grid**:
   - Every chunk stored in ChromaDB is rendered as a clean card:
     - **Entity Pill**: Color-coded badge (🟣 `FEATURE`, 🟢 `CARD`, 🟡 `TEST_DATA`).
     - **Title & Metadata Badges**: Displaying Web ID, Card Number, Expiration Date, Amount, Platform.
     - **Monospace Chunk Preview Box (`.kb-chunk-preview`)**: A scrollable preview displaying the **exact formatted text string** stored in ChromaDB, allowing full inspection of what the AI reads.
     - **Interactive Media Chips**: Features with video demos or screenshots display clickable `▶ Video Demo` and `🖼 Screenshot` chips. Clicking opens the high-definition media modal with an HTML5 video player and zoomable screenshot viewer.
     - **Quick Trash Icon**: Allows one-click deletion of any individual document.

6. **Granular Multi-Select & Deletion Safety**:
   - Document cards include individual checkboxes, plus a **Select All Visible** toggle.
   - When items are checked, the sticky action bar displays the selection count and a glowing red **Delete Selected (X)** button.
   - Clicking opens the **Confirm Vector Deletion Modal**, which lists the exact item titles to be deleted, preventing accidental mass data wipes.

7. **Synchronization with Chat**:
   - When the user asks the Chat Agent for cards or feature walkthroughs, the agent queries ChromaDB through the `fetch_qa_test_data` or `query_feature_knowledge` tools.
   - The exact same interactive `▶ Video Demo` and `🖼 Screenshot` chips are dynamically rendered inside the chat message bubbles.

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

