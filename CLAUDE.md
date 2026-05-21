# AI Legal Repository Auditor

The idea of this project is to build a system,that automatically checks 
contracts against company policies using RAG, MCP, and 
Claude API.

## What It Does

The company has internal policy documents (their rules), 
and when they get a new contract from a supplier or partner, 
the system checks if the contract breaks any of those rules.

For example — if company policy says payment terms can't 
exceed 30 days, but a contract says 45 days, the system 
catches that and puts it in the report.

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

## Environment Variables

Copy .env.example to .env before running anything.
Never commit .env to GitHub — it's in .gitignore.

DATABASE_URL=sqlite:///./legal_auditor.db
JWT_SECRET=pick-something-long-and-random
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60
ANTHROPIC_API_KEY=your-key-here
CHROMA_PERSIST_DIR=backend/rag/chroma_store
MCP_SERVER_PATH=backend/mcp_server

## How to Run

# 1. install backend dependencies
cd backend
pip install -r requirements.txt

# 2. embed the policy documents
# do this once at the start and again if policies change
python backend/rag/embed_policies.py

# 3. start the backend
uvicorn backend.api.main:app --reload

# 4. start the frontend (in a separate terminal)
cd frontend
npm install
npm run dev

## The Agent

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

## If Something Is Broken

Check these three things in this order:
1. is .env filled in correctly?
2. is the MCP server running?
3. does ChromaDB actually have data in it?

Most bugs trace back to one of those three things.
Run python backend/rag/check_store.py to see if 
ChromaDB has any data in it.