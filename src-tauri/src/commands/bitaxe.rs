use serde::Deserialize;
use super::miner::{MinerInfo, PoolInfo, HealthState};

// ---- Raw AxeOS /api/system/info response (subset we care about) ----
// Field names match bitaxeorg/ESP-Miner's documented openapi.yaml exactly —
// AxeOS already reports hashRate in GH/s, same convention as our other ASIC types.
#[derive(Debug, Deserialize)]
struct AxeOsInfo {
    #[serde(rename = "ASICModel", default)]
    asic_model: String,
    #[serde(default)]
    version: String,
    #[serde(rename = "axeOSVersion", default)]
    axe_os_version: String,
    #[serde(default)]
    hostname: String,
    #[serde(rename = "macAddr", default)]
    mac_addr: String,
    #[serde(rename = "hashRate", default)]
    hash_rate: f64,
    #[serde(rename = "hashRate_1h", default)]
    hash_rate_1h: f64,
    #[serde(rename = "sharesAccepted", default)]
    shares_accepted: u64,
    #[serde(rename = "sharesRejected", default)]
    shares_rejected: u64,
    #[serde(rename = "bestDiff", default)]
    best_diff: serde_json::Value,
    #[serde(rename = "uptimeSeconds", default)]
    uptime_seconds: u64,
    #[serde(default)]
    temp: f64,
    #[serde(rename = "vrTemp", default)]
    vr_temp: f64,
    #[serde(rename = "fanspeed", default)]
    fan_speed: u32,
    #[serde(rename = "fanrpm", default)]
    fan_rpm: u32,
    #[serde(default)]
    power: f64,
    #[serde(rename = "stratumURL", default)]
    stratum_url: String,
    #[serde(rename = "stratumPort", default)]
    stratum_port: serde_json::Value,
    #[serde(rename = "stratumUser", default)]
    stratum_user: String,
    #[serde(rename = "isUsingFallbackStratum", default)]
    using_fallback: bool,
    #[serde(rename = "fallbackStratumURL", default)]
    fallback_stratum_url: String,
    #[serde(rename = "fallbackStratumPort", default)]
    fallback_stratum_port: serde_json::Value,
    #[serde(rename = "fallbackStratumUser", default)]
    fallback_stratum_user: String,
    #[serde(rename = "overheat_mode", default)]
    overheat_mode: serde_json::Value,
    #[serde(rename = "power_fault", default)]
    power_fault: String,
}

/// Fetch live status from a Bitaxe / NerdQaxe++ / other AxeOS-firmware device
/// at the given IP. AxeOS ships this API on stock firmware — no flashing needed.
pub async fn fetch_bitaxe_info(ip: &str) -> Result<MinerInfo, String> {
    let url = format!("http://{}/api/system/info", ip);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| {
        log::warn!("Bitaxe: connection failed to {}: {}", ip, e);
        format!("Connection failed to {ip}: {e}")
    })?;

    let info: AxeOsInfo = resp.json().await.map_err(|e| {
        log::warn!("Bitaxe: failed to parse response from {}: {}", ip, e);
        format!("Failed to parse response from {ip}: {e}")
    })?;

    let best_diff = info.best_diff.as_str().map(|s| s.to_string()).unwrap_or_else(|| info.best_diff.to_string());
    let stratum_port = info.stratum_port.as_u64().unwrap_or(0);
    let fallback_port = info.fallback_stratum_port.as_u64().unwrap_or(0);

    let mut pools = vec![PoolInfo {
        no: 0,
        addr: format!("{}:{}", info.stratum_url, stratum_port),
        user: info.stratum_user.clone(),
        pass: String::new(),
        connect: !info.using_fallback,
        diff: best_diff.clone(),
        accepted: info.shares_accepted,
        rejected: info.shares_rejected,
        state: if !info.using_fallback { 1 } else { 0 },
    }];
    if !info.fallback_stratum_url.is_empty() {
        pools.push(PoolInfo {
            no: 1,
            addr: format!("{}:{}", info.fallback_stratum_url, fallback_port),
            user: info.fallback_stratum_user.clone(),
            pass: String::new(),
            connect: info.using_fallback,
            diff: String::new(),
            accepted: 0,
            rejected: 0,
            state: if info.using_fallback { 1 } else { 0 },
        });
    }

    let model = if info.asic_model.is_empty() { "Bitaxe".to_string() } else { info.asic_model.clone() };
    let now = chrono::Utc::now().to_rfc3339();
    let overheating = info.overheat_mode.as_u64().unwrap_or(0) != 0 || info.overheat_mode.as_bool().unwrap_or(false);
    let power_ok = info.power_fault.is_empty() || info.power_fault == "0" || info.power_fault.eq_ignore_ascii_case("none");

    log::info!(
        "Bitaxe {}: model={} rt={:.1}GH/s avg(1h)={:.1}GH/s bestDiff={}",
        ip, model, info.hash_rate, info.hash_rate_1h, best_diff
    );

    Ok(MinerInfo {
        ip: ip.to_string(),
        hostname: info.hostname,
        mac: info.mac_addr,
        model,
        status: "online".to_string(),
        firmware: info.axe_os_version,
        software: info.version,
        online: true,
        rt_hashrate: info.hash_rate,
        avg_hashrate: info.hash_rate_1h,
        hashrate_unit: "G".to_string(),
        runtime: format_runtime(info.uptime_seconds),
        runtime_secs: info.uptime_seconds,
        fans: if info.fan_rpm > 0 { vec![info.fan_rpm] } else { vec![info.fan_speed] },
        boards: vec![],
        pools,
        hashrate_history: vec![],
        health: HealthState {
            power: power_ok,
            network: true,
            fan: info.fan_rpm > 0 || info.fan_speed > 0,
            temp: !overheating,
        },
        last_seen: now,
        default_wattage: if info.power > 0.0 { info.power } else { 15.0 },
        manufacturer: "bitaxe".to_string(),
        hw_errors: info.shares_rejected,
    })
}

fn format_runtime(secs: u64) -> String {
    let dd = secs / 86400;
    let hh = (secs % 86400) / 3600;
    let mm = (secs % 3600) / 60;
    let ss = secs % 60;
    format!("{:02}:{:02}:{:02}:{:02}", dd, hh, mm, ss)
}
