# AI Legal Repository Auditor

An automated compliance checking platform for legal documents. The system
checks contracts against company policy documents using RAG, MCP, and the
Claude API, and generates a structured compliance report.

## Demo

1. Log in → select a contract from the file explorer
2. Click **Run Compliance Audit**
3. The agent reads the contract and searches company policies
4. A full report appears: violations (with severity), warnings, compliant clauses, and a summary
5. Use the **Contract Chat** to ask questions or request suggested fixes

## Project Structure

ai-legal-auditor/
├── backend/
│   ├── auth/          # login, register, JWT tokens
│   ├── api/           # all FastAPI routes go here
│   ├── mcp_server/    # MCP server setup
│   ├── rag/           #PDF loading, chunking, ChromaDB
│   ├── agent/         # the compliance agent — I wrote this by hand
│   └── documents/
│       ├── policies/  #the 8 company policy PDFs
│       └── contracts/ #the 5 contracts to audit
├── frontend/
│   └── src/
│       ├── pages/        # Login, Register, Dashboard
│       ├── components/   # FileExplorer, AuditReport, ChatWindow
│       └── api/          # axios client with JWT headers
├── .claude/
│   └── skills/        # custom slash commands for Claude Code
├── CLAUDE.md
└── README.md

## Tech Stack

Backend: Python + FastAPI
Auth: JWT tokens + SQLite
Vector DB: ChromaDB
Embeddings: sentence-transformers/all-MiniLM-L6-v2
MCP: @modelcontextprotocol/server-filesystem
AI: Claude API (claude-haiku-4-5-20251001)
Frontend: React + Vite + Axios


## Setup

### Requirements
- Python 3.10+
- Node.js 18+
- An Anthropic API key

### Installation

```bash
python -m venv venv
source venv/bin/activate 


pip install -r backend/requirements.txt


cd backend/mcp_server
npm install
cd ../..

cp .env.example .env


python backend/rag/embed_policies.py


uvicorn backend.api.main:app --reload


cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs


## How the Agent Works (Task 2)

    The agent runs a `while True` loop that continues as long as claude 
is making tool calls. On each iteration it sends the full conversation 
history to the Claude API. If the response comes back with 
`stop_reason == "tool_use"`, the agent executes whatever tools Claude 
requested, appends the results back into the messages list as a user 
message, and loops again. Claude sees the tool results and decides 
whether to call more tools or finish. When it's done reasoning, it 
returns `stop_reason == "end_turn"` and the loop breaks. The agent 
never decides how many tool calls to make , Claude does.

    Tool results are fed back into the conversation by appending them as 
a `role: user` message with `type: tool_result`. This is how Claude 
maintains context across multiple tool calls, the full message 
history including every tool result is sent on every iteration.

    Before executing any tool call, the agent validates the input using 
Pydantic models (`ReadContractInput`, `SearchPoliciesInput`). If Claude 
produces a malformed tool call, the validation catches it and returns 
an error string instead of crashing the loop

    The system prompt gives Claude a specific numbered checklist of what 
to search for, IP ownership, subcontracting, payment terms, insurance, 
data protection, confidentiality duration, termination clauses, and 
others. This was intentional. An open-ended instruction like "audit 
this contract" produced inconsistent results. Giving Claude an explicit 
search agenda made the analysis much more reliable.

    The MCP client connects at the start of each audit and disconnects 
in a `finally` block when the audit ends, whether it succeeded or 
failed. This makes sure the background thread and the event loop are 
always cleaned up properly.

**Orchestration flow:**

1. API receives `POST /api/v1/audit/analyze` with a contract filename
2. Agent connects to the MCP filesystem server over stdio
3. `search_policies` tool — queries ChromaDB semantically for relevant policy sections
4. `read_contract` tool — reads the contract PDF from the contracts folder
5. Agentic loop — Claude API receives policy excerpts + contract text and calls tools iteratively
6. When analysis is complete, a second Claude call parses the output into structured JSON
7. Returns `AuditReport` with: `overall_result`, `violations`, `warnings`, `compliant_clauses`, `summary`

**MCP Client design:**

The MCP server runs as a child process communicating over stdio. Because
FastAPI is synchronous and MCP is async, `mcp_client.py` runs a dedicated
asyncio event loop in a background thread and uses a queue to pass tool
calls between the sync and async worlds.


## API Reference

```
POST /api/v1/auth/register    { email, password } → { access_token }
POST /api/v1/auth/login       { email, password } → { access_token }
GET  /api/v1/files            → { contracts: [...], policies: [...] }
POST /api/v1/audit/analyze    { contract_name } → AuditReport
POST /api/v1/chat             { message, audit_context, history } → { reply }
GET  /api/v1/health           → { status: "ok" }
```

## Document Structure

**Policies** (`backend/documents/policies/`) — 8 PDF files:
- Embedded into ChromaDB via `python backend/rag/embed_policies.py`
- Used as the reference base for compliance checking
- Re-run embedding if policies are added or updated

**Contracts** (`backend/documents/contracts/`) — 5 PDF files:
- Never embedded into ChromaDB
- Read directly by the agent at audit time via MCP tools

## Claude Code Usage

This project was built using Claude Code for Tasks 1 and 3.

**Task 1** used Claude Code with the `/scaffold-auth` and `/embed-policies`
skills to build the backend infrastructure: JWT auth, RAG pipeline, and
MCP server setup.

**Task 3** used Claude Code with the `/setup-frontend` skill to scaffold
all React components: Login, Register, Dashboard, FileExplorer,
AuditReport, and ChatWindow.

**Task 2** (the compliance agent)
 Here are the key architectural decisions.

1. Background thread and event loop in mcp_client.py
FastAPI runs synchronously, but the MCP Python SDK is fully async. Calling MCP functions directly from a FastAPI route is not possible. To solve this, when an audit starts the client spins up a dedicated background thread with its own asyncio event loop. The event loop runs the MCP session in that thread while FastAPI continues handling requests normally on the main thread. The two sides communicate without blocking each other.

2. Queue for cross-thread communication

Because the asyncio loop lives in its own thread, you cannot call its async functions directly from synchronous code. I used an asyncio.Queue inside the loop and call_soon_threadsafe to push tool call requests from the sync side into the queue. The loop picks up each request, executes it against the MCP session, and places the result into a concurrent.futures.Future. The synchronous side blocks on that Future until the result arrives, then continues

3. Two Claude API calls instead of one
The first call runs the full agentic reasoning loop, claude reads the contract, searches policies, and reasons through violations in natural language. But the backend requires a strict, structured JSON response. So, instead of forcing the first call to output perfect JSON (which interrupts the model's reasoning), I added a second lightweight Claude call whose only job is to take the free-text analysis and parse it into the exact AuditReport schema. This two-step approach is significantly more reliable and consistent than trying to do reasoning and formatting in a single call

4. pdfplumber for PDF text extraction
The MCP filesystem server reads plain text files natively, but PDFs are a binary format and cannot be read the same way. To extract text from contract PDFs I used pdfplumber. The MCP server is still called to verify the file exists, but the actual text extraction happens locally via pdfplumber .

5. Tools defined manually rather than fetched from MCP
 Even though the MCP server exposes its own tool list, I defined read_contract and search_policies as custom tools in the orchestrator with carefully written descriptions. The quality of a tool description directly affects how well Claude uses it. A generic description like "read a file" produced poor results. Writing descriptions that explicitly explained the audit context, produced significantly better and more consistent analysis

6. Policy search via ChromaDB (RAG) rather than MCP
The 8 company policy documents are large PDFs that do not change between audits. Sending all 8 files to Claude on every audit call would be slow and expensive, and would fill the context window with irrelevant content. Instead, policies are chunked and embedded into ChromaDB once at setup time. When the agent needs to check a specific topic — payment terms, IP ownership, data protection — it retrieves only the relevant chunks from ChromaDB. This keeps the context window focused and makes the analysis more accurate.