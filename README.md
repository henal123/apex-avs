# Apex VisionX Studio

An AI-powered internal platform for generating and analyzing e-commerce ad creative. Features a 9-stage pipeline that transforms store information into branded ad concepts and AI-generated images.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Frontend** | React 19, Tailwind CSS 4, Shadcn UI |
| **State** | Zustand 5, TanStack React Query 5 |
| **Database** | PostgreSQL 17 (Supabase) |
| **Auth** | Supabase Auth (SSR) |
| **AI Models** | Gemini 2.5 Pro/Flash, Claude Sonnet, Flux Pro, Nano Banana Pro |
| **Canvas** | Fabric.js 7 |
| **Scraper** | Python FastAPI + BeautifulSoup4 |
| **Edge Functions** | Deno 2 (Supabase Edge Runtime) |
| **Language** | TypeScript 5 (strict mode) |

---

## 9-Stage Pipeline

The core of the platform is a multi-stage AI pipeline that progressively refines brand strategy and creative output:

### Stage 1 — Store Scraping
Scrapes Shopify, WooCommerce, or generic stores to extract products, collections, metadata, colors, and fonts. Assets are uploaded to Supabase Storage.

### Stage 2 — Brand DNA
AI generates a comprehensive brand strategy document covering identity, target audience, visual identity, messaging, and positioning. Powered by Gemini 2.5 Pro.

### Stage 3 — Ad Library Upload
Manual upload and tagging of competitor and reference ads with source classification (brand-owned, competitor, adjacent).

### Stage 4 — Ad Analysis
Vision AI analyzes each uploaded ad, scoring layout, typography, color usage, product presentation, and human elements. Creates archetype classifications. Powered by Gemini 2.5 Flash.

### Stage 5 — Intelligence Report
Aggregates patterns across all analyzed ads to identify winning patterns, failure patterns, competitive gaps, and strategic recommendations. Powered by Gemini 2.5 Pro.

### Stage 6 — Ad Concepts
AI generates 4 distinct ad concept directions based on the intelligence report, each with a strategic brief, image generation prompt, and text overlay specifications. Powered by Claude Sonnet.

### Stage 7 — Image Generation
Generates images for each concept with multiple variants. Supports Nano Banana Pro (fast) and Flux Pro (quality) models.

### Stage 8 — Compositing
Edit and composite generated images with text overlays, logo placement, and styling using a Fabric.js canvas editor. Supports custom fonts, colors, shadows, and backgrounds.

### Stage 9 — Export & QA
Final quality assurance checks, gallery creation with optional password protection, public sharing via unique tokens, and cost tracking.

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login, signup, password reset
│   │   ├── (dashboard)/         # Main app routes
│   │   │   ├── dashboard/       # Brand list
│   │   │   ├── brands/
│   │   │   │   ├── new/         # Create brand
│   │   │   │   └── [slug]/      # Brand detail & pipeline stages
│   │   │   └── settings/        # User settings & cost tracking
│   │   ├── api/brands/          # REST API endpoints
│   │   └── gallery/             # Public shared galleries
│   ├── components/
│   │   ├── brands/              # Brand cards, filters
│   │   ├── common/              # Reusable UI (modals, editors, pickers)
│   │   ├── layout/              # Sidebar, breadcrumbs, user menu
│   │   ├── pipeline/            # Pipeline stepper, stage containers
│   │   ├── stages/              # Stage-specific components (1-9)
│   │   └── ui/                  # Shadcn base components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/
│   │   ├── ai/                  # AI service clients
│   │   ├── api/                 # API client utilities
│   │   ├── supabase/            # Supabase client setup
│   │   └── validation/          # Zod schemas
│   ├── prompts/                 # AI prompt templates (stages 2, 4, 5, 6)
│   ├── stores/                  # Zustand state stores
│   └── types/                   # TypeScript type definitions
├── scraper/                     # Python FastAPI scraper service
│   └── src/scrapers/
│       ├── shopify.py
│       ├── woocommerce.py
│       ├── generic.py
│       └── extractors/          # Color, metadata, typography
├── supabase/
│   ├── functions/               # Deno Edge Functions (pipeline handlers)
│   │   ├── pipeline-router/     # DB webhook → stage dispatcher
│   │   ├── process-scrape/
│   │   ├── process-brand-dna/
│   │   ├── process-ad-analysis/
│   │   ├── process-intelligence/
│   │   ├── process-concepts/
│   │   ├── process-image-gen/
│   │   ├── process-qa/
│   │   └── _shared/             # Shared utilities
│   └── migrations/              # Database migrations
└── package.json
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts |
| `brands` | Brand data with full pipeline state |
| `brand_assets` | Uploaded and scraped images |
| `ad_library_ads` | Reference and competitor ads |
| `pipeline_jobs` | Async job tracking with progress |
| `generated_ads` | AI-generated images with compositing specs |
| `api_cost_logs` | Cost tracking for AI API calls |
| `shared_galleries` | Public gallery shares with access control |

---

## API Endpoints

### Brand Management
- `GET/POST /api/brands` — List and create brands
- `GET/PUT/DELETE /api/brands/[id]` — CRUD operations
- `POST /api/brands/[id]/restore` — Restore archived brand

### Pipeline
- `POST /api/brands/[id]/pipeline/[stage]/run` — Start a pipeline stage
- `POST /api/brands/[id]/pipeline/[stage]/approve` — Approve stage output
- `POST /api/brands/[id]/pipeline/[stage]/unlock` — Revert approval
- `GET /api/brands/[id]/pipeline/[stage]/status` — Job status

### Ad Library
- `GET/POST /api/brands/[id]/ads` — List and upload ads
- `POST /api/brands/[id]/ads/bulk` — Bulk upload
- `POST /api/brands/[id]/ads/[adId]/reanalyze` — Re-run analysis

### Generation
- `POST /api/brands/[id]/bulk-concepts` — Generate all concepts
- `POST /api/brands/[id]/bulk-concepts/generate-image` — Generate image for concept
- `GET/POST /api/brands/[id]/generated` — List and create generated ads

### Export
- `POST /api/brands/[id]/gallery` — Create shared gallery
- `GET /api/gallery/[shareToken]` — View public gallery

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+ (for scraper)
- Supabase CLI
- API keys for Gemini, Claude, and image generation services

### Environment Setup

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
GEMINI_API_KEY=
CLAUDE_API_KEY=

# Scraper
PYTHON_SCRAPER_URL=http://localhost:8000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Install & Run

```bash
# Install dependencies
npm install

# Start Supabase locally
supabase start

# Run database migrations
supabase db push

# Start the scraper (in a separate terminal)
cd scraper
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Start the dev server
npm run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | Lint with ESLint |

---

## State Management

Zustand stores manage application state:

| Store | Responsibility |
|-------|---------------|
| `auth-store` | User authentication state |
| `brand-store` | Brand data and operations |
| `pipeline-store` | Pipeline job tracking |
| `ad-library-store` | Ad library management |
| `generation-store` | Generated images state |
| `canvas-store` | Compositing editor state |
| `theme-store` | Light/dark theme |

---

## Design System

- Dark theme by default with light mode toggle
- Geist font family (sans + mono)
- Glass morphism aesthetic
- Tailwind CSS 4 with custom animations
- Shadcn UI component library

---

## License

Proprietary — Internal use only.
