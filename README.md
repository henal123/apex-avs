<p align="center">
  <h1 align="center">Apex VisionX Studio</h1>
  <p align="center">
    AI-powered e-commerce ad creative platform with a 9-stage pipeline
    <br />
    <em>From store scraping to composited, export-ready ad creatives — fully automated.</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL%2017-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python" alt="Python 3.12" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [The 9-Stage Pipeline](#the-9-stage-pipeline)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
  - [1. Supabase Setup](#1-supabase-setup)
  - [2. Python Scraper Service](#2-python-scraper-service)
  - [3. Next.js Application](#3-nextjs-application)
- [AI Models & Prompts](#ai-models--prompts)
- [Edge Functions](#edge-functions)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [State Management](#state-management)
- [Design System](#design-system)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

Apex VisionX Studio is an internal platform that automates the entire workflow of generating e-commerce ad creatives. It scrapes online stores, builds a brand DNA profile using AI, analyzes competitor ads, generates strategic ad concepts, creates AI-generated images, and composites them into final export-ready assets.

The platform processes brands through a **9-stage pipeline**, where each stage builds on the output of the previous one. Some stages are fully automated via Supabase Edge Functions, while others involve manual input (uploading reference ads, compositing).

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Full-stack React framework |
| **Frontend** | React 19, Tailwind CSS 4, Shadcn UI | UI rendering & styling |
| **State** | Zustand 5, TanStack React Query 5 | Client state & server cache |
| **Database** | PostgreSQL 17 via Supabase | Persistent data storage |
| **Auth** | Supabase Auth (SSR) | Email/password authentication |
| **Realtime** | Supabase Realtime | Live job progress updates |
| **Storage** | Supabase Storage (S3-compatible) | Image & asset hosting |
| **Edge Functions** | Deno 2 (Supabase Edge Runtime) | Serverless pipeline handlers |
| **AI - Text** | Gemini 2.5 Pro, Gemini 2.5 Flash | Brand DNA, analysis, intelligence |
| **AI - Concepts** | Claude Sonnet 4 | Ad concept generation |
| **AI - Images** | Gemini 2.5 Flash Image | Image generation |
| **Canvas** | Fabric.js 7, Sharp | Image compositing & text overlays |
| **Scraper** | Python FastAPI + BeautifulSoup4 | E-commerce store scraping |
| **Charts** | Recharts 3 | Analysis dashboards |
| **Validation** | Zod | Runtime schema validation |
| **Language** | TypeScript 5 (strict) | Type safety |

---

## The 9-Stage Pipeline

Each stage builds on the previous stage's output. The pipeline is orchestrated via database webhooks — inserting a job into `pipeline_jobs` triggers the appropriate Edge Function.

```
 [1] Scrape ──> [2] Brand DNA ──> [3] Ad Library ──> [4] Analysis ──> [5] Intelligence
                                     (manual)
                                                                           |
  [9] Export <── [8] Compositing <── [7] Image Gen <── [6] Concepts <──────'
                    (manual)
```

### Stage 1 — Store Scraping
> **Function:** `process-scrape` | **Service:** Python FastAPI Scraper

Scrapes the target e-commerce store to extract products, collections, metadata, brand colors, fonts, and logos. Supports **Shopify** (REST API), **WooCommerce** (REST API), and **generic HTML** fallback. Scraped assets are uploaded to Supabase Storage.

### Stage 2 — Brand DNA
> **Function:** `process-brand-dna` | **Model:** Gemini 2.5 Pro

Generates a comprehensive brand strategy document from the scrape data. Outputs 7 sections: brand identity, target audience, visual identity, messaging framework, competitive positioning, negative brand space, and ad creative directives. Sections can be individually regenerated with user feedback.

### Stage 3 — Ad Library Upload
> **Manual stage** — no Edge Function

Users upload competitor and reference ads, then tag them by source (`brand_own`, `competitor`, `adjacent_category`) and performance tier (`winner`, `performer`, `testing`). Supports bulk upload and drag-and-drop.

### Stage 4 — Ad Analysis
> **Function:** `process-ad-analysis` | **Model:** Gemini 2.5 Flash (Vision)

Vision AI analyzes each uploaded ad across 50+ dimensions: layout architecture, typography, color harmony, product presentation, human elements, persuasion mechanics, and overall scores. Each ad receives an archetype classification. Processes in batches of 5 with self-invocation.

### Stage 5 — Intelligence Report
> **Function:** `process-intelligence` | **Model:** Gemini 2.5 Pro

Synthesizes all ad analyses with the Brand DNA to produce a strategic intelligence report. Identifies winning patterns, failure patterns, archetype clusters, competitive gaps, and generates 4 strategic ad concept directions with rationale.

### Stage 6 — Ad Concepts
> **Function:** `process-concepts` | **Model:** Claude Sonnet 4

Generates 4 detailed ad concept specifications, each containing: strategic brief, image generation prompt (50-100 words), prompt structure (style, mood, lighting, colors), text overlay specs with positioning, brand element placement, technical specs (1080x1080), and quality checklist.

### Stage 7 — Image Generation
> **Function:** `process-image-gen` | **Model:** Gemini 2.5 Flash Image

Generates 3 image variants per concept (12 total). Processes 2 images at a time with self-invocation. Raw images are uploaded to Supabase Storage at `generated/{brand_id}/cycle_1/concept_{n}/variant_{n}_raw.{ext}`.

### Stage 8 — Compositing
> **Manual stage** — Fabric.js canvas editor

Users edit and composite generated images with text overlays (headline, subheadline, CTA), logo placement, and styling. The canvas editor supports custom fonts, colors, shadows, text backgrounds, and precise positioning.

### Stage 9 — Export & QA
> **Function:** `process-qa`

Automated QA checks (image exists, file size < 5MB, compositing applied, concept assigned). Creates shareable galleries with optional password protection, expiry dates, and view tracking.

---

## Project Structure

```
apex-visionx-studio-internal-platform/
|
+-- src/
|   +-- app/
|   |   +-- (auth)/                    # Auth pages
|   |   |   +-- login/                 #   Email/password login
|   |   |   +-- signup/                #   User registration
|   |   |   +-- reset-password/        #   Password reset flow
|   |   |       +-- confirm/           #   Reset confirmation
|   |   |
|   |   +-- (dashboard)/              # Authenticated app shell
|   |   |   +-- dashboard/            #   Brand list & overview
|   |   |   +-- brands/
|   |   |   |   +-- new/              #   Create new brand
|   |   |   |   +-- [slug]/           #   Brand detail (pipeline hub)
|   |   |   |       +-- analysis/     #   Stage 4 dashboard
|   |   |   |       +-- concepts/     #   Stage 6 concept cards
|   |   |   |       +-- dna/          #   Stage 2 DNA editor
|   |   |   |       +-- library/      #   Stage 3 ad library
|   |   |   |       +-- generate/
|   |   |   |           +-- [adId]/
|   |   |   |               +-- edit/ #   Stage 8 canvas editor
|   |   |   +-- settings/
|   |   |       +-- costs/            #   API cost tracking
|   |   |
|   |   +-- api/brands/               # REST API routes
|   |   |   +-- [id]/
|   |   |       +-- ads/              #   Ad library CRUD
|   |   |       +-- bulk-concepts/    #   Concept generation
|   |   |       +-- dna/              #   DNA section regeneration
|   |   |       +-- export/           #   Export endpoint
|   |   |       +-- gallery/          #   Gallery creation
|   |   |       +-- generated/        #   Generated ads CRUD
|   |   |       +-- pipeline/         #   Pipeline control
|   |   |       +-- restore/          #   Unarchive brand
|   |   |
|   |   +-- gallery/[shareToken]/     # Public gallery page
|   |
|   +-- components/
|   |   +-- brands/                   # Brand card, filters
|   |   +-- common/                   # Shared UI (modals, pickers, editors)
|   |   +-- layout/                   # Sidebar, breadcrumbs, user menu
|   |   +-- pipeline/                 # Pipeline stepper, stage container
|   |   +-- stages/
|   |   |   +-- stage-1/             # Scrape results, metadata editor
|   |   |   +-- stage-2/             # Brand DNA editor, section regen
|   |   |   +-- stage-3/             # Upload zone, ad gallery, filters
|   |   |   +-- stage-4/             # Analysis dashboard & detail modal
|   |   |   +-- stage-5/             # Intelligence report dashboard
|   |   |   +-- stage-6/             # Concept cards grid
|   |   |   +-- stage-7/             # Variant grid
|   |   |   +-- stage-8/             # Bulk generation, reference picker
|   |   |   +-- stage-9/             # Gallery create modal
|   |   +-- ui/                      # Shadcn base components (25+)
|   |
|   +-- hooks/                       # use-brands, use-realtime-job, use-stage-cancel
|   +-- lib/
|   |   +-- ai/                      # AI service clients (Gemini, Claude, image gen, retry)
|   |   +-- api/                     # Auth helpers, pagination, response utils
|   |   +-- supabase/                # Client (browser, server, admin, middleware)
|   |   +-- validation/              # Zod schemas (brand, ad-library, generation, pipeline)
|   +-- prompts/                     # AI prompt templates (stages 2, 4, 5, 6)
|   +-- stores/                      # Zustand stores (7 stores)
|   +-- types/                       # TypeScript definitions (brand, pipeline, generation, etc.)
|   +-- middleware.ts                # Auth routing & session management
|
+-- scraper/                         # Python FastAPI scraper service
|   +-- main.py                      # FastAPI app, /health + /scrape endpoints
|   +-- Dockerfile                   # Python 3.12-slim container
|   +-- requirements.txt             # Python dependencies
|   +-- scrapers/
|   |   +-- base.py                  # Abstract scraper + data models
|   |   +-- shopify.py              # Shopify REST API scraper
|   |   +-- woocommerce.py          # WooCommerce REST API scraper
|   |   +-- generic.py              # Generic HTML fallback scraper
|   +-- extractors/
|   |   +-- color.py                # CSS color extraction
|   |   +-- metadata.py             # Store name/tagline from meta tags
|   |   +-- typography.py           # Font detection from CSS/Google Fonts
|   +-- utils/
|       +-- image.py                # Thumbnail generation (Pillow)
|       +-- storage.py              # Supabase Storage upload client
|
+-- supabase/
|   +-- config.toml                 # Local dev config (ports, auth, storage)
|   +-- migrations/                 # 14 SQL migration files
|   |   +-- 00001_create_profiles.sql
|   |   +-- 00002_create_brands.sql
|   |   +-- 00003_create_brand_assets.sql
|   |   +-- 00004_create_ad_library_ads.sql
|   |   +-- 00005_create_pipeline_jobs.sql
|   |   +-- 00006_create_generated_ads.sql
|   |   +-- 00007_create_api_cost_logs.sql
|   |   +-- 00008_create_shared_galleries.sql
|   |   +-- 00009_create_stage_approvals.sql
|   |   +-- 00010_create_model_pricing.sql
|   |   +-- 00011_create_indexes.sql
|   |   +-- 00012_create_rls_policies.sql
|   |   +-- 00013_create_triggers.sql
|   |   +-- 00014_seed_model_pricing.sql
|   +-- functions/
|       +-- _shared/                # Shared utilities (CORS, client, jobs, costs)
|       +-- pipeline-router/        # Webhook handler - routes jobs to stages
|       +-- process-scrape/         # Stage 1
|       +-- process-brand-dna/      # Stage 2
|       +-- process-ad-analysis/    # Stage 4
|       +-- process-intelligence/   # Stage 5
|       +-- process-concepts/       # Stage 6
|       +-- process-image-gen/      # Stage 7
|       +-- process-qa/             # Stage 9
|
+-- package.json
+-- next.config.ts
+-- tsconfig.json
+-- .env.example
```

---

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 18+ | Next.js runtime |
| **Python** | 3.10+ | Scraper service |
| **Supabase CLI** | Latest | Local development & Edge Function deployment |
| **Docker** | Latest (optional) | Containerized scraper deployment |
| **Git** | Latest | Version control |

### API Keys Required

| Service | Key Name | Where to Get | Used In |
|---------|----------|-------------|---------|
| **Supabase** | Project URL + Anon Key + Service Role Key | [supabase.com/dashboard](https://supabase.com/dashboard) | Auth, DB, Storage |
| **Google Gemini** | `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com/) | Stages 2, 4, 5, 7 |
| **Anthropic Claude** | `CLAUDE_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) | Stage 6 |

---

## Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

### Next.js Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Supabase service role key (server-only, never expose to client) |
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key for text generation & vision |
| `CLAUDE_API_KEY` | Yes | — | Anthropic Claude API key for concept generation |
| `PYTHON_SCRAPER_URL` | Yes | `http://localhost:8000` | URL of the Python scraper service |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Public-facing app URL |

### Supabase Edge Functions

Set these in **Supabase Dashboard > Project Settings > Edge Functions > Environment Variables**:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin database access |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CLAUDE_API_KEY` | Anthropic Claude API key |
| `PYTHON_SCRAPER_URL` | Scraper service URL (public endpoint if deployed) |
| `SCRAPER_SERVICE_KEY` | Auth token for scraper `/scrape` endpoint |

### Python Scraper Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERVICE_KEY` | No | `""` (no auth) | If set, incoming requests must include matching `X-Service-Key` header |

> **Note:** The scraper receives Supabase credentials per-request in the POST body, not via environment variables.

---

## Getting Started

### 1. Supabase Setup

#### Local Development

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Start local Supabase (PostgreSQL, Auth, Storage, Realtime, Studio)
supabase start
```

This starts the following services:

| Service | URL | Port |
|---------|-----|------|
| API (REST) | `http://127.0.0.1:54321` | 54321 |
| Database | `postgres://postgres:postgres@127.0.0.1:54322/postgres` | 54322 |
| Studio (GUI) | `http://127.0.0.1:54323` | 54323 |
| Inbucket (Email) | `http://127.0.0.1:54324` | 54324 |

#### Run Migrations

```bash
# Apply all 14 migration files (schema, indexes, RLS, triggers, seed data)
supabase db push
```

#### Create Storage Buckets

In Supabase Studio (`http://127.0.0.1:54323`) or Dashboard, create:

| Bucket | Access | Purpose |
|--------|--------|---------|
| `brand-assets` | Private | Scraped logos, product images |
| `generated` | Private | AI-generated images |

#### Configure Database Webhook

The pipeline is triggered by database webhooks. Set this up in **Supabase Dashboard > Database > Webhooks**:

| Setting | Value |
|---------|-------|
| Table | `pipeline_jobs` |
| Event | `INSERT` |
| HTTP Method | POST |
| URL | `https://<project>.supabase.co/functions/v1/pipeline-router` |

---

### 2. Python Scraper Service

The scraper is a standalone FastAPI service that handles e-commerce store scraping.

#### Option A: Run Locally

```bash
# Navigate to scraper directory
cd scraper

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Option B: Run with Docker

```bash
cd scraper

# Build the image
docker build -t visionx-scraper:latest .

# Run the container
docker run -d \
  -p 8000:8000 \
  -e SERVICE_KEY="your-secret-key" \
  --name visionx-scraper \
  --restart unless-stopped \
  visionx-scraper:latest
```

#### Verify It's Running

```bash
curl http://localhost:8000/health
# Response: {"status": "ok", "service": "visionx-scraper"}
```

#### Scraper Endpoints

**`GET /health`** — Health check (no auth)

**`POST /scrape`** — Scrape a store

```bash
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: your-secret-key" \
  -d '{
    "store_url": "https://example-store.com",
    "brand_id": "uuid-here",
    "supabase_url": "https://your-project.supabase.co",
    "supabase_key": "your-service-role-key",
    "max_products_per_collection": 50,
    "upload_assets": true
  }'
```

<details>
<summary>Response structure</summary>

```json
{
  "data": {
    "store_name": "Example Store",
    "store_url": "https://example-store.com",
    "platform": "shopify",
    "tagline": "Quality products for everyone",
    "description": "...",
    "collections": [
      {
        "name": "Summer Collection",
        "slug": "summer-collection",
        "products": [
          {
            "name": "Product Name",
            "slug": "product-name",
            "price": "49.99",
            "description": "...",
            "images": ["https://..."],
            "variants": ["Size S", "Size M"]
          }
        ]
      }
    ],
    "branding": {
      "logo_url": "https://...",
      "favicon_url": "https://...",
      "colors": ["#ff0000", "#00ff00"],
      "fonts": ["Helvetica", "Georgia"]
    },
    "metadata": {},
    "status": "complete",
    "errors": []
  },
  "assets_uploaded": 15,
  "status": "complete"
}
```

</details>

#### Supported Platforms

| Platform | Detection Method | Data Source |
|----------|-----------------|-------------|
| **Shopify** | `/products.json` endpoint or `cdn.shopify.com` in HTML | REST API (`/products.json`, `/collections.json`) |
| **WooCommerce** | `/wp-json/wc/v3/` endpoint or `woocommerce` in HTML | REST API (`/wp-json/wc/store/v1/`) |
| **Generic** | Fallback (always matches) | HTML parsing with CSS selectors |

Detection runs in order: Shopify > WooCommerce > Generic. The first successful detection wins.

---

### 3. Next.js Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

#### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |

---

## AI Models & Prompts

### Models Used Per Stage

| Stage | Model | API | Temperature | Max Tokens | Purpose |
|-------|-------|-----|-------------|------------|---------|
| 2 | `gemini-2.5-pro` | Gemini | 0.7 | 8192 | Brand DNA generation |
| 4 | `gemini-2.5-flash` | Gemini (Vision) | 0.5 | 8192 | Ad image analysis |
| 5 | `gemini-2.5-pro` | Gemini | 0.7 | 8192 | Intelligence synthesis |
| 6 | `claude-sonnet-4-20250514` | Anthropic | 0.7 | 8192 | Ad concept specs |
| 7 | `gemini-2.5-flash-image` | Gemini | — | — | Image generation |

### Prompt Templates

Located in `src/prompts/`:

| File | Stage | Input | Output |
|------|-------|-------|--------|
| `stage2_brand_dna.ts` | 2 | Store scrape data (products, colors, fonts) | 7-section Brand DNA JSON |
| `stage4_analysis.ts` | 4 | Ad image (base64) + optional Brand DNA | 50+ dimension analysis with scores (0-10) |
| `stage5_intelligence.ts` | 5 | Brand DNA + all ad analyses | Patterns, clusters, gaps, 4 concept directions |
| `stage6_concepts.ts` | 6 | Brand DNA + concept direction + product images | Strategic brief, image prompt, text overlays, technical specs |

### Prompt Output Schemas

<details>
<summary>Stage 2 — Brand DNA (7 sections)</summary>

```
brand_identity        → core_values, mission, personality, story, promise
target_audience       → demographics, psychographics, pain_points, aspirations
visual_identity       → colors (primary/secondary/accent), typography, photography style
messaging_framework   → tone_of_voice, key_messages, value_propositions, taglines
competitive_positioning → market_position, USPs, price_positioning, differentiation
negative_brand_space  → visual_donts, messaging_donts, tone_donts, audience_exclusions
ad_creative_directives → must_include_elements, preferred_formats, cta_style, hero_categories
```

</details>

<details>
<summary>Stage 4 — Ad Analysis (6 categories + scores)</summary>

```
layout_architecture   → layout_type, visual_hierarchy (0-10), white_space (0-10), balance (0-10)
typography_analysis   → headline_presence, text_readability (0-10), text_hierarchy (0-10)
color_analysis        → dominant_colors, harmony (0-10), contrast (0-10), brand_alignment (0-10)
product_presentation  → visibility (0-10), context, product_count, packaging_visible
human_element         → people_present, emotion_conveyed, relatability (0-10)
persuasion_mechanics  → hook_type, hook_strength (0-10), urgency (0-10), cta_strength (0-10)
overall_scores        → creative_quality, brand_consistency, scroll_stopping, conversion_potential
archetype + patterns + competitive_gaps
```

</details>

<details>
<summary>Stage 6 — Concept Specification</summary>

```
strategic_brief        → concept_name, objective, target_emotion, key_message, cta
image_generation_prompt → 50-100 word prompt for image model
prompt_structure       → style, composition, mood, lighting, color_palette, background
text_overlays[]        → type (headline/subheadline/cta), text, position {x, y}, style
brand_elements         → logo_position, logo_size, brand_colors_usage
technical_specs        → 1080x1080, 1:1, static, guidance_scale: 7.5, steps: 30
quality_checklist      → list of quality checks
```

</details>

### Retry Logic

All AI calls use exponential backoff:

| Attempt | Delay | Retryable Errors |
|---------|-------|-----------------|
| 1st | Immediate | — |
| 2nd | 2 seconds | HTTP 429, 500, 503, timeout |
| 3rd | 4 seconds | Same |
| 4th | 8 seconds | Same |

Non-retryable errors (content safety violations) fail immediately. Image generation uses max 1 retry (2 total attempts) due to cost.

---

## Edge Functions

Located in `supabase/functions/`. Each function is a Deno module deployed to the Supabase Edge Runtime.

### Pipeline Router

The entry point for all pipeline processing. Triggered by a database webhook on `pipeline_jobs` INSERT.

| Incoming Stage | Routes To |
|---------------|-----------|
| 1 | `process-scrape` |
| 2 | `process-brand-dna` |
| 3 | *(manual — no function)* |
| 4 | `process-ad-analysis` |
| 5 | `process-intelligence` |
| 6 | `process-concepts` |
| 7 | `process-image-gen` |
| 8 | *(manual — no function)* |
| 9 | `process-qa` |

### Shared Utilities (`_shared/`)

| File | Exports |
|------|---------|
| `cors.ts` | `corsHeaders`, `handleCors(req)` |
| `supabase-client.ts` | `getSupabaseAdmin()` — admin client with service role key |
| `job-manager.ts` | `startJob()`, `updateJobProgress()`, `completeJob()`, `failJob()`, `updateBrandStageStatus()` |
| `cost-logger.ts` | `logApiCost()` — tracks tokens, duration, cost per API call |

### Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy pipeline-router
supabase functions deploy process-scrape
supabase functions deploy process-brand-dna
supabase functions deploy process-ad-analysis
supabase functions deploy process-intelligence
supabase functions deploy process-concepts
supabase functions deploy process-image-gen
supabase functions deploy process-qa

# Or deploy all at once
supabase functions deploy --all
```

---

## Database Schema

14 migration files create the complete schema. Run `supabase db push` to apply.

### Tables

| Table | Records | Purpose |
|-------|---------|---------|
| `profiles` | Users | Auto-created on signup via trigger |
| `brands` | Projects | Central table — holds pipeline state + AI outputs as JSONB |
| `brand_assets` | Files | Scraped/uploaded logos, product images |
| `ad_library_ads` | Ads | Reference ads with analysis results |
| `pipeline_jobs` | Jobs | Async job tracking with progress % |
| `generated_ads` | Images | AI-generated images with compositing specs |
| `api_cost_logs` | Costs | Per-call API cost tracking |
| `shared_galleries` | Shares | Public gallery links with optional passwords |
| `stage_approvals` | Approvals | Audit trail for stage approve/reject/unlock |
| `model_pricing` | Config | Per-model token pricing (seed data included) |

### Key Columns on `brands`

| Column | Type | Populated By |
|--------|------|-------------|
| `store_scrape_data` | JSONB | Stage 1 (scraper output) |
| `brand_dna` | JSONB | Stage 2 (Gemini Pro output) |
| `creative_intelligence_report` | JSONB | Stage 5 (Gemini Pro output) |
| `ad_concepts` | JSONB | Stage 6 (Claude output) |
| `pipeline_status` | TEXT | `stage_1` through `stage_9`, then `complete` |
| `current_stage_status` | TEXT | `not_started`, `processing`, `review`, `approved`, `failed` |

### Model Pricing (Seed Data)

| Model | Service | Input / 1K tokens | Output / 1K tokens | Per Image |
|-------|---------|-------------------|--------------------|-----------|
| `gemini-2.5-pro` | Gemini | $0.00125 | $0.005 | — |
| `gemini-2.0-flash` | Gemini | $0.0001 | $0.0004 | — |
| `claude-sonnet` | Claude | $0.003 | $0.015 | — |
| `nano-banana-pro` | Image Gen | — | — | $0.03 |
| `flux-pro` | Image Gen | — | — | $0.30 |

### Row Level Security

All tables have RLS enabled:
- **Profiles:** Users can only view/edit their own profile
- **Brands & related tables:** Any authenticated user can CRUD (Phase 1; org-based isolation planned)
- **Shared galleries:** Public read for active galleries, authenticated write
- **Model pricing:** Public read-only
- **API cost logs:** Authenticated read, service-level insert

### Automatic Triggers

| Trigger | On | Action |
|---------|-----|--------|
| `on_auth_user_created` | `auth.users` INSERT | Auto-creates `profiles` row |
| `before_brand_insert_slug` | `brands` INSERT | Auto-generates unique slug from brand name |
| `update_updated_at` | UPDATE on profiles, brands, galleries, pricing | Sets `updated_at = NOW()` |
| `update_brand_activity` | INSERT/UPDATE on ads, jobs, generated | Updates `brands.last_activity_at` |
| `auto_tier_on_ad_update` | `ad_library_ads` UPDATE | Auto-sets performance tier from `days_running` |

---

## API Reference

All endpoints are under `/api/brands`. Authentication is via Supabase session cookies.

### Brands

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brands` | List all brands |
| POST | `/api/brands` | Create a new brand |
| GET | `/api/brands/[id]` | Get brand details |
| PUT | `/api/brands/[id]` | Update brand |
| DELETE | `/api/brands/[id]` | Archive brand |
| POST | `/api/brands/[id]/restore` | Restore archived brand |

### Pipeline Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/brands/[id]/pipeline/[stage]/run` | Start a pipeline stage (creates job) |
| POST | `/api/brands/[id]/pipeline/[stage]/process` | Process stage results |
| POST | `/api/brands/[id]/pipeline/[stage]/approve` | Approve stage output |
| POST | `/api/brands/[id]/pipeline/[stage]/unlock` | Revert stage approval |
| GET | `/api/brands/[id]/pipeline/[stage]/status` | Get current job status |
| GET | `/api/brands/[id]/pipeline/jobs` | List all jobs for brand |
| GET | `/api/brands/[id]/pipeline/jobs/[jobId]` | Get specific job |

### Ad Library (Stage 3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brands/[id]/ads` | List all ads |
| POST | `/api/brands/[id]/ads` | Upload single ad |
| POST | `/api/brands/[id]/ads/bulk` | Bulk upload ads |
| PUT | `/api/brands/[id]/ads/[adId]` | Edit ad (tags, source, copy) |
| DELETE | `/api/brands/[id]/ads/[adId]` | Delete ad |
| POST | `/api/brands/[id]/ads/[adId]/reanalyze` | Re-run analysis on ad |
| GET | `/api/brands/[id]/ads/stats` | Aggregated analysis stats |

### Brand DNA (Stage 2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/brands/[id]/dna/regenerate-section` | Regenerate a specific DNA section |

### Concepts & Generation (Stages 6-7)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/brands/[id]/bulk-concepts` | Generate all 4 concepts |
| POST | `/api/brands/[id]/bulk-concepts/regenerate-prompt` | Regenerate a concept's image prompt |
| POST | `/api/brands/[id]/bulk-concepts/generate-image` | Generate image for a concept |
| GET | `/api/brands/[id]/generated` | List generated ads |
| POST | `/api/brands/[id]/generated` | Create generated ad record |
| PUT | `/api/brands/[id]/generated/[genId]` | Update compositing specs |
| POST | `/api/brands/[id]/generated/[genId]/regenerate` | Regenerate image |
| POST | `/api/brands/[id]/generated/[genId]/select` | Toggle selection |
| POST | `/api/brands/[id]/generated/[genId]/composite` | Apply compositing |

### Export & Galleries

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/brands/[id]/export` | Export brand results |
| POST | `/api/brands/[id]/gallery` | Create shared gallery |
| GET | `/api/gallery/[shareToken]` | View public gallery |
| GET | `/api/gallery/[shareToken]/verify` | Verify gallery password |

---

## State Management

Seven Zustand stores manage client-side state, hydrated via TanStack React Query for server data.

| Store | File | Responsibility |
|-------|------|---------------|
| **Auth** | `auth-store.ts` | Current user, session, login/logout |
| **Brand** | `brand-store.ts` | Active brand data, CRUD operations |
| **Pipeline** | `pipeline-store.ts` | Job tracking, stage status, progress |
| **Ad Library** | `ad-library-store.ts` | Uploaded ads, filters, selection |
| **Generation** | `generation-store.ts` | Generated images, variants, selection |
| **Canvas** | `canvas-store.ts` | Fabric.js canvas state, text overlays, tools |
| **Theme** | `theme-store.ts` | Light/dark mode toggle |

### Realtime Updates

`use-realtime-job` hook subscribes to Supabase Realtime for live job progress updates during pipeline processing (no polling needed).

---

## Design System

- **Theme:** Dark mode by default, light mode via toggle
- **Typography:** Geist Sans + Geist Mono font family
- **Aesthetic:** Glass morphism with translucent panels
- **Corners:** Extra-large border radius (`rounded-xl`)
- **Components:** 25+ Shadcn UI components (dialog, sheet, command palette, etc.)
- **Icons:** Lucide React
- **Notifications:** Sonner toast library
- **Charts:** Recharts for analysis dashboards

---

## Deployment

### Next.js App

Deploy to Vercel, Netlify, or any Node.js host:

```bash
npm run build
npm start
```

**Next.js Config Highlights:**
- Server Actions body size limit: **50MB** (for image uploads)
- Image optimization enabled for: `*.supabase.co`, `cdn.shopify.com`, `*.cdninstagram.com`

### Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run migrations: `supabase db push --linked`
3. Deploy Edge Functions: `supabase functions deploy --all`
4. Set environment variables in Dashboard
5. Create storage buckets (`brand-assets`, `generated`)
6. Configure database webhook for `pipeline_jobs` INSERT

### Python Scraper

Deploy as a Docker container or to any Python host (Railway, Fly.io, etc.):

```bash
cd scraper
docker build -t visionx-scraper .
docker run -d -p 8000:8000 -e SERVICE_KEY="secret" visionx-scraper
```

---

## License

Proprietary — Internal use only.
