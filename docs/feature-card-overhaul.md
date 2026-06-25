# Feature Card Premium SVG Overhaul

## Scope
- File: `public/index.html`
- Section: `#features` only
- Cards updated:
  - Card 1: Automated Reconciliation (wide)
  - Card 2: Multi-Entity Management (narrow)
  - Card 3: Bank-Level Security (narrow)
  - Card 4: Real-time Analytics (wide)

## Replacement Strategy
- Remove generic icon sets with placeholder fills/dashes
- Replace with premium, card-specific inline SVG compositions
- Keep exact existing CSS class names to preserve current hover behavior
- Strengthen animations with layered transforms
- Keep existing `fc-content` structure and card copy

## Animation Plan
- Recon: document edge travel + sync hub pulse + matched row glow sweep
- Entity: hub phase + entity card translate + local stats draw
- Security: continuous orbital rotation + shield glow pulse + send animation
- Analytics: line draw + area expand + bar staggered rise + metric draw

## Verification
- Rebuild static dev server and reload:
  - npm start
- Visual inspect each feature card on hover
- Ensure transitions are smooth and intentional with no missing refs

## Notes
- No other sections or pages touched
- No new dependencies added
- No component refactors outside feature cards