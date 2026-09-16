import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import pyautogui
from mss import MSS

from PyQt5.QtWidgets import QApplication

try:
    from components.styles import *
except ImportError:
    COLORS = {
        "primary": "#00adb5", "primary_hover": "#0098a0", "primary_pressed": "#01959c",
        "danger": "#ca162e", "danger_hover": "#be0f27", "danger_pressed": "#b41227",
        "bg_dark": "#2b2b2b", "bg_medium": "#3c3c3c", "bg_light": "#1e1e1e",
        "text_primary": "#ffffff", "text_secondary": "#cccccc", "border": "#555555",
    }

# Корневая директория приложения. Когда путь в проекте содержит
# кириллицу, первый и самый устойчивый способ — искать шаблон через
# относительный путь рабочей директории процесса, а уже затем — fallback.
PROJECT_ROOT = Path(__file__).resolve().parent
CANDIDATE_PATHS = [
    Path.cwd() / "assets" / "catch_pda" / "accept.png",
    PROJECT_ROOT / "assets" / "catch_pda" / "accept.png",
]
ACCEPT_PATH = next((p for p in CANDIDATE_PATHS if p.exists()), CANDIDATE_PATHS[0])

SEARCH_AREA = {
    'left': 1220, 'top': 350,
    'right': 1350, 'bottom': 800,
}
SEARCH_AREA['width'] = SEARCH_AREA['right'] - SEARCH_AREA['left']
SEARCH_AREA['height'] = SEARCH_AREA['bottom'] - SEARCH_AREA['top']

from components.base_bot import BaseBotApp, BaseWorker
from components.bot_overlay import (
    OVERLAY_STATUS_IDLE,
    OVERLAY_STATUS_PAUSE,
    OVERLAY_STATUS_READY,
    overlay_status_style,
    setup_overlay_hotkeys,
    stop_overlay_hotkeys,
)
from components.config_manager import config


class OptimizedImageFinder:
    """Optimized accept.png finder based on template matching."""

    _template_cache = {}
    _template_info_cache = {}

    def __init__(self, confidence=0.7):
        self.confidence = confidence
        self.sct = MSS()
        self.last_position = None
        self.pos_cache = []
        self.cache_size = 3

        pyautogui.PAUSE = 0
        pyautogui.FAILSAFE = False

        self.all_monitors = self.sct.monitors
        self.monitor_to_use = self._find_monitor_for_search_area()

        self.search_left = SEARCH_AREA['left']
        self.search_top = SEARCH_AREA['top']
        self.search_width = SEARCH_AREA['width']
        self.search_height = SEARCH_AREA['height']

        self.frame_count = 0

    def _find_monitor_for_search_area(self):
        center_x = SEARCH_AREA['left'] + SEARCH_AREA['width'] // 2
        center_y = SEARCH_AREA['top'] + SEARCH_AREA['height'] // 2
        for i in range(1, len(self.all_monitors)):
            m = self.all_monitors[i]
            if m['left'] <= center_x <= m['left'] + m['width'] and m['top'] <= center_y <= m['top'] + m['height']:
                return i
        return 1

    @classmethod
    def load_template_cached(cls, template_path):
        path = str(template_path)
        if path in cls._template_cache:
            return cls._template_cache[path], cls._template_info_cache.get(path, {})

        try:
            with open(path, 'rb') as image_file:
                image_data = image_file.read()
            encoded = np.frombuffer(image_data, dtype=np.uint8)
            # IMPORTANT: load from bytes so OpenCV never asks the OS to route
            # the image via a unicode/decode-sensitive string path.
            template = cv2.imdecode(encoded, cv2.IMREAD_GRAYSCALE)
        except Exception:
            # Last-resort compatibility with older environments.
            template = cv2.imread(path, cv2.IMREAD_GRAYSCALE)

        if template is None:
            raise FileNotFoundError(f"Не удалось загрузить шаблон: {path}")

        cls._template_cache[path] = template
        cls._template_info_cache[path] = {
            'h': template.shape[0],
            'w': template.shape[1],
            'path': path,
        }
        return template, cls._template_info_cache[path]

    def fast_screenshot(self):
        try:
            monitor = self.all_monitors[self.monitor_to_use]
            relative_left = self.search_left - monitor['left']
            relative_top = self.search_top - monitor['top']
            if relative_left < 0 or relative_top < 0:
                return None

            capture_area = {
                'left': monitor['left'] + relative_left,
                'top': monitor['top'] + relative_top,
                'width': self.search_width,
                'height': self.search_height,
            }
            screenshot = self.sct.grab(capture_area)
            frame = np.frombuffer(screenshot.bgra, dtype=np.uint8).reshape(
                screenshot.height, screenshot.width, 4
            )
            gray = (0.299 * frame[:, :, 2] + 0.587 * frame[:, :, 1] + 0.114 * frame[:, :, 0]).astype(np.uint8)
            return gray
        except Exception:
            return None

    def find_image(self, template, template_info):
        if template is None:
            return None

        self.frame_count += 1
        screenshot = self.fast_screenshot()
        if screenshot is None:
            return None

        h, w = template_info['h'], template_info['w']
        if w * h > 10000:
            scale = 0.7
            small_screenshot = cv2.resize(screenshot, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
            small_template = cv2.resize(template, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
            result = cv2.matchTemplate(small_screenshot, small_template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(result)
            if max_val >= self.confidence:
                center_x = int((max_loc[0] + small_template.shape[1] // 2) / scale)
                center_y = int((max_loc[1] + small_template.shape[0] // 2) / scale)
            else:
                return None
        else:
            result = cv2.matchTemplate(screenshot, template, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(result)
            if max_val < self.confidence:
                return None
            center_x = max_loc[0] + w // 2
            center_y = max_loc[1] + h // 2

        abs_x = self.search_left + center_x
        abs_y = self.search_top + center_y

        self.pos_cache.append((abs_x, abs_y))
        if len(self.pos_cache) > self.cache_size:
            self.pos_cache.pop(0)

        if len(self.pos_cache) >= 2:
            xs = [p[0] for p in self.pos_cache]
            ys = [p[1] for p in self.pos_cache]
            filtered_x = int(np.median(xs))
            filtered_y = int(np.median(ys))
        else:
            filtered_x, filtered_y = abs_x, abs_y

        return filtered_x, filtered_y, max_val

    def move_to_position(self, x, y):
        if self.last_position != (x, y):
            pyautogui.moveTo(x, y, duration=0, _pause=False)
            self.last_position = (x, y)
            return True
        return False

    def click_at_position(self, x, y):
        pyautogui.click(x, y, _pause=False)

    def close(self):
        try:
            self.sct.close()
        except Exception:
            pass


class CatchPDAWorkerThread(BaseWorker):
    """Thread for tracking accept.png and clicking it."""

    def __init__(self, confidence=0.7, click_cooldown=2.5):
        super().__init__()
        self.confidence = confidence
        self.click_cooldown = click_cooldown
        pyautogui.PAUSE = 0
        pyautogui.FAILSAFE = False

    def run(self):
        self.log_message.emit("Запуск потока отслеживания accept.png")
        self.status_updated.emit("Загрузка шаблона...")

        finder = None
        start_time = time.time()
        detection_count = 0
        click_count = 0
        last_click_time = 0
        last_stats_time = start_time

        try:
            if not ACCEPT_PATH.exists():
                self.log_message.emit(f"Ошибка: accept.png не найден: {ACCEPT_PATH}")
                self.status_updated.emit("Ошибка: accept.png не найден")
                return

            template, template_info = OptimizedImageFinder.load_template_cached(str(ACCEPT_PATH))
            self.log_message.emit(f"Шаблон: {template_info['w']}x{template_info['h']} пикселей (кэширован)")
            self.status_updated.emit("Поиск accept.png...")

            finder = OptimizedImageFinder(confidence=self.confidence)

            while self.is_running:
                if not self.wait_if_paused():
                    break

                result = finder.find_image(template, template_info)
                if result:
                    detection_count += 1
                    x, y, confidence_val = result
                    current_time = time.time()
                    if current_time - last_click_time >= self.click_cooldown:
                        click_count += 1
                        self.log_message.emit(f"Обнаружено! ({x}, {y}) Уверенность: {confidence_val:.2f}")
                        finder.move_to_position(x, y)
                        finder.click_at_position(x, y)
                        self.log_message.emit("Клик выполнен!")
                        last_click_time = current_time
                        self.status_updated.emit(f"Клик #{click_count} по ({x}, {y})")

                current_time = time.time()
                if current_time - last_stats_time >= 1.0:
                    elapsed = current_time - start_time
                    fps = finder.frame_count / elapsed if elapsed > 0 else 0
                    pos_str = f"({finder.last_position[0]}, {finder.last_position[1]})" if finder.last_position else "Поиск..."
                    detection_rate = (detection_count / finder.frame_count * 100) if finder.frame_count > 0 else 0
                    status = f"FPS: {fps:.1f} | Обнаружение: {detection_rate:.1f}% | Клики: {click_count} | {pos_str}"
                    self.status_updated.emit(status)
                    last_stats_time = current_time

                self.msleep(5)

        except Exception as exc:
            self.log_message.emit(f"ОШИБКА: {exc}")
            self.status_updated.emit(f"Ошибка: {exc}")
        finally:
            if finder:
                finder.close()
            self.log_message.emit(f"Всего кадров: {getattr(finder, 'frame_count', 0)}")
            self.status_updated.emit("Отслеживание остановлено")


class CatchPDAApp(BaseBotApp):
    def __init__(self):
        super().__init__(
            title="Ловля КПК",
            window_width=500,
            window_height=180,
            has_resolution=False,
            has_delay=False,
            has_log=True,
            has_counter=True,
            overlay_icon="pda",
        )
        self.confidence = config.get('catch_pda', 'confidence', 0.7)
        self.click_cooldown = float(config.get('catch_pda', 'click_cooldown', 2.5))
        self._load_status_from_template()

    def _load_status_from_template(self):
        if not ACCEPT_PATH.exists():
            self._update_status("Ошибка: accept.png не найден")
            if self._settings_status_label:
                self._settings_status_label.setText("Ошибка: accept.png не найден")
        else:
            self._update_status(OVERLAY_STATUS_READY)

    def _on_overlay_f7(self):
        if self._running and self._worker and getattr(self._worker, '_paused', False):
            self._worker.resume()
            self._update_status(OVERLAY_STATUS_READY)
            return
        if not self._running:
            self._start_bot()

    def _on_overlay_f8(self):
        if self._running and self._worker and not getattr(self._worker, '_paused', False):
            self._worker.pause()
            self._update_status(OVERLAY_STATUS_PAUSE)

    def _start_bot(self):
        if not ACCEPT_PATH.exists():
            self._update_status("Ошибка: accept.png не найден")
            self._add_log("accept.png не найден")
            return

        self._running = True
        if self._toggle_button:
            self._toggle_button.setText("Остановить")
            self._toggle_button.setStyleSheet(BUTTON_STYLES["danger"])
        self._reset_overlay_counter()
        self._update_status(OVERLAY_STATUS_READY)

        self._worker = CatchPDAWorkerThread(self.confidence, self.click_cooldown)
        self._worker.log_message.connect(self._add_log)
        self._worker.status_updated.connect(self.update_status_label)
        self._worker.error_occurred.connect(self._add_log)
        self._worker.start()

    def _stop_bot(self):
        self._running = False
        if self._toggle_button:
            self._toggle_button.setText("Запустить")
            self._toggle_button.setStyleSheet(BUTTON_STYLES["primary"])

        if self._worker:
            self._worker.stop()
            self._worker.wait()
            self._worker = None

        self._update_status(OVERLAY_STATUS_IDLE)

    def _toggle_bot(self):
        if self._running:
            self._stop_bot()
        else:
            self._start_bot()

    def update_status_label(self, status_text):
        self._update_status(status_text)

    def print_log(self, message):
        print(f"[LOG] {message}")

    def closeEvent(self, event):
        if self._running:
            self._stop_bot()
        stop_overlay_hotkeys(self)
        event.accept()


def main():
    app = QApplication(sys.argv)
    catch_pda_app = CatchPDAApp()
    catch_pda_app.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
