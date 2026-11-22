# EUREKA! 🧪📖
### Collaborative Academic Research Library & Paper Tracker

> **A collaborative research paper management system, document library, and literature review notebook engineered with Next.js 15, Prisma ORM, and Supabase.**

[![Next.js](https://img.shields.io/badge/Next.js-15.5.19-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19.3-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%26_Storage-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 📌 Problem It Solves

Academic research labs, study groups, and graduate students consistently face disorganized literature review workflows. Research papers accumulate haphazardly in local download directories, reading notes are lost in disconnected private documents, and laboratory teams lack a single shared space to track which colleague is reading, annotating, or synthesizing a given publication.

Moreover, traditional citation managers often lack modern team workspace isolation, have cumbersome non-web desktop user interfaces, or lack automated metadata parsing with transparent fallback handling for paywalled or WAF-protected academic repositories.

**Eureka!** resolves this by delivering a collaborative, web-first academic research workspace. Researchers can organize papers across personal or lab-scoped workspaces, ingest PDFs directly into cloud storage, automatically parse publication metadata via arXiv and DOI APIs, and record structured reading notes formatted like physical research notebooks.

---

## ✨ Features

- **Personal & Lab-Scoped Workspaces:** Organize papers into private research vaults or collaborative lab workspaces. Session persistence automatically restores your last active workspace upon login.
- **Automated Academic Metadata Parsing:** Ingest papers via arXiv link, DOI, or direct URL. Automatically extracts publication titles, author rosters, publication years, and abstracts, featuring a graceful manual override banner for sites protected by Cloudflare WAF (e.g., IEEE Xplore).
- **PDF Paper Storage & Tracking:** Direct PDF uploads stored in Supabase Storage with reading status tags (`To Read`, `Reading`, `Done`, `Reference`) and flexible teammate assignment.
- **Structured Laboratory Notebook:** Dedicated per-paper margin notes panel with structured academic headings (*Summary*, *Key Findings*, *Open Questions*, *Project Relevance*, and *Freeform Notes*) featuring live Markdown rendering.
- **Teammate Profiles & Contribution Metrics:** View shared active papers, recent workspace updates, and individual teammate statistics (papers added, currently reading, completed reviews, and activity timelines).
- **Cascading Integrity & Safe Transactions:** Single-action cascading deletion cleanly removes papers along with all associated notes, comments, tags, and activity records.
- **Serverless Performance Optimizations:**
  - *Prisma Hardening:* Singleton client pattern preventing connection exhaustion across serverless execution environments.
  - *Streaming Activity Feed:* Isolated into an async loader using React 19 `<Suspense>` so paper cards paint instantly while activity feeds stream in.
  - *Selective Queries:* Eliminates `SELECT *` over-fetching through targeted projection filters and composite database indexing on `(workspaceId, status)`.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15.5.19 (App Router, Server Actions)
- **Library:** React 19.1.0
- **Language:** TypeScript 5 (Strict Mode)
- **Database & ORM:** PostgreSQL, Prisma ORM 6.19.3 (connection pooling configured via PgBouncer)
- **Authentication & Storage:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`, GoTrue Auth, Supabase Storage)
- **UI & Styling:** Tailwind CSS v4, shadcn/ui, Base UI (`@base-ui/react`), `next-themes` (Dark/Light mode support)
- **Animations & Feedback:** Framer Motion, Lucide React, Sonner (toasts)

---

## 📸 Screenshots

> _Visual walkthrough of the academic paper library, notebook annotation panel, and team workspace._

| Paper Library & Reading Status Tracker | Structured Notebook Annotation Panel |
| :---: | :---: |
| ![Paper Library Placeholder](docs/screenshots/library_placeholder.png)<br>_Placeholder: Grid view of research papers with status badges and filters_ | ![Notebook Notes Placeholder](docs/screenshots/notes_placeholder.png)<br>_Placeholder: Margin notebook panel with structured Markdown review notes_ |

| Team Workspace & Contribution Dashboard | Automated arXiv & DOI Metadata Parser |
| :---: | :---: |
| ![Team Dashboard Placeholder](docs/screenshots/team_placeholder.png)<br>_Placeholder: Collaborative workspace activity stream and teammate stats_ | ![Metadata Parser Placeholder](docs/screenshots/parser_placeholder.png)<br>_Placeholder: Automated DOI/arXiv ingestion modal with WAF fallback_ |

---

## 🚀 How to Run

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ or v20+ recommended)
- pnpm or npm

### 2. Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/akibmehedi666/Eureka.git
cd Eureka

# Install dependencies
pnpm install
# or: npm install
```

### 3. Environment Variables Setup

Create a `.env` file in the project root:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Configure your environment placeholders in `.env`:
```env
# Database Connections (PgBouncer pooled on 6543, direct on 5432)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres"

# Supabase Auth & Storage
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key-placeholder"
```

### 4. Database Migrations

Apply Prisma schema migrations to set up relational tables and composite indexes:

```bash
npx prisma migrate dev
```

### 5. Launch Development Server

```bash
pnpm dev
# or: npm run dev
```

Open your browser and navigate to: **`http://localhost:3000`**

### 6. Build for Production

```bash
pnpm build
pnpm start
```

---

## 📂 Project Structure

```
Eureka/
├── app/
│   ├── layout.tsx                 # Root layout with theme provider and header
│   ├── page.tsx                   # Landing page
│   ├── actions.ts                 # Next.js Server Actions for paper & workspace mutations
│   ├── auth/                      # Authentication routes and callback handlers
│   └── dashboard/                 # Paper library grid and workspace views
│       ├── [id]/                  # Workspace paper detail routes
│       └── teammates/             # Teammate contribution and activity feed
├── components/                    # UI cards, modals, and Markdown notes panel
├── lib/                           # Prisma client singleton and Supabase SSR helpers
├── prisma/
│   └── schema.prisma              # Relational schema (Users, Workspaces, Papers, Notes)
├── public/                        # Static brand assets and icons
├── package.json                   # Dependencies and build scripts
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # Documentation
```
