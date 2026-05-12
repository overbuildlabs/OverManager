use keyring::Entry;

const SERVICE: &str = "popmanager-cloud";

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, key).map_err(|e| format!("Keychain error: {}", e))
}

// --- API Key -----------------------------------------------------------------

pub fn store_api_key(key: &str) -> Result<(), String> {
    entry("api-key")?
        .set_password(key)
        .map_err(|e| format!("Failed to store API key: {}", e))
}

pub fn load_api_key() -> Result<String, String> {
    entry("api-key")?
        .get_password()
        .map_err(|e| format!("Failed to load API key: {}", e))
}

// --- Refresh Token -----------------------------------------------------------

pub fn store_refresh_token(token: &str) -> Result<(), String> {
    entry("refresh-token")?
        .set_password(token)
        .map_err(|e| format!("Failed to store refresh token: {}", e))
}

pub fn load_refresh_token() -> Result<String, String> {
    entry("refresh-token")?
        .get_password()
        .map_err(|e| format!("Failed to load refresh token: {}", e))
}

// --- Email -------------------------------------------------------------------

pub fn store_email(email: &str) -> Result<(), String> {
    entry("email")?
        .set_password(email)
        .map_err(|e| format!("Failed to store email: {}", e))
}

pub fn load_email() -> Result<String, String> {
    entry("email")?
        .get_password()
        .map_err(|e| format!("Failed to load email: {}", e))
}

// --- Instance ID -------------------------------------------------------------

pub fn store_instance_id(id: &str) -> Result<(), String> {
    entry("instance-id")?
        .set_password(id)
        .map_err(|e| format!("Failed to store instance ID: {}", e))
}

pub fn load_instance_id() -> Result<String, String> {
    entry("instance-id")?
        .get_password()
        .map_err(|e| format!("Failed to load instance ID: {}", e))
}

// --- Instance Name -----------------------------------------------------------

pub fn store_instance_name(name: &str) -> Result<(), String> {
    entry("instance-name")?
        .set_password(name)
        .map_err(|e| format!("Failed to store instance name: {}", e))
}

pub fn load_instance_name() -> Result<String, String> {
    entry("instance-name")?
        .get_password()
        .map_err(|e| format!("Failed to load instance name: {}", e))
}

// --- Check if logged in ------------------------------------------------------

pub fn is_logged_in() -> bool {
    load_api_key().is_ok()
}

// --- Clear all ---------------------------------------------------------------

pub fn clear_all() -> Result<(), String> {
    for key in &["api-key", "refresh-token", "email", "instance-id", "instance-name"] {
        if let Ok(e) = entry(key) {
            let _ = e.delete_credential();
        }
    }
    Ok(())
}
