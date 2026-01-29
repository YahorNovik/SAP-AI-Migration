# SAP AI Migration

AI-powered platform for automated ABAP code migration between SAP systems using LLM tool-calling agents and the SAP ADT REST API.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend                      │
│  (React 19 + Monaco Editor + Radix UI + Zustand)       │
│                                                         │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────────┐ │
│  │ Projects │  │  Settings  │  │  Real-time SSE      │ │
│  │ Dashboard│  │  (LLM/SAP) │  │  Progress Stream    │ │
│  └────┬─────┘  └─────┬──────┘  └──────────┬──────────┘ │
│       │              │                     │            │
│  ┌────┴──────────────┴─────────────────────┴──────────┐ │
│  │              API Routes (Next.js)                   │ │
│  └────┬───────────────────────────────────────────────┘ │
│       │                                                 │
│  ┌────┴────────────────────────────────────────┐        │
│  │         Migration Orchestrator              │        │
│  │  ┌─────────────────┐  ┌──────────────────┐  │        │
│  │  │ Discovery Agent │  │ Migration Worker │  │        │
│  │  │ (BFS + abaplint │  │ (AI tool-calling │  │        │
│  │  │  + topo sort)   │  │  loop per object)│  │        │
│  │  └────────┬────────┘  └────────┬─────────┘  │        │
│  └───────────┼────────────────────┼────────────┘        │
│              │                    │                      │
│  ┌───────────┴────────────────────┴────────────┐        │
│  │          MCP Client (SDK)                    │        │
│  └───────────────────┬─────────────────────────┘        │
└──────────────────────┼──────────────────────────────────┘
                       │ stdio
┌──────────────────────┼──────────────────────────────────┐
│              MCP Server (sap-adt-mcp-server)            │
│          26 SAP ADT Tools across 9 categories           │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              abap-adt-api (v7)                    │   │
│  └──────────────────────┬───────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTPS
                ┌─────────┴──────────┐
                │   SAP System(s)    │
                │   (ADT enabled)    │
                └────────────────────┘

┌──────────────────────┐   ┌──────────────────────────────┐
│   SQLite (Prisma)    │   │  Multi-Provider LLM          │
│  Projects, SubObjects│   │  Anthropic │ OpenAI │ Google  │
│  Settings, Logs      │   │  Mistral                     │
└──────────────────────┘   └──────────────────────────────┘
```

## Key Features

- **Recursive BFS dependency discovery** -- crawls the source SAP system starting from a root object, recursively discovering all custom Z/Y dependencies
- **abaplint parsing** -- uses `@abaplint/core` to extract interfaces, class references, includes, superclasses, and type references from ABAP source
- **Two-level topological ordering** -- inter-object ordering (interfaces before classes, base before subclass) and intra-object ordering (includes before programs) using Kahn's algorithm
- **Target system existence check with auto-exclusion** -- searches the target system for each dependency and auto-excludes objects that already exist
- **Manual sub-object exclude/include** -- toggle individual sub-objects in or out of the migration scope
- **AI agentic migration loop** -- per sub-object write-check-fix-activate cycle: the LLM writes migrated source, runs syntax check, fixes errors, and activates, all through SAP ADT tool calls
- **Real-time SSE progress** -- Server-Sent Events stream every tool call, syntax check result, activation, and error to the browser in real time
- **Monaco code editor** -- side-by-side original/migrated source view with ABAP syntax highlighting
- **Multi-provider LLM support** -- Anthropic Claude, OpenAI GPT, Google Gemini, and Mistral via the Vercel AI SDK
- **Pause / Resume** -- pause a running migration and resume from where it left off

## SAP ADT Tools

The MCP server exposes **26 tools** organized into **9 categories**:

| Category | Tools | Description |
|----------|-------|-------------|
| **Auth** (3) | `sap_login`, `sap_logout`, `sap_drop_session` | Session management |
| **Search** (5) | `sap_search_object`, `sap_node_contents`, `sap_object_structure`, `sap_find_object_path`, `sap_object_types` | Repository search and navigation |
| **Source** (2) | `sap_get_source`, `sap_set_source` | Read/write ABAP source code |
| **Lifecycle** (3) | `sap_create_object`, `sap_validate_new_object`, `sap_delete_object` | Object creation and deletion |
| **Lock** (2) | `sap_lock`, `sap_unlock` | Pessimistic locking for edits |
| **Activation** (2) | `sap_activate`, `sap_inactive_objects` | Activate objects, list inactive |
| **Transport** (4) | `sap_transport_info`, `sap_create_transport`, `sap_release_transport`, `sap_user_transports` | Transport request management |
| **Code Analysis** (4) | `sap_syntax_check`, `sap_code_completion`, `sap_find_definition`, `sap_usage_references` | Syntax check, code intel, where-used |
| **Workflow** (1) | `sap_write_and_check` | Composite: check existence, lock, write, syntax check |

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| MCP Server | TypeScript + Node.js | Node >= 18 |
| MCP Protocol | `@modelcontextprotocol/sdk` | 1.12 / 1.25 |
| SAP ADT Client | `abap-adt-api` | 7.1 |
| Frontend | Next.js (App Router) | 16.1 |
| UI | React + Radix UI + Tailwind CSS | React 19.2 |
| Code Editor | Monaco Editor (`@monaco-editor/react`) | 4.7 |
| Database | SQLite via Prisma ORM | Prisma 5.22 |
| AI SDK | Vercel AI SDK (`ai`) | 6.0 |
| LLM Providers | `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/mistral` | 3.x |
| ABAP Parsing | `@abaplint/core` | 2.115 |
| State Management | Zustand | 5.0 |
| Validation | Zod | 3.23 / 4.3 |

## Prerequisites

- **Node.js >= 20** (LTS recommended)
- **SAP system with ADT enabled** (SICF services under `/sap/bc/adt/` must be active)
- An API key for at least one supported LLM provider (Anthropic, OpenAI, Google, or Mistral)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd SAPAIMigration
```

### 2. MCP Server setup

```bash
# Install dependencies
npm install

# Build the TypeScript server
npm run build
```

The server is compiled to `build/index.js` and is launched automatically by the frontend's MCP client over stdio.

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Or create manually:
echo 'DATABASE_URL=file:./dev.db' > .env

# Initialize the database
npx prisma db push

# (Optional) Seed demo data
npm run db:seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Configure via the Settings page

1. Navigate to **Settings** (`/settings`)
2. Select an **LLM provider** and enter your **API key**
3. Add one or more **SAP systems** (source and target)

## Configuration

### MCP Server environment variables

Create a `.env` file in the project root (or use `config.json`):

| Variable | Description | Example |
|----------|-------------|---------|
| `SAP_URL` | SAP server base URL | `https://sap-server:44300` |
| `SAP_USER` | ADT user | `DEVELOPER` |
| `SAP_PASSWORD` | ADT password | `secret` |
| `SAP_CLIENT` | SAP client number | `001` |
| `SAP_LANGUAGE` | Logon language | `EN` |

> The MCP server environment is used when running the server standalone. When launched from the frontend, SAP credentials are passed per-system from the database.

### Frontend environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma SQLite connection string | `file:./dev.db` |

### Settings page

All runtime configuration is managed through the **Settings** page (`/settings`):

- **LLM Provider** -- Anthropic, OpenAI, Google, or Mistral
- **Model** -- e.g. `claude-sonnet-4-20250514`, `gpt-4o`, `gemini-2.0-flash`, `mistral-large-latest`
- **API Key** -- provider-specific key
- **Global Migration Rules** -- organization-wide rules applied to every migration (e.g. "Convert to clean ABAP syntax, use inline declarations")
- **SAP Systems** -- manage source and target SAP system connections

## How It Works

### Phase 1: Discovery

1. **BFS crawl** -- Starting from the root ABAP object, the discovery agent queries `sap_object_structure` and `sap_node_contents` to enumerate all sub-objects (includes, local classes, interfaces). Source code is fetched via `sap_get_source`.

2. **abaplint dependency extraction** -- Each source file is parsed with `@abaplint/core` to extract:
   - Implemented interfaces (`INTERFACES`)
   - Class references (`TYPE REF TO`)
   - Include references (`INCLUDE`)
   - Superclass (`INHERITING FROM`)
   - Custom type references

3. **Recursive dependency discovery** -- Discovered custom Z/Y dependencies are enqueued for their own BFS crawl. A visited set prevents cycles.

4. **Inter-object topological sort** -- Kahn's algorithm orders discovered objects so that dependencies are migrated first (e.g. interfaces before implementing classes, base classes before subclasses).

5. **Intra-object ordering** -- Within each object, sub-objects are ordered by internal dependencies. The system first attempts deterministic ordering via parsed dependency data; if that fails, the LLM is asked to determine the correct order; sequential fallback as a last resort.

6. **Target system existence check** -- Each discovered dependency (except the root) is searched in the target system. Objects that already exist are auto-excluded from migration.

### Phase 2: Migration

For each non-excluded sub-object, in dependency order:

1. **Dependency gate** -- Verify all `dependsOn` sub-objects and all earlier `objectOrder` groups are activated or excluded.

2. **AI tool-calling loop** (up to 10 iterations):
   - The LLM receives the original source, migration rules, and target context
   - It calls `sap_write_and_check` to write the migrated source and run a syntax check
   - If syntax errors are returned, the LLM fixes the code and retries with the same lock handle
   - Once clean, it calls `sap_activate` to activate the object
   - Finally, `sap_unlock` releases the lock

3. **Persist results** -- The migrated source and status are saved to the database. Every tool call and result is logged as an `ActivityLog` entry and streamed to the browser via SSE.

```
Discovery                              Migration (per sub-object)
─────────                              ──────────────────────────
                                       ┌─────────────────────┐
BFS crawl ──► abaplint parse           │  LLM receives       │
    │              │                   │  original source +   │
    ▼              ▼                   │  migration rules     │
Discover      Extract deps             │         │            │
dependencies       │                   │         ▼            │
    │              ▼                   │  sap_write_and_check │
    ▼         Topological              │         │            │
Enqueue        sort                    │    ┌────┴────┐       │
next Z/Y        │                      │    │ Syntax  │       │
objects         ▼                      │    │ errors? │       │
    │      Target system               │    └────┬────┘       │
    ▼       check                      │    Yes  │  No        │
 (repeat)      │                       │    ▼    │  ▼         │
               ▼                       │  Fix &  │ Activate   │
           Auto-exclude                │  retry  │    │       │
           existing                    │         │  Unlock    │
                                       └─────────┘    │       │
                                                      ▼       │
                                                   Persist    │
                                                   + SSE      │
                                       └──────────────────────┘
```

## Project Structure

```
SAPAIMigration/
├── src/                              # MCP Server
│   ├── index.ts                      # Entry point (stdio transport)
│   ├── server.ts                     # MCP server setup & handler registration
│   ├── config.ts                     # SAP configuration loader
│   ├── client-manager.ts             # abap-adt-api client lifecycle
│   ├── errors.ts                     # Error types
│   └── handlers/                     # SAP ADT tool handlers (9 files)
│       ├── base-handler.ts           # Abstract base with registerTool
│       ├── auth-handler.ts           # login, logout, drop_session
│       ├── search-handler.ts         # search, node_contents, structure, path, types
│       ├── source-handler.ts         # get_source, set_source
│       ├── lifecycle-handler.ts      # create, validate, delete
│       ├── lock-handler.ts           # lock, unlock
│       ├── activation-handler.ts     # activate, inactive_objects
│       ├── transport-handler.ts      # transport_info, create, release, user_transports
│       ├── code-analysis-handler.ts  # syntax_check, completion, definition, references
│       └── workflow-handler.ts       # write_and_check (composite)
├── build/                            # Compiled JS output
├── frontend/                         # Next.js application
│   ├── src/
│   │   ├── app/                      # App Router pages & API routes
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── settings/             # Settings page
│   │   │   ├── projects/[id]/        # Project detail & migration UI
│   │   │   └── api/                  # REST + SSE endpoints
│   │   │       ├── projects/         # CRUD, start, pause, resume, events, chat
│   │   │       ├── systems/          # SAP system CRUD
│   │   │       └── settings/         # LLM & rules configuration
│   │   ├── services/                 # Business logic
│   │   │   ├── ai/                   # AI layer
│   │   │   │   ├── discovery-agent.ts    # BFS discovery + topo sort
│   │   │   │   ├── migration-worker.ts   # Per-object migration loop
│   │   │   │   ├── model.ts              # LLM provider factory
│   │   │   │   ├── prompts.ts            # System & user prompts
│   │   │   │   ├── tool-definitions.ts   # MCP tool schemas for AI SDK
│   │   │   │   └── abap-parser.ts        # abaplint dependency extraction
│   │   │   ├── migration-orchestrator.ts # Top-level orchestration
│   │   │   └── mcp-client.ts            # MCP client (stdio transport)
│   │   ├── components/               # React UI components
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── lib/                      # Utilities (Prisma client, cn, etc.)
│   │   ├── stores/                   # Zustand state stores
│   │   └── types/                    # TypeScript type definitions
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema (SQLite)
│   │   └── seed.ts                   # Demo seed data
│   └── package.json
├── package.json                      # MCP server package
├── tsconfig.json
├── .env.example                      # SAP connection template
└── README.md
```

## License

MIT
