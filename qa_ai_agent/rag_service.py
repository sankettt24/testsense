import os
import re
import json
import uuid
import time
import math
import shutil
import logging
import ssl
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings

# SSL & Corporate Proxy Intercept Patch for httpx and requests
ssl._create_default_https_context = ssl._create_unverified_context
try:
    import httpx
    _orig_httpx_init = httpx.Client.__init__
    def _patched_httpx_init(self, *args, **kwargs):
        kwargs["verify"] = False
        return _orig_httpx_init(self, *args, **kwargs)
    httpx.Client.__init__ = _patched_httpx_init

    _orig_httpx_async_init = httpx.AsyncClient.__init__
    def _patched_httpx_async_init(self, *args, **kwargs):
        kwargs["verify"] = False
        return _orig_httpx_async_init(self, *args, **kwargs)
    httpx.AsyncClient.__init__ = _patched_httpx_async_init
except Exception:
    pass

logger = logging.getLogger("TestSenseAI_RAG")

# Auto-load .env files if GOOGLE_API_KEY is not set in shell environment
if not os.environ.get("GOOGLE_API_KEY"):
    env_paths = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "multi_tool_agent", ".env")
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        key_str = k.strip()
                        val_str = v.strip().strip("'\"")
                        if key_str and not os.environ.get(key_str):
                            os.environ[key_str] = val_str

def _detect_readonly_filesystem() -> bool:
    """Detects if we are running in a serverless or read-only container environment (e.g. Vercel, AWS Lambda)."""
    serverless_envs = [
        "VERCEL", "VERCEL_ENV", "VERCEL_URL", "NOW_REGION",
        "AWS_LAMBDA_FUNCTION_NAME", "LAMBDA_TASK_ROOT", "LAMBDA_RUNTIME_DIR",
        "K_SERVICE", "GAE_ENV"
    ]
    if any(os.environ.get(k) for k in serverless_envs):
        return True
    
    current_abs = os.path.abspath(__file__)
    if current_abs.startswith("/var/task") or current_abs.startswith("/tmp"):
        return True
    
    try:
        test_file = os.path.join(os.path.dirname(__file__), f".write_test_{os.getpid()}")
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        return False
    except (OSError, PermissionError):
        return True

# Persistent ChromaDB Directory (Detect Vercel / AWS Lambda serverless read-only filesystem)
is_serverless = _detect_readonly_filesystem()

if os.environ.get("CHROMA_DB_DIR"):
    CHROMA_DB_DIR = os.environ.get("CHROMA_DB_DIR")
elif is_serverless:
    CHROMA_DB_DIR = "/tmp/chroma_db"
else:
    CHROMA_DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")

# Cold-start source dataset: data.txt (Zero dependency on legacy rag_vector_store.json)
DATA_TXT_FILE = os.path.join(os.path.dirname(__file__), "data.txt")

# Lazy-loaded GenAI Client for embeddings
_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is None:
        try:
            from google import genai
            _genai_client = genai.Client()
        except Exception as e:
            logger.warning(f"Could not initialize google.genai client for embeddings: {e}")
            _genai_client = False
    return _genai_client if _genai_client is not False else None

def fallback_text_embedding(text: str, dim: int = 256) -> List[float]:
    """Deterministic, normalized pseudo-semantic token vectorizer for fallback or offline execution."""
    vec = [0.0] * dim
    words = re.findall(r"\w+", text.lower())
    if not words:
        return vec
    for i, word in enumerate(words):
        h = hash(word) % dim
        weight = 1.0 / (1.0 + math.log(i + 1))
        vec[h] += weight
        # Bigram features for local context
        if i > 0:
            bh = hash(f"{words[i-1]}_{word}") % dim
            vec[bh] += weight * 0.8

    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec

def generate_embedding(text: str) -> List[float]:
    """Generates embedding vector using Gemini gemini-embedding-001 with fallback."""
    client = get_genai_client()
    if client:
        try:
            res = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text
            )
            if res and res.embeddings and len(res.embeddings) > 0:
                values = res.embeddings[0].values
                # Normalize vector for cosine distance stability
                norm = math.sqrt(sum(v * v for v in values))
                if norm > 0:
                    return [v / norm for v in values]
                return values
        except Exception as err:
            logger.debug(f"Gemini embedding API notice ({err}), falling back to internal dense vectorizer.")
    return fallback_text_embedding(text)

class GeminiChromaEmbeddingFunction(EmbeddingFunction):
    """ChromaDB-compatible EmbeddingFunction using Google GenAI with fallback."""
    def __init__(self):
        pass

    def name(self) -> str:
        return "gemini_chroma_ef"

    def __call__(self, input: Documents) -> Embeddings:
        return [generate_embedding(text) for text in input]

# ==============================================================================
# Specialized Chunking Strategies
# ==============================================================================

def chunk_card_item(card_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Specialized chunking for payment, gift, and sandbox cards.
    Separates card type, account number, CVV, expiry, balance, and billing address.
    """
    card_type = str(card_data.get("card_type", "")).strip() or "Credit Card"
    card_number = str(card_data.get("card_number", "")).strip()
    cid = str(card_data.get("cid", card_data.get("cvv", ""))).strip()
    exp = str(card_data.get("exp", card_data.get("expiry", ""))).strip()
    amount = str(card_data.get("amount", card_data.get("balance", ""))).strip()
    address = str(card_data.get("address", "")).strip()
    notes = str(card_data.get("notes", "")).strip()

    chunk_lines = [
        f"[ENTITY: QA PAYMENT & TEST CARD]",
        f"Card Type: {card_type}",
        f"Card Number: {card_number}"
    ]
    if cid:
        chunk_lines.append(f"CVV / CID: {cid}")
    if exp:
        chunk_lines.append(f"Expiration: {exp}")
    if amount:
        chunk_lines.append(f"Card Balance / Value: {amount}")
    if address:
        chunk_lines.append(f"Associated Billing Address: {address}")
    if notes:
        chunk_lines.append(f"Notes: {notes}")
    chunk_lines.append(f"Keywords: {card_type} card number payment test card sandbox credit debit prop {card_number}")

    chunk_text = "\n".join(chunk_lines)
    title = f"{card_type} ({card_number[-4:] if len(card_number) >= 4 else card_number})"

    doc_id = str(card_data.get("doc_id") or card_data.get("id") or "").strip() or str(uuid.uuid4())

    return {
        "id": doc_id,
        "type": "card",
        "title": title,
        "chunk_text": chunk_text,
        "metadata": {
            "card_type": card_type,
            "card_number": card_number,
            "cid": cid,
            "exp": exp,
            "amount": amount,
            "address": address,
            "notes": notes
        },
        "created_at": card_data.get("created_at") or time.time()
    }

def _parse_url_list(value: Any) -> List[str]:
    """Helper to parse a string or list of URLs into a list of clean strings."""
    if not value:
        return []
    if isinstance(value, list):
        urls = []
        for item in value:
            if isinstance(item, str):
                for u in item.replace(",", "\n").split("\n"):
                    u_clean = u.strip()
                    if u_clean:
                        urls.append(u_clean)
        return urls
    return [u.strip() for u in str(value).replace(",", "\n").split("\n") if u.strip()]

def chunk_feature_item(feature_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Specialized chunking for new QA features.
    Embeds requirements, potential issues, things to observe, Figma specs, Test Cases,
    and multiple video/screenshot asset links.
    """
    name = str(feature_data.get("name", feature_data.get("feature_name", ""))).strip()
    platform = str(feature_data.get("platform", feature_data.get("target_platform", "All Platforms"))).strip()
    expected = str(feature_data.get("expected", feature_data.get("expected_behavior", ""))).strip()
    issues = str(feature_data.get("issues", feature_data.get("potential_issues", ""))).strip()
    observe = str(feature_data.get("observe", feature_data.get("things_to_observe", ""))).strip()
    figma_url = str(feature_data.get("figma_url", feature_data.get("figma", ""))).strip()

    # Parse multiple test case URLs
    raw_testcases = feature_data.get("testcase_urls") or feature_data.get("testcases") or feature_data.get("testcase_url") or ""
    testcase_urls = _parse_url_list(raw_testcases)

    # Parse multiple image/screenshot URLs
    raw_images = feature_data.get("image_urls") or feature_data.get("images") or feature_data.get("image_url") or ""
    image_urls = _parse_url_list(raw_images)

    # Parse multiple video URLs
    raw_videos = feature_data.get("video_urls") or feature_data.get("videos") or feature_data.get("video_url") or ""
    video_urls = _parse_url_list(raw_videos)

    # Scalar backward compatibility
    primary_image = image_urls[0] if image_urls else ""
    primary_video = video_urls[0] if video_urls else ""

    chunk_lines = [
        f"[ENTITY: QA FEATURE INTELLIGENCE]",
        f"Feature Name: {name}",
        f"Target Platform / Channel: {platform}",
        f"Expected Behavior & Business Requirements:\n{expected}"
    ]
    if issues:
        chunk_lines.append(f"Potential Issues & Edge Cases Faced:\n{issues}")
    if observe:
        chunk_lines.append(f"Things to Observe & Acceptance Criteria:\n{observe}")
    if figma_url:
        chunk_lines.append(f"Figma Design / Specification Link: {figma_url}")
    if testcase_urls:
        chunk_lines.append("Test Case URLs:\n" + "\n".join(f"- {u}" for u in testcase_urls))
    if image_urls:
        chunk_lines.append("Screenshot & Image Asset Links:\n" + "\n".join(f"- {u}" for u in image_urls))
    if video_urls:
        chunk_lines.append("Video Demo & Recording Links:\n" + "\n".join(f"- {u}" for u in video_urls))
    chunk_lines.append(f"Keywords: {name} feature acceptance criteria test scenario edge cases observation {platform} figma testcases")

    chunk_text = "\n".join(chunk_lines)
    title = f"Feature: {name} ({platform})"
    doc_id = str(feature_data.get("doc_id") or feature_data.get("id") or "").strip() or str(uuid.uuid4())

    return {
        "id": doc_id,
        "type": "feature",
        "title": title,
        "chunk_text": chunk_text,
        "metadata": {
            "feature_name": name,
            "name": name,
            "platform": platform,
            "target_platform": platform,
            "expected": expected,
            "expected_behavior": expected,
            "issues": issues,
            "potential_issues": issues,
            "observe": observe,
            "things_to_observe": observe,
            "figma_url": figma_url,
            "testcase_urls": testcase_urls,
            "image_urls": image_urls,
            "video_urls": video_urls,
            "image_url": primary_image,
            "video_url": primary_video
        },
        "created_at": feature_data.get("created_at") or time.time()
    }

def chunk_test_data_item(test_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Specialized chunking for QA test data (Web IDs, Categories, addresses, and product types).
    """
    category = str(test_data.get("category", "")).strip().upper() or "GENERAL"
    product_id = str(test_data.get("product_id", test_data.get("id", test_data.get("web_id", "")))).strip()
    product_name = str(test_data.get("product_name", test_data.get("name", test_data.get("title", "")))).strip()
    zip_code = str(test_data.get("zip_code", test_data.get("zip", ""))).strip()
    description = str(test_data.get("description", test_data.get("desc", test_data.get("details", "")))).strip()

    chunk_lines = [
        f"[ENTITY: QA TEST DATA & WEB ID]",
        f"Category / Order Type: {category}"
    ]
    if product_id:
        chunk_lines.append(f"Product Web ID / SKU: {product_id}")
    if product_name:
        chunk_lines.append(f"Product Name: {product_name}")
    if zip_code:
        chunk_lines.append(f"Applicable Zip Code / Location: {zip_code}")
    if description:
        chunk_lines.append(f"Description & Details: {description}")
    chunk_lines.append(f"Keywords: {category} web id product id test data {product_id} {product_name}")

    chunk_text = "\n".join(chunk_lines)
    title = f"{category} Web ID: {product_id}" if product_id else f"{category} Test Data"
    # Always generate a unique document ID for ChromaDB, preserving product_id in metadata
    doc_id = str(test_data.get("doc_id", "")).strip() or str(uuid.uuid4())

    return {
        "id": doc_id,
        "type": "test_data",
        "title": title,
        "chunk_text": chunk_text,
        "metadata": {
            "category": category,
            "product_id": product_id,
            "product_name": product_name,
            "name": product_name,
            "zip_code": zip_code,
            "description": description
        },
        "created_at": test_data.get("created_at") or time.time()
    }

# ==============================================================================
# ChromaDB Metadata Serialization Helpers
# ==============================================================================

def to_chroma_metadata(chunk: Dict[str, Any]) -> Dict[str, Any]:
    """Serializes metadata into primitive types accepted by ChromaDB."""
    meta = chunk.get("metadata", {})
    chroma_meta: Dict[str, Any] = {
        "doc_id": str(chunk.get("id", "")),
        "entity_type": str(chunk.get("type", "")),
        "title": str(chunk.get("title", "")),
        "created_at": float(chunk.get("created_at") or time.time())
    }
    # Flatten key primitive attributes for filtering
    for k, v in meta.items():
        if v is None:
            continue
        if isinstance(v, (str, int, float, bool)):
            chroma_meta[k] = v
        else:
            chroma_meta[k] = json.dumps(v)

    # Full lossless JSON copy
    chroma_meta["_full_meta_json"] = json.dumps(meta)
    return chroma_meta

def from_chroma_doc(doc_id: str, document: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Restores full document dictionary from ChromaDB document and metadata."""
    metadata = metadata or {}
    raw_meta_json = metadata.get("_full_meta_json")
    meta_dict = {}
    if raw_meta_json:
        try:
            meta_dict = json.loads(raw_meta_json)
        except Exception:
            meta_dict = {}

    for k, v in metadata.items():
        if k not in ["_full_meta_json", "doc_id", "entity_type", "title", "created_at"] and k not in meta_dict:
            meta_dict[k] = v

    return {
        "id": doc_id,
        "type": metadata.get("entity_type", "general"),
        "title": metadata.get("title", "Untitled Document"),
        "chunk_text": document,
        "metadata": meta_dict,
        "created_at": metadata.get("created_at", 0)
    }

# ==============================================================================
# ChromaDB Vector Store Manager
# ==============================================================================

class RAGVectorStore:
    def __init__(self, chroma_dir: str = CHROMA_DB_DIR, data_txt_file: str = DATA_TXT_FILE):
        self.chroma_dir = chroma_dir
        self.data_txt_file = data_txt_file
        
        # If in serverless environment (/tmp/chroma_db), copy pre-seeded repo chroma_db if available
        local_repo_chroma = os.path.join(os.path.dirname(__file__), "chroma_db")
        if self.chroma_dir != local_repo_chroma and os.path.exists(local_repo_chroma):
            try:
                os.makedirs(self.chroma_dir, exist_ok=True)
                if not os.listdir(self.chroma_dir):
                    logger.info(f"Copying pre-seeded ChromaDB from {local_repo_chroma} to writable {self.chroma_dir}...")
                    for root, dirs, files in os.walk(local_repo_chroma):
                        rel_dir = os.path.relpath(root, local_repo_chroma)
                        dest_dir = os.path.join(self.chroma_dir, rel_dir) if rel_dir != "." else self.chroma_dir
                        os.makedirs(dest_dir, exist_ok=True)
                        for file in files:
                            src_file = os.path.join(root, file)
                            dest_file = os.path.join(dest_dir, file)
                            shutil.copyfile(src_file, dest_file)
                            try:
                                os.chmod(dest_file, 0o666)
                            except Exception:
                                pass
            except Exception as copy_err:
                logger.warning(f"Could not copy local chroma_db to {self.chroma_dir}: {copy_err}")

        # Initialize Chroma Client with graceful fallback for serverless read-only environments
        self.embedding_fn = GeminiChromaEmbeddingFunction()
        client_initialized = False

        # Attempt 1: PersistentClient with telemetry disabled to prevent read-only directory writes
        try:
            os.makedirs(self.chroma_dir, exist_ok=True)
            chroma_settings = Settings(
                anonymized_telemetry=False,
                is_persistent=True,
                persist_directory=self.chroma_dir,
                allow_reset=True
            )
            self.client = chromadb.PersistentClient(path=self.chroma_dir, settings=chroma_settings)
            self.collection = self.client.get_or_create_collection(
                name="qa_knowledge_base",
                embedding_function=self.embedding_fn,
                metadata={"hnsw:space": "cosine"}
            )
            client_initialized = True
            logger.info(f"Initialized ChromaDB PersistentClient at {self.chroma_dir}")
        except Exception as pe:
            logger.warning(f"Could not initialize PersistentClient at {self.chroma_dir} ({pe}). Falling back to chromadb.EphemeralClient() for read-only serverless environment.")

        # Attempt 2: Fallback to pure in-memory EphemeralClient
        if not client_initialized:
            try:
                ephemeral_settings = Settings(
                    anonymized_telemetry=False,
                    is_persistent=False
                )
                self.client = chromadb.EphemeralClient(settings=ephemeral_settings)
                self.collection = self.client.get_or_create_collection(
                    name="qa_knowledge_base",
                    embedding_function=self.embedding_fn,
                    metadata={"hnsw:space": "cosine"}
                )
                logger.info("Successfully initialized in-memory ChromaDB EphemeralClient.")
            except Exception as ee:
                logger.error(f"Critical error initializing ChromaDB EphemeralClient: {ee}")
                raise

        count = self.collection.count()
        logger.info(f"Initialized ChromaDB vector store. Current document count: {count}")
        
        # Cold start auto-seeding directly from data.txt (zero dependency on legacy json)
        if count == 0:
            if os.path.exists(self.data_txt_file):
                self.seed_from_data_txt(self.data_txt_file)
            else:
                self.seed_default_knowledge()

    def seed_from_data_txt(self, filepath: Optional[str] = None) -> int:
        """
        Parses data.txt directly and ingests all Macy's Proprietary cards,
        Amex cards, Customer Profiles, Generic Test cards, Gift cards with PIN/Balance,
        and Web IDs / Product Types into ChromaDB without any JSON dependency.
        Also seeds the standard QA feature specifications so feature queries succeed.
        """
        if filepath is None:
            filepath = self.data_txt_file

        if not os.path.exists(filepath):
            logger.warning(f"data.txt not found at {filepath}, falling back to default seed knowledge.")
            self.seed_default_knowledge()
            return self.collection.count()

        logger.info(f"Seeding ChromaDB knowledge base directly from {filepath}...")
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Error reading {filepath}: {e}, falling back to default seed knowledge.")
            self.seed_default_knowledge()
            return self.collection.count()

        lines = content.splitlines()

        # 1. Parse Proprietary and Amex Cards
        current_tier = "Macy's Prop"
        cards_to_ingest = []
        for line in lines:
            line_s = line.strip()
            if line_s.startswith("### "):
                current_tier = line_s.replace("###", "").strip()
            elif line_s.startswith("*   **Card:**"):
                parts = [p.strip() for p in line_s.replace("*", "").split("|")]
                card_data = {
                    "card_type": f"Macy's {current_tier}" if "tier" in current_tier.lower() or "prop" in current_tier.lower() else current_tier,
                    "notes": f"{current_tier} card"
                }
                for p in parts:
                    if "Card:" in p:
                        card_data["card_number"] = p.split(":")[-1].replace("*", "").strip()
                    elif "CVV:" in p:
                        card_data["cid"] = p.split(":")[-1].replace("*", "").strip()
                    elif "Exp:" in p:
                        card_data["exp"] = p.split(":")[-1].replace("*", "").strip()
                    elif "Note:" in p:
                        card_data["notes"] = p.split(":")[-1].replace("*", "").strip()
                    elif "Tier:" in p:
                        card_data["card_type"] = f"Macy's Amex {p.split(':')[-1].replace('*', '').strip()}"

                if card_data.get("card_number"):
                    cards_to_ingest.append(card_data)

        # 2. Parse Detailed Customer Profiles table
        in_profile_table = False
        for line in lines:
            if "Detailed Customer Profiles" in line:
                in_profile_table = True
                continue
            if in_profile_table:
                if line.startswith("## ") or line.startswith("---"):
                    in_profile_table = False
                    continue
                if "|" in line and not line.strip().startswith("| :---") and "Account Number" not in line:
                    cols = [c.strip() for c in line.strip().strip("|").split("|")]
                    if len(cols) >= 8:
                        cards_to_ingest.append({
                            "card_type": cols[1],
                            "card_number": cols[0],
                            "cid": "" if cols[2] == "N/A" else cols[2],
                            "exp": cols[3],
                            "name": cols[4],
                            "address": cols[5],
                            "phone": cols[6],
                            "notes": f"Customer Profile: {cols[4]} ({cols[7]} - Phone: {cols[6]})"
                        })

        # 3. Parse Generic Test Cards table
        in_generic = False
        for line in lines:
            if "Generic Test Cards" in line:
                in_generic = True
                continue
            if in_generic:
                if line.startswith("## ") or line.startswith("---"):
                    in_generic = False
                    continue
                if "|" in line and not line.strip().startswith("| :---") and "Account Number" not in line:
                    cols = [c.strip() for c in line.strip().strip("|").split("|")]
                    if len(cols) >= 4:
                        cards_to_ingest.append({
                            "card_type": cols[0],
                            "card_number": cols[1],
                            "exp": cols[2],
                            "cid": cols[3],
                            "notes": f"Generic {cols[0]} Sandbox Test Card"
                        })

        # 4. Parse Gift Cards
        gc_matches = re.findall(r"\*\s+(\d{15})\s+(\d{4})\s+-\s+(\$[0-9\.]+)", content)
        for num, pin, amt in gc_matches:
            cards_to_ingest.append({
                "card_type": "Gift Card",
                "card_number": num,
                "cid": pin,
                "amount": amt,
                "notes": f"Active Macy's Gift Card with balance {amt} and PIN {pin}"
            })

        # 5. Parse PayPal Credentials
        if "paypalqe@macys.com" in content:
            cards_to_ingest.append({
                "card_type": "PayPal Sandbox",
                "card_number": "paypalqe@macys.com",
                "cid": "N/A",
                "exp": "N/A",
                "notes": "Verified Macy's PayPal QE Credentials (Password: paypalqe@macys)"
            })

        # 6. Parse Web IDs / Product Types
        test_data_to_ingest = []
        in_web_ids = False
        for line in lines:
            if "Product Type" in line and "Web ID" in line:
                in_web_ids = True
                continue
            if in_web_ids:
                if line.startswith("## ") or line.startswith("---"):
                    in_web_ids = False
                    continue
                if "|" in line and not line.strip().startswith("|---"):
                    cols = [c.strip() for c in line.strip().strip("|").split("|")]
                    if len(cols) >= 2:
                        cat = cols[0]
                        ids_str = cols[1]
                        zip_c = cols[2] if len(cols) > 2 else ""
                        if cat and ids_str:
                            for single_id in [x.strip() for x in ids_str.split(",") if x.strip()]:
                                test_data_to_ingest.append({
                                    "category": cat.upper(),
                                    "product_id": single_id,
                                    "product_name": f"{cat} Test SKU #{single_id}",
                                    "zip_code": zip_c,
                                    "description": f"Verified Web ID for {cat} order flows" + (f" (Store Zip: {zip_c})" if zip_c else "")
                                })

        # 7. Core Feature Specs with rich links
        features_to_ingest = [
            {
                "feature_name": "Credit Card Payment & Apple Pay Express Checkout",
                "platform": "All Platforms",
                "expected_behavior": "Enables customers to checkout seamlessly using Macy's Prop Card, Amex, Visa, MasterCard, Discover, or Apple Pay with real-time CVV and address validation.",
                "potential_issues": "CVV mismatch error, tokenization timeout during high traffic, address verification service (AVS) failure on postal codes.",
                "things_to_observe": "Verify payment authorization token in response wrapper, check that card number is properly masked (showing only last 4 digits), confirm Sentinel logs return HTTP 200 for auth service.",
                "figma_url": "https://www.figma.com/design/example-payment-flow",
                "testcase_urls": ["https://jira.company.com/browse/TC-PAY-001", "https://jira.company.com/browse/TC-PAY-002"],
                "video_urls": ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"],
                "image_urls": ["https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800"]
            },
            {
                "feature_name": "Gift Card & M-Money Redemption Checkout Flow",
                "platform": "All Platforms",
                "expected_behavior": "Allows users to apply 15-digit gift cards with 4-digit CID/PIN up to maximum allowed split-tender amount ($2000 max split tender across up to 5 cards).",
                "potential_issues": "Balance lock during order abandonment, invalid CID retry lockout (max 3 attempts), gift card balance deduction without reservation order ID.",
                "things_to_observe": "Check remaining balance calculation, verify gift card applied status in cart summary, ensure payment lock released if transaction cancels.",
                "figma_url": "https://www.figma.com/design/example-gift-card-flow",
                "testcase_urls": ["https://jira.company.com/browse/TC-GC-101"],
                "video_urls": ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"],
                "image_urls": ["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800"]
            },
            {
                "feature_name": "BOPS Same-Day Store Fulfillment & Curbside Pickup",
                "platform": "All Platforms",
                "expected_behavior": "Buy Online, Pick Up in Store (BOPS) allows customers to reserve inventory in local physical store (e.g. zip 22102) for same-day 2-hour pickup.",
                "potential_issues": "Store inventory stockout between reservation and store associate picking, geofence check-in failure when customer arrives curbside, barcode scan mismatch.",
                "things_to_observe": "Verify reservationId generated in order payload, check store zip code 22102 matching SKU 86800 / 1494, observe curbside notification trigger in customer app.",
                "figma_url": "https://www.figma.com/design/example-bops-flow",
                "testcase_urls": ["https://jira.company.com/browse/TC-BOPS-201", "https://jira.company.com/browse/TC-BOPS-202"],
                "video_urls": ["https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"],
                "image_urls": ["https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800"]
            }
        ]

        ids = []
        docs = []
        metas = []
        embs = []

        for card in cards_to_ingest:
            chunk = chunk_card_item(card)
            emb = generate_embedding(chunk["chunk_text"])
            ids.append(chunk["id"])
            docs.append(chunk["chunk_text"])
            metas.append(to_chroma_metadata(chunk))
            embs.append(emb)

        for td in test_data_to_ingest:
            chunk = chunk_test_data_item(td)
            emb = generate_embedding(chunk["chunk_text"])
            ids.append(chunk["id"])
            docs.append(chunk["chunk_text"])
            metas.append(to_chroma_metadata(chunk))
            embs.append(emb)

        for feat in features_to_ingest:
            chunk = chunk_feature_item(feat)
            emb = generate_embedding(chunk["chunk_text"])
            ids.append(chunk["id"])
            docs.append(chunk["chunk_text"])
            metas.append(to_chroma_metadata(chunk))
            embs.append(emb)

        if ids:
            self.collection.upsert(ids=ids, documents=docs, metadatas=metas, embeddings=embs)
            logger.info(f"Successfully seeded {len(ids)} documents directly from {filepath} into ChromaDB!")

        return len(ids)

    # --------------------------------------------------------------------------
    # Text-Based & LLM-Based Chunking Engine
    # --------------------------------------------------------------------------

    def chunk_text_fixed(
        self,
        text: str,
        chunk_size: int = 500,
        overlap_size: int = 50,
        title_prefix: str = "Document"
    ) -> List[Dict[str, Any]]:
        """
        Splits plain text or markdown using a sliding window of chunk_size with overlap_size.
        Respects natural paragraph, line, and sentence boundaries to avoid splitting mid-word.
        """
        text = text.strip()
        if not text:
            return []

        if len(text) <= chunk_size:
            return [{
                "chunk_index": 1,
                "total_chunks": 1,
                "title": f"{title_prefix} - Complete",
                "text": text,
                "char_count": len(text),
                "word_count": len(text.split()),
                "strategy": "text"
            }]

        chunks = []
        start = 0
        total_len = len(text)
        idx = 1
        safe_chunk_size = max(chunk_size, 100)
        safe_overlap = max(min(overlap_size, safe_chunk_size // 2), 0)

        while start < total_len:
            end = min(start + safe_chunk_size, total_len)
            if end < total_len:
                # Look for paragraph break
                split_at = text.rfind("\n\n", start + safe_chunk_size // 2, end)
                if split_at == -1:
                    # Look for newline break
                    split_at = text.rfind("\n", start + safe_chunk_size // 2, end)
                if split_at == -1:
                    # Look for sentence boundary
                    split_at = text.rfind(". ", start + safe_chunk_size // 2, end)
                    if split_at != -1:
                        split_at += 1
                if split_at == -1:
                    # Look for word boundary space
                    split_at = text.rfind(" ", start + safe_chunk_size // 2, end)
                if split_at != -1:
                    end = split_at

            chunk_str = text[start:end].strip()
            if chunk_str:
                chunks.append({
                    "chunk_index": idx,
                    "title": f"{title_prefix} - Part {idx}",
                    "text": chunk_str,
                    "char_count": len(chunk_str),
                    "word_count": len(chunk_str.split()),
                    "strategy": "text"
                })
                idx += 1

            if end >= total_len:
                break
            start = max(end - safe_overlap, start + 1)

        for c in chunks:
            c["total_chunks"] = len(chunks)
        return chunks

    def _chunk_markdown_fallback(
        self,
        text: str,
        title_prefix: str = "Document",
        fallback_reason: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Intelligent Markdown Semantic Fallback Chunker:
        - NEVER cuts directly or naively across lines, sentences, or tables.
        - Preserves complete markdown tables (| ... |) with their column headers intact.
        - Avoids empty or stub chunks (never outputs a lone header as a chunk).
        - Merges small subsections (< 250 chars) with related parent sections into substantive, proper chunks.
        - Prepends hierarchical breadcrumbs (# Doc > ## Section) so context is preserved without loss.
        """
        lines = [line.rstrip() for line in text.strip().splitlines()]
        if not lines:
            return []

        doc_title = title_prefix
        body_lines = []
        for line in lines:
            if line.startswith("# ") and doc_title == title_prefix:
                doc_title = re.sub(r"^#+\s*", "", line).strip()
            else:
                body_lines.append(line)

        # Parse into semantic sections based on ##, ###, or double-newline blocks
        sections = []
        current_sec_title = f"{doc_title} - Core Content"
        current_sec_lines = []
        in_table = False

        for line in body_lines:
            line_s = line.strip()
            is_header = line_s.startswith("## ") or line_s.startswith("### ") or line_s.startswith("#### ")
            
            # Markdown table detection
            if line_s.startswith("|") and line_s.endswith("|"):
                in_table = True
            else:
                in_table = False

            if is_header and not in_table:
                content_str = "\n".join(current_sec_lines).strip()
                if content_str:
                    sections.append({
                        "title": current_sec_title,
                        "lines": current_sec_lines
                    })
                current_sec_title = re.sub(r"^#+\s*", "", line_s).strip()
                current_sec_lines = [line]
            else:
                current_sec_lines.append(line)

        content_str = "\n".join(current_sec_lines).strip()
        if content_str:
            sections.append({
                "title": current_sec_title,
                "lines": current_sec_lines
            })

        if not sections:
            sections = [{"title": doc_title, "lines": body_lines}]

        # Group small sections (< 250 chars) so we form PROPER, substantive chunks
        proper_chunks = []
        accum_title = None
        accum_lines = []

        for sec in sections:
            sec_text = "\n".join(sec["lines"]).strip()
            if not sec_text:
                continue

            if not accum_lines:
                accum_title = sec["title"]
                accum_lines = list(sec["lines"])
            else:
                accum_len = len("\n".join(accum_lines))
                # Merge if accumulated text is short (< 300 chars) or combined size <= 1200 chars
                if accum_len < 300 or (accum_len + len(sec_text) <= 1200):
                    accum_lines.append("")
                    accum_lines.extend(sec["lines"])
                    if accum_title != sec["title"] and not accum_title.endswith(f"& {sec['title']}"):
                        accum_title = f"{accum_title} & {sec['title']}"
                else:
                    proper_chunks.append({
                        "title": accum_title,
                        "content": "\n".join(accum_lines).strip()
                    })
                    accum_title = sec["title"]
                    accum_lines = list(sec["lines"])

        if accum_lines:
            proper_chunks.append({
                "title": accum_title,
                "content": "\n".join(accum_lines).strip()
            })

        final_chunks = []
        for i, pc in enumerate(proper_chunks):
            content = pc["content"]
            breadcrumb = f"# {doc_title} > ## {pc['title']}"
            if not content.startswith("#"):
                chunk_text = f"{breadcrumb}\n\n{content}"
            else:
                chunk_text = content

            tags = [
                re.sub(r"[^\w]", "_", word.lower())
                for word in re.findall(r"\b[A-Za-z]{3,}\b", pc["title"])
            ][:4]

            final_chunks.append({
                "chunk_index": i + 1,
                "total_chunks": len(proper_chunks),
                "title": f"{doc_title}: {pc['title']}",
                "text": chunk_text,
                "summary": f"Covers {pc['title']} with contextual headers and structured data.",
                "tags": tags or ["qa_document"],
                "char_count": len(chunk_text),
                "word_count": len(chunk_text.split()),
                "strategy": "llm_fallback",
                "fallback_reason": fallback_reason
            })

        if not final_chunks:
            fixed_chunks = self.chunk_text_fixed(text, chunk_size=800, overlap_size=80, title_prefix=title_prefix)
            for fc in fixed_chunks:
                fc["strategy"] = "llm_fallback"
                fc["fallback_reason"] = fallback_reason
            return fixed_chunks

        for c in final_chunks:
            c["total_chunks"] = len(final_chunks)
        return final_chunks

    def chunk_text_llm(
        self,
        text: str,
        instructions: Optional[str] = None,
        title_prefix: str = "Document"
    ) -> List[Dict[str, Any]]:
        """
        Uses Gemini models cascade (gemini-flash-lite-latest -> gemini-3.1-flash-lite)
        to perform intelligent, semantic chunking based on strict meaningful context rules.
        Preserves section titles, table structures, and hierarchical breadcrumbs in each chunk.
        If all LLM models encounter temporary issues (e.g. 503 high demand), gracefully
        falls back to intelligent markdown semantic chunking with full notice.
        """
        client = get_genai_client()
        if not client:
            logger.warning("GenAI client unavailable; using markdown fallback chunker.")
            return self._chunk_markdown_fallback(
                text,
                title_prefix=title_prefix,
                fallback_reason="GenAI client is not configured or unavailable. Smart Markdown Semantic Chunker was used."
            )

        prompt = f"""You are an expert QA Knowledge Base Architect and Document Chunking Specialist.
Your task is to analyze the document and partition it into PROPER, MEANINGFUL, HIGH-QUALITY SEMANTIC CHUNKS for RAG vector search.

MANDATORY RULES FOR MEANINGFUL CHUNKING (NO DIRECT OR BLIND SPLITTING):
1. PROPER CONCEPTUAL CHUNKS (NO DIRECT SPLITTING):
   - Do NOT split directly or arbitrarily by line numbers, word counts, or character limits.
   - Every chunk must represent a COMPLETE, LOGICAL UNIT OF KNOWLEDGE (e.g., an entire feature workflow, a full category of test cards, a complete customer profile with addresses, a complete test case specification, or a cohesive domain topic).
   - If a section is short, combine related sub-items under the same conceptual theme into one proper chunk instead of creating isolated fragments.

2. MEANINGFUL CONTEXTUAL INTEGRITY (ZERO CONTEXT LOSS):
   - Every chunk must begin with explicit hierarchical context breadcrumbs:
     Format: "# {title_prefix} > ## [Section Name] > ### [Topic]"
   - The chunk must be 100% self-explanatory and standalone. An LLM reading ONLY this chunk must understand exactly what system, feature, or entity it refers to, with zero ambiguity and without needing previous or subsequent chunks.
   - Never begin a chunk with an unresolved pronoun ("they", "it", "this") or an orphaned statement. Always anchor it to the specific entity or subject.

3. ATOMIC STRUCTURAL PRESERVATION:
   - NEVER split a Markdown table across chunks. If the document has a table, the complete table (including its column header row and all relevant data rows) must remain together in a single chunk.
   - Keep lists, test step sequences, card credentials (Card Number, Exp, CVV, CID, Balance), and JSON/code blocks completely intact.

4. BALANCED SUBSTANTIVE SIZING:
   - Target optimal semantic chunk size: between 250 and 1,500 characters of meaningful content.
   - Avoid trivial micro-chunks (< 150 characters) or monolithic unsearchable dumps (> 2,500 characters).

5. ACCURATE DESCRIPTIVE METADATA:
   - Provide a precise, descriptive title for every chunk that reflects its exact subject.
   - Provide a concise 1-sentence summary of the chunk's purpose.
   - Provide 3 to 6 targeted keyword tags.

6. USER INSTRUCTIONS / CUSTOM RULES:
   {instructions if instructions and instructions.strip() else 'Apply strict semantic boundaries, preserve complete tables/entities, and prepend hierarchical breadcrumbs to each chunk.'}

Output ONLY valid JSON matching this schema:
{{
  "chunks": [
    {{
      "title": "Descriptive title for this chunk",
      "content": "Exact chunk text including hierarchical breadcrumbs and intact tables/lists",
      "summary": "1 sentence summary explaining the chunk context",
      "tags": ["tag1", "tag2", "tag3"]
    }}
  ]
}}

Document Title: {title_prefix}
Document Content:
{text}
"""
        candidate_models = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite"]
        last_error = None

        for model_name in candidate_models:
            try:
                resp = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                raw = (resp.text or "").strip()
                match = re.search(r"\{.*\}", raw, re.DOTALL)
                if match:
                    data = json.loads(match.group(0))
                    raw_chunks = data.get("chunks", [])
                    if raw_chunks:
                        chunks = []
                        for i, c in enumerate(raw_chunks):
                            c_text = (c.get("content") or "").strip()
                            if not c_text:
                                continue
                            chunks.append({
                                "chunk_index": i + 1,
                                "total_chunks": len(raw_chunks),
                                "title": c.get("title") or f"{title_prefix} - Section {i+1}",
                                "text": c_text,
                                "summary": c.get("summary", ""),
                                "tags": c.get("tags") if isinstance(c.get("tags"), list) else [],
                                "char_count": len(c_text),
                                "word_count": len(c_text.split()),
                                "strategy": "llm"
                            })
                        if chunks:
                            for c in chunks:
                                c["total_chunks"] = len(chunks)
                            return chunks
            except Exception as e:
                last_error = str(e)
                logger.warning(f"LLM model '{model_name}' encountered an error ({e}). Trying next candidate model...")

        fallback_msg = (
            f"Gemini LLM model is currently experiencing high demand or is temporarily unavailable ({last_error or '503 Unavailable'}). "
            "Smart Markdown Semantic Chunker was used as fallback to preserve tables and context without loss."
        )
        logger.warning(f"All LLM candidate models failed; falling back to markdown semantic chunker. Reason: {fallback_msg}")
        return self._chunk_markdown_fallback(text, title_prefix=title_prefix, fallback_reason=fallback_msg)

    def preview_chunks(
        self,
        content: str,
        filename: str = "",
        strategy: str = "llm",
        chunk_size: int = 500,
        overlap_size: int = 50,
        instructions: Optional[str] = None,
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generates chunk previews for user inspection before ingestion into ChromaDB."""
        doc_title = title or filename or "Uploaded Document"
        if strategy == "text":
            chunks = self.chunk_text_fixed(
                text=content,
                chunk_size=chunk_size,
                overlap_size=overlap_size,
                title_prefix=doc_title
            )
        else:
            chunks = self.chunk_text_llm(
                text=content,
                instructions=instructions,
                title_prefix=doc_title
            )

        total_chars = sum(c.get("char_count", 0) for c in chunks)
        total_words = sum(c.get("word_count", 0) for c in chunks)
        fallback_used = any(c.get("strategy") == "llm_fallback" for c in chunks)
        fallback_message = None
        if fallback_used and chunks:
            fallback_message = chunks[0].get("fallback_reason") or (
                "Gemini LLM was temporarily experiencing high demand. "
                "Intelligent Markdown Semantic Chunker was activated to preserve tables and context."
            )

        return {
            "status": "success",
            "strategy": strategy,
            "fallback_used": fallback_used,
            "fallback_message": fallback_message,
            "document_title": doc_title,
            "filename": filename,
            "total_chunks": len(chunks),
            "total_chars": total_chars,
            "total_words": total_words,
            "chunks": chunks
        }

    def ingest_chunks_batch(
        self,
        chunks: List[Dict[str, Any]],
        filename: Optional[str] = None,
        document_title: Optional[str] = None,
        strategy: str = "text"
    ) -> Dict[str, Any]:
        """Ingests a verified list of chunks into ChromaDB."""
        if not chunks:
            return {"status": "error", "message": "No chunks provided to ingest.", "ingested_count": 0}

        ids = []
        docs = []
        metas = []
        embs = []

        source_doc = document_title or filename or "Custom Document"
        created_time = time.time()

        for i, c in enumerate(chunks):
            doc_id = str(c.get("id") or f"doc_{uuid.uuid4().hex[:12]}")
            chunk_title = c.get("title") or f"{source_doc} (Part {i+1})"
            text = c.get("text") or c.get("content") or ""
            if not text.strip():
                continue

            chunk_meta = {
                "source": filename or "direct_paste",
                "document_title": source_doc,
                "chunk_index": i + 1,
                "total_chunks": len(chunks),
                "strategy": strategy,
                "summary": c.get("summary", ""),
                "tags": c.get("tags", [])
            }

            emb = generate_embedding(text)
            chroma_meta = {
                "doc_id": doc_id,
                "entity_type": "document",
                "title": chunk_title,
                "created_at": created_time,
                "source": filename or "direct_paste",
                "document_title": source_doc,
                "chunk_index": i + 1,
                "total_chunks": len(chunks),
                "strategy": strategy,
                "tags": json.dumps(c.get("tags", [])),
                "_full_meta_json": json.dumps(chunk_meta)
            }

            ids.append(doc_id)
            docs.append(text)
            metas.append(chroma_meta)
            embs.append(emb)

        if ids:
            self.collection.upsert(ids=ids, documents=docs, metadatas=metas, embeddings=embs)
            logger.info(f"Ingested {len(ids)} document chunks from '{source_doc}' into ChromaDB.")

        return {
            "status": "success",
            "message": f"Successfully ingested {len(ids)} chunks from '{source_doc}' into ChromaDB.",
            "ingested_count": len(ids)
        }

    def ingest(self, entity_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Ingests a card, feature, or test data item with specialized chunking and vectorization into ChromaDB."""
        if entity_type == "card":
            chunk = chunk_card_item(data)
        elif entity_type == "feature":
            chunk = chunk_feature_item(data)
        else:
            chunk = chunk_test_data_item(data)

        embedding = generate_embedding(chunk["chunk_text"])
        chunk["embedding"] = embedding
        chroma_meta = to_chroma_metadata(chunk)

        self.collection.upsert(
            ids=[chunk["id"]],
            documents=[chunk["chunk_text"]],
            embeddings=[embedding],
            metadatas=[chroma_meta]
        )
        logger.info(f"Ingested {entity_type} document '{chunk['title']}' (ID: {chunk['id']}) into ChromaDB")
        return chunk

    def delete(self, doc_id: str) -> bool:
        """Deletes a single document from ChromaDB."""
        try:
            self.collection.delete(ids=[doc_id])
            logger.info(f"Deleted document {doc_id} from ChromaDB")
            return True
        except Exception as e:
            logger.error(f"Error deleting doc {doc_id} from ChromaDB: {e}")
            return False

    def delete_batch(self, doc_ids: List[str]) -> int:
        """Deletes a batch of user-selected documents from ChromaDB."""
        if not doc_ids:
            return 0
        try:
            self.collection.delete(ids=doc_ids)
            logger.info(f"Batch deleted {len(doc_ids)} documents from ChromaDB")
            return len(doc_ids)
        except Exception as e:
            logger.error(f"Error batch deleting documents from ChromaDB: {e}")
            return 0

    def list_documents(self, filter_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists all documents from ChromaDB with optional entity type filter."""
        where = {"entity_type": filter_type} if (filter_type and filter_type.lower() != "all") else None
        res = self.collection.get(where=where, include=["documents", "metadatas"])
        docs = []
        ids = res.get("ids", [])
        documents = res.get("documents", [])
        metadatas = res.get("metadatas", [])
        for i in range(len(ids)):
            doc = from_chroma_doc(ids[i], documents[i], metadatas[i])
            docs.append(doc)
        docs.sort(key=lambda x: x.get("created_at", 0), reverse=True)
        return docs

    def get_stats(self) -> Dict[str, Any]:
        """Returns total vector count and breakdown of what kind of data is present in ChromaDB."""
        res = self.collection.get(include=["metadatas"])
        metadatas = res.get("metadatas", [])
        try:
            total = self.collection.count()
        except Exception:
            total = len(metadatas)

        features = 0
        cards = 0
        test_data = 0
        documents = 0
        categories: Dict[str, int] = {}
        card_types: Dict[str, int] = {}
        platforms: Dict[str, int] = {}

        for m in metadatas:
            etype = m.get("entity_type", "")
            if etype == "feature":
                features += 1
                plat = m.get("platform") or m.get("target_platform") or "All Platforms"
                platforms[plat] = platforms.get(plat, 0) + 1
            elif etype == "card":
                cards += 1
                ctype = m.get("card_type") or "Credit Card"
                card_types[ctype] = card_types.get(ctype, 0) + 1
            elif etype == "test_data":
                test_data += 1
                cat = str(m.get("category") or "GENERAL").strip().upper()
                categories[cat] = categories.get(cat, 0) + 1
            elif etype in ["document", "doc", "general"]:
                documents += 1

        return {
            "total_vectors": total,
            "features_count": features,
            "cards_count": cards,
            "test_data_count": test_data,
            "documents_count": documents,
            "categories": categories,
            "card_types": card_types,
            "platforms": platforms
        }

    def reseed(self, force: bool = True) -> int:
        """Clears all vectors and re-seeds cleanly from data.txt."""
        if force:
            try:
                all_docs = self.collection.get()
                all_ids = all_docs.get("ids", [])
                if all_ids:
                    self.collection.delete(ids=all_ids)
                    logger.info(f"Purged {len(all_ids)} documents for clean re-seed.")
            except Exception as e:
                logger.warning(f"Error purging documents during reseed: {e}")
        return self.seed_from_data_txt(self.data_txt_file)

    def search(self, query: str, top_k: int = 5, filter_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Executes hybrid semantic search with ChromaDB: combines vector embedding distance
        with exact keyword and ID overlap boosting for cards, Web IDs, and acronyms.
        """
        if not query or not query.strip() or self.collection.count() == 0:
            return []

        query_clean = query.strip()
        query_words = set(re.findall(r"\w+", query_clean.lower()))
        query_embedding = generate_embedding(query_clean)

        where = {"entity_type": filter_type} if filter_type else None
        n_fetch = min(max(top_k * 4, 15), max(self.collection.count(), 1))

        res = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_fetch,
            where=where,
            include=["documents", "metadatas", "distances"]
        )

        scored_results = []
        ids_list = res.get("ids", [[]])
        documents_list = res.get("documents", [[]])
        metadatas_list = res.get("metadatas", [[]])
        distances_list = res.get("distances", [[]])

        ids = ids_list[0] if ids_list else []
        documents = documents_list[0] if documents_list else []
        metadatas = metadatas_list[0] if metadatas_list else []
        distances = distances_list[0] if distances_list else []

        for i in range(len(ids)):
            doc_id = ids[i]
            chunk_text = documents[i]
            raw_meta = metadatas[i]
            doc = from_chroma_doc(doc_id, chunk_text, raw_meta)

            # Cosine distance in Chroma is 1 - similarity. So cosine similarity = 1 - distance
            dist = distances[i] if i < len(distances) else 0.5
            semantic_score = max(0.0, 1.0 - dist)

            # Exact keyword & identifier match boost
            chunk_lower = chunk_text.lower()
            keyword_hits = sum(1 for w in query_words if len(w) > 1 and w in chunk_lower)
            keyword_score = min(0.35, (keyword_hits / max(len(query_words), 1)) * 0.35)

            id_boost = 0.0
            meta = doc.get("metadata", {})
            if meta.get("card_number") and str(meta["card_number"]) in query_clean:
                id_boost += 0.4
            if meta.get("product_id") and str(meta["product_id"]) in query_clean:
                id_boost += 0.4
            if meta.get("category") and str(meta["category"]).lower() in query_clean.lower():
                id_boost += 0.25
            if meta.get("card_type") and str(meta["card_type"]).lower() in query_clean.lower():
                id_boost += 0.25
            if meta.get("name") and str(meta["name"]).lower() in query_clean.lower():
                id_boost += 0.25

            total_score = min(1.0, (semantic_score * 0.65) + keyword_score + id_boost)

            scored_results.append({
                "id": doc["id"],
                "type": doc["type"],
                "title": doc["title"],
                "score": round(total_score, 4),
                "semantic_score": round(semantic_score, 4),
                "chunk_text": doc["chunk_text"],
                "metadata": doc["metadata"]
            })

        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:top_k]

    def seed_default_knowledge(self):
        """Pre-populates ChromaDB vector database with all existing QA cards, Web IDs, and feature specs."""
        logger.info("Seeding initial ChromaDB RAG vector knowledge base...")

        # 1. Seed Cards (Lines 820-882 in original agent.py)
        default_cards = [
            {
                "card_type": "Prop Gold",
                "card_number": "6035340000050209",
                "cid": "655",
                "exp": "07/29",
                "address": "680 Folsom Street 100, Apt 121, SAN FRANCISCO, CA 94107",
                "notes": "Macy's Prop Gold Loyalty Card for in-store and online checkout"
            },
            {
                "card_type": "Prop Platinum",
                "card_number": "6035340399633250",
                "cid": "749",
                "exp": "07/29",
                "address": "680 FOLSOM STREET 100, SAN FRANCISCO, CA 94107",
                "notes": "Macy's Prop Platinum Loyalty Card"
            },
            {
                "card_type": "Macy's Amex",
                "card_number": "377481599274799",
                "cid": "1903",
                "exp": "02/2027",
                "notes": "Macy's Co-branded American Express card"
            },
            {
                "card_type": "Macy's Amex BT",
                "card_number": "377481406011913",
                "cid": "6653",
                "exp": "01/2028",
                "notes": "Macy's Amex Big Ticket Card"
            },
            {
                "card_type": "Working BT Macy's card",
                "card_number": "6035340001224902",
                "notes": "Verified working Big Ticket Macy's card"
            },
            {
                "card_type": "Macy's card 2",
                "card_number": "6035340000050266",
                "cid": "100",
                "notes": "Secondary testing Macy's card"
            },
            {
                "card_type": "American Express",
                "card_number": "3411 1159 7242 000",
                "cid": "1154",
                "exp": "12/22",
                "notes": "Standard Amex payment card"
            },
            {
                "card_type": "Discover",
                "card_number": "6011000991472808",
                "cid": "222",
                "exp": "12/22",
                "notes": "Discover Network payment card"
            },
            {
                "card_type": "MasterCard",
                "card_number": "5444 0099 9922 2205",
                "cid": "222",
                "exp": "12/22",
                "notes": "MasterCard payment card"
            },
            {
                "card_type": "Visa",
                "card_number": "4445222299990007",
                "cid": "222",
                "exp": "12/22",
                "notes": "Visa payment card"
            },
            {
                "card_type": "Gift Card",
                "card_number": "650193392603726",
                "cid": "7416",
                "amount": "$10.00",
                "notes": "Active M-Money / B-Money gift card"
            },
            {
                "card_type": "Gift Card",
                "card_number": "651167392603733",
                "cid": "9669",
                "amount": "$20.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "658119392603742",
                "cid": "1952",
                "amount": "$20.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "651134392603759",
                "cid": "5259",
                "amount": "$20.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "655128392603761",
                "cid": "1554",
                "amount": "$30.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "654120392603773",
                "cid": "2542",
                "amount": "$30.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "650191392603784",
                "cid": "8428",
                "amount": "$40.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "655108392603824",
                "cid": "6412",
                "amount": "$50.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "656183392603837",
                "cid": "8355",
                "amount": "$100.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "656181392603918",
                "cid": "4947",
                "amount": "$120.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "650120392603920",
                "cid": "1972",
                "amount": "$60.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "656117392603948",
                "cid": "3394",
                "amount": "$90.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "651171392603952",
                "cid": "5796",
                "amount": "$130.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "652115392603962",
                "cid": "7936",
                "amount": "$140.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "650106392603979",
                "cid": "8714",
                "amount": "$200.00"
            },
            {
                "card_type": "Gift Card",
                "card_number": "657192392603982",
                "cid": "5867",
                "amount": "$300.00"
            },
            {
                "card_type": "Sandbox Card",
                "card_number": "4111-1111-1111-1111",
                "notes": "Universal sandbox Visa test card"
            },
            {
                "card_type": "Sandbox Card",
                "card_number": "9999-8888-7777-6666",
                "notes": "Sandbox Macy's Loyalty Card"
            }
        ]
        for c in default_cards:
            self.ingest("card", c)

        # 2. Seed Web IDs & Test Data (Lines 785-818 in original agent.py)
        default_test_data = [
            {"category": "BOPS", "product_id": "86800", "product_name": "BOPS Standard Apparel SKU", "zip_code": "22102", "description": "Buy Online Pickup In Store eligible item in Tyson's Corner store"},
            {"category": "BOPS", "product_id": "1494", "product_name": "BOPS Eligible Merchandise", "zip_code": "22102", "description": "Store pickup eligible product"},
            {"category": "BOSS", "product_id": "570992", "product_name": "BOSS Eligible SKU", "zip_code": "22102", "description": "Buy Online Ship to Store merchandise"},
            {"category": "SHIP", "product_id": "86800", "product_name": "Standard Home Delivery SKU", "description": "Ship to Home standard delivery Web ID"},
            {"category": "SHIP", "product_id": "1503", "product_name": "Standard Shipping Item", "description": "STH ground delivery Web ID"},
            {"category": "GWP", "product_id": "1494", "product_name": "Gift With Purchase Qualifying Item", "description": "Triggers complimentary gift at checkout threshold"},
            {"category": "GWP", "product_id": "570992", "product_name": "GWP Eligible Cosmetics SKU", "description": "Beauty category GWP trigger Web ID"},
            {"category": "GWP", "product_id": "75101", "product_name": "GWP Apparel Item", "description": "Apparel GWP qualifying product"},
            {"category": "VGC", "product_id": "4391437", "product_name": "Virtual Gift Card (e-Delivery)", "description": "Electronic gift card delivered via email"},
            {"category": "EGC", "product_id": "10509228", "product_name": "Electronic Gift Card SKU", "description": "EGC digital code product"},
            {"category": "2 TIER", "product_id": "13638432", "product_name": "Two Tier Discount Item", "description": "Eligible for 2-tier promotion bundle discount"},
            {"category": "PWP", "product_id": "570992", "product_name": "Purchase With Purchase Item", "description": "PWP bundle promotion eligible Web ID"},
            {"category": "3P", "product_id": "15313152", "product_name": "Third Party Marketplace Item", "description": "Mirakl 3P marketplace seller fulfilled product"},
            {"category": "3P", "product_id": "15296864", "product_name": "3P Vendor Product SKU", "description": "Marketplace vendor product SKU"},
            {"category": "COLOR & SIZE PDP", "product_id": "16037423", "product_name": "Multi-Color Variant Apparel", "description": "PDP with multiple swatches, colors, and size options"},
            {"category": "COLOR & SIZE PDP", "product_id": "8790118", "product_name": "Apparel Size Grid PDP", "description": "Multi-dimension size grid PDP for regression testing"},
            {"category": "CHANEL PDP", "product_id": "8224326", "product_name": "Chanel Luxury Brand PDP", "description": "Luxury brand excluded from general promo discounts"},
            {"category": "BT - BIG TICKET", "product_id": "1434002", "product_name": "Big Ticket Mattress / Furniture", "description": "Scheduled freight white-glove delivery item"},
            {"category": "BT - BIG TICKET", "product_id": "7117897", "product_name": "Big Ticket Living Room Sofa", "description": "Big ticket freight shipment item"},
            {"category": "LTL", "product_id": "16286842", "product_name": "Less Than Truckload Freight Item", "description": "LTL freight delivery eligible Web ID"},
            {"category": "WNM", "product_id": "16182527", "product_name": "White Glove Delivery Item", "description": "Special handling white glove delivery Web ID"},
            {"category": "PAYPAL", "product_id": "PAYPAL-QA", "product_name": "PayPal Sandbox Account", "description": "User: paypalqe@macys.com | Pass: paypalqe@macys"}
        ]
        for t in default_test_data:
            self.ingest("test_data", t)

        # 3. Seed Sample Features with rich video/image links, expected behavior, and watchouts
        default_features = [
            {
                "name": "BOPS Same-Day Store Fulfillment Flow",
                "platform": "MCOM Site & App",
                "expected": "Customer chooses 'Pick Up In Store', selects store by zip (e.g. 22102), and completes checkout. Reservation ID is generated, and status moves from RESERVED -> SHPSHPD once store fulfills.",
                "issues": "Inventory mismatch between warehouse and physical store can cause cancellation; reservationId wrapper response missing in order mods payload if order is STH.",
                "observe": "Check that reservation ID is non-empty; verify SHPSHPD status update event completes with 200 HTTP response code; inspect store hours in confirmation email.",
                "image_url": "https://images.unsplash.com/photo-1555421689-491a97ff2040?w=800&auto=format&fit=crop&q=60",
                "video_url": "https://www.w3schools.com/html/mov_bbb.mp4"
            },
            {
                "name": "Star Money Loyalty Rewards Redemption",
                "platform": "MCOM Site & App",
                "expected": "Eligible Macy's Cardholders earn reward dollars on purchases. During checkout, available Star Money balance appears automatically and can be applied in $10 increments.",
                "issues": "If loyalty card number format is invalid or expired, rewards fail to load; partial refunds may cause temporary lock on reward dollars.",
                "observe": "Verify rewards balance reduces by chosen redemption amount; verify order total adjusts correctly with zero tax discrepancy.",
                "image_url": "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=60",
                "video_url": "https://www.w3schools.com/html/mov_bbb.mp4"
            },
            {
                "name": "M-Money / B-Money Customer Account Funding",
                "platform": "All Platforms (MCOM & BCOM)",
                "expected": "Automated provisioning of gift card funding into target customer account across environments (e.g. mcom-131, mcom-170, bcom-131). Up to 4 cards funded with $30 each in under 5 seconds.",
                "issues": "Account must exist in the target environment database; corporate VPN required to access internal loyalty automation endpoint.",
                "observe": "Check Postman response wrapper for status='SUCCESS'; verify balance reflects in customer profile wallet immediately.",
                "image_url": "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=60",
                "video_url": "https://www.w3schools.com/html/mov_bbb.mp4"
            }
        ]
        for f in default_features:
            self.ingest("feature", f)

        logger.info(f"ChromaDB RAG Vector Knowledge Base successfully seeded with {self.collection.count()} vectors.")

# Singleton instance
rag_store = RAGVectorStore()
