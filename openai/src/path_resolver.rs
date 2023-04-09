use std::fs;
use std::path::PathBuf;

pub fn resolve_path(target: &str) -> String {
    if PathBuf::from(target).exists() {
        return target.to_string();
    }

    // for cargo run
    let current_dir = std::env::current_dir().unwrap();
    let normalized = current_dir.parent().unwrap_or(&current_dir).join(target);
    if !normalized.exists() {
        panic!("{} not found...", target);
    }
    fs::canonicalize(normalized)
        .unwrap()
        .to_str()
        .unwrap()
        .to_string()
}
