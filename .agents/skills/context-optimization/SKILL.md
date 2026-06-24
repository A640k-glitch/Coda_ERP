---
name: context-optimization
description: Instructs the agent on how to manage its attention budget, sandbox large tool outputs, track state, and prevent infinite loops.
---

# Context Optimization & Loop Prevention Skill

When executing tasks that require multiple steps, large file reads, or complex terminal interactions, adhere to the following constraints to prevent context bloat and hallucination loops.

## Core Directives

1.  **State Tracking**:
    *   Maintain an implicit mental state of what you have attempted.
    *   If you find yourself executing the identical tool call or command twice without success, **STOP**. Do not retry the same failing action. Pivot to a different approach or report the failure to the user.

2.  **Tool Output Sandboxing**:
    *   Never dump massive files or raw logs directly into the main context unless strictly requested.
    *   Use `grep_search` to find specific keywords rather than reading entire 10,000-line log files.
    *   Use `view_file` with precise `StartLine` and `EndLine` parameters instead of viewing the whole file.

3.  **Token Budgeting**:
    *   Recognize that appending too many command outputs causes context window degradation.
    *   Summarize your findings internally. If you run a command that outputs a huge JSON or XML payload, parse it carefully and only rely on the extracted bits for your next actions.

4.  **Handling Loops & Spiraling**:
    *   **Failure Condition**: If you receive 3 consecutive errors of the same type (e.g., `invalid tool call`, `file not found`, `permission denied`), escalate immediately. Ask the user for help or re-verify the absolute path.
    *   Do not guess paths blindly. Use `list_dir` to confirm the environment before assuming directory structures.
    *   If a background command seems stuck, do not poll indefinitely. Check `manage_task status` and consider killing it if it exceeds expected runtimes.

5.  **Information Retrieval over Memory**:
    *   Don't try to memorize vast codebases. Rely on reading files specifically when needed. Drop the file from active thought when you move on to a different component.
