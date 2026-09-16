// Anti-AFK bot logic - Real implementation with keyboard control
use super::common::safe_sleep;
use super::keyboard::{key_down, key_up, keys};
use super::{BotConfig, BotLogic};
use rand::Rng;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;

pub struct AntiAfkBot {
    running: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    fast_mode: bool,
    action_count: Arc<AtomicU32>,
}

impl AntiAfkBot {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            paused: Arc::new(AtomicBool::new(false)),
            fast_mode: false,
            action_count: Arc::new(AtomicU32::new(0)),
        }
    }
}

impl BotLogic for AntiAfkBot {
    fn start(&mut self, config: BotConfig) -> Result<(), String> {
        if self.running.load(Ordering::SeqCst) {
            return Err("Bot is already running".to_string());
        }

        self.fast_mode = config.fast_mode.unwrap_or(false);
        self.running.store(true, Ordering::SeqCst);
        self.paused.store(false, Ordering::SeqCst);
        self.action_count.store(0, Ordering::SeqCst);

        let running = self.running.clone();
        let paused = self.paused.clone();
        let fast_mode = self.fast_mode;
        let action_count = self.action_count.clone();

        std::thread::spawn(move || {
            let keys = [keys::W, keys::A, keys::S, keys::D];
            let time_between_keys = if fast_mode { (30, 60) } else { (300, 450) };
            let time_between_cycles = if fast_mode { (10, 30) } else { (60, 180) };

            // Initial delay
            safe_sleep(3.0, 100);

            while running.load(Ordering::SeqCst) {
                // Wait if paused
                while paused.load(Ordering::SeqCst) && running.load(Ordering::SeqCst) {
                    safe_sleep(0.5, 100);
                }

                if !running.load(Ordering::SeqCst) {
                    break;
                }

                let cycles = rand::thread_rng().gen_range(1..=6);
                
                for _ in 0..cycles {
                    if !running.load(Ordering::SeqCst) {
                        break;
                    }

                    while paused.load(Ordering::SeqCst) && running.load(Ordering::SeqCst) {
                        safe_sleep(0.5, 100);
                    }

                    if !running.load(Ordering::SeqCst) {
                        break;
                    }

                    let key = keys[rand::thread_rng().gen_range(0..keys.len())];
                    
                    // Press the key
                    key_down(key);
                    let duration = rand::thread_rng().gen_range(time_between_keys.0..=time_between_keys.1);
                    safe_sleep(duration as f64 / 1000.0, 10);
                    key_up(key);
                    
                    action_count.fetch_add(1, Ordering::SeqCst);
                    
                    let wait = rand::thread_rng().gen_range(time_between_keys.0..=time_between_keys.1);
                    safe_sleep(wait as f64 / 1000.0, 10);
                }

                if !running.load(Ordering::SeqCst) {
                    break;
                }

                let wait = rand::thread_rng().gen_range(time_between_cycles.0..=time_between_cycles.1);
                safe_sleep(wait as f64 / 1000.0, 100);
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

impl Default for AntiAfkBot {
    fn default() -> Self {
        Self::new()
    }
}