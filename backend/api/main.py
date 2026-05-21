from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.auth.database import Base, engine
from backend.auth.routes import router as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Legal Auditor", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
