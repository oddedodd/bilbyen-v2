# Bilbyen v2

Next.js-app for visning av bruktbiler fra FINN API, med offentlige
landingssider, forhandlerdashboard og enkel admin for dealer-tilganger.

## Utvikling

Sjekk først om dev-server allerede kjører:

```bash
lsof -i :3000
lsof -i :3001
```

Start kun ny server hvis ingen eksisterer:

```bash
npm run dev
```

## Validering

Bruk disse som standard sjekkpunkter:

```bash
npm run lint
npx tsc --noEmit
```

Ikke bruk `npm run build` som vanlig validering.

## Sikkerhet

- `.env*` skal være lokale filer og er ignorert av git.
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` og `FINN_API_KEY` skal bare
  brukes server-side.
- Supabase-klientroller skal ha minst mulige grants. RLS er siste
  forsvarslinje, ikke eneste.
- Offentlig analytics-endepunkt skal validere origin, størrelse, rate og
  dealer/group før det kaller Supabase RPC.

Se `supabase/README.md` for database- og migrasjonsrutiner.
