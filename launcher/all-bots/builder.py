"""
Бот для автоматизации строительства
"""

import os
import sys
import time
import random
import threading
import ctypes
from typing import Optional

from PyQt5.QtWidgets import QVBoxLayout, QLabel, QFrame, QWidget, QHBoxLayout, QCheckBox
from PyQt5.QtCore import Qt, QTimer

from components.base_bot import BaseBotApp, BaseWorker
from components.functions import press_key, check_color
from components.colors import colors
from components.coordinates import builder_coordinate
from components.config_manager import config
from components.image_processor import OptimizedImageFinder
from components.styles import FRAME_STYLES, BUTTON_STYLES, LABEL_STYLES, INPUT_STYLES
from components.constants import (
    PRESS_KEY_DURATION,
    ACTION_TIMEOUT,
    DEFAULT_DELAY_BUILDER,
    COLOR_TOLERANCE_NORMAL,
    IMAGE_CONFIDENCE_STRICT,
    SMOOTHING_SIZE,
    COLOR_LIGHT_GREEN
)
from components.bot_overlay import stop_overlay_hotkeys


# Путь к папке с изображениями клавиш
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

KEYS_DIR = os.path.join(BASE_DIR, 'assets', 'keys')

try:
    from pynput import keyboard as builder_keyboard
except ImportError:
    builder_keyboard = None

BUILDER_SCAN_CODES = {'shift': 0x2A, 'w': 0x11}


def _hold_builder_key(key: str) -> None:
    if sys.platform == 'win32' and key in BUILDER_SCAN_CODES:
        ctypes.windll.user32.keybd_event(0, BUILDER_SCAN_CODES[key], 0x0008, 0)
        return
    import pyautogui
    pyautogui.keyDown(key)


def _release_builder_key(key: str) -> None:
    if sys.platform == 'win32' and key in BUILDER_SCAN_CODES:
        ctypes.windll.user32.keybd_event(0, BUILDER_SCAN_CODES[key], 0x0008 | 0x0002, 0)
        return
    import pyautogui
    pyautogui.keyUp(key)


class BuilderWorker(BaseWorker):
    """Рабочий поток для строительства"""
    
    def __init__(self, resolution_mode: str, delay_between_presses: int, color_tolerance: int = COLOR_TOLERANCE_NORMAL):
        super().__init__()
        self._resolution_mode = resolution_mode
        self._delay_between_presses = delay_between_presses / 1000.0
        self._color_tolerance = color_tolerance
        
        self._builder_coords = {
            "FullHD": builder_coordinate["FullHD"].get("builder_marker", (765, 496)),
            "QuadHD": builder_coordinate["QuadHD"].get("builder_marker", (1084, 674))
        }
        
        self._target_color = COLOR_LIGHT_GREEN
        self._current_key: Optional[str] = None
        self._is_processing = False
        self._image_finder: Optional[OptimizedImageFinder] = None
        
        # Область поиска для клавиш (расширенная область)
        self._search_area = (700, 400, 1300, 800)  # left, top, right, bottom
        
    def run(self) -> None:
        """Основной цикл потока"""
        self.log_message.emit("Запуск потока строительства")
        self.status_updated.emit("Ищу зелёный")
        
        # Проверяем наличие папки с изображениями
        if not os.path.exists(KEYS_DIR):
            self.log_message.emit(f"ОШИБКА: Папка с изображениями не найдена: {KEYS_DIR}")
            self.status_updated.emit("Ошибка")
            return
        
        # Проверяем наличие файлов клавиш
        required_keys = ['e.png', 'f.png', 'h.png']
        missing_keys = []
        for key in required_keys:
            key_path = os.path.join(KEYS_DIR, key)
            if not os.path.exists(key_path):
                missing_keys.append(key)
        
        if missing_keys:
            self.log_message.emit(f"ОШИБКА: Отсутствуют файлы: {', '.join(missing_keys)}")
            self.status_updated.emit("Ошибка")
            return
        
        # Инициализация поисковика с областью поиска
        self._image_finder = OptimizedImageFinder(
            confidence=IMAGE_CONFIDENCE_STRICT,
            smoothing=True,
            smoothing_size=SMOOTHING_SIZE,
            search_area=self._search_area
        )
        
        self.log_message.emit(f"Поиск клавиш в области: {self._search_area}")
        
        while self.is_running:
            if not self.wait_if_paused():
                break
            # Проверяем наличие зеленого цвета
            green_detected = self._check_green_color()
            
            if green_detected:
                # Если зеленый цвет есть, но мы еще не обрабатываем - начинаем обработку
                if not self._is_processing:
                    self._is_processing = True
                    self.status_updated.emit("Определяю клавишу")
                    self.log_message.emit("Зеленый цвет обнаружен, начинаю обработку")
                    
                    # Определяем клавишу один раз в начале действия
                    self._current_key = self._detect_which_key()
                    
                    if self._current_key is None:
                        self.status_updated.emit("Клавиша не найдена")
                        self.log_message.emit("ОШИБКА: Не удалось определить клавишу")
                        self._is_processing = False
                        self.msleep(100)
                        continue
                    
                    self.log_message.emit(f"Определена клавиша: {self._current_key.upper()}")
                    self.status_updated.emit(f"Нажимаю {self._current_key.upper()}")
                
                # Пока есть зеленый цвет - нажимаем клавишу с заданной периодичностью
                if self._current_key:
                    if not self.wait_if_paused():
                        break
                    press_key(self._current_key, boundary=PRESS_KEY_DURATION)
                    # Задержка между нажатиями + случайная погрешность
                    delay = self._delay_between_presses + random.uniform(0.005, 0.025)
                    time.sleep(delay)
            
            else:
                # Зеленый цвет пропал
                if self._is_processing:
                    # Завершаем действие и увеличиваем счетчик
                    self._is_processing = False
                    self._current_key = None
                    self.action_completed.emit()
                    self.status_updated.emit("Готово")
                    self.log_message.emit("Зеленый цвет пропал, +1 к счетчику")
                else:
                    # Небольшая пауза для снижения нагрузки CPU
                    self.msleep(50)
            
            # Небольшая пауза между итерациями цикла
            self.msleep(10)
        
        self._cleanup()
        self.log_message.emit("Поток строительства остановлен")
    
    def _check_green_color(self) -> bool:
        """Проверяет наличие зеленого цвета"""
        x, y = self._builder_coords[self._resolution_mode]
        return check_color((x, y), self._target_color, self._color_tolerance)
    
    def _detect_which_key(self) -> Optional[str]:
        """Определяет, какую клавишу нужно нажимать"""
        if not self._image_finder:
            self.log_message.emit("ОШИБКА: ImageFinder не инициализирован")
            return None
        
        # Список клавиш для проверки в порядке приоритета
        keys_to_check = ['e', 'f', 'h']
        
        for key in keys_to_check:
            image_path = os.path.join(KEYS_DIR, f'{key}.png')
            if not os.path.exists(image_path):
                continue
            
            result = self._image_finder.find_image(image_path)
            
            if result:
                x, y, confidence = result
                self.log_message.emit(f"Обнаружено изображение: {key}.png (уверенность: {confidence:.2f})")
                return key
        
        # Если не нашли через image finder, пробуем альтернативный метод
        self.log_message.emit("Поиск по изображениям не дал результатов, пробую альтернативный метод...")
        alt_key = self._detect_key_by_color()
        if alt_key:
            return alt_key
        
        return None
    
    def _detect_key_by_color(self) -> Optional[str]:
        """
        Альтернативный метод определения клавиши по цвету в области
        """
        try:
            # Координаты областей для разных клавиш (относительные)
            if self._resolution_mode == "FullHD":
                key_areas = {
                    'e': (800, 540),
                    'f': (900, 540),
                    'h': (1000, 540)
                }
            else:  # QuadHD
                key_areas = {
                    'e': (1100, 720),
                    'f': (1200, 720),
                    'h': (1300, 720)
                }
            
            # Ищем белый цвет (клавиши обычно белые или светлые)
            for key, pos in key_areas.items():
                if check_color(pos, (255, 255, 255), tolerance=40):
                    self.log_message.emit(f"Альтернативное определение: клавиша {key.upper()} по цвету")
                    return key
            
            return None
        except Exception as e:
            self.log_message.emit(f"Ошибка в альтернативном определении: {e}")
            return None
    
    def _cleanup(self) -> None:
        """Очистка ресурсов"""
        if self._image_finder:
            self._image_finder.close()


class BuilderApp(BaseBotApp):
    """Приложение для автоматизации строительства"""
    
    def __init__(self):
        self._autorun_enabled = False
        self._autorun_stop = False
        self._autorun_thread = None
        self._auto_run_checkbox = None
        self._builder_hotkey_listener = None
        super().__init__(
            title="Стройка",
            window_width=550,
            window_height=525,
            has_resolution=True,
            has_delay=True,
            has_log=True,
            has_counter=True,
            overlay_icon="crane"
        )
        stop_overlay_hotkeys(self)
        self._setup_builder_hotkeys()
        self._color_tolerance = COLOR_TOLERANCE_NORMAL
        self._detection_label: Optional[QLabel] = None
        self._info_label: Optional[QLabel] = None

    def _setup_builder_hotkeys(self) -> None:
        if builder_keyboard is None:
            print("[Builder] pynput недоступен, резервный F7 отключён")
            return

        def on_press(key):
            try:
                vk = getattr(key, "vk", None)
                name = getattr(key, "name", "")
                if key == builder_keyboard.Key.f7 or vk == 0x76 or name == "f7":
                    print("[Builder] F7 получен")
                    self._on_overlay_f7()
                elif key == builder_keyboard.Key.f8 or vk == 0x77 or name == "f8":
                    print("[Builder] F8 получен")
                    self._on_overlay_f8()
            except Exception as error:
                print(f"[Builder hotkey] {error}")

        self._builder_hotkey_listener = builder_keyboard.Listener(on_press=on_press)
        self._builder_hotkey_listener.daemon = True
        self._builder_hotkey_listener.start()
        print("[Builder] резервный F7/F8 listener запущен")
    
    def _add_custom_settings(self, parent_layout: QVBoxLayout) -> None:
        """Добавляет фрейм с информацией о детекции"""
        detection_frame = QFrame()
        detection_frame.setStyleSheet(FRAME_STYLES["frame"])
        detection_layout = QVBoxLayout(detection_frame)
        detection_layout.setContentsMargins(15, 10, 15, 10)
        
        self._detection_label = QLabel("Обнаружено: ничего")
        self._detection_label.setStyleSheet("""
            QLabel {
                color: #ffffff;
                font-size: 13px;
                padding: 8px;
                background-color: #3c3c3c;
                border-radius: 8px;
                font-weight: bold;
            }
        """)
        self._detection_label.setAlignment(Qt.AlignCenter)
        detection_layout.addWidget(self._detection_label)
        
        info_title = QLabel("Параметры детекции:")
        info_title.setStyleSheet(LABEL_STYLES["secondary"])
        info_title.setAlignment(Qt.AlignCenter)
        detection_layout.addWidget(info_title)
        
        target_color = COLOR_LIGHT_GREEN
        coords = builder_coordinate["FullHD"]["builder_marker"]
        self._info_label = QLabel(f"Цвет: RGB{target_color}, Координаты: {coords}\nОбласть поиска клавиш: 700-1300 x 400-800")
        self._info_label.setStyleSheet(LABEL_STYLES["muted"])
        self._info_label.setAlignment(Qt.AlignCenter)
        self._info_label.setWordWrap(True)
        detection_layout.addWidget(self._info_label)
        
        parent_layout.addWidget(detection_frame)
        autorun_frame = QFrame()
        autorun_frame.setStyleSheet(FRAME_STYLES["frame"])
        autorun_layout = QHBoxLayout(autorun_frame)
        autorun_layout.setContentsMargins(15, 8, 15, 8)
        self._auto_run_checkbox = QCheckBox("Автобег (Shift + W)")
        self._auto_run_checkbox.setStyleSheet("color: #ffffff;")
        self._auto_run_checkbox.stateChanged.connect(self._on_auto_run_toggled)
        autorun_layout.addWidget(self._auto_run_checkbox)
        parent_layout.addWidget(autorun_frame)
        self._check_keys_folder()

    def _autorun_worker(self):
        pressed_keys = []
        try:
            self._add_log("Автобег Builder: зажимаю Shift")
            _hold_builder_key('shift')
            pressed_keys.append('shift')
            time.sleep(0.05)
            self._add_log("Автобег Builder: зажимаю W")
            _hold_builder_key('w')
            pressed_keys.append('w')
            self._add_log("Автобег Builder: Shift+W зажаты")
            while not self._autorun_stop:
                time.sleep(0.1)
        except Exception as error:
            self._add_log(f"ОШИБКА автобега Builder: {error}")
            print(f"[Builder autorun] {error}")
        finally:
            for key in reversed(pressed_keys):
                try:
                    _release_builder_key(key)
                except Exception as error:
                    self._add_log(f"ОШИБКА освобождения {key}: {error}")
            self._autorun_enabled = False

    def _start_autorun(self):
        if self._autorun_enabled or not self._running:
            return
        self._add_log("Автобег Builder: запуск Shift+W")
        print("[Builder] Автобег: зажимаю Shift+W")
        self._autorun_enabled = True
        self._autorun_stop = False
        self._autorun_thread = threading.Thread(target=self._autorun_worker, daemon=True)
        self._autorun_thread.start()
        self._update_status("Автобег")

    def _stop_autorun(self):
        self._autorun_enabled = False
        self._autorun_stop = True
        if self._autorun_thread:
            self._autorun_thread.join(timeout=1.0)
            self._autorun_thread = None
        for key in ('w', 'shift'):
            try:
                _release_builder_key(key)
            except Exception:
                pass

    def _on_auto_run_toggled(self, state: int):
        if state != Qt.Checked and self._autorun_enabled:
            self._stop_autorun()

    def _on_overlay_f7(self) -> None:
        print("[Builder] F7: запуск/возобновление")
        was_paused = self._running and getattr(self._worker, "_paused", False)
        if was_paused:
            self.resume()
        elif not self._running:
            self._start_bot()

        auto_run_requested = bool(
            self._auto_run_checkbox
            and self._auto_run_checkbox.isChecked()
        ) or config.get("builder", "auto_run", False)
        print(f"[Builder] F7: auto_run={auto_run_requested}, running={self._running}")
        if auto_run_requested and not self._autorun_enabled:
            self._start_autorun()

    def _on_overlay_f8(self) -> None:
        self._stop_autorun()
        super()._on_overlay_f8()

    def _stop_bot(self) -> None:
        self._stop_autorun()
        super()._stop_bot()

    def closeEvent(self, event) -> None:
        self._stop_autorun()
        if self._builder_hotkey_listener is not None:
            self._builder_hotkey_listener.stop()
            self._builder_hotkey_listener = None
        super().closeEvent(event)
    
    def _check_keys_folder(self) -> bool:
        """Проверяет наличие файлов клавиш"""
        if not os.path.exists(KEYS_DIR):
            self._add_log(f"ОШИБКА: Папка 'keys' не найдена по пути: {KEYS_DIR}")
            self._update_status("Ошибка: папка keys не найдена")
            return False
        
        required = ['e.png', 'f.png', 'h.png']
        missing = [f for f in required if not os.path.exists(os.path.join(KEYS_DIR, f))]
        
        if missing:
            self._add_log(f"ОШИБКА: Отсутствуют файлы: {', '.join(missing)} в папке {KEYS_DIR}")
            self._update_status(f"Ошибка: отсутствуют {', '.join(missing)}")
            return False
        
        self._add_log(f"Все файлы найдены: {KEYS_DIR}")
        return True
    
    def _get_counter_text(self) -> str:
        return "Выполнено действий:"
    
    def _create_worker(self) -> Optional[BaseWorker]:
        if not self._check_keys_folder():
            return None
        return BuilderWorker(self._resolution_mode, self._get_delay(), self._color_tolerance)
    
    def _start_bot(self) -> None:
        """Запускает бота"""
        super()._start_bot()
        
        if self._detection_label:
            self._detection_label.setText("Обнаружено: ничего")
        
        self._worker = self._create_worker()
        if self._worker:
            self._worker.action_completed.connect(self._increment_counter)
            self._worker.log_message.connect(self._add_log)
            self._worker.status_updated.connect(self._update_status)
            
            # Подключаем сигнал обнаружения клавиши через лог
            def on_log_message(msg: str):
                if "Обнаружено изображение:" in msg and self._detection_label:
                    key = msg.split(":")[-1].strip().replace(".png", "")
                    self._detection_label.setText(f"Обнаружено: {key.upper()}.png")
                elif "Альтернативное определение: клавиша" in msg and self._detection_label:
                    key = msg.split("клавиша")[-1].strip().upper()
                    self._detection_label.setText(f"Обнаружено: {key} (по цвету)")
            
            self._worker.log_message.connect(on_log_message)
            self._worker.start()
            if (
                self._auto_run_checkbox and self._auto_run_checkbox.isChecked()
            ) or config.get("builder", "auto_run", False):
                self._start_autorun()
            self._add_log(f"Бот запущен. Задержка: {self._get_delay()} мс")
            self._add_log(f"Разрешение: {self._resolution_mode}")
    
    def _set_resolution(self, mode: str) -> None:
        """Устанавливает разрешение и обновляет информацию"""
        super()._set_resolution(mode)
        if self._info_label:
            coords = builder_coordinate[mode]["builder_marker"]
            target_color = COLOR_LIGHT_GREEN
            self._info_label.setText(f"Цвет: RGB{target_color}, Координаты: {coords}\nОбласть поиска клавиш: 700-1300 x 400-800")
    
    def _load_settings(self) -> None:
        """Загружает сохраненные настройки"""
        self._resolution_mode = config.get("builder", "resolution_mode", "FullHD")
        self._color_tolerance = config.get("builder", "color_tolerance", COLOR_TOLERANCE_NORMAL)
        auto_run = config.get("builder", "auto_run", False)
        
        if self._delay_entry:
            delay = config.get("builder", "delay_between_presses", DEFAULT_DELAY_BUILDER)
            self._delay_entry.setText(str(delay))
        
        self._set_resolution(self._resolution_mode)
        if self._auto_run_checkbox:
            self._auto_run_checkbox.blockSignals(True)
            self._auto_run_checkbox.setChecked(auto_run)
            self._auto_run_checkbox.blockSignals(False)
        
        counter_visible = config.get("builder", "counter_visible", False)
        if counter_visible and self._counter_window and self._counter_btn:
            self._counter_window.show()
            self._counter_btn.setText("Скрыть счётчик")
    
    def _save_settings(self) -> None:
        """Сохраняет текущие настройки"""
        config.set_multiple("builder", {
            "resolution_mode": self._resolution_mode,
            "delay_between_presses": self._get_delay(),
            "color_tolerance": self._color_tolerance,
            "auto_run": self._auto_run_checkbox.isChecked() if self._auto_run_checkbox else False,
            "counter_visible": self._counter_window.isVisible() if self._counter_window else False
        })


def main():
    from PyQt5.QtWidgets import QApplication
    app = QApplication(sys.argv)
    window = BuilderApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()