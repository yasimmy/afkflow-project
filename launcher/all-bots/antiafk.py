"""
Бот для предотвращения AFK (Anti-AFK)
"""

import sys
import random
import time
import math
from typing import List

from PyQt5.QtWidgets import (QApplication, QWidget, QVBoxLayout,
                             QLabel, QPushButton, QHBoxLayout, QCheckBox)
from PyQt5.QtCore import Qt, pyqtSignal, pyqtSlot

from components.base_bot import BaseWorker
from components.functions import press_key
from components.config_manager import config
from components.styles import BUTTON_STYLES, CHECKBOX_STYLES
from components.bot_overlay import (
    OVERLAY_STATUS_IDLE,
    OVERLAY_STATUS_PAUSE,
    OVERLAY_STATUS_READY,
    apply_overlay_window,
    build_overlay_chrome,
    overlay_mouse_move,
    overlay_mouse_press,
    overlay_mouse_release,
    overlay_status_style,
    paint_overlay_background,
    setup_overlay_hotkeys,
    stop_overlay_hotkeys,
)


class AntiAFKWorker(BaseWorker):
    """Рабочий поток для Anti-AFK"""
    
    state_changed = BaseWorker.status_updated
    
    def __init__(self):
        super().__init__()
        self._fast_mode = False
        
        self._keys: List[str] = ['w', 'a', 's', 'd']
        self._time_between_keys: tuple = (0.3, 0.45)
        self._time_between_cycles: tuple = (8, 10)
        self._clamping_time: dict = {
            'fast': (0.03, 0.06),
            'standard': (0.9, 1.0)
        }
    
    def set_fast_mode(self, enabled: bool) -> None:
        """Устанавливает быстрый режим"""
        self._fast_mode = enabled
    
    def run(self) -> None:
        """Основной цикл потока"""
        self.status_updated.emit("Двигаю клавиши")
        self.log_message.emit("Anti-AFK запущен")
        
        while self.is_running:
            if not self.wait_if_paused():
                break
            for _ in range(random.randint(1, 6)):
                if not self.is_running:
                    break
                if not self.wait_if_paused():
                    break
                
                mode = 'fast' if self._fast_mode else 'standard'
                self.status_updated.emit("Двигаю клавиши")
                press_key(random.choice(self._keys), self._clamping_time[mode])
                
                wait = random.uniform(*self._time_between_keys)
                self.safe_sleep(wait)
            
            if not self.is_running:
                break
            
            wait = random.uniform(*self._time_between_cycles)
            wait_until = time.monotonic() + wait
            last_remaining = None
            while self.is_running and time.monotonic() < wait_until:
                if not self.wait_if_paused():
                    break

                remaining = math.ceil(wait_until - time.monotonic())
                if remaining != last_remaining:
                    self.status_updated.emit(f"Жду {remaining} сек")
                    last_remaining = remaining
                self.msleep(100)
        
        self.status_updated.emit(OVERLAY_STATUS_IDLE)


class MainWindow(QWidget):
    """Оверлей Anti-AFK"""

    def __init__(self):
        super().__init__()
        self._worker = AntiAFKWorker()
        self._bot_active = False
        self._init_ui()
        self._worker.state_changed.connect(self._update_state_label)
        self._load_settings()
        setup_overlay_hotkeys(self, self._on_f7, self._on_f8)

    def _init_ui(self) -> None:
        self.setWindowTitle("AFK+")
        apply_overlay_window(self)
        chrome = build_overlay_chrome(self, "AFK+", "afk")
        self._overlay_status_label = chrome["status"]
        self._overlay_counter_label = chrome["counter"]

        self._settings_panel = QWidget()
        self._settings_panel.hide()
        settings_layout = QVBoxLayout(self._settings_panel)

        self._fast_mode_cb = QCheckBox("Быстрое зажатие клавиш")
        self._fast_mode_cb.setStyleSheet(CHECKBOX_STYLES["small"])
        self._fast_mode_cb.stateChanged.connect(self._toggle_fast_mode)
        settings_layout.addWidget(self._fast_mode_cb)

        self._toggle_btn = QPushButton("Ожидание F7")
        self._toggle_btn.setStyleSheet(BUTTON_STYLES["primary"])
        self._toggle_btn.setEnabled(False)
        self._toggle_btn.clicked.connect(self._toggle_bot)
        settings_layout.addWidget(self._toggle_btn)

    def _on_f7(self):
        if self._bot_active and getattr(self._worker, "_paused", False):
            self._worker.resume()
            self._set_overlay_status(OVERLAY_STATUS_READY)
            return
        if not self._bot_active:
            self._start_bot()

    def _on_f8(self):
        if self._bot_active and not getattr(self._worker, "_paused", False):
            self._worker.pause()
            self._set_overlay_status(OVERLAY_STATUS_PAUSE)

    def _set_overlay_status(self, text: str):
        self._overlay_status_label.setText(text)
        self._overlay_status_label.setStyleSheet(overlay_status_style(text))

    def _toggle_fast_mode(self, state: int) -> None:
        self._worker.set_fast_mode(state == Qt.Checked)

    def _toggle_bot(self) -> None:
        if self._bot_active:
            self._stop_bot()

    def _start_bot(self) -> None:
        if self._bot_active:
            return
        self._set_overlay_status("Запускаю")
        self._worker = AntiAFKWorker()
        self._worker.set_fast_mode(self._fast_mode_cb.isChecked())
        self._worker.state_changed.connect(self._update_state_label)
        self._bot_active = True
        self._overlay_counter_label.setText("0")
        self._toggle_btn.setText("Выключить")
        self._toggle_btn.setStyleSheet(BUTTON_STYLES["danger"])
        self._toggle_btn.setEnabled(True)
        self._worker.start()

    def _stop_bot(self) -> None:
        if not self._bot_active:
            return
        self._worker.stop()
        self._worker.wait()
        self._toggle_btn.setText("Включить")
        self._toggle_btn.setStyleSheet(BUTTON_STYLES["primary"])
        self._toggle_btn.setEnabled(False)
        self._bot_active = False
        self._set_overlay_status(OVERLAY_STATUS_IDLE)

    def _load_settings(self) -> None:
        fast_mode = config.get("antiafk", "fast_mode", False)
        self._fast_mode_cb.setChecked(fast_mode)
        self._worker.set_fast_mode(fast_mode)

    def _save_settings(self) -> None:
        config.set("antiafk", "fast_mode", self._fast_mode_cb.isChecked())

    @pyqtSlot(str)
    def _update_state_label(self, text: str) -> None:
        self._set_overlay_status(text if text else OVERLAY_STATUS_IDLE)

    def paintEvent(self, event):
        paint_overlay_background(self)

    def mousePressEvent(self, event):
        overlay_mouse_press(self, event)

    def mouseMoveEvent(self, event):
        overlay_mouse_move(self, event)

    def mouseReleaseEvent(self, event):
        overlay_mouse_release(self, event)

    def closeEvent(self, event) -> None:
        self._save_settings()
        if self._bot_active:
            self._worker.stop()
            self._worker.wait()
        stop_overlay_hotkeys(self)
        self._settings_panel.close()
        event.accept()


def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()