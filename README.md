# EUREKA! 🧪📖

A collaborative research notebook, document library, and paper tracking application designed for research teams and academic workspaces. 

Built with a state-of-the-art Next.js 15 App Router architecture, Prisma ORM, Supabase (Postgres & Auth), TypeScript, Tailwind CSS, and Framer Motion.

---

## ⚡ Tech Stack & Architecture

*   **Frontend**: Next.js 15 (App Router, Server Actions, React Suspense & Streaming)
*   **Database & Auth**: Supabase (PostgreSQL Database + Supabase GoTrue Authentication)
*   **ORM**: Prisma ORM (Connection pooling configured via PgBouncer)
*   **Styling**: Tailwind CSS 4 with custom variables and premium dark-mode themes
*   **Animations**: Framer Motion & Lucide Icons

---

## 🚀 Key Features

1.  **Shared & Personal Workspace Libraries**: Create individual or team-based workspaces to organize papers. Transitions automatically remember your last active workspace session.
2.  **Robust Metadata Extraction & Workarounds**: Automatically parses arXiv and DOI metadata when adding entries. Includes a clear, built-in notice banner and manual override flow for sites protected by Cloudflare WAF (like IEEE Xplore).
3.  **Scoped Team Dashboard & Teammates**: Each workspace has a dedicated team details page. View shared active papers, recent updates, and pending workspace invites.
4.  **Teammate Profiles**: Click on any teammate to view their specific contributions, stats (papers added, currently reading, done), active notes, and timeline of activities within that workspace.
5.  **Cascading Paper Deletion**: Cleanly delete papers from the dashboard (with confirmation prompts). Deleting a paper automatically cascades to delete related notes, comments, tags, and activities in a single safe transaction.
6.  **Notebook Margin Annotation**: Write structured notes (Summary, Key Findings, Gaps/Questions, Relevance, and Freeform notes) styled to look like physical notebook pages.

---

## 🛠️ Performance Architecture & Optimizations

This application is optimized for fast TTFB (Time to First Byte) and high-concurrency serverless execution:

*   **Prisma Client Hardening**: Built-in singleton pattern preventing connection exhaustion during hot-reloads and serverless execution.
*   **Over-Fetch Elimination**: Avoids heavy `SELECT *` queries by utilizing explicit select filters. Joins for pages (like dashboard cards) select only required fields (e.g., fetching note IDs instead of full summary text).
*   **Suspense Streaming**: The activity feed runs heavy database queries and is isolated into an async `<ActivityFeedLoader>` wrapper using React `<Suspense>`. The main paper grid paints instantly while activities stream in.
*   **Component Memoization**: Note markdown renderers are memoized with `React.memo` and `useMemo` to prevent expensive re-renders on layout and theme transitions.
*   **High-Performance DB Indexing**: Composite indexes applied on `Paper(workspaceId, status)`, `Paper(workspaceId, createdAt)`, and `Activity(workspaceId, createdAt DESC)` to accelerate status filtering and sorted dashboards.

---

## 💻 Local Setup & Development

### 1. Prerequisites
Ensure you have **Node.js** (v18+ or v20+) and **pnpm** installed.

### 2. Configure Environment Variables
Create a `.env` file in the root directory:

```env
# Database Connections
# (Port 6543 handles pooled connections via PgBouncer, Port 5432 is direct)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres"

# Supabase Auth Integration
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Sync Database Schema
Apply existing migrations to build tables, relations, and composite performance indexes:
```bash
npx prisma migrate dev
```

### 5. Running the Application

*   **Development Server**:
    ```bash
    pnpm dev
    ```
*   **Production Build & Run** (highly recommended for performance testing, as it enables prefetching and eliminates server compilation delay):
    ```bash
    pnpm build
    pnpm start
    ```

---

## 📂 Database Schema Overview

```mermaid
erDiagram
    User ||--o{ WorkspaceMember : member
    User ||--o{ Paper : adds
    User ||--o{ Note : writes
    User ||--o{ Activity : performs
    Workspace ||--o{ WorkspaceMember : contains
    Workspace ||--o{ Paper : tracks
    Workspace ||--o{ Tag : owns
    Paper ||--o{ Note : has
    Paper ||--o{ PaperTag : tagged
    Tag ||--o{ PaperTag : categorizes
```

*   **User**: Core credentials, bios, focus areas, and session workspace states.
*   **Workspace**: Group/personal namespaces.
*   **WorkspaceMember**: Bridges users to workspaces with role controls (`OWNER` or `MEMBER`).
*   **Paper**: Tracks titles, metadata, URLs, and current statuses (`TO_READ`, `READING`, `DONE`, `REFERENCE`).
*   **Note**: The structured markdown notebooks associated with papers.
*   **Activity**: Event feed capturing workspace events to display to the team.
