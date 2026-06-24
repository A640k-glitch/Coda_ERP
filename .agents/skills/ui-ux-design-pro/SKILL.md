---
name: ui-ux-design-pro
description: Enforces modern design aesthetics, visual vocabulary, semantic color tokens, and iterative feedback loops for frontend web development tasks.
---

# UI/UX Design Pro Skill

When design, building, or modifying frontend interfaces, act as a Senior UI/UX Designer and Frontend Engineer. Follow these principles to ensure high-quality, modern, responsive, and cohesive designs.

## 1. Coordinated Skills

This skill is part of a premium UI/UX design suite. Coordinate with the following specialized skills:
*   [lightweight-animations-icons](file:///c:/Users/AK/Documents/fifthapp/.agents/skills/lightweight-animations-icons/SKILL.md): Principles for high-performance animations and premium SVG icon configurations.
*   [ux-flow-auditor](file:///c:/Users/AK/Documents/fifthapp/.agents/skills/ux-flow-auditor/SKILL.md): Heuristics and checklists for workflow optimization and step reduction.

## 2. Core Design Principles & Guidelines

### Semantic Tokens & Design System
*   **Colors**: Avoid raw colors (e.g. `#FF0000` or generic `blue`). Always declare and use CSS Custom Properties for a semantic palette:
    *   `--bg-primary`, `--bg-secondary` (main app canvases)
    *   `--surface`, `--surface-hover` (cards, drawers, inputs)
    *   `--primary`, `--primary-hover`, `--primary-active` (branding color)
    *   `--text-primary`, `--text-secondary`, `--text-muted` (typography hierarchy)
    *   `--border-color`, `--border-hover` (subtle separating lines)
    *   `--success`, `--warning`, `--error` (status colors)
*   **Typography Scale**: Define explicit font size scales (e.g., `sm: 0.875rem`, `base: 1rem`, `lg: 1.125rem`, `xl: 1.25rem`, `2xl: 1.5rem`). Establish a clear hierarchy using font-weights (`400` regular, `500` medium, `600` semibold). Use modern sans-serif typefaces (e.g., Inter, Outfit, or Roboto).
*   **Spacing Rhythm**: Maintain visual hierarchy using the **8px grid scale** for padding, margin, and gaps (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`).

### Premium Aesthetics
*   **Depth & Elevation**: Use subtle multi-layered shadows and transparency rather than thick flat borders.
    *   *Example*: `box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);`
*   **Glassmorphism**: For modern dashboards and overlays, use glass effects combining backdrop filtering and semi-transparent borders:
    *   *Example*: `background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.3);`
*   **Accent Gradients**: Use smooth, dual-stop color gradients for hero banners, primary buttons, or loading states to elevate visual interest.

## 3. Responsive Layout Guidelines
*   **Mobile-First Design**: Implement responsive logic starting with mobile and scaling up using CSS Media Queries (e.g., `@media (min-width: 768px)` for tablets, `@media (min-width: 1024px)` for desktop layouts).
*   **Flex & Grid**: Rely on flex containers for single-axis alignments (like navigation bars and button bars) and grid layouts for multi-axis alignments (like cards and dashboard widgets). Never use absolute positioning for primary layout structures.

## 4. Interactive Micro-animations
*   Every interactive element (button, form field, card link) must have hover, active, and focus states.
*   Ensure state transitions are smooth and performant by utilizing transitions documented in the [lightweight-animations-icons](file:///c:/Users/AK/Documents/fifthapp/.agents/skills/lightweight-animations-icons/SKILL.md) skill.
