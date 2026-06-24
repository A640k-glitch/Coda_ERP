---
name: lightweight-animations-icons
description: Guidelines for high-performance, lightweight website CSS/WAAPI animations and premium SVG icon systems (Lucide/Phosphor) without bloat.
---

# Lightweight Animations & Premium Icons Skill

When design requirements dictate animations or iconography, adhere to these guidelines to make the application feel fluid and premium without bloating the bundle size or degrading performance.

## 1. Animation Philosophy: Zero-Bloat, High-Performance

*   **No Heavy Libraries**: Strictly avoid importing GSAP, Framer Motion, or Anime.js unless the user explicitly requests them.
*   **The Golden Core**: Rely exclusively on **CSS Transitions**, **CSS Keyframes**, and the native browser **Web Animations API (WAAPI)**.
*   **Performance Optimization (GPU Acceleration)**:
    *   Only animate properties that do not trigger layout reflow or repaint cycles.
    *   **Allowed**: `transform` (scale, translate, rotate), `opacity`, and `filter`.
    *   **Avoid**: `width`, `height`, `top`, `left`, `margin`, `padding`, and `font-size`. If you need to expand an element, animate `transform: scale()` or use CSS Grid grid-template-rows transition instead of animating height.

## 2. Animation Token Guidelines

*   **Premium Easing (Cubic-Bezier)**: Avoid generic ease/linear transitions. Use curated timing curves:
    *   *System standard (smooth ease-in-out)*: `cubic-bezier(0.4, 0, 0.2, 1)`
    *   *Premium deceleration (snappy ease-out)*: `cubic-bezier(0.16, 1, 0.3, 1)` (Ease Out Expo)
    *   *Elastoid bounce (playful feed)*: `cubic-bezier(0.34, 1.56, 0.64, 1)`
*   **Durations**:
    *   *Micro-interactions (buttons, hovers)*: `100ms` - `200ms`
    *   *Page transitions / modal fades*: `250ms` - `350ms`
    *   *Complex entries*: `max 400ms`
*   **Staggered Entries**:
    *   When rendering lists or grids, stagger elements by applying an incremental `transition-delay` inline (e.g., `0ms`, `30ms`, `60ms`, `90ms`) to create a cascading entrance flow.

## 3. High-Fidelity CSS Animation Recipes

Use these recipes directly in UI projects:

### Hover Lift & Glow (Cards/Buttons)
```css
.premium-card {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), 
              box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-color);
}
.premium-card:hover {
  transform: translateY(-3px);
  border-color: var(--primary-accent);
  box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.08), 
              0 0 15px -3px rgba(var(--primary-rgb), 0.15);
}
```

### Active Press State
```css
.premium-btn:active {
  transform: scale(0.97);
  transition: transform 0.05s ease;
}
```

### Entrance Slide-Up (Fade In)
```css
@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.entry-fade-up {
  animation: fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### Skeleton Screen Pulse (Loading States)
```css
@keyframes skeletonPulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.85;
  }
}
.skeleton-placeholder {
  background: var(--skeleton-bg, #e2e8f0);
  animation: skeletonPulse 1.5s ease-in-out infinite;
}
```

### Input Error Shake
```css
@keyframes shakeError {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
.input-error-shake {
  animation: shakeError 0.25s ease-in-out;
}
```

## 4. Premium Icon Systems & Guidelines

Icons act as visual anchors. To make them look premium:

*   **Preferred Libraries**:
    *   **Lucide Icons**: Crisp, clean geometric design (successor to Feather).
    *   **Phosphor Icons**: Soft, rounded outlines, highly consistent stroke weight.
*   **Best Practices for SVG Embedding**:
    *   *Sizing*: Use explicit classes or attributes:
        *   `16px` (sm) - inside buttons, inline text
        *   `20px` (md) - navigation links, standard list items
        *   `24px` (lg) - cards, headers
        *   `32px+` (xl) - empty state illustrations, heroes
    *   *Stroke Weight*: Use `stroke-width="1.75"` or `stroke-width="2"` for smaller sizes. For a premium look on larger displays, use `stroke-width="1.5"` for clean, delicate outlines.
    *   *Colors*: Use `stroke="currentColor"` and `fill="none"` to allow icons to dynamically inherit the visual state of parent components (like active, hover, or disabled colors).
*   **Icon Transitions**:
    *   When the parent is hovered, animate the icon's rotation, transform, or stroke-color.
    ```css
    .nav-link {
      color: var(--text-muted);
    }
    .nav-link svg {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), 
                  stroke 0.2s ease;
    }
    .nav-link:hover {
      color: var(--text-active);
    }
    .nav-link:hover svg {
      transform: translateX(2px); /* Subtle shift forward */
      stroke: var(--primary);
    }
    ```

## 5. Web Animations API (WAAPI) for Dynamic States

For interactive logic that requires complex start/end states or coordinates dynamic events (e.g. click ripple effect, toast dismissal, expanding accordion details), use the native browser `animate()` API:

```javascript
// Example: Playful ripple effect
function triggerRipple(element, event) {
  const rect = element.getBoundingClientRect();
  const circle = document.createElement('span');
  const diameter = Math.max(rect.width, rect.height);
  const radius = diameter / 2;
  
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple-element');
  
  element.appendChild(circle);
  
  circle.animate([
    { transform: 'scale(0)', opacity: 0.4 },
    { transform: 'scale(2.5)', opacity: 0 }
  ], {
    duration: 400,
    easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)'
  }).onfinish = () => circle.remove();
}
```
