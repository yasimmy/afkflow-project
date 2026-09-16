use serde_json::{json, Value};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::State;

use crate::bot_manager::{BotManager, BotState};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

pub struct AppState {
    pub bot_manager: Arc<BotManager>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogCleanupFailure {
    pub path: String,
    pub reason: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogCleanupResult {
    pub deleted_files: u32,
    pub freed_bytes: u64,
    pub failed: Vec<LogCleanupFailure>,
}

const BOT_SECTIONS: &[(&str, &str)] = &[
    ("bot_anti_afk", "antiafk"),
    ("bot_wheel", "lucky_wheel"),
    ("bot_cooking", "cooking"),
    ("bot_gym", "gym"),
    ("bot_construction", "builder"),
    ("bot_port", "port"),
    ("bot_mine", "mining"),
    ("bot_farm", "farm_cows"),
    ("bot_turner", "turner"),
    ("bot_seamstress", "seamstress"),
    ("bot_catch_pda", "catch_pda"),
    ("bot_rutine_helper", "rutine_helper"),
];

fn section_for_bot(bot_id: &str) -> Option<&'static str> {
    BOT_SECTIONS
        .iter()
        .find(|(id, _)| *id == bot_id)
        .map(|(_, section)| *section)
}

/// Resolve the all-bots directory relative to the running executable.
pub fn resolve_all_bots_dir() -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        let mut dir = exe.as_path();
        for _ in 0..8 {
            if let Some(parent) = dir.parent() {
                let candidate = parent.join("all-bots");
                if candidate.is_dir() {
                    return candidate;
                }
                dir = parent;
            } else {
                break;
            }
        }
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            return parent.join("all-bots");
        }
    }

    PathBuf::from("all-bots")
}

fn settings_path() -> PathBuf {
    resolve_all_bots_dir().join("settings.json")
}

fn apply_creation_flags(cmd: &mut Command) {
    #[cfg(windows)]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let _ = cmd;
}

fn looks_like_store_stub(path: &Path) -> bool {
    path.to_string_lossy()
        .to_lowercase()
        .contains("windowsapps")
}

fn python_ok(program: &str, prefix_args: &[&str]) -> bool {
    let mut cmd = Command::new(program);
    cmd.args(prefix_args).arg("--version");
    apply_creation_flags(&mut cmd);
    match cmd.output() {
        Ok(out) => out.status.success() && !looks_like_store_stub(Path::new(program)),
        Err(_) => false,
    }
}

/// Returns (executable, extra args before the script), e.g. ("py", ["-3"]).
fn find_python() -> Result<(String, Vec<String>), String> {
    let candidates: Vec<(String, Vec<String>)> = vec![
        ("python".into(), vec![]),
        ("py".into(), vec!["-3".into()]),
        ("python3".into(), vec![]),
    ];

    for (program, prefix) in &candidates {
        let prefix_refs: Vec<&str> = prefix.iter().map(String::as_str).collect();
        if python_ok(program, &prefix_refs) {
            return Ok((program.clone(), prefix.clone()));
        }
    }

    #[cfg(windows)]
    {
        let mut search_roots: Vec<PathBuf> = Vec::new();
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            search_roots.push(PathBuf::from(local).join("Programs").join("Python"));
        }
        search_roots.push(PathBuf::from(r"C:\Python"));
        search_roots.push(PathBuf::from(r"C:\Program Files\Python"));

        for root in search_roots {
            if let Ok(entries) = fs::read_dir(&root) {
                let mut dirs: Vec<PathBuf> = entries.filter_map(|e| e.ok().map(|e| e.path())).collect();
                dirs.sort();
                dirs.reverse();
                for dir in dirs {
                    let exe = dir.join("python.exe");
                    if exe.is_file() && python_ok(&exe.to_string_lossy(), &[]) {
                        return Ok((exe.to_string_lossy().to_string(), vec![]));
                    }
                }
            }
        }
    }

    Err(
        "Python не найден. Установите Python 3 и добавьте его в PATH (команда python или py)."
            .into(),
    )
}

fn read_process_log(path: &Path) -> String {
    let mut buf = String::new();
    if let Ok(mut file) = fs::File::open(path) {
        let _ = file.read_to_string(&mut buf);
    }
    buf.chars().take(2000).collect()
}

fn spawn_bot_process(
    bot_id: &str,
    config: &Value,
) -> Result<std::process::Child, String> {
    let all_bots_path = resolve_all_bots_dir();
    let launcher_path = all_bots_path.join("launcher.py");

    if !launcher_path.exists() {
        return Err(format!(
            "Python launcher не найден: {:?}. Папка all-bots должна лежать рядом с лаунчером.",
            launcher_path
        ));
    }

    let logs_dir = all_bots_path.join("logs");
    let _ = fs::create_dir_all(&logs_dir);
    let log_path = logs_dir.join(format!("{}.log", bot_id));
    let log_file = fs::File::create(&log_path)
        .map_err(|e| format!("Не удалось создать лог-файл бота: {}", e))?;
    let log_err = log_file
        .try_clone()
        .map_err(|e| format!("Не удалось открыть лог-файл бота: {}", e))?;

    let (python, prefix) = find_python()?;
    let config_str = serde_json::to_string(config).unwrap_or_else(|_| "{}".into());

    let mut cmd = Command::new(&python);
    cmd.args(&prefix)
        .arg(&launcher_path)
        .env("BOT_ID", bot_id)
        .env("BOT_CONFIG", &config_str)
        .env("BOT_AUTO_START", "1")
        .current_dir(&all_bots_path)
        .stdin(Stdio::null())
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_err));
    apply_creation_flags(&mut cmd);

    let mut child = cmd.spawn().map_err(|e| {
        format!(
            "Не удалось запустить Python ({}): {}. Проверьте, что Python 3 установлен.",
            python, e
        )
    })?;

    // Give the process a moment to fail on missing deps / import errors.
    thread::sleep(Duration::from_millis(900));
    match child.try_wait() {
        Ok(Some(status)) => {
            let log = read_process_log(&log_path);
            let tail = log.trim();
            let detail = if tail.is_empty() {
                format!("код выхода {}", status)
            } else {
                tail.to_string()
            };
            Err(format!(
                "Бот сразу завершился. {}\n\n{}",
                if status.success() {
                    "Процесс закрылся сам.".to_string()
                } else {
                    format!("Код выхода: {}", status)
                },
                detail
            ))
        }
        Ok(None) => Ok(child),
        Err(e) => Err(format!("Не удалось проверить процесс бота: {}", e)),
    }
}

fn persist_section(bot_id: &str, config: &Value) -> Result<(), String> {
    let Some(section) = section_for_bot(bot_id) else {
        return Ok(());
    };
    let Some(obj) = config.as_object() else {
        return Ok(());
    };

    let path = settings_path();
    let mut root = if path.exists() {
        let raw = fs::read_to_string(&path)
            .map_err(|e| format!("Не удалось прочитать settings.json: {}", e))?;
        serde_json::from_str::<Value>(&raw).unwrap_or_else(|_| json!({}))
    } else {
        json!({})
    };

    if !root.is_object() {
        root = json!({});
    }

    let section_value = root
        .as_object_mut()
        .unwrap()
        .entry(section)
        .or_insert_with(|| json!({}));

    if let Some(section_obj) = section_value.as_object_mut() {
        for (k, v) in obj {
            section_obj.insert(k.clone(), v.clone());
        }
    }

    // lucky_wheel: UI may send `cycles` as hours
    if section == "lucky_wheel" {
        if let Some(section_obj) = root.get_mut("lucky_wheel").and_then(|v| v.as_object_mut()) {
            if let Some(cycles) = obj.get("cycles") {
                if !obj.contains_key("hours") {
                    section_obj.insert("hours".into(), cycles.clone());
                }
            }
        }
    }

    let pretty = serde_json::to_string_pretty(&root)
        .map_err(|e| format!("Не удалось сериализовать settings.json: {}", e))?;
    fs::write(&path, pretty)
        .map_err(|e| format!("Не удалось записать settings.json: {}", e))?;
    Ok(())
}

fn load_section(bot_id: &str) -> Result<Value, String> {
    let Some(section) = section_for_bot(bot_id) else {
        return Ok(json!({}));
    };
    let path = settings_path();
    if !path.exists() {
        return Ok(json!({}));
    }
    let raw = fs::read_to_string(&path)
        .map_err(|e| format!("Не удалось прочитать settings.json: {}", e))?;
    let root: Value = serde_json::from_str(&raw).unwrap_or_else(|_| json!({}));
    Ok(root.get(section).cloned().unwrap_or_else(|| json!({})))
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Only HTTP(S) URLs are allowed".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

/// Start a bot. Argument names are snake_case so Tauri maps JS camelCase (`botId`).
#[tauri::command]
pub fn start_bot(
    bot_id: String,
    #[allow(unused_variables)] executable_path: Option<String>,
    config: Option<Value>,
    state: State<'_, AppState>,
) -> Result<BotState, String> {
    if bot_id.trim().is_empty() {
        return Err("botId must not be empty".into());
    }

    let _ = state.bot_manager.stop_bot(&bot_id);

    let config = config.unwrap_or_else(|| json!({}));
    let _ = persist_section(&bot_id, &config);

    let child = spawn_bot_process(&bot_id, &config)?;
    state.bot_manager.register_process(bot_id.clone(), child)
}

#[tauri::command]
pub fn stop_bot(bot_id: String, state: State<'_, AppState>) -> Result<(), String> {
    if bot_id.trim().is_empty() {
        return Err("botId must not be empty".into());
    }
    state.bot_manager.stop_bot(&bot_id)
}

#[tauri::command]
pub fn send_bot_command(bot_id: String, command: String) -> Result<(), String> {
    if bot_id.trim().is_empty() {
        return Err("botId must not be empty".into());
    }
    if !matches!(command.as_str(), "pause" | "resume") {
        return Err("Unsupported bot command".into());
    }
    let control_dir = resolve_all_bots_dir().join("control");
    fs::create_dir_all(&control_dir).map_err(|error| error.to_string())?;
    fs::write(control_dir.join(format!("{}.cmd", bot_id)), command)
        .map_err(|error| format!("Не удалось передать команду боту: {}", error))
}

#[tauri::command]
pub fn get_bot_action_count(bot_id: String) -> Result<u64, String> {
    if bot_id.trim().is_empty() {
        return Err("botId must not be empty".into());
    }
    let log_path = resolve_all_bots_dir().join("logs").join(format!("{}.log", bot_id));
    let contents = fs::read_to_string(log_path).unwrap_or_default();
    for line in contents.lines().rev() {
        if let Some(value) = line.split("Счётчик:").nth(1) {
            if let Ok(count) = value.trim().split('/').next().unwrap_or_default().parse::<u64>() {
                return Ok(count);
            }
        }
    }
    Ok(0)
}

#[tauri::command]
pub fn restart_bot(
    bot_id: String,
    executable_path: Option<String>,
    config: Option<Value>,
    state: State<'_, AppState>,
) -> Result<BotState, String> {
    let _ = stop_bot(bot_id.clone(), state.clone());
    start_bot(bot_id, executable_path, config, state)
}

#[tauri::command]
pub fn get_bot_status(bot_id: String, state: State<'_, AppState>) -> Option<BotState> {
    if bot_id.trim().is_empty() {
        return None;
    }
    state.bot_manager.get_status(&bot_id)
}

#[tauri::command]
pub fn get_running_bots(state: State<'_, AppState>) -> Vec<BotState> {
    state.bot_manager.get_running_bots()
}

#[tauri::command]
pub fn save_bot_config(bot_id: String, config: Value) -> Result<(), String> {
    if bot_id.trim().is_empty() {
        return Err("botId must not be empty".into());
    }
    persist_section(&bot_id, &config)
}

#[tauri::command]
pub fn load_bot_config(bot_id: String) -> Result<Value, String> {
    if bot_id.trim().is_empty() {
        return Err("botId must not be empty".into());
    }
    load_section(&bot_id)
}

#[tauri::command]
pub fn clear_app_logs(state: State<'_, AppState>) -> Result<LogCleanupResult, String> {
    let running_bot_ids: Vec<String> = state
        .bot_manager
        .get_running_bots()
        .into_iter()
        .map(|bot| bot.bot_id)
        .collect();

    for bot_id in running_bot_ids {
        state.bot_manager.stop_bot(&bot_id)?;
    }

    let logs_dir = resolve_all_bots_dir().join("logs");
    if !logs_dir.exists() {
        return Ok(LogCleanupResult {
            deleted_files: 0,
            freed_bytes: 0,
            failed: Vec::new(),
        });
    }

    let mut result = LogCleanupResult {
        deleted_files: 0,
        freed_bytes: 0,
        failed: Vec::new(),
    };

    let entries = fs::read_dir(&logs_dir).map_err(|error| {
        format!("Не удалось открыть собственную папку логов: {}", error)
    })?;

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(error) => {
                result.failed.push(LogCleanupFailure {
                    path: logs_dir.to_string_lossy().into_owned(),
                    reason: error.to_string(),
                });
                continue;
            }
        };
        let path = entry.path();
        let metadata = match entry.metadata() {
            Ok(metadata) if metadata.is_file() => metadata,
            Ok(_) => continue,
            Err(error) => {
                result.failed.push(LogCleanupFailure {
                    path: path.to_string_lossy().into_owned(),
                    reason: error.to_string(),
                });
                continue;
            }
        };

        match fs::remove_file(&path) {
            Ok(()) => {
                result.deleted_files += 1;
                result.freed_bytes += metadata.len();
            }
            Err(error) => result.failed.push(LogCleanupFailure {
                path: path.to_string_lossy().into_owned(),
                reason: format!("Файл занят или недоступен: {}", error),
            }),
        }
    }

    Ok(result)
}
