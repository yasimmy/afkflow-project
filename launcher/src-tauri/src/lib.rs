mod bot_manager;
mod commands;

use commands::{
    AppState,
    start_bot,
    stop_bot,
    restart_bot,
    get_bot_status,
    get_running_bots,
    open_external_url,
    save_bot_config,
    load_bot_config,
    clear_app_logs,
    send_bot_command,
    get_bot_action_count,
};
use bot_manager::BotManager;

pub fn run() {
    let bot_manager = BotManager::new();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState { bot_manager })
        .invoke_handler(tauri::generate_handler![
            start_bot,
            stop_bot,
            restart_bot,
            get_bot_status,
            get_running_bots,
            open_external_url,
            save_bot_config,
            load_bot_config,
            clear_app_logs,
            send_bot_command,
            get_bot_action_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AFKFlow");
}
