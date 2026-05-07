from pydantic import BaseModel, Field
from typing import Optional, List

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    conversation_id: str
    messages: List[Message]
    model: str = "meta/llama-3.1-70b-instruct"
    auto_route: bool = False
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: Optional[int] = None
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    max_tokens: int = 4096
    system_prompt: Optional[str] = None

class CodeRequest(BaseModel):
    conversation_id: str
    messages: List[Message]
    model: str = "meta/llama-3.1-405b-instruct"
    language: Optional[str] = None
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: Optional[int] = None
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    max_tokens: int = 4096
    system_prompt: Optional[str] = None

class BlendRequest(BaseModel):
    conversation_id: str
    messages: List[Message]
    models: List[str]
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: Optional[int] = None
    max_tokens: int = 2048
    system_prompt: Optional[str] = None

ALLOWED_IMAGE_MODELS = frozenset({
    "black-forest-labs/flux.1-schnell",
    "black-forest-labs/flux.1-dev",
})

class ImageRequest(BaseModel):
    conversation_id: str
    prompt: str = Field(min_length=1, max_length=8000)
    model: str = "black-forest-labs/flux.1-dev"
    width: int = Field(default=1024, ge=64, le=2048)
    height: int = Field(default=1024, ge=64, le=2048)
    steps: int = Field(default=35, ge=1, le=100)

class ConversationCreate(BaseModel):
    title: str
    mode: str = "chat"
    model: Optional[str] = None

class RouteRequest(BaseModel):
    prompt: str

class EnhanceRequest(BaseModel):
    text: str

class VoteRequest(BaseModel):
    conv_id: str
    msg_id: str
    model_id: str
    prompt_hash: str
