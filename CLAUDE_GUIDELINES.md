# Claude Code Guidelines 🔧

## The Prime Directive

Whenever production code is added or modified, **ALWAYS**:

1. **Tests** – create or update unit/integration tests so the suite stays green.
2. **Types** – update any affected `.d.ts`, interfaces, or `global.d.ts`.
3. **Docs** – patch or add user-facing docs (README, docs/COMPONENTS.md, etc.).

## Prompt Style

- Keep each change atomic (one logical feature or bug-fix per prompt).
- Point Claude at specific files when possible, but “rewrite whatever is needed” is OK for small edits.
- If CI fails, feed the failing stack trace back to Claude.

## File Locations

- **Tests:** `/test/**` or `/__tests__/**`
- **Types:** `/types/**`
- **Docs:** `/docs/**` and root `README.md`

_Claude reads this file automatically; you don’t have to restate the rules in every prompt._
