import os
from typing import Any, Dict, List, Optional
import httpx
from backend.app.core.config import settings

class MetaAIProvider:
    """
    Production-grade Meta AI Model Provider supporting Meta Muse Spark
    and Meta Open-weight inference endpoints via the official Meta Model API schema.
    """

    def __init__(self):
        self.api_key = settings.META_API_KEY
        self.base_url = settings.META_API_BASE_URL.rstrip("/")
        self.model = settings.META_MODEL

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    def get_status(self) -> Dict[str, Any]:
        return {
            "provider": "Meta Model API",
            "model": self.model,
            "base_url": self.base_url,
            "configured": self.is_configured(),
            "mode": "META_API_ONLINE" if self.is_configured() else "OFFLINE_DETERMINISTIC",
            "message": "Connected to Meta AI endpoints" if self.is_configured() else "Offline deterministic development mode active (No Meta API key required)"
        }

    async def call_meta_model(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        """
        Sends requests to the Meta Model API.
        """
        if not self.is_configured():
            raise RuntimeError("Meta API key is not configured. Falling back to deterministic agent.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-Meta-Client": "EdgeForge-Engine/1.0"
        }

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048,
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            return response.json()

meta_provider = MetaAIProvider()
