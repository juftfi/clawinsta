# Clawgram VPS Start Here

Purpose: give the next agent a fast, reliable starting point for working on the live OpenClaw/Clawgram setup on the VPS.

## Scope

- VPS host: `46.224.194.178`
- VPS user: `root`
- OpenClaw repo on VPS: `/root/openclaw`
- OpenClaw runtime data on VPS: `/root/.openclaw`
- Main workspace on VPS: `/root/.openclaw/workspace`

## How To Connect

Use the SSH key already configured on this machine.

Typical command:

```bash
ssh root@46.224.194.178
```

Notes:

- The SSH key is passphrase-protected.
- Do not store passphrases in git/repo files.
- If SSH fails, verify you are on the same machine/profile that already has the working key.

## First Files To Read On The VPS

Read these first, in order:

1. `/root/.openclaw/workspace/AGENT_HANDOFF_2026-03-13.md`
2. `/root/.openclaw/workspace/HEARTBEAT_DEBUG_RUNBOOK_2026-02-26.md`
3. `/root/.openclaw/workspace/HEARTBEAT.md`
4. `/root/.openclaw/workspace/AGENTS.md`
5. `/root/.openclaw/workspace/TODOS.md`
6. `/root/.openclaw/workspace/DECISIONS.md`
7. `/root/.openclaw/workspace/ACTION_PLAN_2026-03-08.md`

These files contain:

- current heartbeat debugging history
- production policy for Clawgram/Moltbook behavior
- current user priorities and operating context

## Source Of Truth

When there is any mismatch between local notes and live behavior:

- trust the live VPS files
- trust the live VPS logs
- trust the live VPS session transcripts

Do not assume the local repo or old notes reflect the current production runtime.

## Repo And Runtime Layout On The VPS

Git repo:

- `/root/openclaw`

Runtime config:

- `/root/.openclaw/openclaw.json`

Workspace files:

- `/root/.openclaw/workspace/`

Structured memory:

- `/root/.openclaw/workspace/memory/`

Main session transcripts:

- `/root/.openclaw/agents/main/sessions/`

## Most Important Live Files

Config:

- `/root/.openclaw/openclaw.json`

Workspace:

- `/root/.openclaw/workspace/HEARTBEAT.md`
- `/root/.openclaw/workspace/AGENTS.md`
- `/root/.openclaw/workspace/USER.md`
- `/root/.openclaw/workspace/OPS_PROFILE.md`
- `/root/.openclaw/workspace/TODOS.md`
- `/root/.openclaw/workspace/DECISIONS.md`

Heartbeat logs/state:

- `/root/.openclaw/workspace/memory/heartbeat-audit.jsonl`
- `/root/.openclaw/workspace/memory/heartbeat-state.json`

Session transcripts:

- `/root/.openclaw/agents/main/sessions/*.jsonl`

## What To Inspect First For Clawgram Issues

If the issue is heartbeat posting quality, failures, duplicates, or skipped runs:

1. `/root/.openclaw/workspace/HEARTBEAT.md`
2. `/root/.openclaw/workspace/memory/heartbeat-audit.jsonl`
3. newest files under `/root/.openclaw/agents/main/sessions/`
4. `/root/.openclaw/openclaw.json`

Check for:

- duplicate posting
- reused media
- fallback behavior after failed image generation/upload
- stale session reuse
- target/session settings under heartbeat config

## Known Production Focus

Current production focus is not generic OpenClaw work. It is specifically:

- make Clawgram heartbeat posting reliable
- avoid duplicate posts
- avoid old media reuse
- preserve robust logging so future failures are debuggable

Secondary focus:

- keep Moltbook behavior sane
- avoid breaking the live agent while debugging

## Safe Working Order

Use this order when starting work:

1. read the handoff/debug files
2. inspect live logs and transcripts
3. inspect live config/workspace files
4. form a hypothesis
5. make the smallest production-safe change
6. verify with logs after the next run

Do not start by changing prompts/config blindly.

## Updating The VPS Repo

The update runbook is local here:

- `C:\Users\ladis\Desktop\Coding\openclaw-main\UPDATE_LOCAL_AND_VPS_RUNBOOK.md`

If you need to update both local and VPS OpenClaw again, use that file instead of improvising.

## Practical Start Prompt For The Next Agent

Use this as the first instruction:

`Connect to the VPS at root@46.224.194.178. First read /root/.openclaw/workspace/AGENT_HANDOFF_2026-03-13.md and /root/.openclaw/workspace/HEARTBEAT_DEBUG_RUNBOOK_2026-02-26.md. Then inspect /root/.openclaw/workspace/HEARTBEAT.md, /root/.openclaw/workspace/memory/heartbeat-audit.jsonl, and the newest files under /root/.openclaw/agents/main/sessions/ before making any changes.`
