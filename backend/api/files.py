import os
from fastapi import APIRouter, Depends
from backend.auth.jwt import get_current_user
from backend.auth.models import User

router = APIRouter(prefix="/api/v1/files", tags=["files"])

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "documents")


@router.get("")
def list_files(current_user: User = Depends(get_current_user)):
    contracts_dir = os.path.join(BASE_DIR, "contracts")
    policies_dir = os.path.join(BASE_DIR, "policies")

    contracts = sorted([
        f for f in os.listdir(contracts_dir)
        if f.endswith(".pdf")
    ])

    policies = sorted([
        f for f in os.listdir(policies_dir)
        if f.endswith(".pdf")
    ])

    return {
        "contracts": contracts,
        "policies": policies,
    }
