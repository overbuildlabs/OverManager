# PoPManager Ecosystem Roadmap

Last updated from the main development session (May 2026). This captures all planned work across the entire Proof of Prints product ecosystem.

## Current state (shipped)

| Product | Version | Status | Repo |
|---|---|---|---|
| **PoPManager Desktop** | v1.2.0 | Released, public | github.com/proofofprints/PoPManager |
| **PoPCloud API** | v1.0.0 | Deployed, live | github.com/proofofprints/PoPCloud (private) |
| **PoPMobile** (Android) | v1.0.x | In development | L:\KaspaAndroidMiner |
| **PoPMiner Nano** (ESP32) | v0.2.6 | Pre-release | github.com/proofofprints/popminer-nano |

## Phase map

### Phase 2.5 — Background Polling Refactor (NEXT — PoPManager Desktop)

**Priority: HIGH — blocks everything else**

Move all data polling from React frontend (only runs when pages are visible) to a Rust background task (always running). This fixes:
- Cloud sync only working when Dashboard is open
- Pages being slow on first navigate (poll-then-render)
- Miner data going stale when user is on a different page

**Full spec:** `thoughts/HANDOFF_BACKGROUND_POLLING.md`

**Session prompt:** Ready to paste — see bottom of HANDOFF_BACKGROUND_POLLING.md

---

### Phase 3 — Web Portal (NEW REPO: PoPManagerPortal)

**Priority: HIGH — first thing cloud subscribers see**

React SPA at cloud.proofofprints.com. Same data as the desktop app but accessible from any browser.

**Tech:** React + TypeScript + Vite + Tailwind CSS (same stack as PoPManager frontend)

**Screens:**
- Login (email/password + Google SSO + Microsoft SSO)
- Dashboard — farm hashrate, miner counts, earnings, uptime chart
- Miners — all types (ASIC, Mobile, PoPMiner) with search/filter
- Miner Detail — same stats as desktop, remote start/stop/restart
- Alerts — history with push notification preferences
- Settings — account, subscription (Stripe), instances, API keys
- Subscription management — Stripe Checkout integration

**SSO implementation (do in this phase):**
- Add OAuth endpoints to PoPCloud API: `/auth/google`, `/auth/google/callback`, `/auth/microsoft`, `/auth/microsoft/callback`
- Google Cloud Console: create OAuth client ID (free)
- Azure AD: register app (free tier)
- Standard PKCE flow for browser, deep-link flow for desktop + mobile
- After SSO exists in PoPCloud, add "Sign in with Google/Microsoft" buttons to PoPManager desktop's CloudSyncPanel

**Prompt for new session:**
```
Build the PoPCloud web portal — a React SPA that connects to the
existing PoPCloud API at cloud.proofofprints.com.

Read L:\PoPCloud\ARCHITECTURE.md for the full API spec.

Tech: React + TypeScript + Vite + Tailwind CSS.
Deploy: static files served by Caddy on the same Contabo VPS.
Domain: cloud.proofofprints.com (Caddy already handles TLS).

Include SSO: add Google and Microsoft OAuth endpoints to the
PoPCloud API (src/routes/auth.ts), then use them in the portal
login page. Standard PKCE browser flow.

Screens: Login, Dashboard, Miners, Miner Detail, Alerts, Settings
(with Stripe subscription management).

Match the PoPManager desktop dark theme:
- Background: #0f172a
- Cards: #1e293b with slate-700 borders
- Primary: #6366f1 (indigo)
- Status: emerald/red/amber

Repo: L:\PoPManagerPortal (or wherever makes sense)
GitHub: proofofprints/PoPManagerPortal
```

---

### Phase 4 — Companion App (NEW REPO: PoPManagerCompanion)

**Priority: MEDIUM — nice to have after web portal**

React Native (Expo) app for iOS + Android. Same data as web portal but native, with push notifications.

**Tech:** React Native + Expo + TypeScript + Zustand + Firebase Cloud Messaging

**Screens:**
- Login (email/password + Google/Microsoft SSO)
- Dashboard — farm summary, live WebSocket updates
- Miners list + detail
- Alerts with push notification history
- Settings — account, notification preferences

**Prompt for new session:**
```
Build the PoPManager companion mobile app using React Native + Expo.

The PoPCloud API is live at cloud.proofofprints.com — read
L:\PoPCloud\ARCHITECTURE.md for endpoints.

Tech: React Native, Expo (managed workflow), TypeScript, Zustand
for state, Firebase Cloud Messaging for push notifications.

Screens: Login, Dashboard (WebSocket live updates), Miners list +
detail, Alerts, Settings.

Match the PoPManager dark theme (bg #0f172a, cards #1e293b,
primary #6366f1).

Include SSO via the OAuth endpoints built in Phase 3.

Repo: L:\PoPManagerCompanion
GitHub: proofofprints/PoPManagerCompanion
```

---

### Phase 5 — Payments (PoPCloud API + Web Portal)

**Priority: MEDIUM — needed before public cloud launch**

Stripe integration for the $5/month Cloud Basic plan.

**Scope:**
- Stripe Checkout session creation from PoPCloud API
- Webhook handler for subscription events (payment success, failure, cancellation)
- Plan enforcement middleware (commands require active subscription)
- Subscription management page in web portal (upgrade, cancel, billing history)
- 30-day free trial option
- PoPManager desktop: show subscription status in Cloud Sync panel, gate remote commands

**Stripe setup:**
- Create products: "Cloud Basic" ($5/month), "Cloud Pro" ($10/month, future)
- Test in Stripe test mode first, switch to live before public launch

---

### Phase 6 — Desktop Ads / Cloud Upsell (PoPManager Desktop)

**Priority: LOW — after cloud is public**

Subtle first-party ads promoting PoPCloud in the free desktop app.

**Implementation:**
- After 5+ managed devices, show a slim banner below the Dashboard stat cards
- "Managing N devices? Access your farm from anywhere — $5/month"
- Dismissible with X, returns after 7 days
- Permanently removed with any Cloud subscription (check subscription status via cloud API)
- Settings → About section: "Upgrade to Cloud" link
- NO third-party ads (Google AdSense etc.) — only first-party PoPCloud promotion

---

### Phase 7 — Advanced Reporting (PoPCloud API + Web Portal)

**Priority: LOW — Cloud Pro upsell**

Tax/IRS export, advanced analytics, multi-user access.

**Features:**
- Historical earnings reports by coin, by miner, by time period
- Tax-ready CSV/PDF export (cost basis, income, expenses)
- Custom date range queries
- Multi-user access (invite team members to view your farm)
- API access for custom integrations

**This is the Cloud Pro ($10/month) tier differentiator.**

---

### Ongoing — PoPMiner Nano Tier 2 (PoPMiner firmware + PoPManager Desktop)

**Priority: MEDIUM — after background polling refactor**

Add authenticated control to PoPMiner Nano devices from PoPManager.

**Requires:**
- Login flow: POST /login with per-device password → auth cookie
- Remote start/stop: POST /api/mine with { action: "start"|"stop" }
- Remote config: GET/POST /api/config (pool URL, wallet, threads)
- OTA firmware push: POST /api/ota with .bin file
- Device restart: POST /api/restart

**PoPManager changes:**
- PoPMiner detail page with Start/Stop/Restart buttons (like Mobile Miner Remote Control)
- Editable config form (pool, wallet, worker, threads)
- Password management per device (stored in OS keychain)
- OTA update button (select .bin file, upload to device)

---

### Ongoing — New Miner Support (PoPManager Desktop)

Community-driven. Prioritize based on user requests.

**Potential additions:**
- Goldshell miners
- Bitmain Antminer newer models (S21 XP, etc.)
- IceRiver newer models (KS5L, etc.)
- Whatsminer newer models

**Each new manufacturer needs:**
- Rust command module (`src-tauri/src/commands/<manufacturer>.rs`)
- API response parsing (each manufacturer has unique HTTP API)
- Auto-detection in network scanner
- Registration in `mod.rs`

---

## Infrastructure decisions (locked in)

| Decision | Choice | Rationale |
|---|---|---|
| Desktop framework | Tauri 2 (Rust + React) | Cross-platform, small binary, native perf |
| Cloud API | Node.js + Fastify + TypeScript | Fast, type-safe, matches frontend skills |
| Database | PostgreSQL + TimescaleDB | Time-series native, proven at scale |
| Mobile app | React Native + Expo | Cross-platform, same React/TS skills |
| Web portal | React + Vite + Tailwind | Same stack as desktop frontend |
| Auth | JWT + refresh tokens + OAuth SSO | Industry standard |
| Payments | Stripe | Simplest for subscriptions |
| Push notifications | Firebase Cloud Messaging | iOS + Android + Web |
| Desktop credentials | OS keychain (keyring crate) | Secure, native |
| Offline queue | SQLite (rusqlite) | Durable, crash-safe |
| Cloud hosting | Contabo VPS | Cheap, reliable, collocated with mining pool |
| Code signing | Certum Open Source (deferred) | ~$30/year after repo goes fully public |

## Pricing model

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 | PoPManager desktop, all local features, unlimited miners |
| **Cloud Basic** | $5/month | Cloud sync, web portal, companion app, remote commands, push notifications, unlimited history, multi-instance, ad-free |
| **Cloud Pro** | $10/month (future) | Everything in Basic + advanced reporting, tax exports, multi-user |

## Repository map

| Repo | Purpose | Status |
|---|---|---|
| `PoPManager` | Desktop app (Tauri) | Public, v1.2.0 |
| `PoPCloud` | Cloud API (Node.js) | Private, v1.0.0, deployed |
| `PoPManagerPortal` | Web portal (React SPA) | Not started |
| `PoPManagerCompanion` | Mobile companion (React Native) | Not started |
| `popminer-nano` | ESP32 firmware | Public, v0.2.6 |
| `KaspaAndroidMiner` / PoPMobile | Android miner app | In development |

## Session history

This roadmap was developed across a single extended Claude Code session covering:
1. Mobile miner push telemetry + pairing codes
2. Navigation restructure (ASIC / Mobile / PoPMiner split)
3. Dashboard overhaul (multi-type stats, profitability fix)
4. Alert system (ASIC + Mobile rules, startup grace period)
5. Pool unification (cross-fleet matching + Push to Mobile)
6. Device removal flows
7. v1 release prep (docs, CI, code signing setup, GitHub Actions)
8. PoPMiner Nano mDNS discovery + live stats
9. QR code pairing
10. Cloud sync Phase 2 (auth, client, queue, sync loop, WebSocket, Settings UI)
11. Background polling architecture design (next session)
