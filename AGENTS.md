# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project may use newer Next.js patterns, APIs, caching behavior, and App Router conventions that differ from older training data.

Before making framework-level changes:
- Read relevant documentation in `node_modules/next/dist/docs/`
- Check existing project patterns first
- Prefer existing conventions over generic Next.js examples
- Heed deprecation warnings and build output carefully

Important:
- Do not introduce Pages Router patterns into App Router code
- Do not add `getServerSideProps` or `getStaticProps`
- Prefer async server components where appropriate
- Prefer server-side fetching and caching
- Respect existing revalidation strategy
- Avoid unnecessary client components

Always follow the existing architecture before introducing new patterns.
<!-- END:nextjs-agent-rules -->

---

# Project context

This is a Next.js application for displaying used cars from the FINN API.

The project includes:
- front page car carousels
- dealer-specific sections
- landing pages
- filtered listing pages
- server-side cached API fetching

The primary goals are:
- good performance
- predictable caching
- low API usage
- maintainable code
- fast page loads
- responsive UI

---

# General rules

- Prefer small, targeted changes.
- Do not rewrite working code unnecessarily.
- Preserve existing architecture, naming, structure, and conventions.
- Avoid introducing new abstractions unless they clearly improve maintainability.
- Do not add dependencies unless necessary.
- Explain briefly why a new dependency is needed before adding it.
- Follow existing project patterns before creating new ones.
- Never run `npm run build` unless the user explicitly requests it.
- Avoid “cleanup refactors” unless explicitly requested.

---

# Development server rules

Before running a development server, always check whether one is already running.

Check ports first:

```bash
lsof -i :3000
```

```bash
lsof -i :3001
```

If a dev server is already running:
- do not start another one
- reuse the existing server

Preferred workflow:

1. Check if a dev server already exists
2. Start `npm run dev` only if necessary
3. Validate affected pages/components locally
4. Run lint/typecheck if relevant

---

# Build rules

- **Never run `npm run build`.** Agents must not run production builds.
- Do not use build as a validation step — use the dev server, lint, and typecheck instead.
- Only run a build if the user explicitly asks (e.g. "run build", "verify production build").
- Never suppress errors without explanation.
- Do not bypass TypeScript or ESLint errors by using `any`, disabling lint rules, or adding ignore comments unless explicitly justified.
- Fix root causes whenever possible.

---

# FINN API rules

- Be conservative with FINN API usage.
- Avoid unnecessary repeated requests.
- Prefer server-side fetching.
- Prefer caching and revalidation over frequent live requests.
- Avoid client-side fetching unless interactivity requires it.
- Keep dealer/org ID filtering explicit and easy to maintain.
- Dealer org IDs do not need to be hidden in `.env`.
- Never expose API credentials or tokens in client components.
- Any secrets must remain server-side only.

---

# Caching rules

- Prefer cached server requests for vehicle data.
- Use sensible revalidation intervals.
- Avoid reducing cache duration without good reason.
- Slightly stale car data is acceptable if it improves performance and reduces costs.
- Prefer stable caching behavior over unnecessary real-time updates.

---

# UI rules

- Keep components simple and reusable.
- Prioritize responsiveness on both mobile and desktop.
- Carousels should perform smoothly without heavy animations.
- Landing pages should be fast, readable, and SEO-friendly.
- Use Next.js image optimization where appropriate.
- Avoid unnecessary client-side state.

---

# Next.js rules

- Prefer Server Components by default.
- Only use `"use client"` when truly necessary.
- Avoid unnecessary hydration.
- Prefer route-level data fetching over deeply nested fetches.
- Keep server/client boundaries clear.
- Respect App Router conventions.
- Do not introduce outdated Next.js patterns.

---

# Code style

- Write clear and readable code.
- Prefer descriptive naming.
- Keep components focused and small.
- Avoid clever or over-engineered abstractions.
- Follow existing formatting and file organization.
- Prefer consistency over personal preference.

---

# Git rules

- Do not commit unless explicitly asked.
- Do not push unless explicitly asked.
- Summarize changes before suggesting a commit.
- Never overwrite user changes.
- Never force push.

---

# File safety rules

- Do not delete files unless explicitly asked.
- Do not modify `.env` files unless explicitly asked.
- Do not rotate, regenerate, or replace secrets automatically.
- Ask before performing broad refactors or moving files.

---

# Performance priorities

Priority order:

1. Stability
2. Performance
3. Maintainability
4. Developer convenience
5. Cleverness

Always prioritize predictable behavior and maintainable solutions over overly complex optimizations.