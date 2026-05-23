from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import anthropic

from backend.auth.jwt import get_current_user
from backend.auth.models import User
from backend.config import ANTHROPIC_API_KEY

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    audit_context: Optional[str] = None
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest, current_user: User = Depends(get_current_user)):
    try:
        system_prompt = (
            "You are a helpful legal compliance assistant. "
            "You help users understand contract audit reports and answer questions about "
            "compliance issues, policy violations, and legal clauses."
        )

        if request.audit_context:
            system_prompt += (
                f"\n\nThe user is looking at the following audit report:\n{request.audit_context}"
            )

        messages = [
            {"role": msg.role, "content": msg.content}
            for msg in request.history
        ]
        messages.append({"role": "user", "content": request.message})

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )

        reply = response.content[0].text
        return ChatResponse(reply=reply)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Chat failed", "detail": str(e)},
        )
