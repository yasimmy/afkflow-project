// Common utilities for bot logic
use std::time::Duration;
use std::thread;
use rand::Rng;

pub fn random_sleep(min_ms: u64, max_ms: u64) {
    let mut rng = rand::thread_rng();
    let sleep_time = rng.gen_range(min_ms..=max_ms);
    thread::sleep(Duration::from_millis(sleep_time));
}

pub fn safe_sleep(seconds: f64, check_interval_ms: u64) -> bool {
    let total_ms = (seconds * 1000.0) as u64;
    let mut elapsed = 0u64;
    
    while elapsed < total_ms {
        let sleep_time = std::cmp::min(check_interval_ms, total_ms - elapsed);
        thread::sleep(Duration::from_millis(sleep_time));
        elapsed += sleep_time;
    }
    
    true
}