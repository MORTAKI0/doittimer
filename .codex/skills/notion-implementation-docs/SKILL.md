---
name: notion-implementation-docs
description: Turns recent implementation work into clean Notion docs with linked plans and tasks. Use when documenting shipped changes, creating implementation docs, or updating progress. Only invoke when Notion MCP is connected and user explicitly asks to publish to Notion.
---

# Objective
Write or update clean Notion implementation docs, plans, and tasks for recent work.

# Default workflow
1. Find the last documentation boundary.
2. Analyze commits, diffs, code, and related Notion pages.
3. Write/update the implementation doc, plan, and linked tasks.
4. Keep plan/task relations consistent.
5. Report boundary, pages changed, tasks changed, assumptions, and next step.

# Required setup

If any Notion MCP call fails because Notion MCP is not connected, stop and tell the user to set it up with:

```bash
codex mcp add notion --url https://mcp.notion.com/mcp
```

Enable remote MCP client:

* set `[features].rmcp_client = true` in `config.toml`
* or run Codex with `--enable rmcp_client`

Then log in:

```bash
codex mcp login notion
```

After login, tell the user they must restart Codex, then continue the workflow on the next run.

# Source priority for analysis

Use sources in this order when available:

1. recent commits and push history
2. changed files and current code state
3. pull requests if they explain intent
4. issues if they define scope or constraints
5. existing documentation pages in Notion to determine the last documented point

Prefer reconstructing the true implementation story over repeating commit messages verbatim.


# Core workflow
1. Find the last documentation boundary.
2. Analyze recent commits, changed files, current architecture, and relevant Notion pages.
3. Synthesize the implementation story, not a commit log.
4. Create or update the implementation doc, plan, and tasks.
5. Link artifacts and record progress.

# Writing rules

## Summary
1 short paragraph in plain language.

## Scope
State what was included and what was not.

## What was implemented
Group by capability, not commit.

## Architecture / technical design
Explain boundaries, data flow, validation, and tradeoffs.

## Files or modules affected
Summarize main areas touched.

## Testing / verification
Document real verification and missing coverage.

## Risks / known gaps
Be explicit about partial work, shortcuts, and follow-up items.

## Remaining work / next steps
Source for plan and tasks.

# Notion behavior rules
- Search `DoItTimer — App` first unless the user names another parent.
- Update an existing doc instead of creating a duplicate.
- Use `DoItTimer - <Feature> Implementation|Plan|Progress`.
- If the parent is missing or ambiguous, ask.
- Never include secrets; use `[REDACTED]` when needed.
