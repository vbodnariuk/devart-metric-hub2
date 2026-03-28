# Devart Metric Hub

## Notion Integration

To connect Notion MCP server, create `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"Authorization\": \"Bearer <NOTION_API_TOKEN>\", \"Notion-Version\": \"2022-06-28\"}"
      }
    }
  }
}
```

The user will provide the token. `.mcp.json` is in `.gitignore` — never commit it.
