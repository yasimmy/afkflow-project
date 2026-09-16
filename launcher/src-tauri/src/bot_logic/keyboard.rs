// Keyboard control module for Afk Flow bots
// Provides cross-platform keyboard simulation using rdev

use rdev::{EventType, Key, simulate, Button};

pub fn press_key(key: Key, duration_ms: u64) {
    // Press key down
    simulate(&EventType::KeyPress(key)).ok();
    std::thread::sleep(std::time::Duration::from_millis(duration_ms));
    // Release key
    simulate(&EventType::KeyRelease(key)).ok();
}

pub fn key_down(key: Key) {
    simulate(&EventType::KeyPress(key)).ok();
}

pub fn key_up(key: Key) {
    simulate(&EventType::KeyRelease(key)).ok();
}

pub fn mouse_click(button: Button) {
    simulate(&EventType::ButtonPress(button)).ok();
    std::thread::sleep(std::time::Duration::from_millis(50));
    simulate(&EventType::ButtonRelease(button)).ok();
}

// Key mappings matching the Python bot implementations
pub mod keys {
    use rdev::Key;
    
    pub const RETURN: Key = Key::Return;
    pub const SPACE: Key = Key::Space;
    pub const ESCAPE: Key = Key::Escape;
    
    // Letter keys
    pub const A: Key = Key::KeyA;
    pub const B: Key = Key::KeyB;
    pub const C: Key = Key::KeyC;
    pub const D: Key = Key::KeyD;
    pub const E: Key = Key::KeyE;
    pub const F: Key = Key::KeyF;
    pub const G: Key = Key::KeyG;
    pub const H: Key = Key::KeyH;
    pub const I: Key = Key::KeyI;
    pub const J: Key = Key::KeyJ;
    pub const K: Key = Key::KeyK;
    pub const L: Key = Key::KeyL;
    pub const M: Key = Key::KeyM;
    pub const N: Key = Key::KeyN;
    pub const O: Key = Key::KeyO;
    pub const P: Key = Key::KeyP;
    pub const Q: Key = Key::KeyQ;
    pub const R: Key = Key::KeyR;
    pub const S: Key = Key::KeyS;
    pub const T: Key = Key::KeyT;
    pub const U: Key = Key::KeyU;
    pub const V: Key = Key::KeyV;
    pub const W: Key = Key::KeyW;
    pub const X: Key = Key::KeyX;
    pub const Y: Key = Key::KeyY;
    pub const Z: Key = Key::KeyZ;
    
    // Number keys
    pub const NUM0: Key = Key::Num0;
    pub const NUM1: Key = Key::Num1;
    pub const NUM2: Key = Key::Num2;
    pub const NUM3: Key = Key::Num3;
    pub const NUM4: Key = Key::Num4;
    pub const NUM5: Key = Key::Num5;
    pub const NUM6: Key = Key::Num6;
    pub const NUM7: Key = Key::Num7;
    pub const NUM8: Key = Key::Num8;
    pub const NUM9: Key = Key::Num9;
}