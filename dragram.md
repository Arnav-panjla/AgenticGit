# AgentBranch Commit Structure & Knowledge Graph

- Commits are stored in PostgreSQL (`backend/src/db/schema.sql` + v2–v5 migrations) under `commits` with parent/branch/repo links and semantic/trace fields. Content payload is referenced by `content_ref` (Fileverse CID or mock).
- Semantic fields (`embedding`, `semantic_summary`, `tags`, `reasoning_type`, `trace_*`) come from v2 and are indexed for search/graph/replay. Knowledge/failure memory adds JSONB (`knowledge_context`, `failure_context`) with GIN indexes (v4/v5). Workflow hooks write `workflow_runs.checks` JSONB per commit (v5).
- The knowledge graph is derived from `parent_commit_id` plus `knowledge_context.dependencies[]` and is exposed via `GET /repositories/:id/commits/graph` and `GET /repositories/:id/commits/context-chain`.

```mermaid
flowchart LR
  subgraph Actors
    Agent[Agent]
  end

  subgraph RepoSpace
    Repo[Repository]
    Branch[Branch]
    Commit[Commit]
  end

  subgraph CommitPayload
    Content[content_ref (Fileverse CID)]
    Semantic[embedding | semantic_summary | tags | reasoning_type | trace_*]
    KC[knowledge_context {decisions, architecture, libraries, open_questions, next_steps, dependencies, handoff_summary}]
    FC[failure_context {failed, error_type, error_detail, failed_approach, root_cause, severity}]
    Workflow[workflow_runs.checks[] {security_scan, content_quality, knowledge_completeness}]
  end

  Agent --> Repo
  Repo --> Branch
  Branch --> Commit
  Commit --> Content
  Commit --> Semantic
  Commit --> KC
  Commit --> FC
  Commit --> Workflow
  Commit -. parent_commit_id .-> Commit
  KC -. dependencies[] .-> Commit
  Commit -->|graph API| Graph[Knowledge Graph]
```

Example commit payload (stored on `commits` + JSONB fields, content lives at `content_ref`):

```json
{
  "message": "Add Sudoku validation",
  "content_ref": "fileverse://cid",
  "branch_id": "<uuid>",
  "author_agent_id": "<uuid>",
  "parent_commit_id": "<uuid>",
  "semantic_summary": "Implements row/col/subgrid checks",
  "tags": ["frontend", "logic"],
  "reasoning_type": "experiment",
  "trace_context": {"input": "board state"},
  "knowledge_context": {
    "decisions": ["Validate on submit"],
    "architecture": "Client-side hook + shared validator util",
    "libraries": ["react"],
    "open_questions": ["Add difficulty levels?"],
    "next_steps": ["Add timer"],
    "dependencies": ["parent-uuid"],
    "handoff_summary": "UI wired; needs perf tuning"
  },
  "failure_context": null
}
```

Knowledge graph tracking:
- Nodes: commits in a repo/branch.
- Edges: `parent_commit_id` (temporal lineage) plus optional `knowledge_context.dependencies[]` (explicit cross-commit links).
- Queries: `GET /repositories/:id/commits/graph` returns nodes/edges; `GET /repositories/:id/commits/context-chain` returns ordered chain with per-commit knowledge briefs.
- Search: embeddings (`pgvector` when available, FTS fallback) + tags/semantic_summary enable semantic graph traversal; JSONB indexes speed knowledge/failure queries.
