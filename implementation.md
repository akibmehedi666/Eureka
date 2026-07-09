# Eureka! — Implementation Spec

A research paper tracking and collaboration platform for research teams. This document is the single source of truth for the project. Read this in full before writing any code.

---

## 1. Tech Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (customized — see Design System, do not use default shadcn theme)
- **Animation:** Framer Motion (used deliberately, not everywhere — see Motion section)
- **Backend/DB:** Supabase (Postgres + Auth + Storage + Realtime)
- **ORM:** Prisma
- **Hosting target:** Vercel

---

## 2. Design System — READ CAREFULLY, DO NOT DEFAULT

Do not use generic AI-generated design patterns. Specifically avoid: dark mode as default, purple/indigo gradient blobs, glassmorphism cards, Inter font for everything, numbered 01/02/03 feature cards used as decoration, rounded-2xl applied uniformly to every element, and centered hero sections with a gradient headline. These are templated defaults, not design choices.

**Concept:** treat this as a research notebook / library, not a generic SaaS dashboard.

### Palette (set these as actual values in `tailwind.config.ts`, do not substitute defaults)

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FAF7F0` | primary background (warm off-white, not pure white) |
| `ink` | `#1C1F26` | primary text |
| `ink-muted` | `#5C5F66` | secondary text |
| `accent` | `#D98E2F` | highlighter/annotation amber — interactive elements, active status |
| `accent-secondary` | `#3F5C4C` | deep forest green — secondary states, tags |
| `border` | `#E4DFD3` | hairline borders/dividers |

No purple, no neon, no default indigo/violet.

### Typography

- **Headings:** a characterful serif or slab-serif with real presence (e.g. Fraunces, Source Serif 4, or similar journal/book-spine energy)
- **Body:** a clean, highly legible sans (Inter is acceptable for body copy ONLY, never headings — or use something more distinct like General Sans)
- **Utility/metadata face:** a monospace font for timestamps, tags, and metadata to reinforce the "annotation" feel

### Signature element

The **notes panel** is where design boldness lives. It should feel like actual margin annotations on a page — not a generic modal or plain textarea. Think: a document view with a visible margin column where notes attach, underlines/highlights connecting note to paper content, restrained handwritten-adjacent accent details. Keep everything else (nav, forms, tables) clean, quiet, disciplined.

### Layout

- The **activity feed/dashboard** is the home screen — design it like a lab notebook log or reading journal, not a generic analytics dashboard with stat cards.
- Avoid 3-column icon-card grids for features.
- Use structural devices (dividers, labels, eyebrows) only where they encode real information — status labels (To Read/Reading/Done) are legitimate; decorative 01/02/03 numbering is not.

### Motion

Use Framer Motion deliberately:
- Good: subtle page-load sequence, smooth transitions when a paper moves between status columns, soft reveal when the notes panel opens
- Avoid: hover effects on every element, scattered/ambient animation everywhere

### Mode & accessibility

- **Light mode is default.** Design the palette and every component FOR light mode first — do not design dark-first and invert. Use `next-themes` with `defaultTheme: "light"`. Dark mode exists only as a toggle.
- Responsive down to mobile
- Visible keyboard focus states
- Respect `prefers-reduced-motion`

---

## 3. Core Features

1. **Authentication & Profile** — email/password + Google OAuth (Supabase Auth). Profile page: name, avatar, bio, current research focus. Auto-populated stats: papers reading, notes written, last active.

2. **Paper Library** — add via PDF upload (Supabase Storage) or external link (arXiv/DOI/URL). Metadata: title, authors, year, source link, tags. Status: `To Read / Reading / Done / Reference`. Assignable to self or teammate.

3. **Structured Notes** — opens as a panel per paper. Sections: Summary, Key Findings, Open Questions, Relevance to Project. Markdown support (code blocks, LaTeX-style math where possible). Freeform notes also allowed.

4. **Workspaces (Team/Collab)** — one workspace per research direction/project. Invite teammates via email/invite link. Papers and notes are scoped to a workspace.

5. **Teammate Profiles** — view a teammate's current reading list, recent notes/activity, quick-access to comment/message.

6. **Contextual Comments** — threads directly on a paper (not a generic chat). @mention teammates. Realtime via Supabase Realtime.

7. **Activity Feed / Dashboard** — chronological feed of who added/noted what, this week. This is the home base screen.

8. **Search & Filter** — across papers and notes (title, tags, content). Filter by workspace, status, assignee, tag.

9. **Tag System** — global tags within a workspace, filterable across all teammates' papers.

---

## 4. Data Model (Prisma Schema)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum PaperStatus {
  TO_READ
  READING
  DONE
  REFERENCE
}

enum WorkspaceRole {
  OWNER
  MEMBER
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String
  avatarUrl     String?
  bio           String?
  focusArea     String?
  createdAt     DateTime @default(now())
  lastActiveAt  DateTime @default(now())

  memberships   WorkspaceMember[]
  papersAdded   Paper[]           @relation("PapersAdded")
  papersAssigned Paper[]          @relation("PapersAssigned")
  notes         Note[]
  comments      Comment[]
  activities    Activity[]
}

model Workspace {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now())

  members     WorkspaceMember[]
  papers      Paper[]
  tags        Tag[]
  activities  Activity[]
}

model WorkspaceMember {
  id          String        @id @default(uuid())
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now())

  user        User      @relation(fields: [userId], references: [id])
  userId      String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId String

  @@unique([userId, workspaceId])
}

model Paper {
  id          String      @id @default(uuid())
  title       String
  authors     String
  year        Int?
  sourceUrl   String?
  fileUrl     String?
  status      PaperStatus @default(TO_READ)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId String

  addedBy     User   @relation("PapersAdded", fields: [addedById], references: [id])
  addedById   String

  assignedTo   User?   @relation("PapersAssigned", fields: [assignedToId], references: [id])
  assignedToId String?

  tags        PaperTag[]
  notes       Note[]
  comments    Comment[]
  activities  Activity[]
}

model Note {
  id          String   @id @default(uuid())
  summary     String?
  keyFindings String?
  openQuestions String?
  relevance   String?
  freeform    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  paper       Paper  @relation(fields: [paperId], references: [id])
  paperId     String
  author      User   @relation(fields: [authorId], references: [id])
  authorId    String
}

model Comment {
  id        String   @id @default(uuid())
  content   String
  createdAt DateTime @default(now())

  paper     Paper  @relation(fields: [paperId], references: [id])
  paperId   String
  author    User   @relation(fields: [authorId], references: [id])
  authorId  String
}

model Tag {
  id          String   @id @default(uuid())
  name        String

  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId String
  papers      PaperTag[]

  @@unique([name, workspaceId])
}

model PaperTag {
  paper   Paper  @relation(fields: [paperId], references: [id])
  paperId String
  tag     Tag    @relation(fields: [tagId], references: [id])
  tagId   String

  @@id([paperId, tagId])
}

// Feed of who-did-what, powers the Activity dashboard
model Activity {
  id          String   @id @default(uuid())
  type        String   // e.g. "PAPER_ADDED", "NOTE_ADDED", "COMMENT_ADDED", "STATUS_CHANGED"
  metadata    Json?
  createdAt   DateTime @default(now())

  user        User      @relation(fields: [userId], references: [id])
  userId      String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  workspaceId String
  paper       Paper?    @relation(fields: [paperId], references: [id])
  paperId     String?
}
```

---

## 5. Build Phases

**Phase 1 — Solo-usable core**
Project scaffold, Tailwind config with design tokens, Prisma schema + migration, Supabase Auth, Paper CRUD, Notes panel (signature design element).

**Phase 2 — Team layer**
Workspaces (create/invite), Teammate profiles.

**Phase 3 — Visibility layer**
Activity Feed/dashboard, Search, Tags.

**Phase 4 — Realtime collaboration**
Contextual comments on papers, @mentions, Supabase Realtime wiring.

Do not skip ahead to a later phase before the current phase is functional end-to-end. Update `PROGRESS.md` as tasks complete.

---

## 6. Working Agreement for the AI Agent

- Always re-read this file before starting new work in a session.
- Match the Design System exactly — do not fall back to shadcn/ui default theme, default Tailwind colors, or default fonts.
- Light mode is default, dark mode is a toggle — never invert this.
- Work phase by phase. Confirm a phase is working before moving to the next.
- Check off completed items in `PROGRESS.md` as you go.
