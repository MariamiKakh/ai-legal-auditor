---
name: generate-report
description: Format raw audit output into a clean structured report
invocation: user
---

Read CLAUDE.md first before doing anything so you understand 
the report schema and project conventions.

## What this skill does

After the agent runs an audit, the raw output needs to be 
formatted into a clean report that the frontend can display.
This skill takes that raw output and turns it into something 
readable and structured.

## Input

The raw agent output looks something like this:

{
  "contract": "contract_01_software_development.pdf",
  "results": [
    {
      "clause": "Payment Terms",
      "policy": "Financial Controls Policy",
      "status": "FAIL",
      "reason": "Payment terms exceed 30 day limit"
    },
    {
      "clause": "Data Handling",
      "policy": "Data Protection Policy", 
      "status": "PASS",
      "reason": null
    }
  ]
}

## What to build

### Report schema (backend/agent/schemas.py)
If this file doesn't exist yet, create it.
This is the single source of truth for report structure.

ComplianceResult:
- clause: string
- policy: string  
- status: "PASS" or "FAIL" or "WARNING"
- reason: string or null
- severity: "low", "medium", "high" — only for FAIL items

ComplianceReport:
- contract_filename: string
- audit_timestamp: datetime
- total_checked: integer
- passed: integer
- failed: integer
- results: list of ComplianceResult
- overall_status: "COMPLIANT" or "NON_COMPLIANT"

### Report formatter (backend/agent/report_formatter.py)
- format_report(raw_output) function
- takes raw agent output
- validates it against the schema
- calculates summary numbers
- sets overall_status based on whether any FAILs exist
- returns a clean ComplianceReport object

### HTML report (backend/agent/report_template.html)
A simple HTML template for the report that shows:
- contract name and audit date at the top
- overall status badge (green for COMPLIANT, red for NON_COMPLIANT)
- a table with all the results
- PASS rows in green, FAIL rows in red, WARNING in yellow
- summary section at the bottom with counts
- keep the styling simple, just inline CSS is fine

## Rules
- always use the schema