// Bot logic modules for Afk Flow
// Real implementation with keyboard control

pub mod anti_afk;
pub mod lucky_wheel;
pub mod cooking;
pub mod gym;
pub mod builder;
pub mod port;
pub mod mining;
pub mod farm_cows;
pub mod turner;
pub mod seamstress;

pub mod keyboard;
pub mod common;

pub use anti_afk::AntiAfkBot;
pub use lucky_wheel::LuckyWheelBot;
pub use cooking::CookingBot;
pub use gym::GymBot;
pub use builder::BuilderBot;
pub use port::PortBot;
pub use mining::MiningBot;
pub use farm_cows::FarmCowsBot;
pub use turner::TurnerBot;
pub use seamstress::SeamstressBot;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BotConfig {
    pub resolution_mode: String,
    pub delay_between_presses: i32,
    pub color_tolerance: i32,
    pub counter_visible: bool,
    pub fast_mode: Option<bool>,
    pub cycles: Option<i32>,
    pub auto_run: Option<bool>,
    pub vertical_offset: Option<i32>,
    pub horizontal_offset: Option<i32>,
    pub total_time_sec: Option<i32>,
}

impl Default for BotConfig {
    fn default() -> Self {
        Self {
            resolution_mode: "FullHD".to_string(),
            delay_between_presses: 120,
            color_tolerance: 10,
            counter_visible: false,
            fast_mode: None,
            cycles: None,
            auto_run: None,
            vertical_offset: None,
            horizontal_offset: None,
            total_time_sec: None,
        }
    }
}

pub trait BotLogic {
    fn start(&mut self, config: BotConfig) -> Result<(), String>;
    fn stop(&mut self) -> Result<(), String>;
    fn pause(&mut self) -> Result<(), String>;
    fn resume(&mut self) -> Result<(), String>;
    fn is_running(&self) -> bool;
    fn is_paused(&self) -> bool;
    fn get_status(&self) -> String;
    fn get_action_count(&self) -> u32;
}