# Supabase setup

This project keeps database changes in `supabase/migrations`.

Required local environment values:

```env
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_DB_URL="postgresql://postgres:[YOUR-PASSWORD]@db.<project-ref>.supabase.co:5432/postgres"
ADMIN_EMAILS="admin@example.com"
```

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
are safe to expose to the browser. Service role keys, database URLs, FINN API
keys, and admin credentials must stay server-side and out of git.

`ADMIN_EMAILS` is used as an admin bootstrap/failsafe. After the first admin has
signed in, admin access is managed in the `admin_users` table through the admin
settings page.

Use the session pooler connection string instead of direct connection if your
network does not support IPv6.

To apply migrations with the Supabase CLI:

```bash
npx supabase db push --db-url "$SUPABASE_DB_URL"
```

Alternatively, open a migration file and run the SQL in the Supabase SQL Editor.

After security-related migrations, run Supabase Security Advisor and verify that
client roles only have the grants required by the app. Public analytics should
be written through the server route, not by granting browser roles direct table
write access.

Supabase Auth settings are not managed by these SQL migrations. Enable leaked
password protection in the Supabase dashboard for production projects.
