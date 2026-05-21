---
name: setup-frontend
description: Scaffold the React frontend with all pages and components
invocation: user
---

Read CLAUDE.md first before doing anything so you understand 
the project structure and what the frontend needs to connect to.

## What to build

I need a React + Vite frontend with JWT auth, a file manager,
an audit trigger, a report viewer, and a chat window.

## Setup

Initialize a Vite React project inside the frontend/ folder.
Add these dependencies:
- react-router-dom — for page routing
- axios — for API calls
- react-toastify — for success/error notifications

## File structure to create

frontend/
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   └── Dashboard.jsx
│   ├── components/
│   │   ├── FileExplorer.jsx
│   │   ├── AuditReport.jsx
│   │   └── ChatWindow.jsx
│   ├── api/
│   │   └── client.js
│   ├── App.jsx
│   └── main.jsx

## What each file should do

### client.js (frontend/src/api/client.js)
- axios instance with baseURL pointing to http://localhost:8000
- request interceptor that adds Authorization: Bearer {token}
  to every request automatically
- token is stored in memory as a module-level variable
  NOT in localStorage — this is important
- export setToken(token) and clearToken() functions
- export the axios instance as default

### App.jsx
- set up React Router with these routes:
  /login → Login page
  /register → Register page
  /dashboard → Dashboard page (protected)
- if user hits a protected route without a token
  redirect them to /login automatically

### Login.jsx
- simple form with email and password fields
- on submit calls POST /api/v1/auth/login
- on success saves token with setToken() and goes to /dashboard
- shows error message if login fails
- has a link to the register page

### Register.jsx
- simple form with email and password fields
- on submit calls POST /api/v1/auth/register
- on success saves token and goes to /dashboard
- shows error if email already exists
- has a link to the login page

### Dashboard.jsx
- this is the main page after login
- has a logout button at the top right
- layout is split into two sections:
  left side: FileExplorer component
  right side: AuditReport and ChatWindow components
- keeps track of which contract is currently selected
- passes selected contract down to child components

### FileExplorer.jsx
- fetches list of contracts from GET /api/v1/files/contracts
- fetches list of policies from GET /api/v1/files/policies
- shows both lists so user can see what's in the system
- user can click a contract to select it
- selected contract is highlighted
- has a "Run Compliance Audit" button
- button is disabled if no contract is selected
- on button click calls POST /api/v1/audit/run with 
  the selected contract filename
- shows a loading spinner while audit is running

### AuditReport.jsx
- receives the audit report as a prop from Dashboard
- if no report yet shows a simple placeholder message
- when report exists shows:
  contract name and audit date
  overall status badge (COMPLIANT or NON_COMPLIANT)
  table with all clause results
  PASS in green, FAIL in red, WARNING in yellow
  summary at the bottom (X passed, Y failed)

### ChatWindow.jsx
- appears next to the report after an audit runs
- simple chat interface with a message list and input box
- user can type messages like "fix clause 3 to comply 
  with the data protection policy"
- sends messages to POST /api/v1/chat with:
  the message text
  the current contract filename
  the current report as context
- displays Claude's response in the chat
- keeps the full conversation history in component state
- if no audit has run yet shows a message saying 
  run an audit first before using the chat

## Rules
- JWT token goes in memory only, never localStorage
- every API call goes through client.js, not raw fetch
- show loading states so the user knows something is happening
- show error messages when API calls fail, don't fail silently
- keep styling simple, plain CSS is fine, no UI library needed
- don't start on this until the backend API is working