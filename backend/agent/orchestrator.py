import anthropic
import json

import os
from pydantic import BaseModel, Field, ValidationError
from backend.rag.retriever import query_policies
from backend.config import ANTHROPIC_API_KEY
from backend.agent.mcp_client import MCPClient
import pdfplumber

mcp_client = MCPClient(documents_path="backend/documents/contracts")
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
MODEL = "claude-haiku-4-5-20251001"

class ReadContractInput(BaseModel):
    filename: str = Field(description="Contract filename e.g. 'agreement.pdf'")

class SearchPoliciesInput(BaseModel):
    query: str = Field(description="Natural language policy search query")


class ComplianceViolation(BaseModel):
    clause: str = Field(description="The contract clause that violates policy")
    policy_rule: str = Field(description="The policy rule that is violated")
    severity: str = Field(description="HIGH, MEDIUM or LOW")

class AuditReport(BaseModel):
    contract: str = Field(description="Contract filename that was audited")
    overall_result: str = Field(description="PASS or FAIL")
    violations: list[ComplianceViolation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    compliant_clauses: list[str] = Field(default_factory=list)
    summary: str = Field(description="Overall audit summary paragraph")

all_tools = [
    {
        "name": "read_contract",
        "description": "Read the full text of a contract file from the contracts directory.",
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "The contract filename only, e.g. 'supplier_agreement.pdf'. Do not include the full path."
                }
            },
            "required": ["filename"]
        }
    },
    {
        "name": "search_policies",
        "description": "Semantically searches the company's indexed policy documents and returns relevant policy clauses.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "A natural language query describing what policy topic to search for, e.g. 'payment terms limits'"
                }
            },
            "required": ["query"]
        }
    }
]

def execute_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name == "read_contract":
        try:
            validated = ReadContractInput(**tool_input)
        except ValidationError as e:
            return f"Error: Invalid tool input: {str(e)}"
        
        base_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../documents/contracts")
        )
        filepath = os.path.join(base_dir, validated.filename)
        print(f"[read_contract] Attempting to read: {filepath}")
        
        try:
            try:
                mcp_client.call_tool_sync("get_file_info", {"path": filepath})
            except Exception:
                pass  

            with pdfplumber.open(filepath) as pdf:
                pages = [page.extract_text() or "" for page in pdf.pages]
            content = "\n".join(pages)
            print(f"[read_contract] Success: {len(content)} chars")
            return content
        except Exception as e:
            print(f"[read_contract] FAILED: {e}")
            return f"Error reading contract: {str(e)}"
        
    elif tool_name == "search_policies":
        try:
            validated = SearchPoliciesInput(**tool_input)
        except ValidationError as e:
            return f"Error: Invalid tool input: {str(e)}"
        
        results = query_policies(validated.query)

        if not results:
            return "No relevant policy section found."
        
        formatted = []
        for i, chunk in enumerate(results, 1):
            formatted.append(
                f"[Policy {i}]\n"
                f"Source: {chunk.get('source', 'unknown')}\n"
                f"Content: {chunk.get('text', '')}\n"
            )
            
        return "\n".join(formatted)
    
    else:
        return "ERROR: Unknown tool"

SYSTEM_PROMPT = """You are a legal auditor assistant. Your job is to analyze the provided contract and identify any potential compliance
issues based on the company's policies.

You have the following tools:
  read_contract: Reads the content of a contract file.
  search_policies: Searches the company's policies for relevant sections based on a query.

When given a contract, you should follow this exact process:
1. Read the full contract first using read_contract.
2. Identify every clause, number, percentage, and obligation in the contract.
3. Formulate queries to search_policies to find relevant policy sections.
    Run as many searches as needed to cover all areas including:
    IP ownership, open source, subcontracting, payment terms, advance payments, milestone payments, insurance, 
    data protection, confidentiality duration, termination, personnel changes, and policy compliance references
4. Compare what the contract says against what the policies require and analyze the contract clauses in the context of the retrieved policy sections.
5. Summarize any potential compliance issues or areas of concern and flag every discrepancy,including specific numbers that differ from policy limits

Be thorough in your analysis and provide clear explanations for any issues you identify.
"""


def run_audit(contract_name: str) -> AuditReport:
    mcp_client.connect_sync()

    messages = [
        {"role": "user", "content": f"Please audit the contract: {contract_name}"}
    ]
    
    try: 
        while True:
    
            response = client.messages.create(
                model=MODEL,
                system=SYSTEM_PROMPT,
                tools=all_tools,
                max_tokens=8000,
                messages=messages
            )

            messages.append({
                "role": "assistant",
                "content": response.content
            })

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result
                        })
                
                
                messages.append({
                    "role": "user",
                    "content": tool_results
                })
                
            elif response.stop_reason == "end_turn":
                final_text = ""
                for block in response.content:
                    if block.type == "text":
                        final_text = block.text
                        break

                parse_response = client.messages.create(
                    model=MODEL,
                    max_tokens=2000,
                    system="""Extract the audit report into JSON matching exactly this structure:
                            {
                                "overall_result": "PASS or FAIL",
                                "violations": [
                                    {"clause": "...", "policy_rule": "...", "severity": "HIGH/MEDIUM/LOW"}
                                ],
                                "warnings": ["..."],
                                "compliant_clauses": ["..."],
                                "summary": "..."
                            }
                            Return only the JSON, no other text.""",
                    messages=[
                        {"role": "user", "content": final_text}
                    ]
                )
            
                try:
                    raw_json = next((b.text for b in parse_response.content if b.type == "text"), "")
                    if not raw_json:
                        raise ValueError("No text block in parse response")

                    if raw_json.startswith("```"):
                        lines = raw_json.splitlines()
                        lines = lines[1:] if lines[0].startswith("```") else lines
                        lines = lines[:-1] if lines[-1].startswith("```") else lines
                        raw_json = "\n".join(lines).strip()

                    start = raw_json.find("{")
                    end = raw_json.rfind("}") + 1
                    if start != -1 and end > start:
                        raw_json = raw_json[start:end]

                    report_data = json.loads(raw_json)
                    return AuditReport(
                        contract=contract_name,
                        **report_data
                    )
                except Exception as e:
                
                    print(f"(Warning) Could not parse structured report: {e}")
                    return AuditReport(
                        contract=contract_name,
                        overall_result="UNKNOWN",
                        summary=final_text
                    )
            else:
                print(f"(Warning) Unexpected stop_reason: {response.stop_reason}")
                break

    finally:
        mcp_client.disconnect_sync()

    return AuditReport(
        contract=contract_name,
        overall_result="UNKNOWN",
        summary="Audit failed unexpectedly."
    )