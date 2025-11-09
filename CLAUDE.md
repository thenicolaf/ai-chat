# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 AI chatbot application built with the AI SDK, featuring real-time streaming conversations, artifact creation (documents, code, spreadsheets, images), and multi-model support. The application uses Groq's ultra-fast Llama models (completely FREE) for AI capabilities.

## Tech Stack

- **Framework**: Next.js 15 (App Router with React Server Components and Server Actions)
- **AI**: AI SDK with Groq (Llama 3.3 70B, Llama 3.1 70B/8B) - FREE & ultra-fast
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Vercel Blob for file uploads
- **Cache**: Redis for resumable streams
- **Auth**: Auth.js (NextAuth v5 beta)
- **UI**: shadcn/ui with Tailwind CSS
- **Linting**: Ultracite (Biome-based)

## Development Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start dev server with Turbo (localhost:3000)
pnpm build                # Run migrations and build for production
pnpm start                # Start production server
pnpm lint                 # Check code with Ultracite
pnpm format               # Auto-fix code with Ultracite
pnpm test                 # Run Playwright tests

# Database commands
pnpm db:migrate           # Apply database migrations
pnpm db:generate          # Generate new migrations from schema changes
pnpm db:studio            # Open Drizzle Studio (visual DB editor)
pnpm db:push              # Push schema changes directly to DB
pnpm db:pull              # Pull schema from DB
```

## Environment Setup

Required environment variables (see `.env.example`):
- `AUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- `GROQ_API_KEY` - Groq API key (FREE! Get from https://console.groq.com/keys)
- `POSTGRES_URL` - PostgreSQL connection string
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
- `REDIS_URL` - Optional, enables resumable streams

For local development:
1. Create `.env.local` from `.env.example`
2. Use `vercel env pull` to sync Vercel environment variables (recommended)
3. Run `pnpm db:migrate` before first run

## Architecture

### AI Layer (`lib/ai/`)

**Model Configuration** (`models.ts`, `providers.ts`):
- Uses Groq provider with ultra-fast inference (FREE API)
- Two chat models: `chat-model` (Llama 3.3 70B) and `chat-model-reasoning` (Llama 3.1 70B)
- `title-model` uses Llama 3.1 8B for instant title generation
- `artifact-model` uses Llama 3.3 70B for creating documents/code/spreadsheets
- Test environment uses mock models (`models.mock.ts`)
- Groq provides extremely fast generation speed using LPU (Language Processing Units)

**Tools** (`lib/ai/tools/`):
- `createDocument` - Creates artifacts (text, code, image, sheet)
- `updateDocument` - Updates existing artifacts
- `getWeather` - Weather information tool
- `requestSuggestions` - Document editing suggestions
- Tools write to `dataStream` for real-time UI updates

**Prompts** (`prompts.ts`):
- `artifactsPrompt` - Guides when to create/update documents
- `systemPrompt` - Includes user location hints from Vercel geolocation
- `codePrompt` - Python code generation rules (default language)
- `updateDocumentPrompt` - Context for document updates

### Database (`lib/db/`)

**Schema** (`schema.ts`):
- `user` - User accounts
- `chat` - Conversations with visibility settings and lastContext (usage tracking)
- `message` - New message format (Message_v2) with parts and attachments
- `messageDeprecated` - Legacy format (Message table)
- `vote` - Message upvotes/downvotes (Vote_v2)
- `document` - Artifacts with kind (text/code/image/sheet)
- `suggestion` - Document edit suggestions
- `stream` - Resumable stream tracking

**Queries** (`queries.ts`):
- Database operations using Drizzle ORM
- Uses transactions for atomic operations
- Message conversion between DB format and UI format in `convertToUIMessages`

**Migrations**:
- Located in `lib/db/migrations/`
- Auto-run on build via `tsx lib/db/migrate && next build`
- Generate with `pnpm db:generate` after schema changes

### API Routes (`app/(chat)/api/`)

**`/api/chat` (POST)**:
- Main streaming chat endpoint with resumable stream support
- Uses `streamText` from AI SDK
- Entitlement checking for usage limits
- Real-time token usage tracking with TokenLens
- Creates chat title on first message via `generateTitleFromUserMessage`
- Tools: createDocument, updateDocument, getWeather, requestSuggestions
- Returns Server-Sent Events via `JsonToSseTransformStream`

**`/api/chat/[id]/stream` (GET)**:
- Resume interrupted streams (requires Redis)
- Uses `resumable-stream` library

**Other endpoints**:
- `/api/document` - CRUD for artifacts
- `/api/vote` - Message voting
- `/api/suggestions` - Document suggestions
- `/api/history` - Chat history pagination
- `/api/files/upload` - File uploads to Vercel Blob

### Components

**Artifacts** (`components/artifact.tsx`, `lib/artifacts/server.ts`):
- Side-by-side editing interface for documents
- Four kinds: text (ProseMirror), code (CodeMirror), image (Replicate), sheet (react-data-grid)
- Document handlers in `lib/artifacts/server.ts` define creation/update behavior
- Real-time streaming updates via `dataStream` events

**Messages** (`components/message.tsx`, `components/messages.tsx`):
- Renders chat history with markdown, code blocks, and tool calls
- Syntax highlighting with Shiki
- Message parts system supports text, tool calls, images, reasoning
- Reasoning display for reasoning model via `message-reasoning.tsx`

**Multimodal Input** (`components/multimodal-input.tsx`):
- Text input with file attachment support
- Image preview and removal
- Model selector integration

**Data Stream** (`components/data-stream-handler.tsx`, `data-stream-provider.tsx`):
- Handles custom data stream events for artifact updates
- Events: `data-kind`, `data-id`, `data-title`, `data-clear`, `data-finish`
- Coordinates between chat and artifact panels

### Ultracite Rules (`.cursor/rules/ultracite.mdc`)

This project uses Ultracite, a strict Biome-based linter. Key enforced rules:

**Type Safety**:
- No `any` type, no non-null assertions (`!`)
- No TypeScript enums (use const objects)
- `export type` and `import type` for types
- No unnecessary type annotations

**React/Next.js**:
- No `<img>` (use Next.js `Image`)
- No `<head>` outside `_document`
- Hooks called at top level only
- Key props required in iterators
- No Array index as key

**Code Quality**:
- Use `for...of` instead of `forEach`
- Arrow functions over function expressions
- `const` for variables assigned once
- No `var`, use `let` or `const`
- No `console` (use proper logging)
- Exhaustive switch statements

**Accessibility**:
- Type attribute required on buttons
- Alt text on images (no "image", "picture" in text)
- Label association with inputs
- Semantic HTML over ARIA roles where possible

## Key Patterns

### Adding a New AI Tool

1. Create tool file in `lib/ai/tools/`
2. Export tool function using `tool()` from AI SDK
3. Define Zod schema for inputs
4. Add to tools array in `/api/chat/route.ts`
5. Update system prompt if needed

### Adding a New Artifact Type

1. Add kind to `artifactKinds` in `lib/artifacts/server.ts`
2. Create document handler with `onCreateDocument` and `onUpdateDocument`
3. Add to `documentHandlersByArtifactKind` array
4. Update schema enum in `lib/db/schema.ts`
5. Create UI editor component in `components/`
6. Add case in `components/artifact.tsx`

### Database Schema Changes

1. Modify `lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Review generated SQL in `lib/db/migrations/`
4. Run `pnpm db:migrate` to apply
5. For production: migrations auto-run on build

### Resumable Streams

- Requires `REDIS_URL` environment variable
- Stream context created in `/api/chat/route.ts` via `createResumableStreamContext`
- Resume via `/api/chat/[id]/stream` GET endpoint
- Auto-resume on client via `useAutoResume` hook

### Message Format Migration

The codebase is transitioning from `Message` (deprecated) to `Message_v2`:
- Old: `content` field (JSON)
- New: `parts` array (supports multiple content types) + `attachments` array
- See migration guide: https://chat-sdk.dev/docs/migration-guides/message-parts

## Testing

- Playwright tests in `tests/`
- Set `PLAYWRIGHT=True` environment variable when running tests
- Mock models automatically used in test environment (see `lib/ai/models.mock.ts`)

## Important Notes

- Build command runs migrations automatically - ensure DB is accessible during builds
- Groq API is completely FREE - get your key at https://console.groq.com/keys
- Groq provides ultra-fast inference using specialized LPU hardware
- Code artifacts default to Python (other languages not yet supported)
- Don't update documents immediately after creation - wait for user feedback
- Ultracite rules are strict - run `pnpm format` before committing
