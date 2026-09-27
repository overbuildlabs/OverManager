# Changelog

## v1.9.1

### Fixed

- **The 7d and 30d charts show the whole window.** The time axis used to
  stretch whatever history existed across the chart, so with less than a
  week of data 7d looked the same as 24h and every label read today's date.
  The axis now always spans the window you picked, ending now, and the line
  breaks wherever OverManager wasn't running instead of drawing a straight
  line across days with no readings. Hovering shows the date and time. Both
  the Dashboard and the per-coin dashboard are fixed.
- **Charts no longer replay a 1.5-second draw-in** every time you switch
  range or a new reading arrives.
- **NerdMiners are always Bitcoin.** The coin dropdown on NerdMiner cards
  and in Add NerdMiner is gone (NerdMiner_v2 is a SHA-256 Bitcoin miner), and
  any NerdMiner previously set to another coin is read back as BTC.
- **Acknowledge all and Clear history are fast and show progress.** They
  used to acknowledge alerts one at a time, rewriting the history file and
  waiting on a Cloud request for each, with no feedback until the end. Now
  it's one save and one Cloud request, and the button shows a spinner and
  "Acknowledging N…" or "Clearing…" while it works. If Cloud can't be
  reached, each alert is queued to sync later as before.

## v1.9.0

### Changed

- **New app icon.** OverManager has its own icon instead of the company
  logo: the company's faceted emerald hexagon with a raised purple pulse
  line. It shows in the taskbar, Start menu, installer, sidebar and About.
  Windows may show the old icon on existing shortcuts until its icon cache
  refreshes.
- **Hashrate leads the Dashboard.** Total hashrate is the first, larger
  number, in Kaspa teal with a live dot while miners report. Charts and
  miner-list sparklines are teal, and each section has a short teal rule by
  its title so sections stand apart. Sparkline tooltips lost their old
  blue-grey background.
- **Design system sync.** design/tokens.json and docs/DESIGN.md match the
  site again (new Kaspa-teal `data` token). No visible change in the app.
- **Easier to read.** Small grey labels and green buttons now meet the WCAG
  contrast standard, and form fields have visible borders.
- **Fleet health at a glance.** The Dashboard opens with one line: all
  miners online, or how many are offline and how many alerts need you, with
  links straight to them.
- **Jump anywhere with Ctrl+K (⌘K on Mac).** Type part of a miner's name or
  IP, or a page name, and press Enter.
- **Clearer charts.** Flat lines with the latest value labelled at the end,
  solid gridlines, and colors that stay distinguishable for color-blind users
  on the per-board chart.
- **Better tables.** Large fleets open in the table view, the header stays
  put while you scroll, numbers line up on the right, and your sort order is
  remembered. Settings → Preferences has a compact table density.
- **Dialogs work from the keyboard.** Escape closes them, Tab stays inside,
  and focus goes back where it was.
- Every "last updated" time now counts up live and turns amber when data
  is stale. Dates and times look the same on every screen.
- Consistent icons throughout, and a keyboard "Skip to content" link.
- **A quieter, more legible interface.** OverManager now uses IBM Plex Sans
  for text and IBM Plex Mono for numbers, so hashrates and temperatures line
  up and don't jump around as they refresh. The fonts are bundled, so it
  still works offline. Greys are neutral instead of blue-tinted, and the app
  matches the website.
- **Dashboard numbers are grouped.** Fleet counts, hashrates and
  profitability each sit in one compact strip instead of rows of separate
  cards, so more fits on screen.
- **Status tags are easier to scan.** Online, offline and warning are shown
  as small outlined labels instead of solid colored bubbles.
- Dialogs no longer blur the screen behind them, and the active sidebar item
  is marked with a thin green bar.
- If your system is set to reduce motion, OverManager now turns off its
  animations.
- **Miner detail and OverMobile detail match the rest of the app.** The
  miner's hashrate chart is the teal line with its latest value labelled,
  and its time labels no longer run together. The summary numbers on both
  pages sit in one strip. OverMobile's Stop and Restart buttons are plain
  outlined buttons instead of red and orange.
- The OverMobile card keeps the hashrate on one line.

### Fixed

- **Small Bitcoin earnings no longer show as 0.000000 BTC.** Amounts under
  0.001 BTC are shown in sats. Coin prices have thousands separators
  ("84,745.00 USD").
- **No more bogus high-temperature alerts.** Board sensor readings above
  150 °C (firmware reports 255 °C for a missing sensor) are ignored, and
  an alert can no longer be recorded without a miner, which showed as "()"
  in the history.

### Dependencies

- **Tauri 2.10 → 2.12** and its plugins, updated together on the Rust and
  JavaScript sides: updater 2.13, dialog 2.8, fs 2.6, log 2.10, shell 2.4,
  notification 2.5. Tokio, serde, tower-http, lettre, uuid, chrono and
  other libraries take their latest patch releases.
- **react-router-dom 6.30.6.** Two remaining advisories are fixed only in
  react-router 7 and don't apply here: OverManager has no server rendering,
  and every in-app link starts with a fixed path.
- The third-party licenses screen is regenerated for v1.9.0 and now lists
  the bundled IBM Plex fonts (SIL Open Font License 1.1) and Lucide icons.
- Unchanged on purpose: the updater endpoint, signing key and update
  format, so v1.8.5 updates to v1.9.0 as usual; the mobile miner server
  (axum 0.7), OverMiner discovery (mdns-sd 0.11), the history database
  (rusqlite 0.31), the data folder (dirs 5) and the Cloud connection.

## v1.8.5

*(v1.8.4 was published as a pre-release. GitHub's "latest release" skips
pre-releases, so the in-app updater never offered it — everything from v1.8.4
reaches you in this release.)*

### Fixed

- **The 30d hashrate chart no longer freezes the app.** OverManager keeps a
  month of history at one reading per minute — about 43,000 points — and the
  Dashboard was formatting, rescaling and redrawing every one of them on each
  refresh. Selecting **30d** could lock the window up for a long stretch and
  leave it sluggish afterwards. Long ranges are now condensed for display,
  keeping the highest and lowest reading in each interval so short spikes and
  dips are still visible. The same fix applies to the per-coin dashboard
  chart, which had the identical problem.
- **Long-range chart labels now show dates.** Every point on the axis read as a
  time of day ("14:32"), so a 30-day chart was a row of indistinguishable
  labels. Past 48 hours the axis now shows the date.

### Cloud sync

- **OverMiner devices now report their coin.** The cloud portal showed a blank
  coin for every OverMiner; they now report Kaspa, so they group with the rest
  of your fleet in the per-coin views and reports.
- **The cloud now shows which OverManager version each computer is running.**
  The Instances page in the portal has always had a Version field, but nothing
  ever filled it in.

## v1.8.4

*(v1.8.3 was version-bumped internally but never published; all of its changes
ship here.)*

### Cloud sync

- **A second computer can no longer take over your first computer's cloud
  instance.** Each install now remembers which cloud instance is *its own*
  (via the OS keychain) and only ever reuses that one. Previously, signing in
  to Cloud Sync on a 2nd PC could silently adopt the account's existing
  instance — mixing two machines' miners into one site and clobbering the
  original machine's identity. Now a 2nd machine on a single-site plan gets a
  clear "site limit reached — upgrade to Pro (multi-site) or unpair the other
  computer" message instead.

### NerdMiner improvements

- **Pick your NerdMiner's solo pool from a list.** When you add a stock-firmware
  NerdMiner_v2 by BTC address, you now choose its pool from a dropdown of
  supported solo pools instead of typing a host by hand. Each supported pool has
  its own stats reader, so monitoring works correctly no matter which pool
  software it runs:
  - **ckpool-solo** pools — NerdMiners Pool (pool.nerdminers.org) and CKPool
    Solo (solo.ckpool.org)
  - **Public Pool** (public-pool.io)

  NerdMiners you added in an earlier version keep working unchanged.
  *The Public Pool stats reader follows that pool's documented API; verify on
  first poll — community testing welcome.*

### Fixed

- **Mining by Coin** now includes NerdMiner hashrate — previously the poller
  never read the NerdMiner cache when building the per-coin snapshot, so BTC
  solo-mined by NerdMiners was invisible in the coin breakdown and historical
  charts.
- Adding an Antminer L7/L9 (or any ASIC) no longer silently hardcodes its
  `coinId` to `kaspa`; mistagged miners can now also be corrected after the
  fact.
- **Pool Profiles** no longer shows "No online miners" for a profile that
  real, online ASIC/mobile miners are actually mining to. The matching logic
  was only treating a pool slot as "active" when the miner's firmware set its
  `connect` flag, missing miners that instead report an up link via
  `state === 1` (the same detection already used elsewhere in the app); it
  also now falls back to hostname-only matching when one side's stratum
  address omits a port, and checks all three pool slots (not just the
  primary) when tagging a miner's coin from its pool address.

### Reporting & display

- **Per-coin dashboards** — clicking a card or row in *Mining by Coin* now
  opens a dedicated dashboard for that coin (miner breakdown, coin-scoped
  profitability, and a per-coin hashrate history chart) instead of jumping
  straight to the filtered ASIC list. A "View ASIC miners" link on each coin
  dashboard still gets you to that list.
- The *Total Farm Hashrate* chart's coin selector now defaults to Kaspa and
  remembers your last selection between launches.
- Hashrate everywhere on the dashboard (Total/ASIC stat cards, *Mining by Coin*
  cards and rows, the history chart, and the Pool Profiles total) now scales
  its unit dynamically from H/s up through KH/s, MH/s, GH/s, TH/s and PH/s
  instead of being fixed to GH/s. A BTC BitAxe or Antminer reading 1.4 TH/s no
  longer shows as "1400 GH/s", a NerdMiner shows in KH/s, and large farms scale
  cleanly into PH/s. Totals are normalized across ASIC, mobile and NerdMiner
  sources so mixed-unit fleets add up correctly.

## v1.8.3

### NerdMiner improvements

- **Pick your NerdMiner's solo pool from a list.** When you add a stock-firmware
  NerdMiner_v2 by BTC address, you now choose its pool from a dropdown of
  supported solo pools instead of typing a host by hand. Each supported pool has
  its own stats reader, so monitoring works correctly no matter which pool
  software it runs:
  - **ckpool-solo** pools — NerdMiners Pool (pool.nerdminers.org) and CKPool
    Solo (solo.ckpool.org)
  - **Public Pool** (public-pool.io)

  NerdMiners you added in an earlier version keep working unchanged.
  *The Public Pool stats reader follows that pool's documented API; verify on
  first poll — community testing welcome.*

## v1.8.2

### Cloud

- **NerdMiner_v2 units now sync to OverManager Cloud.** Stock-firmware
  NerdMiners (added by BTC address) join your ASIC, OverMiner, and mobile
  miners in the cloud — so they show up in the web portal and the OverManager
  mobile app with live hashrate, online status, and pool share stats, not just
  on the desktop. NerdMiners stay monitor-only everywhere they appear.

## v1.8.1

### Fixed

- **NerdMiner stats now display.** Stock-firmware NerdMiner_v2 devices added by
  BTC address were stuck showing "offline" with zero hashrate, shares, and best
  difficulty. The solo-pool stats response is now parsed correctly, so hashrate,
  shares, best difficulty, and last-share time populate as expected.

### New miner support

- **Antminer L7 / L9 (Scrypt)** — monitoring for Bitmain's Scrypt ASICs over the
  CGMiner API (TCP 4028), alongside the existing SHA-256 Antminer support.
  Hashrate, board temps, and fan speeds surface natively.
  *Validated against the CGMiner API shape; verify on first poll — community
  testing welcome.*

### Improvements

- **Third-party license screen** — review the open-source licenses of the
  libraries OverManager is built on, from within the app.

### Under the hood

- Internal rebrand from the legacy `com.proofofprints.popmanager` identifier to
  `com.overbuildlabs.overmanager`. Your saved miners, pools, alerts, preferences,
  history, and cloud-sync data migrate automatically and safely — **copied, not
  moved** — on first launch, so there's nothing to reconfigure.
- The updater signing key and endpoint are unchanged, so existing installs
  auto-update as usual.

## v1.7.0

### New miner support

- **Bitaxe / NerdQaxe++ (AxeOS firmware)** — discovered by the network scanner
  and monitored over the stock AxeOS HTTP API (`GET /api/system/info`).
  Hashrate, shares, best difficulty, temps, fans, power, and active/fallback
  pool all surface natively. No firmware flashing required.
  *Built against AxeOS's published OpenAPI spec; not yet verified on physical
  hardware — community testing welcome.*
- **NerdMiner_v2 (stock firmware)** — monitored via your solo pool's
  per-account stats (ckpool-style `/users/<btc-address>`), since stock
  NerdMiner firmware exposes no local API. Add a miner by BTC address from the
  new **NerdMiners** section. Reports hashrate, shares, best share, and
  last-share age.
  *Pool response shape follows standard ckpool-solo convention; verify against
  your pool on first poll — community testing welcome.*

### Supported miners (full list as of 1.7.0)

| Family | Discovery | Transport | Capability |
| --- | --- | --- | --- |
| IceRiver | Network scan / by IP | HTTP | Monitoring **+ pool reconfiguration** |
| Bitmain Antminer (and CGMiner-compatible firmwares) | Network scan / by IP | CGMiner API (TCP 4028) | Monitoring |
| Whatsminer (MicroBT) | Network scan / by IP | BTMiner API (TCP 4028) | Monitoring |
| Bitaxe / NerdQaxe++ (AxeOS) | Network scan / by IP | HTTP `/api/system/info` | Monitoring |
| NerdMiner_v2 | Add by BTC address | Solo-pool account stats | Monitoring |
| OverMiner / OverMiner Nano (ESP32) | mDNS auto-discovery | HTTP `/api/info` + `/api/stats` | Monitoring (real-time) |
| OverMobile (mobile app miners) | Reports to desktop server | HTTP push | Monitoring |
