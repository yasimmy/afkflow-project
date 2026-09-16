use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum BotProcessStatus {
    Idle,
    Starting,
    Running,
    Stopping,
    Crashed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BotState {
    pub bot_id: String,
    pub status: BotProcessStatus,
    pub pid: Option<u32>,
    pub started_at: Option<u64>,
}

pub struct ManagedProcess {
    pub child: Child,
    pub status: BotProcessStatus,
    pub started_at: u64,
}

pub struct BotManager {
    pub processes: Mutex<HashMap<String, ManagedProcess>>,
}

impl BotManager {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            processes: Mutex::new(HashMap::new()),
        })
    }

    pub fn register_process(&self, bot_id: String, child: Child) -> Result<BotState, String> {
        let pid = child.id();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let mut procs = self.processes.lock().map_err(|e| e.to_string())?;
        procs.insert(
            bot_id.clone(),
            ManagedProcess {
                child,
                status: BotProcessStatus::Running,
                started_at: now,
            },
        );

        Ok(BotState {
            bot_id,
            status: BotProcessStatus::Running,
            pid: Some(pid),
            started_at: Some(now),
        })
    }

    pub fn stop_bot(&self, bot_id: &str) -> Result<(), String> {
        let mut procs = self.processes.lock().map_err(|e| e.to_string())?;
        let Some(mut p) = procs.remove(bot_id) else {
            return Ok(());
        };

        p.status = BotProcessStatus::Stopping;
        let pid = p.child.id();

        #[cfg(windows)]
        {
            let _ = Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .creation_flags(0x0800_0000)
                .status();
        }

        let _ = p.child.kill();
        let _ = p.child.wait();
        Ok(())
    }

    pub fn get_status(&self, bot_id: &str) -> Option<BotState> {
        let mut procs = self.processes.lock().ok()?;
        let p = procs.get_mut(bot_id)?;

        match p.child.try_wait() {
            Ok(Some(exit_status)) => {
                let crashed = !exit_status.success();
                p.status = if crashed {
                    BotProcessStatus::Crashed
                } else {
                    BotProcessStatus::Idle
                };
                Some(BotState {
                    bot_id: bot_id.to_string(),
                    status: p.status.clone(),
                    pid: None,
                    started_at: Some(p.started_at),
                })
            }
            Ok(None) => Some(BotState {
                bot_id: bot_id.to_string(),
                status: BotProcessStatus::Running,
                pid: Some(p.child.id()),
                started_at: Some(p.started_at),
            }),
            Err(_) => None,
        }
    }

    pub fn get_running_bots(&self) -> Vec<BotState> {
        let bot_ids: Vec<String> = {
            match self.processes.lock() {
                Ok(p) => p.keys().cloned().collect(),
                Err(_) => return vec![],
            }
        };

        bot_ids
            .iter()
            .filter_map(|id| self.get_status(id))
            .collect()
    }
}

#[cfg(windows)]
use std::os::windows::process::CommandExt;
