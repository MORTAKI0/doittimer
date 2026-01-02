# DoItTimer ClickUp Docs - Quick Start

## Setup
- ClickUp MCP is already configured in `config.toml`.
- Restart the Codex CLI after configuration changes so MCP tools load.

## First-use walkthrough
1. Create a Sprint Plan doc
   - Use the Sprint Plan template.
   - Name it: "DoItTimer � Sprint X Plan".
   - Publish it in the correct space/folder/list.
2. Create story tasks (S1-01, S1-02, ...)
   - Create tasks in the sprint list.
   - Link each task back to the Sprint Plan doc.
3. Mid-sprint update
   - Update the Sprint Plan doc with progress and scope changes.
   - Keep updates short and checklist-driven.
4. Sprint Closeout
   - Create the Closeout doc using the template.
   - Name it: "DoItTimer � Sprint X Closeout".
   - Capture what shipped, demo steps, metrics, and retrospective notes.

## Pro tips and best practices
- [ ] Use story IDs in every doc section and task title.
- [ ] Keep sections short and scannable.
- [ ] Add links between docs, tasks, PRs, and deployments.
- [ ] Use checklists for status and action items.
- [ ] Keep naming consistent across all sprint docs.

## Troubleshooting quick fixes
- MCP not found: restart the CLI and verify MCP configuration.
- Permission errors: confirm access to the target space/folder/list.
- Doc created in the wrong place: double-check IDs before creating.
- Updates not applying: verify doc_id and retry with a smaller update.
