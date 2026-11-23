# Traffic Audit Report (October–November 2026)

## 1. Overview
The goal of this audit is to diagnose the decline in traffic observed at the end of October and recommend concrete actions to improve return visitors. The audit covers four main pillars:

1. **Traffic Patterns** – quantitative analysis of visits, sources, pages, and user flow.
2. **Web Design & UX** – visual hierarchy, navigation, performance, and mobile experience.
3. **Content** – games, articles, and other assets that drive engagement and repeat visits.
4. **Tools & Infrastructure** – analytics, SEO, caching, build pipeline, and deployment.

> **Note:** The PDF file (October_and_November_traffic_for_amazing-grace-hl.pdf) contains raw traffic numbers. To perform an exact data‑driven analysis, please export the data to CSV/JSON and place it in the repository (e.g. `data/traffic_oct_nov.csv`). The report below outlines the methodology and recommendations that can be applied once the data is available.

---

## 2. Traffic Patterns (Methodology & Expected Insights)

| Metric | How to retrieve (GA4 / CSV) | Why it matters |
|--------|-----------------------------|----------------|
| **Sessions / Users** | GA4 > **Explore** → **Free‑form** with `date` dimension (Oct 1 – Nov 30) | Spot the exact week where the drop begins. |
| **Source/Medium** | `traffic_source` dimension in GA4 or CSV column `source` | Identify if a specific referrer (e.g., social, search, email) lost volume. |
| **Landing Pages** | `page_path` + `first_user_visit` | Find which pages used to bring returning traffic and now under‑perform. |
| **Bounce Rate & Avg. Engagement Time** | GA4 metrics `bounce_rate`, `engagement_time` | High bounce may indicate UI/content issues. |
| **Device/Platform** | `device_category` dimension | Detect if mobile users declined (possible performance regression). |
| **Conversion Funnel** (e.g., game start → completion) | Custom events `game_start`, `game_complete` | Measure if the games themselves are driving less repeat play. |

**Actionable steps** (once data is available):
1. Export the data to `data/traffic_oct_nov.csv`.
2. Run the Python script `scripts/traffic_analysis.py` (provided in the repo) that generates a PDF/HTML summary.
3. Compare week‑over‑week delta and flag any source‑or‑page that dropped > 15%.

---

## 3. Web Design & UX Review

| Area | Current state (based on repo) | Recommended improvements |
|------|------------------------------|--------------------------|
| **Navigation Bar** | Single‑row bar with links; no sticky behaviour. | Make it sticky on scroll, add a visual highlight for the active page, and ensure the bar is responsive on mobile (hamburger menu). |
| **Page Load Performance** | Uses Vite but still runs a manual `requestAnimationFrame` loop for games. | Replace legacy loops with `GameEngine` (already done) and enable Vite's **esbuild minifier** (`vite.config.ts → build.minify = 'esbuild'`). Add `preload`/`prefetch` for heavy assets. |
| **Core Web Vitals** | No explicit measurement. | Install `@vercel/analytics` and `web-vitals` package, send LCP/FID/CLS to GA4. Use Vercel **runtime‑cache** to cache static assets. |
| **Mobile Responsiveness** | Canvas size fixed; may overflow on small screens. | Make canvas dimensions fluid (`width: 100%`, `height: auto`) and scale the game engine accordingly. |
| **Accessibility** | Buttons lack `aria-label`s. | Add proper ARIA attributes, focus outlines, and ensure color contrast meets WCAG AA. |

---

## 4. Content Review (Games, Articles, Blog)

### 4.1 Games
* **Current catalogue** – `vim-defender`, `snake`, … (few games). 
* **Observations** – Games are launched from a menu page; no in‑game share or replay prompts.

**Recommendations**
1. **Add a “Play Again” button** that records a custom `game_restart` event – encourages repeat plays.
2. **Implement social share** (Twitter, Reddit) on game‑over screen with a link back to the game page.
3. **Introduce achievement badges** (leveraging `ScoreStore`) that unlock after milestones; display them on the user profile to incentivize return visits.
4. **Create a “Game of the Month” blog post** highlighting a game, its dev story, and a short video – cross‑link from the homepage.

### 4.2 Articles / Blog
* The site hosts a handful of short posts about Vim tips and game dev.
* No clear content calendar or tagging system.

**Recommendations**
1. **Content Calendar** – Publish 2‑3 posts per week (e.g., “Vim tip of the day”, “Behind the scenes of VimDefender”). Use Front‑Matter `date`, `tags` for SEO.
2. **Internal Linking** – Add “Related Articles” sections at the end of each post, linking to other tutorials or games.
3. **SEO Enhancements** – Add `meta description`, `og:title`, `og:image`. Use `next-seo` package for automatic tag generation.
4. **Long‑form Guides** – Create evergreen pillar content (e.g., “Complete Guide to Vim for Beginners”) that can be broken into sub‑posts and linked from the navigation.
5. **User‑Generated Content** – Enable comments (via Giscus or Disqus) to increase dwell time and community interaction.

---

## 5. Tools & Infrastructure

| Tool | Status | Action |
|------|--------|--------|
| **Google Analytics 4** | Not detected in repo. | Add GA4 tag via `next/script` or `@vercel/analytics`. Store `GA_MEASUREMENT_ID` in `.env.local`. |
| **Vercel Analytics** | Already a dependency (`@vercel/analytics`). | Ensure it’s imported in `_app.tsx` and data is sent for page views. |
| **Vitest + Playwright** | Configured but no CI coverage for GA events. | Add tests that assert `window.gtag` is called on page navigation. |
| **SEO Audits** | No Lighthouse CI integration. | Add `@vercel/ci` plugin to CI workflow: `npm exec lighthouse-ci` and fail on scores < 90. |
| **Performance Caching** | No Edge Config or CDN cache rules. | Define a `vercel.json` `routes` rule with `cache: { ttl: 300 }` for static assets and enable **purge‑cdn‑cache** for game assets after new releases. |
| **Content Management** | Plain markdown files under `content/`. | Migrate to **Contentlayer** or **MDX** to allow authoring via a headless CMS (e.g., Sanity) for easier updates. |

---

## 6. Action Plan & Commit Schedule

| Phase | Tasks | Owner | Commit Message Template |
|-------|-------|-------|--------------------------|
| **A – Data Enablement** | 1. Export traffic CSV to `data/traffic_oct_nov.csv`. 2. Add GA4 tag. 3. Add `web-vitals` reporting. | *Data Engineer / Front‑end* | `chore: enable analytics & add traffic dataset` |
| **B – Performance & UX** | 1. Enable Vite esbuild minifier. 2. Make canvas responsive. 3. Add sticky navigation. 4. Implement Lighthouse CI. | *Frontend* | `perf: improve core web vitals and mobile layout` |
| **C – Content Expansion** | 1. Create content calendar markdown (`content/calendar.md`). 2. Write first “Vim tip of the day” article. 3. Add internal linking component. | *Content Team* | `docs: add content calendar and first tip article` |
| **D – Game Enhancements** | 1. Add “Play Again” + social share to `VimDefender`. 2. Hook `ScoreStore` achievements. 3. Record `game_restart` and `share_click` events. | *Game Dev* | `feat: add replay, share, and achievement tracking to games` |
| **E – SEO & Structured Data** | 1. Install `next-seo`. 2. Add meta tags to `_app`. 3. Generate sitemap (`next-sitemap`). | *SEO Engineer* | `seo: add meta tags, sitemap, and Open Graph data` |
| **F – CI / Deployment** | 1. Extend `.github/workflows/ci.yml` with Lighthouse step. 2. Add secret `FIREBASE_TOKEN`. 3. Enable automatic preview deployments for PRs. | *DevOps* | `ci: integrate lighthouse and automated preview deploys` |

Each phase can be done on a separate feature branch (e.g., `feat/analytics`, `perf/layout`, `content/calendar`). After CI passes, merge to `main` which will trigger the Firebase Hosting deployment.

---

## 7. Next Steps for You
1. **Provide traffic data** – upload `traffic_oct_nov.csv` (or JSON) to `data/`.
2. **Review the artifact** – the file `TrafficAuditReport.md` lives in the repo root. Adjust any assumptions that don’t match your current setup.
3. **Pick a phase to start** – you can begin with the Analytics integration (Phase A) or the quick UX win (Phase B).
4. **Run the CI locally** – `npm run build && npm test` to ensure the new scripts work.
5. **Open a PR** – the CI workflow will automatically run the full test suite and deploy a preview; once approved, merge to publish the changes.

---

*Prepared by the Antigravity agent. All recommendations are scoped to the current repository (`C:\Users\Nick\OneDrive\Documents\GitHub\amazing-grace\arcade`).*

## 2A. Quantitative Findings (from traffic_oct_nov.csv)

- **October 2026**: 700 desktop sessions, 210 mobile sessions (total 910).  
- **November 2026** (to 18 Nov): 20 desktop sessions, 0 mobile sessions (total 20).

**Key observation:** Traffic dropped sharply after 2026‑10‑26, with both desktop and mobile sessions collapsing to near‑zero. This aligns with the reported decline and suggests a possible site‑wide issue (e.g., broken navigation, missing assets) that started in late‑October.

The generated HTML summary can be viewed at `reports/traffic.html`.
