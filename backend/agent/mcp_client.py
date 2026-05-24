import asyncio
import threading
import os
import concurrent.futures
import traceback
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class MCPClient:
    def __init__(self, documents_path: str):
        self.documents_path = documents_path
        self.session = None
        self._loop = None
        self._thread = None
        self._ready_event = threading.Event()
        self._done_event = threading.Event()
        
        self._tool_queue = None 
        self._tools = []

    def _start_loop(self):
        asyncio.set_event_loop(self._loop)
        self._loop.run_forever()

    def connect_sync(self):
        self._loop = asyncio.new_event_loop()
        self._ready_event.clear()
        self._done_event.clear()
        self._thread = threading.Thread(target=self._start_loop, daemon=True)
        self._thread.start()
        asyncio.run_coroutine_threadsafe(self._run_session(), self._loop)
        if not self._ready_event.wait(timeout=30):
            raise RuntimeError("MCP connection timed out")

    async def _run_session(self):
        self._tool_queue = asyncio.Queue()
        binary = os.path.abspath(
            os.path.join(os.path.dirname(__file__),
                         "../mcp_server/node_modules/.bin/mcp-server-filesystem")
        )
        abs_path = os.path.abspath(self.documents_path)
        server_params = StdioServerParameters(command=binary, args=[abs_path])

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    self.session = session
                    await session.initialize()
                    print(f"[MCP] Connected. Serving: {abs_path}")
                    self._ready_event.set()

                    while True:
                        item = await self._tool_queue.get()
                        if item is None:
                            break
                        tool_name, tool_input, result_future = item
                        try:
                            result = await session.call_tool(tool_name, tool_input)
                            result_future.set_result(result)
                        except Exception as e:
                            result_future.set_exception(e)

        except Exception as e:
            traceback.print_exc()
            if not self._ready_event.is_set():
                self._ready_event.set()
        finally:
            self.session = None
            print("[MCP] Disconnected")
            self._done_event.set()


    def get_tools(self) -> list:
        """Return tools in Anthropic API format."""
        anthropic_tools = []
        for tool in self._tools:
            anthropic_tools.append({
                "name": tool.name,
                "description": tool.description or "",
                "input_schema": tool.inputSchema,
            })
        return anthropic_tools
    
    def call_tool_sync(self, tool_name: str, tool_input: dict) -> str:
        result_future = concurrent.futures.Future()
        self._loop.call_soon_threadsafe(
            self._tool_queue.put_nowait, (tool_name, tool_input, result_future)
        )
        result = result_future.result(timeout=60)
        if result.content:
            return result.content[0].text
        return "No result returned."

    def disconnect_sync(self):
        if self._tool_queue is not None:
            self._loop.call_soon_threadsafe(self._tool_queue.put_nowait, None)
            self._done_event.wait(timeout=15)
        self._loop.call_soon_threadsafe(self._loop.stop)
        self._thread.join(timeout=5)