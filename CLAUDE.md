# AI Legal Repository Auditor

The idea of this project is to build a system,that automatically checks 
contracts against company policies using RAG, MCP, and 
Claude API.

The problem it solves is pretty straightforward — companies deal with 
a lot of incoming contracts from suppliers, partners, and clients. 
Manually checking each one against internal policies takes time and 
is easy to mess up. This system automates that process.

## What It Does

The way it works is: the company uploads their internal policy 
documents (things like data protection rules, payment terms, 
procurement standards etc.) and these get processed and stored in a 
vector database. When a new contract comes in, the agent reads it, 
searches for the most relevant policy sections, and then uses Claude 
to compare them and find any violations.

So for example — if company policy says payment terms can't exceed 
30 days, but a contract comes in with 45-day terms, the system 
catches that and flags it in the compliance report. The user can then 
open a chat window and ask things like "rewrite clause 3 so it 
complies with the policy."

The project has three main parts:
- A backend with JWT auth, a RAG pipeline, and an MCP filesystem server
- A compliance agent that orchestrates everything (written by hand)
- A React frontend with a file manager, audit trigger, and chat interface

## Project Structure

Here's where everything lives:

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

Backend is Python and FastAPI. I chose FastAPI because it's 
fast to write and automatically generates API docs at /docs 
which makes debugging a lot easier.

For the database I'm using SQLite during development because 
it needs zero setup — just a file. If this was production 
I'd switch to PostgreSQL.

For the vector database I picked ChromaDB. It runs locally 
and saves to disk so there's no extra server to manage. 
The policy chunks and embeddings are stored there.

For embeddings I'm using sentence-transformers with the 
all-MiniLM-L6-v2 model. It runs locally, no API key needed, 
and it's good enough for searching legal text.

The MCP server is the official Anthropic filesystem server 
(@modelcontextprotocol/server-filesystem). It gives the 
agent tools to read and list files from the documents folder.

Frontend is React with Vite. Vite is just faster and simpler 
than Create React App. Axios for API calls, React Router 
for navigation.

## How to Run

# 1. activate the virtual environment
source venv/bin/activate

# 2. install backend dependencies (first time only)
pip install -r backend/requirements.txt

# 3. install MCP server (first time only)
cd backend/mcp_server && npm install && cd ../..

# 4. embed the policy documents (first time, and when policies change)
python backend/rag/embed_policies.py

# 5. start the backend
uvicorn backend.api.main:app --reload

# 6. start the frontend (in a separate terminal)
cd frontend
npm install
npm run dev

The agent lives in backend/agent/ and this is the part 
I wrote completely by hand without any AI help. This was 
a hard requirement of the task so please don't generate 
or modify any code in that folder.

Here's what the agent does step by step:
1. receives a contract filename from the API
2. queries ChromaDB to find the most relevant policy sections
3. uses MCP filesystem tools to read the full contract
4. sends the policy excerpts and contract to Claude API
5. parses the response into a structured compliance report
6. returns the report back to the API

The MCP part works by spawning the filesystem server as a 
child process and communicating with it over stdio using 
JSON-RPC messages. This is all in backend/agent/mcp_client.py.

## How Documents Work

There are two types of documents and they work differently:

Policies (backend/documents/policies/)
These are the company's internal rules. They get embedded 
into ChromaDB when you run embed_policies.py. They're the 
reference base that contracts get checked against. If you 
add or update a policy you need to re-run the embedding.

Contracts (backend/documents/contracts/)
These are the incoming agreements to be audited. They do 
NOT go into ChromaDB. The agent reads them directly at 
audit time using the MCP filesystem tools.

Simple rule: policies → ChromaDB, contracts → read directly.
Never embed a contract into ChromaDB.

## Claude Code Skills

These are in .claude/skills/ and work as slash commands 
during Claude Code sessions:

- /embed-policies — processes all policy PDFs into ChromaDB
- /scaffold-auth — builds the JWT auth system
- /setup-frontend — scaffolds all React components
- /run-audit — tests the agent against a contract file
- /generate-report — formats audit output into a report

## Rules

- never touch backend/agent/ with AI generated code
- JWT token on the frontend goes in memory, not localStorage
- never embed contracts into ChromaDB, only policies
- never hardcode the Anthropic API key anywhere
- all API routes start with /api/v1/
- errors always return { "error": "...", "detail": "..." }
- don't start a new task until the previous one works

## Build Order

Task 1 — backend, auth, MCP server, RAG pipeline
Task 2 — compliance agent (hand-written, no AI)
Task 3 — React frontend

Don't jump ahead. Each task depends on the previous one 
actually working end to end.

## Task 2 design decisions

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

## If Something Is Broken

Check these three things in this order:
1. is .env filled in correctly?
2. is the MCP server running?
3. does ChromaDB actually have data in it?

Most bugs trace back to one of those three things.
Run python backend/rag/check_store.py to see if 
ChromaDB has any data in it.