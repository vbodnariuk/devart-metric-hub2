# Devart Metric Hub

## Notion Integration

When the user says "запусти ноушена" (or similar — "подключи Notion", "notion", etc.):

1. Check if `.mcp.json` exists in the project root. If yes — tell the user to restart the chat so the MCP server loads.
2. If `.mcp.json` does not exist — ask the user for their Notion API token.
3. Once the user provides the token, create `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"Authorization\": \"Bearer <TOKEN>\", \"Notion-Version\": \"2022-06-28\"}"
      }
    }
  }
}
```

Replace `<TOKEN>` with the user's token. Then tell the user to restart the chat.

IMPORTANT: `.mcp.json` is in `.gitignore` — NEVER commit it to git.
