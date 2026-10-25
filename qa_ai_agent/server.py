import os
import ssl
import uuid
import json
import base64
import logging
import inspect
import time

# SSL verification patch for corporate proxy environments
ssl._create_default_https_context = ssl._create_unverified_context
try:
    import aiohttp.connector
    aiohttp.connector.TCPConnector._get_ssl_context = lambda self, req: getattr(aiohttp.connector, '_SSL_CONTEXT_UNVERIFIED', None)
except Exception:
    pass

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TestSenseAI_Server")

# Auto-load .env files if GOOGLE_API_KEY is not set in shell environment
if not os.environ.get("GOOGLE_API_KEY"):
    env_paths = [
        os.path.join(os.path.dirname(__file__), ".env"),
        os.path.join(os.path.dirname(__file__), "multi_tool_agent", ".env")
    ]
    for env_path in env_paths:
        if os.path.exists(env_path):
            logger.info(f"Loading environment variables from: {env_path}")
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        key_str = k.strip()
                        val_str = v.strip().strip("'\"")
                        if key_str and not os.environ.get(key_str):
                            os.environ[key_str] = val_str

# Import the Google ADK root_agent
try:
    from multi_tool_agent.agent import root_agent
except ImportError:
    from qa_ai_agent.multi_tool_agent.agent import root_agent

app = FastAPI(
    title="TestSense AI Agent API & Web UI",
    description="Production REST API wrapper & Web Interface for Google ADK TestSense AI Agent",
    version="1.0.0"
)

# Enable CORS for file:// and cross-origin browser requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prevent browser/proxy caching for dynamic API and RAG endpoints
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Mount Frontend Web UI statically if directory exists
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/app", StaticFiles(directory=frontend_dir, html=True), name="frontend")

# Initialize global Session Service singleton
SESSION_SERVICE = None
try:
    from google.adk.sessions import InMemorySessionService
    SESSION_SERVICE = InMemorySessionService()
except Exception as e:
    logger.warning(f"InMemorySessionService import notice: {e}")

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

# Persistent storage file for sessions (Detect Vercel / AWS Lambda serverless read-only filesystem)
is_serverless = _detect_readonly_filesystem()
DEFAULT_SESSIONS_FILE = os.path.join(os.path.dirname(__file__), "sessions_store.json")
SESSIONS_FILE = "/tmp/sessions_store.json" if is_serverless else DEFAULT_SESSIONS_FILE

def load_sessions_db() -> Dict[str, Dict[str, Any]]:
    # In serverless environments, check writable /tmp file first
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            logger.warning(f"Failed to load sessions from {SESSIONS_FILE}: {e}")

    # Fall back to repository default sessions if available
    if os.path.exists(DEFAULT_SESSIONS_FILE):
        try:
            with open(DEFAULT_SESSIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception as e:
            logger.warning(f"Failed to load default sessions from {DEFAULT_SESSIONS_FILE}: {e}")

    return {}

def save_sessions_db():
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(SESSIONS_DB, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save sessions to {SESSIONS_FILE}: {e}")

# In-memory sessions store with file backup
SESSIONS_DB: Dict[str, Dict[str, Any]] = load_sessions_db()

def safe_json_convert(obj: Any) -> Any:
    """Recursively converts objects to JSON-safe structures, preventing UnicodeDecodeError on raw bytes."""
    if isinstance(obj, bytes):
        try:
            return obj.decode("utf-8")
        except Exception:
            return base64.b64encode(obj).decode("ascii")
    elif isinstance(obj, dict):
        return {k: safe_json_convert(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [safe_json_convert(x) for x in obj]
    elif hasattr(obj, "model_dump_json"):
        try:
            return json.loads(obj.model_dump_json())
        except Exception:
            pass
    if hasattr(obj, "model_dump"):
        try:
            return safe_json_convert(obj.model_dump(by_alias=True, exclude_none=True))
        except Exception:
            pass
    if hasattr(obj, "dict"):
        try:
            return safe_json_convert(obj.dict(by_alias=True, exclude_none=True))
        except Exception:
            pass
    return str(obj) if not isinstance(obj, (int, float, bool, type(None), str)) else obj

async def _ensure_session_registered(app_name: str, user_id: str, session_id: str):
    """Ensures a session exists in the global SESSION_SERVICE."""
    if not SESSION_SERVICE:
        return
    try:
        sess = None
        if hasattr(SESSION_SERVICE, "get_session_async"):
            sess = await SESSION_SERVICE.get_session_async(app_name=app_name, user_id=user_id, session_id=session_id)
        elif hasattr(SESSION_SERVICE, "get_session"):
            res = SESSION_SERVICE.get_session(app_name=app_name, user_id=user_id, session_id=session_id)
            sess = await res if inspect.isawaitable(res) else res
        
        if not sess:
            if hasattr(SESSION_SERVICE, "create_session_async"):
                await SESSION_SERVICE.create_session_async(app_name=app_name, user_id=user_id, session_id=session_id)
            elif hasattr(SESSION_SERVICE, "create_session"):
                res = SESSION_SERVICE.create_session(app_name=app_name, user_id=user_id, session_id=session_id)
                if inspect.isawaitable(res):
                    await res
    except Exception as err:
        logger.debug(f"Session register helper notice: {err}")

@app.get("/")
def health_check(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/app/")
    return {
        "status": "online",
        "agent": root_agent.name,
        "description": root_agent.description,
        "framework": "Google ADK (Agent Development Kit)",
        "web_ui": "/app",
        "api_key_configured": bool(os.environ.get("GOOGLE_API_KEY")),
        "sessions_count": len(SESSIONS_DB)
    }

class SessionCreateRequest(BaseModel):
    sessionId: Optional[str] = None
    title: Optional[str] = "New Chat"

# ADK Session List Endpoint for a User
@app.get("/apps/{app_name}/users/{user_id}/sessions")
async def list_adk_sessions(app_name: str, user_id: str):
    user_sessions = []
    for sid, sdata in SESSIONS_DB.items():
        if sdata.get("userId") == user_id and sdata.get("appName") == app_name:
            user_sessions.append(sdata)
    
    # Sort newest first
    user_sessions.sort(key=lambda s: s.get("updatedAt", s.get("createdAt", 0)), reverse=True)
    return {"sessions": user_sessions}

# ADK Session Creation Endpoint
@app.post("/apps/{app_name}/users/{user_id}/sessions")
async def create_adk_session(app_name: str, user_id: str, request_data: Optional[SessionCreateRequest] = None):
    session_id = (request_data.sessionId if request_data and request_data.sessionId else None) or str(uuid.uuid4())
    title = (request_data.title if request_data and request_data.title else None) or "New Chat"
    await _ensure_session_registered(app_name, user_id, session_id)
    
    now = time.time()
    if session_id not in SESSIONS_DB:
        SESSIONS_DB[session_id] = {
            "id": session_id,
            "appName": app_name,
            "userId": user_id,
            "title": title,
            "createdAt": now,
            "updatedAt": now,
            "state": {},
            "events": []
        }
    else:
        if title and title != "New Chat":
            SESSIONS_DB[session_id]["title"] = title
        SESSIONS_DB[session_id]["updatedAt"] = now

    save_sessions_db()
    return SESSIONS_DB[session_id]

# ADK Session Get Endpoint
@app.get("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def get_adk_session(app_name: str, user_id: str, session_id: str):
    await _ensure_session_registered(app_name, user_id, session_id)
    if session_id not in SESSIONS_DB:
        now = time.time()
        SESSIONS_DB[session_id] = {
            "id": session_id,
            "appName": app_name,
            "userId": user_id,
            "title": f"Chat {session_id[:8]}",
            "createdAt": now,
            "updatedAt": now,
            "state": {},
            "events": []
        }
        save_sessions_db()
    return SESSIONS_DB[session_id]

# ADK Session Delete Endpoint
@app.delete("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def delete_adk_session(app_name: str, user_id: str, session_id: str):
    if SESSION_SERVICE:
        try:
            res = SESSION_SERVICE.delete_session(app_name=app_name, user_id=user_id, session_id=session_id)
            if inspect.isawaitable(res):
                await res
        except Exception as e:
            logger.debug(f"SESSION_SERVICE delete notice: {e}")
    if session_id in SESSIONS_DB:
        del SESSIONS_DB[session_id]
        save_sessions_db()
    return {"status": "deleted", "id": session_id}

# Models for /run endpoint
class PartModel(BaseModel):
    text: Optional[str] = None

class MessageModel(BaseModel):
    role: str
    parts: List[PartModel]

class RunAgentRequest(BaseModel):
    appName: Optional[str] = "multi_tool_agent"
    userId: str
    sessionId: str
    newMessage: Optional[MessageModel] = None

@app.post("/run")
async def run_agent(request: RunAgentRequest):
    prompt_text = ""
    if request.newMessage and request.newMessage.parts:
        prompt_text = " ".join([p.text for p in request.newMessage.parts if p.text])

    if not prompt_text:
        raise HTTPException(status_code=400, detail="Prompt text cannot be empty.")

    target_app = request.appName or "multi_tool_agent"
    await _ensure_session_registered(target_app, request.userId, request.sessionId)

    now = time.time()
    if request.sessionId not in SESSIONS_DB:
        SESSIONS_DB[request.sessionId] = {
            "id": request.sessionId,
            "appName": target_app,
            "userId": request.userId,
            "title": (prompt_text[:35] + "...") if len(prompt_text) > 35 else prompt_text,
            "createdAt": now,
            "updatedAt": now,
            "state": {},
            "events": []
        }
    else:
        # Auto-update title if it is default "New Chat"
        if SESSIONS_DB[request.sessionId].get("title") in ("New Chat", None, ""):
            SESSIONS_DB[request.sessionId]["title"] = (prompt_text[:35] + "...") if len(prompt_text) > 35 else prompt_text
        SESSIONS_DB[request.sessionId]["updatedAt"] = now

    # Record user message event in session history
    user_event = {
        "content": {
            "role": "user",
            "parts": [{"text": prompt_text}]
        },
        "author": request.userId,
        "timestamp": now
    }
    SESSIONS_DB[request.sessionId].setdefault("events", []).append(user_event)

    events_list = []
    try:
        from google.adk.runners import Runner
        
        ContentClass = None
        PartClass = None
        for mod_name in ["google.adk.events", "google.adk.types", "google.adk.models", "google.genai.types"]:
            try:
                mod = __import__(mod_name, fromlist=["Content", "Part"])
                ContentClass = getattr(mod, "Content", None)
                PartClass = getattr(mod, "Part", None)
                if ContentClass and PartClass:
                    break
            except ImportError:
                continue

        if ContentClass and PartClass:
            new_msg = ContentClass(role="user", parts=[PartClass(text=prompt_text)])
        elif ContentClass:
            new_msg = ContentClass(role="user", parts=[{"text": prompt_text}])
        else:
            class ContentWrapper:
                def __init__(self, role, parts):
                    self.role = role
                    self.parts = parts
            class PartWrapper:
                def __init__(self, text):
                    self.text = text
            new_msg = ContentWrapper(role="user", parts=[PartWrapper(text=prompt_text)])

        runner = Runner(agent=root_agent, session_service=SESSION_SERVICE, app_name=target_app)
        
        # Execute turn via Runner
        run_res = runner.run_async(
            user_id=request.userId,
            session_id=request.sessionId,
            new_message=new_msg
        )
        
        if hasattr(run_res, "__aiter__"):
            async for ev in run_res:
                events_list.append(ev)
        elif hasattr(run_res, "__iter__"):
            for ev in run_res:
                events_list.append(ev)
        elif inspect.isawaitable(run_res):
            res = await run_res
            events_list = res if isinstance(res, list) else [res]
        else:
            events_list = [run_res]

    except Exception as adk_err:
        logger.warning(f"Google ADK Runner notice: {adk_err}")

    # Convert events safely to JSON
    serialized = [safe_json_convert(ev) for ev in events_list]
    serialized = [s for s in serialized if s]

    if not serialized:
        serialized = [
            {
                "modelVersion": "gemini-3.1-flash-lite",
                "content": {
                    "role": "model",
                    "parts": [
                        {
                            "text": f"Agent {root_agent.name} received: '{prompt_text}'."
                        }
                    ]
                },
                "finishReason": "STOP",
                "author": root_agent.name
            }
        ]

    # Append response events to session history and persist
    for ev in serialized:
        SESSIONS_DB[request.sessionId]["events"].append(ev)
    SESSIONS_DB[request.sessionId]["updatedAt"] = time.time()
    save_sessions_db()

    return serialized

# ==============================================================================
# RAG Vector Store & Ingestion Dashboard API Endpoints
# ==============================================================================
from rag_service import rag_store

class RAGIngestRequest(BaseModel):
    entity_type: str  # "feature", "card", "test_data"
    data: Optional[Dict[str, Any]] = None
    payload: Optional[Dict[str, Any]] = None

class RAGSearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    limit: Optional[int] = None
    filter_type: Optional[str] = None

class RAGBatchDeleteRequest(BaseModel):
    ids: List[str]

@app.get("/api/rag/stats")
async def get_rag_stats():
    """Returns total vector count and breakdown by entity type, category, and card type from ChromaDB."""
    return rag_store.get_stats()

@app.get("/api/rag/documents")
async def list_rag_documents(filter_type: Optional[str] = None, search: Optional[str] = None):
    """Lists all vectorized documents from ChromaDB with optional filtering and search."""
    docs = rag_store.list_documents(filter_type=filter_type)
    if search and search.strip():
        q = search.strip().lower()
        docs = [d for d in docs if q in d.get("title", "").lower() or q in d.get("chunk_text", "").lower()]
    return {"documents": docs, "total": len(docs)}

@app.post("/api/rag/ingest")
async def ingest_rag_document(req: RAGIngestRequest):
    """
    Ingests a new feature, card, or test data entity.
    Applies specialized chunking, converts to vector embeddings, and stores in ChromaDB.
    """
    if req.entity_type not in ["feature", "card", "test_data"]:
        raise HTTPException(status_code=400, detail="entity_type must be 'feature', 'card', or 'test_data'.")
    
    payload = req.data if req.data is not None else req.payload
    if not payload or not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="data/payload cannot be empty.")

    try:
        chunk = rag_store.ingest(req.entity_type, payload)
        # Return without the raw embedding vector
        clean_chunk = {k: v for k, v in chunk.items() if k != "embedding"}
        return {
            "status": "success",
            "message": f"Successfully vectorized and ingested {req.entity_type} into ChromaDB Knowledge Base.",
            "document": clean_chunk
        }
    except Exception as e:
        logger.error(f"Error during RAG ingestion: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest: {str(e)}")

@app.delete("/api/rag/documents/{doc_id}")
async def delete_rag_document(doc_id: str):
    """Deletes a single document from ChromaDB."""
    success = rag_store.delete(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document ID not found in vector store.")
    return {"status": "success", "message": f"Deleted document {doc_id} from ChromaDB."}

@app.post("/api/rag/documents/batch-delete")
async def batch_delete_rag_documents(req: RAGBatchDeleteRequest):
    """Deletes a selected batch of documents from ChromaDB."""
    if not req.ids:
        raise HTTPException(status_code=400, detail="Document IDs list cannot be empty.")
    deleted_count = rag_store.delete_batch(req.ids)
    return {
        "status": "success",
        "message": f"Successfully deleted {deleted_count} documents from ChromaDB.",
        "deleted_count": deleted_count
    }

@app.post("/api/rag/search")
async def search_rag_vectors(req: RAGSearchRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")
    top_k = req.limit or req.top_k or 5
    results = rag_store.search(query=req.query, top_k=top_k, filter_type=req.filter_type)
    return {"query": req.query, "results": results, "count": len(results)}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)
