# What You Missed

> A daily media literacy report comparing top wire service stories (AP, Reuters) with Fox News coverage — powered by Claude Sonnet 4.6 with live web search.

## How it works

1. Fetches the 5 most significant stories from AP News and Reuters via Claude with web search
2. Searches Fox News for coverage of each story
3. Compares framing, identifies missing context, omissions, and spin
4. Displays results with severity scores and an overall grade

The app runs in two modes:
- **Interactive** — click "Analyze Today's News" in the web UI to run on demand
- **Automated** — GitHub Actions runs `scripts/generate.js` daily at 8 AM ET

Same-day results are cached to avoid redundant API calls.

---

## Setup

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)

### Install

```bash
git clone <repo-url>
cd news-evaluator
npm install
```

### Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key for Claude requests |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3000` | API base URL (override for custom deployments) |

---

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click "Analyze Today's News" to run an analysis.

To run the standalone generator script directly:

```bash
node scripts/generate.js
```

---

## Deploy to Vercel

### One-click deploy

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository
3. Add the environment variable `ANTHROPIC_API_KEY` with your key
4. Click **Deploy**

### Manual deploy via CLI

```bash
npm i -g vercel
vercel
```

When prompted, add your environment variable:

```bash
vercel env add ANTHROPIC_API_KEY
```

Then redeploy:

```bash
vercel --prod
```

### Environment variables on Vercel

Go to your project **Settings** → **Environment Variables** and add:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

`NEXT_PUBLIC_API_URL` is not needed on Vercel — it defaults to the deployment URL automatically.

---

## GitHub Actions (automated daily analysis)

The included `.github/workflows/daily-analysis.yml` runs the generator daily at 13:00 UTC (8 AM ET).

To enable it:

1. Go to repo **Settings** → **Secrets and variables** → **Actions**
2. Add secret `ANTHROPIC_API_KEY` with your key
3. The workflow runs automatically, or trigger it manually from the **Actions** tab

---

## Cost estimate

Each daily run makes ~6 Claude API calls with web search:
- 1 call for top stories (~800 tokens in, ~600 out)
- 5 calls for Fox comparisons (~500 tokens in, ~400 out each)

**Estimated cost: ~$0.05–0.10/day (~$1.50–3.00/month)** using Claude Sonnet 4.6.

---

## Project structure

```
news-evaluator/
├── .github/workflows/
│   └── daily-analysis.yml        # Scheduled daily generator
├── scripts/
│   ├── generate.js               # Standalone analysis runner
│   └── update-archive-index.js   # Archive index builder
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main interactive UI
│   │   ├── layout.tsx            # Root layout
│   │   └── api/
│   │       ├── analyze/          # Claude proxy endpoint
│   │       └── analysis-cache/   # File-based cache
│   ├── components/
│   │   ├── Scorecard.tsx         # Daily summary metrics
│   │   └── StoryCard.tsx         # Individual story display
│   └── lib/
│       ├── analysisCache.ts      # Caching logic
│       ├── getTopStories.ts      # Wire story fetcher
│       └── getFoxComparison.ts   # Fox coverage analyzer
├── .env.local.example            # Environment template
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```
