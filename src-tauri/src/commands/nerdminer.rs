use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// NerdMiner_v2 stock firmware has no local HTTP API at all — it only speaks
// Stratum to a solo pool. The only way to monitor a stock-firmware unit is to
// poll the pool's own per-account web stats, which `pool.nerdminers.org` (a
// fork of Con Kolivas' ckpool-solo) serves at `/users/<btc-address>` in
// ckpool's standard JSON stats format. This is the same format solo.ckpool.org
// and most ckpool-solo deployments use.
//
// NOTE: this endpoint shape is documented community knowledge, not verified
// against a live response from this sandbox (outbound network is blocked
// here). Confirm the field names match on first real poll and adjust
// `CkpoolUserStats` below if the pool's deployment differs.

const DEFAULT_POOL_HOST: &str = "pool.nerdminers.org";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedNerdMiner {
    pub id: String,
    pub label: String,
    pub address: String,
    #[serde(default)]
    pub worker: String,
    #[serde(default = "default_pool_host")]
    pub pool_host: String,
    /// Coin this miner's solo-pool address mines. Stock NerdMiner_v2 firmware
    /// only solo-mines BTC today, but this is an explicit field (not
    /// hardcoded) so a future firmware/pool variant for another coin doesn't
    /// need another migration.
    #[serde(default = "default_coin_id")]
    pub coin_id: String,
    pub added_at: String,
}

fn default_pool_host() -> String {
    DEFAULT_POOL_HOST.to_string()
}

fn default_coin_id() -> String {
    "bitcoin".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NerdMinerInfo {
    pub id: String,
    pub label: String,
    pub address: String,
    pub worker: String,
    pub pool_host: String,
    pub coin_id: String,
    pub online: bool,
    /// H/s — NerdMiner is kH/s-scale, unlike GH/s-scale ASICs.
    pub hashrate_1m_hs: f64,
    pub hashrate_5m_hs: f64,
    pub hashrate_1hr_hs: f64,
    pub workers: u32,
    pub shares: u64,
    pub best_share_diff: f64,
    pub best_ever_diff: f64,
    pub last_share_unix: i64,
    pub last_seen: String,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct CkpoolUserStats {
    #[serde(default)]
    hashrate1m: String,
    #[serde(default)]
    hashrate5m: String,
    #[serde(default)]
    hashrate1hr: String,
    // ckpool-solo serves these counters as JSON numbers, but its deployments
    // are inconsistent about integer vs. float form (e.g. `shares` comes back
    // as `2320022.0`). Decode them all as f64 and narrow on assignment so a
    // float value doesn't blow up the whole parse.
    #[serde(default)]
    lastshare: f64,
    #[serde(default)]
    workers: f64,
    #[serde(default)]
    shares: f64,
    #[serde(default)]
    bestshare: f64,
    #[serde(default)]
    bestever: f64,
}

/// Parse a ckpool hashrate string like "15.2K", "1.4M", "850" (bare = H/s) into H/s.
fn parse_ckpool_hashrate(s: &str) -> f64 {
    let s = s.trim();
    if s.is_empty() {
        return 0.0;
    }
    let (num_part, mult) = match s.chars().last() {
        Some('K') | Some('k') => (&s[..s.len() - 1], 1_000.0),
        Some('M') => (&s[..s.len() - 1], 1_000_000.0),
        Some('G') => (&s[..s.len() - 1], 1_000_000_000.0),
        Some('T') => (&s[..s.len() - 1], 1_000_000_000_000.0),
        _ => (s, 1.0),
    };
    num_part.trim().parse::<f64>().unwrap_or(0.0) * mult
}

/// Poll the configured solo pool's per-account web stats for a saved NerdMiner.
pub async fn fetch_nerdminer_info(saved: &SavedNerdMiner) -> NerdMinerInfo {
    let url = format!("https://{}/users/{}", saved.pool_host, saved.address);

    let mut info = NerdMinerInfo {
        id: saved.id.clone(),
        label: saved.label.clone(),
        address: saved.address.clone(),
        worker: saved.worker.clone(),
        pool_host: saved.pool_host.clone(),
        coin_id: saved.coin_id.clone(),
        last_seen: Utc::now().to_rfc3339(),
        ..Default::default()
    };

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            info.error = Some(e.to_string());
            return info;
        }
    };

    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            log::warn!("NerdMiner: pool lookup failed for {} at {}: {}", saved.address, saved.pool_host, e);
            info.error = Some(format!("Pool lookup failed: {e}"));
            return info;
        }
    };

    let status = resp.status();
    let body = match resp.text().await {
        Ok(b) => b,
        Err(e) => {
            log::warn!("NerdMiner: failed to read pool response body for {}: {}", saved.address, e);
            info.error = Some(format!("Failed to read pool response: {e}"));
            return info;
        }
    };

    if !status.is_success() {
        let snippet: String = body.chars().take(200).collect();
        log::warn!(
            "NerdMiner: pool returned HTTP {} for {}: {}",
            status, saved.address, snippet
        );
        info.error = Some(format!("Pool returned HTTP {status}"));
        return info;
    }

    let stats: CkpoolUserStats = match serde_json::from_str(&body) {
        Ok(s) => s,
        Err(e) => {
            // Log a snippet of the raw body — the pool's response shape is
            // documented community knowledge, not yet verified live, so this
            // is the diagnostic we need if a deployment's JSON differs.
            let snippet: String = body.chars().take(200).collect();
            log::warn!(
                "NerdMiner: failed to parse pool stats for {}: {}. Raw response: {}",
                saved.address, e, snippet
            );
            info.error = Some(format!("Failed to parse pool stats: {e}"));
            return info;
        }
    };

    info.hashrate_1m_hs = parse_ckpool_hashrate(&stats.hashrate1m);
    info.hashrate_5m_hs = parse_ckpool_hashrate(&stats.hashrate5m);
    info.hashrate_1hr_hs = parse_ckpool_hashrate(&stats.hashrate1hr);
    info.workers = stats.workers as u32;
    info.shares = stats.shares as u64;
    info.best_share_diff = stats.bestshare;
    info.best_ever_diff = stats.bestever;
    info.last_share_unix = stats.lastshare as i64;
    // Online = a share came in within the last 10 minutes (ckpool last-share is
    // epoch-seconds). NerdMiner's diff is so low shares usually land every
    // few minutes when actually mining.
    info.online = info.last_share_unix > 0 && (Utc::now().timestamp() - info.last_share_unix) < 600;

    log::info!(
        "NerdMiner {}: 1m={:.0} H/s workers={} shares={} bestShare={:.0}",
        saved.address, info.hashrate_1m_hs, info.workers, info.shares, info.best_share_diff
    );

    info
}

// ─── Storage ──────────────────────────────────────────────────────────────────

fn config_path() -> PathBuf {
    crate::paths::app_data_root().join("nerdminers.json")
}

fn load_nerdminers() -> Vec<SavedNerdMiner> {
    let path = config_path();
    if !path.exists() {
        return vec![];
    }
    let content = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}

fn save_nerdminers(miners: &[SavedNerdMiner]) -> Result<(), String> {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(miners).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_saved_nerdminers() -> Result<Vec<SavedNerdMiner>, String> {
    Ok(load_nerdminers())
}

#[tauri::command]
pub fn add_nerdminer(
    address: String,
    label: Option<String>,
    worker: Option<String>,
    pool_host: Option<String>,
    coin_id: Option<String>,
) -> Result<Vec<SavedNerdMiner>, String> {
    let address = address.trim().to_string();
    if address.is_empty() {
        return Err("BTC address is required".to_string());
    }
    let mut miners = load_nerdminers();
    if miners.iter().any(|m| m.address == address) {
        return Ok(miners);
    }
    miners.push(SavedNerdMiner {
        id: uuid::Uuid::new_v4().to_string(),
        label: label.unwrap_or_else(|| address.clone()),
        address,
        worker: worker.unwrap_or_default(),
        pool_host: pool_host.filter(|h| !h.is_empty()).unwrap_or_else(default_pool_host),
        coin_id: coin_id.filter(|c| !c.is_empty()).unwrap_or_else(default_coin_id),
        added_at: Utc::now().to_rfc3339(),
    });
    save_nerdminers(&miners)?;
    Ok(miners)
}

#[tauri::command]
pub fn remove_nerdminer(id: String) -> Result<Vec<SavedNerdMiner>, String> {
    let mut miners = load_nerdminers();
    miners.retain(|m| m.id != id);
    save_nerdminers(&miners)?;
    Ok(miners)
}

#[tauri::command]
pub fn update_nerdminer_label(id: String, label: String) -> Result<Vec<SavedNerdMiner>, String> {
    let mut miners = load_nerdminers();
    if let Some(m) = miners.iter_mut().find(|m| m.id == id) {
        m.label = label;
    }
    save_nerdminers(&miners)?;
    Ok(miners)
}

#[tauri::command]
pub fn update_nerdminer_coin(id: String, coin_id: String) -> Result<Vec<SavedNerdMiner>, String> {
    let mut miners = load_nerdminers();
    if let Some(m) = miners.iter_mut().find(|m| m.id == id) {
        m.coin_id = coin_id;
    }
    save_nerdminers(&miners)?;
    Ok(miners)
}
