"""
Бот для автоматизации порта
"""

import sys
import time
import threading
import ctypes
from typing import Optional

import pyautogui
from PyQt5.QtWidgets import QApplication, QVBoxLayout, QFrame, QHBoxLayout, QCheckBox, QLabel
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QKeySequence
from PyQt5.QtWidgets import QShortcut

from components.base_bot import BaseBotApp, BaseWorker
from components.functions import check_color, press_key
from components.colors import colors
from components.coordinates import port_coordinate
from components.config_manager import config
from components.styles import FRAME_STYLES, BUTTON_STYLES, LABEL_STYLES, CHECKBOX_STYLES
from components.constants import PRESS_KEY_DURATION

# Пытаемся импортировать pydirectinput (лучше для игр)
try:
    import pydirectinput
    pydirectinput.PAUSE = 0
    INPUT_LIB = pydirectinput
except ImportError:
    INPUT_LIB = pyautogui
    INPUT_LIB.PAUSE = 0

# Пробуем разные библиотеки для глобального хука
KEYBOARD_AVAILABLE = False
KEYBOARD_LIB = None
INPUT_CONTROLLER = None
WINDOWS_SCAN_CODES = {"shift": 0x2A, "w": 0x11}

try:
    from pynput import keyboard as pynput_keyboard
    KEYBOARD_AVAILABLE = True
    KEYBOARD_LIB = "pynput"
    INPUT_CONTROLLER = pynput_keyboard.Controller()
    print("Используется pynput для глобальных хуков")
except ImportError:
    try:
        import keyboard
        KEYBOARD_AVAILABLE = True
        KEYBOARD_LIB = "keyboard"
        print("Используется keyboard для глобальных хуков")
    except ImportError:
        print("⚠️ Ни одна библиотека для глобальных хуков не установлена")
        print("Установите: pip install pynput")
        KEYBOARD_AVAILABLE = False


def _key_value(key: str):
    if key == "shift" and INPUT_CONTROLLER is not None:
        return pynput_keyboard.Key.shift
    return key


def _key_down(key: str) -> None:
    if sys.platform == "win32" and key in WINDOWS_SCAN_CODES:
        ctypes.windll.user32.keybd_event(
            0,
            WINDOWS_SCAN_CODES[key],
            0x0008,
            0,
        )
        return
    if INPUT_CONTROLLER is not None:
        INPUT_CONTROLLER.press(_key_value(key))
    else:
        INPUT_LIB.keyDown(key)


def _key_up(key: str) -> None:
    if sys.platform == "win32" and key in WINDOWS_SCAN_CODES:
        ctypes.windll.user32.keybd_event(
            0,
            WINDOWS_SCAN_CODES[key],
            0x0008 | 0x0002,
            0,
        )
        return
    if INPUT_CONTROLLER is not None:
        INPUT_CONTROLLER.release(_key_value(key))
    else:
        INPUT_LIB.keyUp(key)


class PortWorker(BaseWorker):
    """Рабочий поток для порта"""
    
    def __init__(self, resolution_mode: str):
        super().__init__()
        self._resolution_mode = resolution_mode
        self._green_color = colors.color["light_green"]
        self._last_click_time = 0  # Время последнего клика
        self._click_cooldown = 0.2  # 200 мс задержка после клика
        self._marker_was_detected = False
    
    def run(self) -> None:
        """Основной цикл потока"""
        self.log_message.emit("Запуск потока порта")
        self.status_updated.emit("Ищу зелёный")
        
        while self.is_running:
            if not self.wait_if_paused():
                break
            try:
                if self._resolution_mode in port_coordinate:
                    coords = port_coordinate[self._resolution_mode].get("port_marker")
                    marker_detected = bool(coords and check_color(coords, self._green_color))
                    if marker_detected and not self._marker_was_detected:
                        self.status_updated.emit("Готово к нажатию")
                    marker_disappeared = self._marker_was_detected and not marker_detected
                    self._marker_was_detected = marker_detected
                    if marker_detected:
                        current_time = time.time()
                        
                        # Проверяем, прошло ли достаточно времени с последнего клика
                        if current_time - self._last_click_time >= self._click_cooldown:
                            self.status_updated.emit("Нажимаю E")
                            if not self.wait_if_paused():
                                break
                            press_key("e", boundary=PRESS_KEY_DURATION)
                            self.log_message.emit("Нажата клавиша E (обнаружен зелёный цвет)")
                            self.action_completed.emit()
                            self._last_click_time = current_time
                            
                            # Небольшая дополнительная задержка, чтобы избежать повторного срабатывания
                            time.sleep(0.05)
                    elif marker_disappeared:
                        self.status_updated.emit("Ищу зелёный")
            except Exception as e:
                self.log_message.emit(f"ОШИБКА: {e}")
            
            self.msleep(10)
        
        self.log_message.emit("Поток порта остановлен")


class PortApp(BaseBotApp):
    """Приложение для автоматизации порта"""
    
    def __init__(self):
        # Сначала создаем атрибуты
        self._auto_run_checkbox = None
        self._f7_shortcut = None
        self._f8_shortcut = None
        self._autorun_status = None
        self._status_timer = None
        
        # Состояние автобега
        self._autorun_enabled = False
        self._autorun_thread = None
        self._autorun_stop = False
        
        # Для глобальных хуков
        self._global_listener = None
        self._hook_thread = None
        
        # Вызываем родительский __init__
        super().__init__(
            title="Порт",
            window_width=550,
            window_height=500,
            has_resolution=True,
            has_delay=False,
            has_log=True,
            has_counter=True,
            overlay_icon="boat"
        )
        
        # Запускаем таймер синхронизации после создания UI
        self._status_timer = QTimer()
        self._status_timer.timeout.connect(self._sync_ui_state)
        self._status_timer.start(500)
    
    def _setup_global_hooks(self):
        """Устанавливает глобальные хуки на F7 и F8"""
        if not KEYBOARD_AVAILABLE:
            self._add_log("⚠️ Для работы F7/F8 вне фокуса установите: pip install pynput")
            return
        
        try:
            if KEYBOARD_LIB == "pynput":
                self._setup_pynput_hooks()
            elif KEYBOARD_LIB == "keyboard":
                self._setup_keyboard_hooks()
        except Exception as e:
            self._add_log(f"❌ Ошибка установки глобальных хуков: {e}")
    
    def _setup_pynput_hooks(self):
        """Устанавливает хуки через pynput"""
        def on_press(key):
            try:
                # Проверяем F7
                if hasattr(key, 'vk') and key.vk == 0x76:  # VK_F7
                    self._add_log("🔧 Обнаружено нажатие F7 (глобально)")
                    QTimer.singleShot(0, self._on_overlay_f7)
                elif hasattr(key, 'vk') and key.vk == 0x77:  # VK_F8
                    self._add_log("🔧 Обнаружено нажатие F8 (глобально)")
                    QTimer.singleShot(0, self._on_overlay_f8)
                # Альтернативный способ проверки
                elif hasattr(key, 'name'):
                    if key.name == 'f7':
                        self._add_log("🔧 Обнаружено нажатие F7 (глобально)")
                        QTimer.singleShot(0, self._on_overlay_f7)
                    elif key.name == 'f8':
                        self._add_log("🔧 Обнаружено нажатие F8 (глобально)")
                        QTimer.singleShot(0, self._on_overlay_f8)
            except Exception as e:
                self._add_log(f"Ошибка в обработчике клавиш: {e}")
        
        # Запускаем слушатель в отдельном потоке
        self._global_listener = pynput_keyboard.Listener(on_press=on_press)
        self._global_listener.daemon = True
        self._global_listener.start()
        self._add_log("✅ Глобальные слушатели F7/F8 запущены (через pynput)")
    
    def _setup_keyboard_hooks(self):
        """Устанавливает хуки через keyboard (старый способ)"""
        try:
            import keyboard
            keyboard.add_hotkey('f7', lambda: QTimer.singleShot(0, self._on_overlay_f7))
            keyboard.add_hotkey('f8', lambda: QTimer.singleShot(0, self._on_overlay_f8))
            self._add_log("✅ Глобальные слушатели F7/F8 запущены (через keyboard)")
        except Exception as e:
            self._add_log(f"❌ Ошибка хуков keyboard: {e}")
    
    def _autorun_worker(self):
        """Поток автобега - просто зажимает клавиши"""
        self._add_log("🔧 Поток автобега запущен, зажимаем Shift+W")
        keys_pressed = []
        try:
            _key_down('shift')
            keys_pressed.append('shift')
            time.sleep(0.05)
            _key_down('w')
            keys_pressed.append('w')

            while not self._autorun_stop:
                time.sleep(0.1)
        except Exception as error:
            self._add_log(f"ОШИБКА автобега: {error}")
        finally:
            for key in reversed(keys_pressed):
                try:
                    _key_up(key)
                except Exception as error:
                    self._add_log(f"ОШИБКА освобождения {key}: {error}")
            self._add_log("🔧 Поток автобега остановлен, клавиши отпущены")
    
    def _start_autorun(self):
        """Включить автобег"""
        self._add_log(f"🔧 _start_autorun вызван, текущее состояние: {self._autorun_enabled}")
        
        if self._autorun_enabled:
            self._add_log("ℹ️ Автобег уже включен")
            return

        if not self._running:
            self._add_log("ℹ️ Автобег будет включен после нажатия F7")
            return
        
        self._autorun_enabled = True
        self._autorun_stop = False
        self._autorun_thread = threading.Thread(target=self._autorun_worker, daemon=True)
        self._autorun_thread.start()
        self._update_status("Автобег")

        self._add_log("✅ Автобег ВКЛЮЧЕН (Shift + W зажаты)")
        self._update_autorun_status()

        if self._auto_run_checkbox:
            self._auto_run_checkbox.blockSignals(True)
            self._auto_run_checkbox.setChecked(True)
            self._auto_run_checkbox.blockSignals(False)

    def _stop_autorun(self):
        """Останавливает автобег и гарантированно отпускает Shift и W."""
        self._autorun_enabled = False
        self._autorun_stop = True

        if self._autorun_thread:
            self._autorun_thread.join(timeout=1.0)
            self._autorun_thread = None

        for key in ('w', 'shift'):
            try:
                _key_up(key)
            except Exception as error:
                self._add_log(f"ОШИБКА освобождения {key}: {error}")

        self._update_autorun_status()

    def _sync_ui_state(self):
        """Синхронизирует индикатор автобега без запуска до F7."""
        if not self._running:
            self._update_autorun_status()
            return

        self._update_autorun_status()

    def _update_autorun_status(self):
        """Обновляет индикатор состояния автобега в панели настроек."""
        if not self._autorun_status:
            return

        if self._autorun_enabled:
            self._autorun_status.setText("● Автобег включён")
            self._autorun_status.setStyleSheet(
                "color: #4CAF50; font-size: 11px; font-weight: bold;"
            )
        else:
            self._autorun_status.setText("● Автобег выключен")
            self._autorun_status.setStyleSheet(
                "color: #888888; font-size: 11px;"
            )
    
    def _add_custom_settings(self, parent_layout: QVBoxLayout) -> None:
        """Добавляет фрейм автобега"""
        auto_run_frame = QFrame()
        auto_run_frame.setStyleSheet(FRAME_STYLES["frame"])
        auto_run_layout = QVBoxLayout(auto_run_frame)
        auto_run_layout.setContentsMargins(15, 10, 15, 10)
        
        # Чекбокс с горячей клавишей
        checkbox_layout = QHBoxLayout()
        self._auto_run_checkbox = QCheckBox("Автобег (Shift + W)")
        self._auto_run_checkbox.setStyleSheet(CHECKBOX_STYLES["standard"])
        self._auto_run_checkbox.stateChanged.connect(self._on_auto_run_toggled)
        checkbox_layout.addWidget(self._auto_run_checkbox)
        
        auto_run_layout.addLayout(checkbox_layout)
        
        # Статус автобега
        self._autorun_status = QLabel("● Автобег выключен")
        self._autorun_status.setStyleSheet("color: #888888; font-size: 11px;")
        self._autorun_status.setAlignment(Qt.AlignCenter)
        auto_run_layout.addWidget(self._autorun_status)
        
        parent_layout.addWidget(auto_run_frame)
        
        # Информационная метка о боте
        info_label = QLabel("Бот будет нажимать E при обнаружении зелёного цвета")
        info_label.setStyleSheet(LABEL_STYLES["muted"])
        info_label.setAlignment(Qt.AlignCenter)
        info_label.setWordWrap(True)
        parent_layout.addWidget(info_label)
    
    def _on_auto_run_toggled(self, state: int):
        """Обработчик чекбокса автобега"""
        enabled = (state == Qt.Checked)
        
        if enabled != self._autorun_enabled:
            if enabled:
                self._start_autorun()
            else:
                self._stop_autorun()

    def _on_overlay_f7(self) -> None:
        if self._running and self._worker and getattr(self._worker, "_paused", False):
            self.resume()
            if self._auto_run_checkbox and self._auto_run_checkbox.isChecked():
                self._start_autorun()
            return

        if not self._running:
            super()._on_overlay_f7()
            if self._auto_run_checkbox and self._auto_run_checkbox.isChecked():
                self._start_autorun()

    def _on_overlay_f8(self) -> None:
        autorun_was_enabled = self._autorun_enabled
        if self._autorun_enabled:
            self._stop_autorun()
            if autorun_was_enabled and self._auto_run_checkbox:
                self._auto_run_checkbox.blockSignals(True)
                self._auto_run_checkbox.setChecked(True)
                self._auto_run_checkbox.blockSignals(False)
        super()._on_overlay_f8()

    def _stop_bot(self) -> None:
        self._stop_autorun()
        super()._stop_bot()
    
    def _get_counter_text(self) -> str:
        return "Коробок:"
    
    def _create_worker(self) -> Optional[BaseWorker]:
        return PortWorker(self._resolution_mode)
    
    def _start_bot(self) -> None:
        """Запускает бота"""
        super()._start_bot()
        
        self._worker = self._create_worker()
        if self._worker:
            self._worker.action_completed.connect(self._increment_counter)
            self._worker.log_message.connect(self._add_log)
            self._worker.status_updated.connect(self._update_status)
            self._worker.start()
            self._add_log(f"Запуск порта. Разрешение: {self._resolution_mode}")
            if self._auto_run_checkbox and self._auto_run_checkbox.isChecked():
                self._start_autorun()
    
    def _load_settings(self) -> None:
        """Загружает сохраненные настройки"""
        self._resolution_mode = config.get("port", "resolution_mode", "FullHD")
        auto_run = config.get("port", "auto_run", False)
        
        self._set_resolution(self._resolution_mode)
        
        if self._auto_run_checkbox:
            self._auto_run_checkbox.blockSignals(True)
            self._auto_run_checkbox.setChecked(auto_run)
            self._auto_run_checkbox.blockSignals(False)
        
        counter_visible = config.get("port", "counter_visible", False)
        if counter_visible and self._counter_window and self._counter_btn:
            self._counter_window.show()
            self._counter_btn.setText("Скрыть счётчик")
    
    def _save_settings(self) -> None:
        """Сохраняет текущие настройки"""
        config.set_multiple("port", {
            "resolution_mode": self._resolution_mode,
            "auto_run": self._auto_run_checkbox.isChecked() if self._auto_run_checkbox else False,
            "counter_visible": self._counter_window.isVisible() if self._counter_window else False
        })
    
    def closeEvent(self, event) -> None:
        """Обработчик закрытия окна"""
        if self._status_timer:
            self._status_timer.stop()
        
        self._stop_autorun()
        
        # Останавливаем глобальный слушатель
        if self._global_listener:
            try:
                self._global_listener.stop()
            except:
                pass
        
        if self._f7_shortcut:
            self._f7_shortcut.activated.disconnect()
        
        if self._f8_shortcut:
            self._f8_shortcut.activated.disconnect()
        
        super().closeEvent(event)


def main():
    app = QApplication(sys.argv)
    window = PortApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()