# UI DESIGN SYSTEM

## Style & Palette
- **Primary Canvas**: Clean off-white `#F8FAFC` / `#FFFFFF`
- **Typography & Dark Elements**: Slate Charcoal `#0F172A`, Dark Gray `#334155`, Muted Gray `#64748B`
- **Borders & Dividers**: Hairline subtle borders `#E2E8F0` / `rgba(0,0,0,0.08)`
- **Accent Palette**: Deep Indigo (`#4338CA`), Slate Blue (`#2563EB`)
- **Semantic Indicators**:
  - Success / Match: Emerald (`#059669`)
  - Mismatch / Warning: Amber (`#D97706`)
  - Alert / Error: Rose (`#E11D48`)

## Typography Rules
- Display & Headings: `Plus Jakarta Sans` / `Cabinet Grotesk`
- Body & Labels: `Plus Jakarta Sans` / `Satoshi`
- Tabular Numerals: Enforced with `font-mono tabular-nums` for all numeric metrics, scores, difficulty indices, and timestamps.
- Zero-Pill Discipline: Static metadata rendered as clean text separated by `·` or `/`. Functional filter buttons use subtle segmented tabs.

## Interactive States
- Every table & chart view includes:
  1. Populated State
  2. Loading / Skeleton State
  3. Empty State with CTA
  4. Error / Validation State
