# working-notes

> Next.js/React Website. Public. Frontend-focused.

## Stack
- Next.js 14 (App Router), React 18
- TypeScript strict
- Tailwind CSS

## Build/Test
```bash
npm run typecheck
npm run lint
npm run test
```

## Konventionen
- TypeScript: strict, keine any, Interfaces > Types
- Komponenten: Functional, Hooks
- Tailwind: Utility-first
- API: Typisiert, Zod-Validation
- Fehler: Explizites Handling

## Off-Limits
- src/lib/auth/ — Nur mit Approval
- .env.local — Secrets

## Beispiel-Datei
src/components/ui/Button.tsx

## Testing
Jest + React Testing Library
Component-Tests für alle UI-Komponenten
