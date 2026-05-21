# MCP Filesystem Server

This folder runs the official `@modelcontextprotocol/server-filesystem` Node package.
It exposes `backend/documents/` (policies and contracts) over stdio using JSON-RPC,
so the compliance agent can call `read_file` and `list_directory` without touching
the filesystem directly.

## Start manually (for testing)

Run from this directory:

```bash
cd backend/mcp_server
npm start
```

Or call the binary directly with an absolute path (useful when testing from anywhere):

```bash
node backend/mcp_server/node_modules/.bin/mcp-server-filesystem \
  "$(pwd)/backend/documents"
```

The server speaks JSON-RPC over stdin/stdout. Once started you can send a request
by hand to confirm it is working:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  | node backend/mcp_server/node_modules/.bin/mcp-server-filesystem \
      "$(pwd)/backend/documents"
```

You should see a JSON response listing the available tools (`read_file`,
`list_directory`, etc.).

## How the agent uses this

`backend/agent/mcp_client.py` spawns this server as a child process and
communicates with it over stdio. The path to the binary is read from the
`MCP_SERVER_PATH` env var (set in `.env`):

```
MCP_SERVER_PATH=backend/mcp_server
```

The client resolves the binary as:

```
{MCP_SERVER_PATH}/node_modules/.bin/mcp-server-filesystem
```

and passes the absolute path to `backend/documents/` as its only argument.

## Allowed root

The server is locked to `backend/documents/`. It cannot read files outside
that directory — this is enforced by the package itself, not our code.

## Re-installing

If `node_modules/` is missing (e.g. after a fresh clone):

```bash
cd backend/mcp_server
npm install
```
