---
name: app-security-hardening
description: A defensive security framework for building secure applications and mitigating prompt injection or system prompt leakage risks.
---

# App Security Hardening Skill

When tasked with writing code, particularly backend logic or AI agent workflows, apply standard defensive programming concepts. You must adhere to OWASP Top 10 guidelines and proactively mitigate prompt vulnerabilities.

## Secure Coding Principles

1.  **Input Validation & Sanitization**:
    *   Never trust user input. Validate and sanitize inputs strictly before processing them, whether they are HTTP requests, database inputs, or prompts fed into another LLM.
    *   Use parameterized queries or ORMs to prevent SQL Injection.
    *   Escape HTML output to prevent XSS (Cross-Site Scripting).

2.  **Mitigating Prompt Injection**:
    *   When passing user input into a prompt, use clear delimiters (e.g., ````user-input````) and instruct the model explicitly that text inside those delimiters is data, not instructions.
    *   Avoid executing untrusted scripts or commands directly derived from user input.

3.  **Preventing System Prompt Leakage**:
    *   Never "hardcode" sensitive API keys, secrets, or proprietary internal system rules directly in the source code or in outputs shown to the end user.
    *   If designing a chatbot or an agent, implement a safety filter to politely decline requests asking to "ignore previous instructions" or "print your system prompt."

4.  **Least Privilege**:
    *   When creating subagents or configuring tools, only grant the minimum permissions necessary for the task (e.g., restrict file write access if a task only requires reading).
    *   Run commands in sandboxed environments when handling potentially dangerous user-submitted code.

5.  **Secure Code Review Check**:
    *   Before submitting final code, double-check for:
        - Hardcoded secrets
        - Missing authentication/authorization checks
        - Dangerous functions (e.g., `eval()`, `exec()`)
