# 006. Build the app interface on shadcn/ui with Base UI

- **Status**: accepted
- **Context**: The renderer had its own menu, dialog, tooltip and popover, with hand-written keyboard, focus and dismissal code and tests for each. Every new control meant writing that again. The approved look in `docs/design/` must not change, the CSP stays strict, and the disk is nearly full.
- **Decision**: Use shadcn/ui components (style `base-nova`) on Base UI primitives, added with the shadcn CLI into `src/renderer/components/ui/` and restyled to our tokens. Hugeicons, Inter and JetBrains Mono stay. `components.json` is written by hand, because `shadcn init` only offers presets that install Lucide and Geist.
- **Consequences**:
  - Base UI owns focus management, keyboard navigation, positioning, dismissal and ARIA for menus, dialogs, popovers and tooltips; we test only our behaviour on top.
  - We own the source, so the design stays exact, but upstream fixes have to be merged by hand: never re-add a component with `--overwrite`.
  - Tokens use shadcn's semantic names (`background`, `muted-foreground`, …) so generated code fits, plus four of ours: `canvas`, `active`, `border-strong` and `destructive-tint`.
  - New dependencies: `@base-ui/react`, `class-variance-authority`, `cn` and `tw-animate-css`. The `shadcn` package itself isn't installed; the two custom variants and the reduced-motion rule it would bring live in `styles/app.css`.
  - Base UI renders inline `<style>` only for ScrollArea and Select, which we don't use, and the CSP already allows inline styles; the e2e suite fails on any CSP violation.
