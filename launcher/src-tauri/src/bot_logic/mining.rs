// Mining bot logic - Real implementation
use super::common::safe_sleep;
use super::keyboard::{key_down, key_up, keys};
use super::{BotConfig, BotLogic};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;

pub struct MiningBot {
    running: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    action_count: Arc<AtomicU32>,
}

impl MiningBot {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            paused: Arc::new(AtomicBool::new(false)),
            action_count: Arc::new(AtomicU32::new(0)),
        }
    }
}

impl BotLogic for MiningBot {
    fn start(&mut self, config: BotConfig) -> Result<(), String> {
        if self.running.load(Ordering::SeqCst) {
            return Err("Bot is already running".to_string());
        }

        self.running.store(true, Ordering::SeqCst);
        self.paused.store(false, Ordering::SeqCst);
        self.action_count.store(0, Ordering::SeqCst);

        let running = self.running.clone();
        let paused = self.paused.clone();
        let action_count = self.action_count.clone();
        let delay = config.delay_between_presses as f64 / 1000.0;

        std::thread::spawn(move || {
            while running.load(Ordering::SeqCst) {
                while paused.load(Ordering::SeqCst) && running.load(Ordering::SeqCst) {
                    safe_sleep(0.5, 100);
                }

                if !running.load(Ordering::SeqCst) {
                    break;
                }

                key_down(keys::E);
                safe_sleep(delay, 10);
                key_up(keys::E);
                
                action_count.fetch_add(1, Ordering::SeqCst);
                safe_sleep(delay, 100);
            }
        });

        Ok(())
    }

    fn stop(&mut self) -> Result<(), String> {
        self.running.store(false, Ordering::SeqCst);
        self.paused.store(false, Ordering::SeqCst);
        Ok(())
    }

    fn pause(&mut self) -> Result<(), String> {
        if !self.running.load(Ordering::SeqCst) {
            return Err("Bot is not running".to_string());
        }
        self.paused.store(true, Ordering::SeqCst);
        Ok(())
    }

    fn resume(&mut self) -> Result<(), String> {
        if !self.running.load(Ordering::SeqCst) {
            return Err("Bot is not running".to_string());
        }
        self.paused.store(false, Ordering::SeqCst);
        Ok(())
    }

    fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    fn is_paused(&self) -> bool {
        self.paused.load(Ordering::SeqCst)
    }

    fn get_status(&self) -> String {
        if !self.running.load(Ordering::SeqCst) {
            "Остановлен".to_string()
        } else if self.paused.load(Ordering::SeqCst) {
            "Пауза".to_string()
        } else {
            "Запущен".to_string()
        }
    }

    fn get_action_count(&self) -> u32 {
        self.action_count.load(Ordering::SeqCst)
    }
}

impl Default for MiningBot {
    fn default() -> Self {
        Self::new()
    }
}