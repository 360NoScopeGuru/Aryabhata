from pydantic import BaseModel
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

class BlendRequest(BaseModel):
    conversation_id: str
    messages: List[Message]
    models: List[str]
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: Optional[int] = None
    max_tokens: int = 2048

class ImageRequest(BaseModel):
    conversation_id: str
    prompt: str
    model: str = "black-forest-labs/flux.1-dev"
    width: int = 1024
    height: int = 1024
    steps: int = 35

class ConversationCreate(BaseModel):
    title: str
    mode: str = "chat"
    model: Optional[str] = None

class RouteRequest(BaseModel):
    prompt: str
