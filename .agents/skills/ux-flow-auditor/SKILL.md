---
name: ux-flow-auditor
description: Guidelines and checklists to test, audit, and optimize application UX flows, ensuring simplicity, visual structure, and zero unnecessary steps.
---

# UX Flow Auditor Skill

When building, reviewing, or refactoring application flows, act as a strict UX auditor. Your goal is to simplify user journeys, reduce cognitive load, eliminate unstructured layouts, and make every interaction feel purposeful and premium.

## 1. Heuristics for Premium UX Flows

Use these heuristics to review and refine every user flow in the application:

*   **Click & Step Minimization**:
    *   Evaluate the action-to-step ratio. Can the user complete the primary action in fewer clicks or screens?
    *   Pre-fill form fields where possible using defaults, session data, or query params.
    *   Avoid introducing intermediary landing or confirmation screens unless security/financial clearance strictly requires it.
*   **Progressive Disclosure**:
    *   Avoid overwhelming the user. Present only the information relevant to their current step.
    *   Use expanding drawers, accordions, or modal steps instead of navigating to separate pages for minor sub-tasks.
*   **Context & State Conservation**:
    *   When navigating away to perform an action (e.g., adding an integration or onboarding a business) and returning, ensure the user returns to their exact previous state with filter selections intact.
*   **Aesthetic Alignment & Grids**:
    *   Ensure all items are mathematically aligned. Leverage CSS Grid and Flexbox with consistent gap values.
    *   Adhere strictly to an **8px grid spacing scale**: spacing values should always be multiples of 8 (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`) for padding, margins, and layout gaps.

## 2. The UX Audit Checklist

Before implementing or completing any task, run the system through this audit checklist:

1.  **Empty/Zero State Audit**:
    *   *Check*: What does the user see if there is no data (e.g., empty dashboard, no customers, no invoices)?
    *   *Requirement*: Never show a blank page or empty table. Display a beautifully styled placeholder illustration, brief description, and a clear, primary CTA (e.g., "Add Your First Customer").
2.  **Async & Loading State Audit**:
    *   *Check*: What happens during network delay or loading?
    *   *Requirement*: Disable primary action buttons on click to prevent double submissions. Show a loading spinner or matching skeleton screens to maintain visual structure.
3.  **Form Validation & Error State Audit**:
    *   *Check*: How are errors handled?
    *   *Requirement*: Avoid generic alerts or raw backend stack traces. Show descriptive, localized inline error messages directly under the affected form fields. Highlight inputs with a red border, and play a subtle shake animation (using the `lightweight-animations-icons` error recipe) to draw attention.
4.  **Success/Completion Feedback**:
    *   *Check*: Is the user notified of success?
    *   *Requirement*: Trigger a clean, micro-animated toast notification or confirmation state. Ensure the toast dismisses itself automatically after 3–5 seconds or can be closed manually.
5.  **Focus & Accessibility Flow**:
    *   *Check*: Can the user navigate the flow using only a keyboard?
    *   *Requirement*: Ensure logical `tabindex` flows. Active elements must display a distinct visual focus state (e.g., ring outline).

## 3. Auditing the Workspace Heuristically

When performing an audit command:
1.  **Map the Routes**: Identify the entry points, happy paths, and error/cancel branches.
2.  **List Friction Points**: Look for unnecessary fields, slow responses, confusing layout grids, and missing feedback.
3.  **Refactor**: Group forms logically into columns, add input masks/hints, add lightweight animations for transitions, and replace generic text with descriptive copy.
4.  **Confirm Alignment**: Verify that no elements overlap or wrap awkwardly on mobile/tablet viewports.
