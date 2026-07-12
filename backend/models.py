from pydantic import BaseModel, Field


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    conversation_id: str
    messages: list[Message]
    model: str = "meta/llama-3.1-70b-instruct"
    auto_route: bool = False
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: int | None = None
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    max_tokens: int = 4096
    system_prompt: str | None = None


class CodeRequest(BaseModel):
    conversation_id: str
    messages: list[Message]
    model: str = "meta/llama-3.1-405b-instruct"
    language: str | None = None
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: int | None = None
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    max_tokens: int = 4096
    system_prompt: str | None = None


class BlendRequest(BaseModel):
    conversation_id: str
    messages: list[Message]
    models: list[str]
    temperature: float = 0.7
    top_p: float = 0.95
    top_k: int | None = None
    max_tokens: int = 2048
    system_prompt: str | None = None


ALLOWED_IMAGE_MODELS = frozenset(
    {
        "black-forest-labs/flux.1-schnell",
        "black-forest-labs/flux.1-dev",
    }
)


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
    model: str | None = None


class RouteRequest(BaseModel):
    prompt: str


class EnhanceRequest(BaseModel):
    text: str


class VoteRequest(BaseModel):
    conv_id: str
    msg_id: str
    model_id: str
    prompt_hash: str
