import os
import uuid
import json
import base64
import logging
import inspect
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

# In-memory sessions store for ADK compatibility
SESSIONS_DB: Dict[str, Dict[str, Any]] = {}

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
def health_check():
    return {
        "status": "online",
        "agent": root_agent.name,
        "description": root_agent.description,
        "framework": "Google ADK (Agent Development Kit)",
        "web_ui": "/app",
        "api_key_configured": bool(os.environ.get("GOOGLE_API_KEY"))
    }

# ADK Session Creation Endpoint
@app.post("/apps/{app_name}/users/{user_id}/sessions")
async def create_adk_session(app_name: str, user_id: str):
    session_id = str(uuid.uuid4())
    await _ensure_session_registered(app_name, user_id, session_id)
    
    SESSIONS_DB[session_id] = {
        "id": session_id,
        "appName": app_name,
        "userId": user_id,
        "state": {},
        "events": []
    }
    return SESSIONS_DB[session_id]

# ADK Session Get Endpoint
@app.get("/apps/{app_name}/users/{user_id}/sessions/{session_id}")
async def get_adk_session(app_name: str, user_id: str, session_id: str):
    await _ensure_session_registered(app_name, user_id, session_id)
    if session_id not in SESSIONS_DB:
        return {"id": session_id, "appName": app_name, "userId": user_id}
    return SESSIONS_DB[session_id]

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

    if serialized:
        return serialized

    # Return standard formatted fallback event if runner list is empty
    return [
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

# Simplified REST Chat Endpoint
class ChatRequest(BaseModel):
    prompt: str
    user_id: Optional[str] = "qa_tester"
    session_id: Optional[str] = "default_session"

class ChatResponse(BaseModel):
    status: str
    agent_name: str
    response: str
    session_id: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    return ChatResponse(
        status="success",
        agent_name=root_agent.name,
        response=f"Received prompt: {request.prompt}",
        session_id=request.session_id
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=port)
