// Gym bot logic - Real implementation with keyboard control
use super::common::safe_sleep;
use super::keyboard::{key_down, key_up, keys};
use super::{BotConfig, BotLogic};
use rand::Rng;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;

pub struct GymBot {
    running: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    action_count: Arc<AtomicU32>,
    cycles: i32,
    espander: bool,
    espander_bind: String,
}

impl GymBot {
    pub fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            paused: Arc::new(AtomicBool::new(false)),
            action_count: Arc::new(AtomicU32::new(0)),
            cycles: 0,
            espander: false,
            espander_bind: "p".to_string(),
        }
    }
}

impl BotLogic for GymBot {
    fn start(&mut self, config: BotConfig) -> Result<(), String> {
        if self.running.load(Ordering::SeqCst) {
            return Err("Bot is already running".to_string());
        }

        self.cycles = config.cycles.unwrap_or(0);
        self.espander = false; // Would be extracted from config
        self.espander_bind = "p".to_string(); // Would be extracted from config
        
        self.running.store(true, Ordering::SeqCst);
        self.paused.store(false, Ordering::SeqCst);
        self.action_count.store(0, Ordering::SeqCst);

        let running = self.running.clone();
        let paused = self.paused.clone();
        let action_count = self.action_count.clone();
        let cycles = self.cycles;
        let espander = self.espander;
        let espander_bind = self.espander_bind.clone();

        std::thread::spawn(move || {
            let mut current_cycle = 0;
            
            while running.load(Ordering::SeqCst) {
                // Wait if paused
                while paused.load(Ordering::SeqCst) && running.load(Ordering::SeqCst) {
                    safe_sleep(0.5, 100);
                }

                if !running.load(Ordering::SeqCst) {
                    break;
                }

                if cycles > 0 && current_cycle >= cycles {
                    break;
                }
                
                // Gym training logic - simulate key presses
                let keys = [keys::NUM1, keys::NUM2, keys::NUM3, keys::NUM4, keys::NUM5];
                let key = keys[rand::thread_rng().gen_range(0..keys.len())];
                
                key_down(key);
                safe_sleep(0.1, 10);
                key_up(key);
                
                action_count.fetch_add(1, Ordering::SeqCst);
                current_cycle += 1;
                
                // Wait between cycles
                let wait = rand::thread_rng().gen_range(2000..=5000);
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

impl Default for GymBot {
    fn default() -> Self {
        Self::new()
    }
}