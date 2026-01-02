---
name: doittimer-clickup-docs
description: Create and maintain ClickUp Sprint docs (Plan, Mid-sprint update, Closeout) for DoItTimer using MCP.
metadata:
  short-description: ClickUp MCP sprint documentation templates and workflow
---

## Usage triggers
- Sprint Plan creation
- Mid-sprint update
- Sprint Closeout

## Workflow (4 phases)
1. Discovery
   - Confirm sprint number, dates, goals, scope, and target ClickUp location (space/folder/list).
   - Gather story IDs, owners, and required links (PRs, tests, deployments).
2. Creation
   - Draft or update the doc with the correct template and naming convention.
   - Keep sections short; prefer checklists and tables for scannability.
3. Tasks
   - Create or update ClickUp tasks for each story (S1-01, S1-02, ...).
   - Link tasks in the doc and add doc links back to tasks.
4. Verification
   - Verify doc location, links, formatting consistency, and story IDs.
   - Confirm no secrets are present and placeholders are [REDACTED].

## Templates

### Sprint Plan template
```
# DoItTimer � Sprint X Plan

## Overview
- Sprint: X
- Dates: YYYY-MM-DD to YYYY-MM-DD
- Owner: Name

## Goals
- Goal 1
- Goal 2

## Scope
### In
- S1-01 - Story title
- S1-02 - Story title

### Out
- O1 - Out-of-scope item

## Plan checklist
- [ ] Stories refined and estimated
- [ ] Dependencies confirmed
- [ ] Risks captured
- [ ] Demo plan drafted

## Stories
| ID | Title | Owner | Status | Link |
| --- | --- | --- | --- | --- |
| S1-01 | Story title | Name | Planned | ClickUp task link |
| S1-02 | Story title | Name | Planned | ClickUp task link |

## Risks
- [ ] Risk: Description. Mitigation: Plan.
- [ ] Risk: Description. Mitigation: Plan.

## Definition of Done (DoD)
- [ ] Feature complete and merged
- [ ] Tests updated or added
- [ ] Docs updated
- [ ] Demo-ready

## Exit criteria
- [ ] All planned stories complete or moved with rationale
- [ ] Demo steps validated
- [ ] Metrics captured

## Links
- ClickUp list: URL
- Repo/PRs: URL
```

### Sprint Closeout template
```
# DoItTimer � Sprint X Closeout

## What shipped
- S1-01 - Story title (link)
- S1-02 - Story title (link)

## Demo steps
1. Step 1
2. Step 2

## Metrics
- Cycle time: value
- PRs merged: value
- Bugs: value

## Retrospective
### Wins
- Win 1
- Win 2

### Challenges
- Challenge 1
- Challenge 2

### Actions
- [ ] Action item 1 (owner, due date)
- [ ] Action item 2 (owner, due date)

## Follow-ups
- Carryover stories:
  - S1-03 - Story title
- New backlog items:
  - B1 - Item title
```

## MCP integration examples
Use the ClickUp MCP tool names configured in this environment. Example flow:

```text
# Locate target space/folder/list
clickup.list_spaces {}
clickup.list_folders { "space_id": "SPACE_ID" }
clickup.list_lists { "folder_id": "FOLDER_ID" }

# Create a Sprint Plan doc
clickup.create_doc {
  "space_id": "SPACE_ID",
  "title": "DoItTimer � Sprint X Plan",
  "content_markdown": "..."
}

# Update a doc mid-sprint
clickup.update_doc {
  "doc_id": "DOC_ID",
  "content_markdown": "..."
}

# Create story tasks
clickup.create_task {
  "list_id": "LIST_ID",
  "name": "S1-01 - Story title",
  "description": "Summary and acceptance criteria",
  "links": ["DOC_URL"]
}
```

## Security guardrails (CRITICAL)
- Never include credentials, tokens, or secrets in docs or task descriptions.
- If a placeholder is required, use [REDACTED].
- Avoid copying environment values or .env.local contents.

## Quality standards
- Concise, scannable sections with short paragraphs and checklists.
- Consistent headings and ordering across Plan, Mid-sprint, Closeout.
- Always use story IDs (S1-01, S1-02, ...).
- Link docs to tasks and tasks back to docs.

## Troubleshooting
- MCP unavailable: retry after restarting the CLI; fall back to local markdown files.
- Permissions error: verify you have access to the target space/folder/list.
- Wrong location: confirm space/folder/list IDs before creating docs.
- Doc not updating: verify doc_id and try a smaller content update.

## Integration points
- Link Sprint Plan and Closeout docs to related tasks and PRs.
- If other skills create work (auth, homepage), ensure their story IDs and tasks are linked here.
- Reference test commands, deployment notes, and review links in the doc.
