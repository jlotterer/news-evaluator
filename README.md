# What You Missed

> A daily media literacy report comparing top wire service stories (AP, Reuters) with Fox News coverage — powered by Claude Sonnet 4.6 with live web search.

## Live site

Deploys to GitHub Pages at: `https://YOUR-USERNAME.github.io/whatfoxmissed/`

---

## How it works

```
GitHub Actions (cron: 8 AM ET daily)
  └─ node scripts/generate.js
        ├─ Claude Sonnet 4.6 + web search → fetches AP/Reuters top 5 stories
        ├─ Claude Sonnet 4.6 + web search → analyzes Fox News coverage for each
        └─ writes public/data/latest.json
              public/data/archive/YYYY-MM-DD.json
              public/data/archive-index.json
  └─ git commit & push → GitHub Pages serves updated static site
```

Visitors just load `index.html` → it fetches `data/latest.json` → renders the comparison. **No API key is ever exposed to the browser.**

---

## Deploy in 5 steps

### 1. Fork or create this repo on GitHub

```bash
git init whatfoxmissed
cd whatfoxmissed
# copy these files in, then:
git add .
git commit -m "initial commit"
git remote add origin git@github.com:YOUR-USERNAME/whatfoxmissed.git
git push -u origin main
```

### 2. Enable GitHub Pages

- Go to your repo → **Settings** → **Pages**
- Source: **Deploy from a branch**
- Branch: `main` / folder: `/public`
- Click **Save**

Your site will be live at `https://YOUR-USERNAME.github.io/whatfoxmissed/`

### 3. Add your Anthropic API key as a secret

- Go to repo → **Settings** → **Secrets and variables** → **Actions**
- Click **New repository secret**
- Name: `ANTHROPIC_API_KEY`
- Value: your key from https://console.anthropic.com

### 4. Run the first analysis manually

- Go to repo → **Actions** → **Daily News Analysis**
- Click **Run workflow** → **Run workflow**
- Wait ~5 minutes for it to complete
- Your site should now show today's stories

### 5. It runs automatically every day at 8 AM ET

No further action needed. GitHub Actions handles the rest for free.

---

## Cost estimate

Each daily run makes ~6 Claude API calls with web search:
- 1 call for top stories (~800 tokens in, ~600 out)
- 5 calls for Fox comparisons (~500 tokens in, ~400 out each)

**Estimated cost per day: ~$0.05–0.10** using Claude Sonnet 4.6.
**Monthly: ~$1.50–3.00**

GitHub Actions: **free** (2,000 minutes/month on free tier; this job uses ~5 min/day = 150 min/month)
GitHub Pages: **free**

---

## Local development

```bash
npm install

# Run the generator (requires ANTHROPIC_API_KEY in env)
ANTHROPIC_API_KEY=sk-ant-... node scripts/generate.js

# Preview the site
npm run dev
# → open http://localhost:8080
```

---

## File structure

```
whatfoxmissed/
├── .github/
│   └── workflows/
│       └── daily-analysis.yml   ← GitHub Actions cron job
├── public/                      ← GitHub Pages root
│   ├── index.html               ← The website (pure static)
│   └── data/
│       ├── latest.json          ← Today's analysis (auto-updated)
│       ├── archive-index.json   ← List of available archive dates
│       └── archive/
│           └── YYYY-MM-DD.json  ← Per-day archives
├── scripts/
│   ├── generate.js              ← Main daily runner
│   └── update-archive-index.js  ← Rebuilds archive-index.json
├── package.json
└── README.md
```

---

## Notes

- The analysis runs at **13:00 UTC** (8–9 AM ET depending on daylight saving)
- If a run fails, the site shows the last successful analysis
- You can trigger a manual run any time from the Actions tab
- Model used: **Claude Sonnet 4.6** (`claude-sonnet-4-6`)
