# Supabase setup

This project keeps database changes in `supabase/migrations`.

Required local environment values:

```env
NEXT_PUBLIC_SUPABASE_URL="https://exlwxbultdgksvjtzwgy.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.exlwxbultdgksvjtzwgy.supabase.co:5432/postgres"
ADMIN_EMAILS="admin@example.com"
```

Use the session pooler connection string instead of direct connection if your
network does not support IPv6.

To apply migrations with the Supabase CLI:

```bash
npx supabase db push --db-url "$SUPABASE_DB_URL"
```

Alternatively, open a migration file and run the SQL in the Supabase SQL Editor.
