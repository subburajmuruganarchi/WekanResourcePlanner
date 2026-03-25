# Codebase Memory System

A production-ready memory system that completely eliminates repetitive token costs by shifting codebase understanding from LLM context to a deterministic, offline-indexed Memory Store powered by abstract syntax trees (ASTs).

## Features
- **Deterministic Querying**: Bypasses slow LLM reasoning by directly executing exact searches (`find_function`, `trace_call_path`, `impact_analysis`).
- **Zero Raw File Reads**: The LLM exclusively sees compressed JSON context containing just the nodes and edges needed.
- **Incremental Indexing**: Background scanner processes only changes by tracking file hashes.
- **Offline Indexing**: Built on `web-tree-sitter` for JavaScript/TypeScript, saving the full tree into SQLite.

## Core Architecture
1. **Indexer**: Background parser generating `FileNode`, `FunctionNode`, `ClassNode`, and relationship `Edges`.
2. **Memory Store**: Fast SQLite graph holding the index.
3. **Query Engine**: Exposes strict backend functions mapped directly to user intents.
4. **Controller**: Employs a cheap LLM call (e.g., `gpt-3.5-turbo`) *only* to decode intent (routing), queries the explicit DB logic, and finally uses the advanced LLM (*gpt-4*) *only* to format the JSON data back into natural language.

---

## Example Usage
```bash
# Build the project
npx tsc

# Run the controller pipeline against mock/test data
node dist/index.js
```
