"""
Помощник рутины: почтальон, дальнобойщик, аквалангист.
После выбора профиля — компактное окно поверх игры, F7 старт / F8 пауза.
"""

import threading
import time
import ctypes
import sys

from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QKeySequence
from PyQt5.QtWidgets import (
    QApplication,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLayout,
    QPushButton,
    QShortcut,
    QVBoxLayout,
    QWidget,
)

from components.config_manager import config
from components.styles import BUTTON_STYLES, LABEL_STYLES, WINDOW_STYLES
from components.bot_overlay import (
    OVERLAY_STATUS_IDLE,
    OVERLAY_STATUS_PAUSE,
    apply_overlay_window,
    build_overlay_chrome,
    overlay_status_style,
    paint_overlay_background,
)

try:
    import pydirectinput
    pydirectinput.PAUSE = 0
    INPUT_LIB = pydirectinput
except ImportError:
    import pyautogui
    INPUT_LIB = pyautogui
    INPUT_LIB.PAUSE = 0

KEYBOARD_LIB = None
WINDOWS_SCAN_CODES = {
    'w': 0x11,
    'shift': 0x2A,
    'capslock': 0x3A,
}
try:
    from pynput import keyboard as pynput_keyboard
    KEYBOARD_LIB = 'pynput'
except ImportError:
    try:
        import keyboard as keyboard_lib
        KEYBOARD_LIB = 'keyboard'
    except ImportError:
        KEYBOARD_LIB = None


def _hold_key(key: str) -> None:
    if sys.platform == 'win32' and key in WINDOWS_SCAN_CODES:
        ctypes.windll.user32.keybd_event(0, WINDOWS_SCAN_CODES[key], 0x0008, 0)
        return
    INPUT_LIB.keyDown(key)


def _release_key(key: str) -> None:
    if sys.platform == 'win32' and key in WINDOWS_SCAN_CODES:
        ctypes.windll.user32.keybd_event(
            0, WINDOWS_SCAN_CODES[key], 0x0008 | 0x0002, 0
        )
        return
    INPUT_LIB.keyUp(key)


PROFILES = {
    'postman': {
        'title': 'почтальон',
        'keys': ('w', 'capslock'),
    },
    'trucker': {
        'title': 'дальнобойщик',
        'keys': ('w',),
    },
    'diver': {
        'title': 'аквалангист',
        'keys': ('shift',),
    },
}

PROFILE_ALIASES = {
    'postman': 'postman',
    'почтальон': 'postman',
    'trucker': 'trucker',
    'дальнобойщик': 'trucker',
    'diver': 'diver',
    'аквалангист': 'diver',
}


def normalize_profile(value) -> str:
    if not value:
        return ''
    return PROFILE_ALIASES.get(str(value).strip().lower(), '')


def _clear_layout(layout: QLayout) -> None:
    while layout.count():
        item = layout.takeAt(0)
        widget = item.widget()
        child_layout = item.layout()
        if widget is not None:
            widget.deleteLater()
        elif child_layout is not None:
            _clear_layout(child_layout)


class RutineHelperApp(QWidget):
    def __init__(self):
        super().__init__()
        self.profile = normalize_profile(config.get('rutine_helper', 'profile', ''))
        self._holding = False
        self._paused = False
        self._stop_hold = False
        self._hold_thread = None
        self._pressed_keys = []
        self._global_listener = None
        self._status_label = None
        self._title_label = None
        self._drag_position = None
        self._overlay_mode = False
        self._overlay_status_label = None
        self._root = QVBoxLayout(self)
        self._root.setContentsMargins(0, 0, 0, 0)

        if self.profile:
            self._show_overlay()
        else:
            self._show_picker()

        self._setup_shortcuts()
        self._setup_global_hooks()

    def _show_picker(self):
        _clear_layout(self._root)
        self.profile = ''
        self._overlay_mode = False
        self.setWindowFlags(Qt.Window)
        self.setAttribute(Qt.WA_TranslucentBackground, False)
        self.setWindowTitle('Помощник рутины')
        self.setFixedSize(360, 280)
        self.setStyleSheet(WINDOW_STYLES['main_window'])

        inner = QWidget()
        layout = QVBoxLayout(inner)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)

        title = QLabel('Что запустить:')
        title.setStyleSheet(WINDOW_STYLES['title'])
        layout.addWidget(title)

        for profile_id, meta in PROFILES.items():
            button = QPushButton(meta['title'].capitalize())
            button.setStyleSheet(BUTTON_STYLES['primary'])
            button.clicked.connect(lambda _checked=False, pid=profile_id: self._choose_profile(pid))
            layout.addWidget(button)

        layout.addStretch()
        self._root.addWidget(inner)

    def _show_overlay(self):
        _clear_layout(self._root)
        apply_overlay_window(self)
        self._overlay_mode = True
        title = PROFILES[self.profile]['title'].capitalize()
        host = QWidget()
        host.setAttribute(Qt.WA_TranslucentBackground, True)
        chrome = build_overlay_chrome(host, title, "helper")
        host.setAttribute(Qt.WA_TransparentForMouseEvents, True)
        self._overlay_status_label = chrome["status"]
        self._status_label = chrome["status"]
        self._title_label = chrome["title"]
        self._root.setContentsMargins(0, 0, 0, 0)
        self._root.addWidget(host)
        self.setFixedSize(host.width(), host.height())
        self._move_to_top_right()
        self._set_status(OVERLAY_STATUS_IDLE)

    def _choose_profile(self, profile_id: str):
        self.profile = profile_id
        config.set('rutine_helper', 'profile', profile_id, auto_save=True)
        self.hide()
        self._show_overlay()
        self.show()
        self.raise_()

    def _move_to_top_right(self):
        screen = QApplication.desktop().availableGeometry()
        self.move(max(0, screen.width() - self.width() - 20), 12)

    def _set_status(self, text: str):
        if self._status_label is not None:
            self._status_label.setText(text)
            self._status_label.setStyleSheet(overlay_status_style(text if text != "Пауза" else OVERLAY_STATUS_PAUSE))

    def _setup_shortcuts(self):
        self._f7 = QShortcut(QKeySequence('F7'), self)
        self._f7.activated.connect(self.start)
        self._f8 = QShortcut(QKeySequence('F8'), self)
        self._f8.activated.connect(self.pause)

    def _setup_global_hooks(self):
        if KEYBOARD_LIB == 'pynput':
            def on_press(key):
                try:
                    vk = getattr(key, 'vk', None)
                    name = getattr(key, 'name', '')
                    if vk == 0x76 or name == 'f7':
                        QTimer.singleShot(0, self.start)
                    elif vk == 0x77 or name == 'f8':
                        QTimer.singleShot(0, self.pause)
                except Exception:
                    pass

            self._global_listener = pynput_keyboard.Listener(on_press=on_press)
            self._global_listener.daemon = True
            self._global_listener.start()
        elif KEYBOARD_LIB == 'keyboard':
            import keyboard as keyboard_lib
            keyboard_lib.add_hotkey('f7', lambda: QTimer.singleShot(0, self.start))
            keyboard_lib.add_hotkey('f8', lambda: QTimer.singleShot(0, self.pause))

    def _hold_worker(self):
        keys = PROFILES[self.profile]['keys']
        self._pressed_keys = list(keys)
        for key in keys:
            try:
                _hold_key(key)
                time.sleep(0.03)
            except Exception as error:
                self._set_status(f"Ошибка {key}")
                print(f"Routine Helper: не удалось зажать {key}: {error}")

        while not self._stop_hold:
            time.sleep(0.4)

        for key in reversed(self._pressed_keys):
            try:
                _release_key(key)
            except Exception as error:
                print(f"Routine Helper: не удалось отпустить {key}: {error}")
        self._pressed_keys = []

    def start(self):
        if not self.profile:
            return
        if self._holding:
            return
        self.resume()

    def pause(self):
        if not self._holding:
            return
        self._paused = True
        self._stop_hold = True
        if self._hold_thread:
            self._hold_thread.join(timeout=1.0)
            self._hold_thread = None
        self._holding = False
        self._set_status('Пауза')

    def resume(self):
        if not self.profile:
            return
        if self._holding:
            return
        self._paused = False
        self._stop_hold = False
        self._holding = True
        self._hold_thread = threading.Thread(target=self._hold_worker, daemon=True)
        self._hold_thread.start()
        keys = ' + '.join(key.upper() for key in PROFILES[self.profile]['keys'])
        self._set_status(f"Зажимаю {keys}")

    def pause_training(self):
        self.pause()

    def resume_training(self):
        self.resume()

    def stop(self):
        self.pause()
        self._set_status('Остановлен')

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton and self.profile:
            self._drag_position = event.globalPos() - self.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event):
        if event.buttons() == Qt.LeftButton and self._drag_position and self.profile:
            self.move(event.globalPos() - self._drag_position)
            event.accept()

    def mouseReleaseEvent(self, event):
        self._drag_position = None
        event.accept()

    def paintEvent(self, event):
        if self._overlay_mode:
            paint_overlay_background(self)

    def closeEvent(self, event):
        self.stop()
        if self._global_listener is not None:
            try:
                self._global_listener.stop()
            except Exception:
                pass
        event.accept()
