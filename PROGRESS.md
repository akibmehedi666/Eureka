# Eureka! — Progress Checklist

Reference `implementation.md` for full spec on every task below. Check items off as they're completed and working (not just written).

---

## Phase 1: Solo-usable core

### Project setup
- [x] Next.js 15 project scaffolded (App Router + TypeScript)
- [x] Tailwind config updated with custom palette (`paper`, `ink`, `ink-muted`, `accent`, `accent-secondary`, `border`)
- [x] Fonts installed and configured (serif for headings, sans for body, mono for metadata)
- [x] shadcn/ui installed and re-themed to match palette (not default theme)
- [x] `next-themes` installed with `defaultTheme: "light"`
- [x] Supabase project created (Auth, Storage, Postgres, Realtime enabled)
- [x] Prisma installed, schema written, first migration run

### Auth & Profile
- [x] Email/password login working
- [x] Google OAuth login working
- [x] Profile page: name, avatar, bio, focus area
- [x] Auto-populated stats on profile (papers reading, notes written, last active)

### Paper Library
- [x] Add paper via PDF upload (Supabase Storage)
- [x] Add paper via external link (arXiv/DOI/URL)
- [x] Metadata fields working (title, authors, year, source link, tags)
- [x] Status field working (To Read / Reading / Done / Reference)
- [x] Assign paper to self or teammate

### Notes (signature design element)
- [x] Notes panel opens per paper
- [x] Structured sections: Summary, Key Findings, Open Questions, Relevance
- [x] Freeform notes supported
- [x] Markdown rendering works
- [x] Design matches "margin annotation" concept — not a generic modal/textarea

**Phase 1 sign-off:** app is usable solo end-to-end (log in, add a paper, take notes on it) before moving to Phase 2.

---

## Phase 2: Team layer

- [ ] Create workspace
- [ ] Invite teammate via email/link
- [ ] Papers/notes scoped correctly to workspace
- [ ] Teammate profile page: their reading list visible
- [ ] Teammate profile page: their recent activity visible
- [ ] Quick-access comment/message button on profile

**Phase 2 sign-off:** two accounts can share a workspace and see each other's work.

---

## Phase 3: Visibility layer

- [ ] Activity feed shows chronological events (paper added, note added, status changed)
- [ ] Activity feed styled as lab notebook/journal, not generic stat-card dashboard
- [ ] Search works across paper titles, tags, and note content
- [ ] Filters work: workspace, status, assignee, tag
- [ ] Tag system: create/apply tags, filter by tag across workspace

**Phase 3 sign-off:** you can find anything (paper, note, teammate's work) in under 10 seconds.

---

## Phase 4: Realtime collaboration

- [ ] Comment threads on papers
- [ ] @mention teammates in comments
- [ ] Realtime updates via Supabase Realtime (comments + activity feed update live)

**Phase 4 sign-off:** a comment posted by one teammate appears for the other without a refresh.

---

## Design QA (check at the end of every phase)

- [x] Light mode is default on fresh load
- [x] Dark mode toggle works and doesn't break layout
- [x] No purple/indigo gradients, no glassmorphism, no default Inter-everywhere
- [x] Palette matches the hex values in `implementation.md`
- [x] Responsive on mobile
- [x] Keyboard focus states visible
- [x] `prefers-reduced-motion` respected (Tailwind/CSS baseline)

---

## Notes / things tried (log anything worth remembering here)

- Prisma v7 (latest at time of scaffold) moved datasource URL out of schema.prisma into prisma.config.ts. Pinned to Prisma v6 (6.19.3) to keep standard schema.prisma url= syntax.
- shadcn/ui v4 (`base-nova` style) uses Base UI primitives instead of Radix UI — `asChild` prop does not exist; replaced with `render={}` prop on DialogTrigger.
- General Sans is on Fontshare (not Google Fonts). Loaded via Fontshare CDN `@import` in globals.css; Fraunces and JetBrains Mono loaded via next/font/google.
- pnpm v11 requires `pnpm approve-builds --all` for any package with postinstall scripts (sharp, prisma engines, unrs-resolver). Approval is stored in pnpm-workspace.yaml.
- DATABASE_URL uses pgBouncer pooled URL (port 6543); DIRECT_URL uses direct URL (port 5432). Prisma uses directUrl for migrations.
- Auto-creates a personal workspace for new users on first login (no workspace-creation UI needed for solo Phase 1 flow).
