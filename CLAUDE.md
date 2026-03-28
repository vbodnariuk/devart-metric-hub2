# Devart Metric Hub

## CRITICAL: "ноушен" / "notion" = Notion MCP Server, NOT the app

When the user says "запусти ноушен", "запусти ноушена", "ноушен", "notion", "подключи notion" — they mean **connect the Notion MCP server**, NOT launch the Vite dev server or the application.

### Steps:

1. Check if `.mcp.json` exists in the project root (`ls .mcp.json`).
2. If it exists — tell the user: "Notion MCP уже настроен. Перезапусти чат, чтобы сервер загрузился."
3. If it does NOT exist — ask the user: "Дай мне твой Notion API токен (начинается с ntn_)."
4. Once the user provides the token, create `.mcp.json` in the project root:

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

5. Replace `<TOKEN>` with the user's actual token.
6. Tell the user: "Готово! Перезапусти чат — Notion будет доступен."

IMPORTANT: `.mcp.json` is in `.gitignore` — NEVER commit it to git.
