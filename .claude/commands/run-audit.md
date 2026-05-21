---
name: run-audit
description: Run a compliance audit on a contract against company policies
invocation: user
---

Read CLAUDE.md first, especially the agent section, before 
doing anything. This skill is for testing the agent pipeline 
during development — not for building the agent itself.

## What this skill does

When I type /run-audit I want to test the full audit pipeline 
against a specific contract file. It should:

1. Take a contract filename as input
   example: /run-audit contract_01_software_development.pdf

2. Check that the file actually exists in 
   backend/documents/contracts/ before doing anything

3. Run the agent pipeline against it:
   - search ChromaDB for relevant policy sections
   - read the contract via MCP tools  
   - send both to Claude API for analysis
   - get back a structured compliance report

4. Print the report to the terminal in a readable way:
   - show each clause that was checked
   - show PASS or FAIL for each one
   - for FAIL items show which policy was violated and why
   - show a summary at the end (X passed, Y failed)

## What NOT to do

- do not write or modify any files in backend/agent/
  that directory is hand-written code, don't touch it
- do not create a new agent implementation
- just use whatever is already in backend/agent/ to run the test

## If the agent isn't built yet

If backend/agent/ doesn't exist or isn't complete yet,
just print a clear message saying the agent needs to be 
built first before this skill can be used. Don't try to 
build it yourself.

## Output format I want to see

Contract: contract_01_software_development.pdf
Policies checked: 8
─────────────────────────────────
Clause: Payment Terms (45 days)
Policy: Financial Controls Policy
Result: FAIL
Reason: Policy requires payment terms not exceeding 30 days

Clause: Data handling agreement
Policy: Data Protection Policy  
Result: PASS

─────────────────────────────────
Summary: 6 passed, 2 failed