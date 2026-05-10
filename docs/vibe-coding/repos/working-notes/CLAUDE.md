# working-notes

> Next.js/React Website. Public. Frontend-focused.

## Stack
- **Framework:** Next.js 14 (App Router), React 18
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State:** React hooks, kein global State (außer nötig)
- **API:** Next.js API Routes, typisiert
- **Content:** Markdown, MDX

## Build/Test
```bash
npm run dev        # Development
npm run build      # Production build
npm run typecheck  # TypeScript-Check (strict!)
npm run lint       # ESLint
npm run test       # Jest / React Testing Library
```

## Konventionen
- **TypeScript:** `strict: true`, keine `any`, Interfaces > Types
- **Komponenten:** Functional components, Hooks, keine Classes
- **Tailwind:** Utility-first, keine custom CSS ohne Grund
- **API:** Typisierte Request/Response, Zod für Validation
- **Fehler:** Explizites Error-Handling, keine stille Fehler
- **Git:** Feature-Branches, PRs, squash merge

## Folder Structure
```
src/app/           # Next.js App Router
src/components/    # React-Komponenten
src/lib/           # Utilities, API-Clients
src/hooks/         # Custom Hooks
src/types/         # TypeScript-Types
content/           # Markdown-Content
public/            # Statische Assets
```

## Off-Limits
- `src/lib/auth/` — Auth-Config nur mit Approval
- `.env.local` — Secrets (in .gitignore)
- `public/` — Nur Assets, keine sensiblen Daten

## Beispiel-Datei (Komponenten-Stil)
Siehe: `src/components/ui/Button.tsx`

## Testing
- Jest + React Testing Library
- Component-Tests für alle UI-Komponenten
- API-Route-Tests mit MSW (Mock Service Worker)

## Performance
- Bilder: `next/image`, WebP, lazy loading
- Fonts: `next/font`, Subsetting
- Code: Dynamic imports, Code splitting
