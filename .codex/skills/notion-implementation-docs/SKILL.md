---
name: notion-implementation-docs
description: analyze everything changed since the last documentation update, turn recent implementation work into clean documentation, and publish it to notion with linked implementation plans, tasks, and progress updates. use when chatgpt is asked to document what was built from recent commits, pushes, diffs, or implementation work; create a full notion implementation doc; derive a plan and tasks from shipped work or remaining work; or keep notion pages in sync with actual engineering progress. requires notion mcp.
---

# Objective

Turn recent implementation work into clean, human-readable Notion documentation that explains what was built, why it was built, how it works, what changed, what remains, and how to track the work through linked plan and task artifacts.

The output must be a clean documentation set, not just a raw diff summary and not just a code dump.

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

# Default trigger interpretation

Unless the user explicitly says otherwise, interpret the request as:

1. analyze everything changed since the last documentation update
2. identify the implemented feature set from commits, diffs, and current code state
3. write a clean implementation document in Notion
4. create or update an implementation plan page
5. create or update linked task pages
6. add progress/status updates where useful
7. keep links between spec, implementation doc, plan, and tasks consistent

# Source priority for analysis

Use sources in this order when available:

1. recent commits and push history
2. changed files and current code state
3. pull requests if they explain intent
4. issues if they define scope or constraints
5. existing documentation pages in Notion to determine the last documented point

Prefer reconstructing the true implementation story over repeating commit messages verbatim.

# Core workflow

## 1) Find the last documentation boundary

First determine what "since the last documentation update" means.

Look for one of these, in order:

1. an existing Notion implementation page or progress page for this feature/repo
2. the latest documented milestone, checkpoint, or closeout note
3. an explicit commit hash, PR, or date mentioned by the user
4. if no boundary is found, use the most recent meaningful implementation window and state the assumption clearly

Before proceeding, capture a short assumptions block:

* assumed documentation boundary
* repo/feature scope
* any ambiguity about related work vs unrelated work

## 2) Analyze implementation work

From the identified boundary to now:

* inspect recent commits
* inspect changed files
* inspect current architecture and data flow
* infer what was actually implemented
* separate completed work from partial work
* identify user-visible behavior, backend changes, validation, security, UI, data layer, and testing changes
* identify risks, shortcuts, and follow-up work

Do not produce documentation as a commit-by-commit changelog unless the user explicitly asks for that.
Instead, synthesize a coherent implementation narrative.

## 3) Produce a clean implementation document

The main Notion documentation page should explain the work clearly for humans.

Default structure:

1. Title
2. Summary
3. Scope
4. What was implemented
5. Architecture / technical design
6. Data flow / API / validation / security notes
7. UI / UX changes
8. Files or modules affected
9. Testing / verification
10. Risks / known gaps
11. Remaining work / next steps
12. Linked plan
13. Linked tasks
14. Progress snapshot

This page must read like polished implementation documentation, not like raw engineering notes.

## 4) Create or update an implementation plan

Choose the plan depth:

* simple work -> use `references/quick-implementation-plan.md`
* larger or multi-part work -> use `references/standard-implementation-plan.md`

The plan should include:

* overview
* linked implementation doc
* linked spec if one exists
* requirements summary
* implementation phases
* dependencies and risks
* success criteria
* remaining work

## 5) Create or update tasks

Find the task database in Notion and confirm the required schema before creating tasks.

Create tasks only for:

* remaining work
* follow-up cleanup
* missing validation/tests
* rollout or verification work
* explicit next steps requested by the user

Do not create tasks for work already completed unless the user wants historical backfill.

Task sizing target:

* 1 to 2 days per task when possible

Each task should include:

* context
* objective
* acceptance criteria
* dependencies
* resources/links

Set properties when supported:

* title
* status
* priority
* relation to implementation doc
* relation to plan
* relation to spec if present
* due date / story points / assignee if provided

## 6) Link artifacts

Keep relations consistent:

* implementation doc links to plan and tasks
* plan links to implementation doc and tasks
* tasks link back to plan and implementation doc
* if a spec exists, spec links to implementation doc and plan
* if useful, add a short "Implementation" section to the spec

## 7) Track progress

When the user asks for updates or continuation:

* update the implementation doc with what changed
* update the plan status
* update task statuses
* add milestone/progress notes using `references/progress-update-template.md`
* close phases with `references/milestone-summary-template.md` when appropriate

# Documentation quality rules

Always produce clean documentation that:

* explains what was actually built
* groups related changes into coherent sections
* translates low-level code changes into understandable implementation language
* includes important technical depth without becoming a raw file dump
* distinguishes completed work from remaining work
* clearly states assumptions and ambiguities
* avoids vague filler

Do not output:

* raw diff-only summaries
* giant commit lists without synthesis
* unreadable code-first notes
* fake certainty when implementation intent is ambiguous

# Documentation writing rules

## Summary

Write 1 short paragraph that explains the feature/change in plain language.

## Scope

State what was included and what was not included.

## What was implemented

Group by meaningful capability, not by commit.

Good grouping examples:

* authentication flow
* dashboard UI
* form validation
* route protection
* data layer refactor
* task creation flow

## Architecture / technical design

Explain:

* route/component boundaries
* server/client split
* data flow
* validation
* security constraints
* storage/api/repository/service boundaries
* important tradeoffs

## Files or modules affected

Summarize the main areas touched.
Do not dump every changed file unless the user asks.

## Testing / verification

Document:

* actual tests added or updated
* lint/typecheck/manual verification if known
* missing test coverage if relevant

## Risks / known gaps

Be honest about:

* partial implementation
* shortcuts
* missing edge cases
* missing tests
* follow-up work

## Remaining work / next steps

This is where plan and tasks should come from.

# Notion behavior rules

## Search first

Before creating pages, search for:

* existing spec
* existing implementation page
* existing plan page
* existing task database
* existing related tasks

If multiple relevant pages are found, choose the best match when obvious. If not obvious, ask the user which one to use.

## Reuse before creating duplicates

If a clean implementation doc already exists for the same scope:

* update it instead of creating a duplicate
* only create a new page when the work is materially separate

## Titles

Prefer titles like:

* `DoItTimer - <Feature Name> Implementation`
* `DoItTimer - <Feature Name> Plan`
* `DoItTimer - <Feature Name> Progress`
* task titles should start with a clear action verb

## Secrets

Never include credentials, secrets, tokens, or sensitive values.
Use `[REDACTED]` when needed.

# Required output to the user

After finishing, respond with:

1. what boundary was used for analysis
2. what was documented
3. what Notion pages were created or updated
4. what tasks were created or updated
5. any ambiguities or assumptions
6. best next step

# Reference files to consult

Use these when needed:

* `references/spec-parsing.md`
* `references/quick-implementation-plan.md`
* `references/standard-implementation-plan.md`
* `references/task-creation.md`
* `references/task-creation-template.md`
* `references/progress-tracking.md`
* `references/progress-update-template.md`
* `references/milestone-summary-template.md`

# Style

Be structured, concise, and implementation-aware.
Prefer one clean documentation set over fragmented notes.
Optimize for clarity to future engineers, product stakeholders, and the user.
