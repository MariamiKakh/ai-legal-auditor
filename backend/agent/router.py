from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
import traceback
from backend.auth.jwt import get_current_user
from backend.auth.models import User

from backend.agent.orchestrator import run_audit, AuditReport

router = APIRouter(prefix="/api/v1/audit", tags=["audit"])



class AuditRequest(BaseModel):
    contract_name: str = Field(..., description="Contract filename e.g. 'contract_01.pdf'")
@router.post("/analyze", response_model= AuditReport, status_code=status.HTTP_200_OK)

def analyze_contract(request: AuditRequest, curent_user: User = Depends(get_current_user)):
    try: 
        report = run_audit(request.contract_name)
        return report
    except Exception as e:
        traceback.print_exc() 
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail = {"error" : "Audit failed", "detail": str(e)}
        )