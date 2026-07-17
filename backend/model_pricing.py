"""Illustrative per-model cost estimates, in USD per 1M output tokens.

These are NOT live NVIDIA NIM pricing — NIM's actual billing varies by
deployment and isn't exposed via a public API this app can query. Figures
here are representative of typical hosted-inference pricing for comparably
sized open-weight models, used only to give the eval dashboard a relative
cost signal across models (same spirit as the existing CO2 estimate in
Insights.tsx, which is also labelled "est."). Do not treat as billing data.
"""

# $ per 1M output tokens, keyed by model id (same ids as MODEL_LABELS in blend.py).
_PRICE_PER_1M_TOKENS: dict[str, float] = {
    # Meta
    "meta/llama-3.2-3b-instruct": 0.06,
    "meta/llama-3.1-8b-instruct": 0.20,
    "meta/llama-3.2-11b-vision-instruct": 0.20,
    "meta/llama-3.1-70b-instruct": 0.90,
    "meta/llama-3.3-70b-instruct": 0.90,
    "meta/llama-3.2-90b-vision-instruct": 1.20,
    "meta/llama-3.1-405b-instruct": 3.50,
    "meta/llama-4-scout-17b-16e-instruct": 0.70,
    "meta/llama-4-maverick-17b-128e-instruct": 1.00,
    # Mistral
    "mistralai/mistral-7b-instruct-v0.3": 0.25,
    "mistralai/mistral-nemo-12b-instruct": 0.30,
    "mistralai/mixtral-8x7b-instruct-v0.1": 0.60,
    "mistralai/codestral-22b-instruct-v0.1": 0.90,
    "mistralai/mixtral-8x22b-instruct-v0.1": 1.20,
    "mistralai/mistral-large-3-675b-instruct-2512": 6.00,
    # Google
    "google/gemma-2-9b-it": 0.20,
    "google/codegemma-7b-it": 0.20,
    "google/gemma-2-27b-it": 0.55,
    "google/gemma-3-12b-it": 0.30,
    "google/gemma-3-27b-it": 0.55,
    # Microsoft
    "microsoft/phi-3-mini-128k-instruct": 0.13,
    "microsoft/phi-3.5-mini-instruct": 0.13,
    "microsoft/phi-3-medium-128k-instruct": 0.40,
    "microsoft/phi-4": 0.40,
    # Qwen
    "qwen/qwen2.5-7b-instruct": 0.20,
    "qwen/qwen2.5-72b-instruct": 0.90,
    "qwen/qwq-32b": 0.60,
    # DeepSeek
    "deepseek-ai/deepseek-r1-distill-qwen-7b": 0.20,
    "deepseek-ai/deepseek-r1-distill-llama-70b": 0.90,
    "deepseek-ai/deepseek-r1": 2.20,
    "deepseek-ai/deepseek-v3": 1.10,
    # NVIDIA
    "nvidia/llama-3.1-nemotron-nano-8b-v1": 0.20,
    "nvidia/llama-3.1-nemotron-70b-instruct": 0.90,
    "nvidia/llama-3.3-nemotron-super-49b-v1": 1.30,
    # Cohere
    "cohere/command-r-08-2024": 0.60,
    "cohere/command-r-plus-04-2024": 3.00,
    # IBM
    "ibm/granite-3.0-8b-instruct": 0.20,
    "ibm/granite-34b-code-instruct": 0.80,
}

_DEFAULT_PRICE_PER_1M = 0.90  # fallback for models not in the table above (e.g. "blend")


def estimate_cost_usd(model_id: str | None, output_tokens: int) -> float:
    price = _PRICE_PER_1M_TOKENS.get(model_id or "", _DEFAULT_PRICE_PER_1M)
    return round((output_tokens / 1_000_000) * price, 6)
