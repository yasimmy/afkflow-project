"""Общий спокойный оверлей для ботов: стекло, статус, счётчик, F7/F8."""

from typing import Callable, Optional

from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QColor, QKeySequence, QPainter, QPainterPath, QPen, QLinearGradient
from PyQt5.QtWidgets import QApplication, QHBoxLayout, QLabel, QShortcut, QVBoxLayout, QWidget

OVERLAY_FONT = "Segoe UI"
OVERLAY_STATUS_IDLE = "Ожидает старта"
OVERLAY_STATUS_READY = "Готов к работе"
OVERLAY_STATUS_PAUSE = "Пауза"
OVERLAY_STATUS_FOOD_CHECK = "Проверка еды"
OVERLAY_STATUS_FEEDING = "Ест"
OVERLAY_STATUS_WAIT = "Жду мини-игру"
OVERLAY_STATUS_SOLVE = "Решаю мини-игру"

KEYBOARD_LIB = None
try:
    from pynput import keyboard as pynput_keyboard
    KEYBOARD_LIB = "pynput"
except ImportError:
    try:
        import keyboard as keyboard_lib
        KEYBOARD_LIB = "keyboard"
    except ImportError:
        KEYBOARD_LIB = None


class OverlayIcon(QWidget):
    """Компактная векторная иконка для оверлея."""

    def __init__(self, kind: str = "mark", parent=None):
        super().__init__(parent)
        self.kind = kind
        self.setFixedSize(34, 34)
        self.setAttribute(Qt.WA_TransparentForMouseEvents)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing, True)
        painter.setPen(Qt.NoPen)
        painter.setBrush(QColor(38, 42, 49, 235))
        painter.drawRoundedRect(1, 1, 32, 32, 9, 9)

        colors = {
            "barn": QColor("#F2B84B"), "dumbbell": QColor("#63D5B2"),
            "chef": QColor("#FF8A65"), "crane": QColor("#6CB4EE"),
            "boat": QColor("#66C7E8"), "pickaxe": QColor("#C5A7FF"),
            "afk": QColor("#AAB4C3"), "turner": QColor("#F08BA8"),
            "needle": QColor("#F0A6CA"), "wheel": QColor("#F4C95D"),
            "helper": QColor("#7DD3FC"), "pda": QColor("#8BE28B"),
        }
        color = colors.get(self.kind, QColor("#B8C1CC"))
        painter.setPen(QPen(color, 2.4, Qt.SolidLine, Qt.RoundCap, Qt.RoundJoin))
        painter.setBrush(Qt.NoBrush)

        if self.kind == "barn":
            path = QPainterPath()
            path.moveTo(8, 16)
            path.lineTo(17, 8)
            path.lineTo(26, 16)
            path.lineTo(26, 26)
            path.lineTo(8, 26)
            path.closeSubpath()
            painter.drawPath(path)
            painter.drawLine(14, 26, 14, 19)
            painter.drawLine(20, 26, 20, 19)
            painter.drawLine(14, 19, 20, 19)
        elif self.kind == "dumbbell":
            painter.drawLine(8, 17, 26, 17)
            for x in (8, 11, 23, 26):
                painter.drawLine(x, 13 if x in (8, 26) else 14, x, 21 if x in (8, 26) else 20)
        elif self.kind == "pickaxe":
            painter.drawLine(11, 26, 23, 8)
            painter.drawArc(7, 7, 21, 11, 25 * 16, 130 * 16)
        elif self.kind == "boat":
            painter.drawLine(17, 8, 17, 21)
            painter.drawLine(17, 9, 25, 15)
            painter.drawLine(8, 21, 27, 21)
            painter.drawArc(9, 17, 17, 9, 180 * 16, 180 * 16)
        elif self.kind == "needle":
            painter.drawLine(9, 25, 24, 10)
            painter.drawEllipse(21, 7, 5, 5)
        elif self.kind == "wheel":
            painter.drawEllipse(9, 9, 16, 16)
            painter.drawEllipse(15, 15, 4, 4)
            for angle in range(0, 360, 45):
                painter.save()
                painter.translate(17, 17)
                painter.rotate(angle)
                painter.drawLine(0, -7, 0, -3)
                painter.restore()
        elif self.kind == "pda":
            painter.drawRoundedRect(10, 7, 14, 20, 3, 3)
            painter.drawLine(13, 11, 21, 11)
            painter.drawLine(13, 15, 21, 15)
            painter.drawEllipse(15, 21, 4, 2)
        else:
            painter.drawRoundedRect(9, 10, 16, 15, 4, 4)
            painter.drawLine(12, 8, 22, 8)
            painter.drawLine(17, 8, 17, 5)


def overlay_status_style(text: str) -> str:
    color = "#AAB4C3"
    if text in (OVERLAY_STATUS_WAIT, OVERLAY_STATUS_SOLVE) or "Готов" in text:
        color = "#8BE0C5"
    elif text in ("Копаю", "Двигаю клавиши", "Автобег") or "Нажим" in text:
        color = "#8DECF0"
    elif text in ("Ищу зелёный", "Определяю клавишу", "Готово", "Жду следующий цикл"):
        color = "#B7C0CB"
    elif text == "Запускаю":
        color = "#D7B7FF"
    elif "Клавиша не найдена" in text:
        color = "#F4C978"
    elif "ПАУЗА" in text or "Пауза" in text:
        color = "#F4C978"
    elif text == "Проверка еды":
        color = "#D7B7FF"
    elif text == "Ест":
        color = "#9BE28C"
    elif "Ошибка" in text:
        color = "#FF8D8D"
    return (
        f"color: {color}; font-size: 12px; font-weight: 400; "
        f"font-family: '{OVERLAY_FONT}'; background: transparent;"
    )


def paint_overlay_background(widget: QWidget) -> None:
    painter = QPainter(widget)
    painter.setRenderHint(QPainter.Antialiasing)
    rect = widget.rect().adjusted(0, 0, -1, -1)
    path = QPainterPath()
    path.addRoundedRect(rect.x(), rect.y(), rect.width(), rect.height(), 14, 14)
    gradient = QLinearGradient(0, 0, 0, widget.height())
    gradient.setColorAt(0, QColor(34, 34, 36, 185))
    gradient.setColorAt(1, QColor(16, 17, 19, 198))
    painter.fillPath(path, gradient)
    painter.setPen(QPen(QColor(153, 185, 176, 90), 1))
    painter.drawPath(path)
    painter.setPen(Qt.NoPen)
    painter.setBrush(QColor(153, 205, 190, 125))
    painter.drawRoundedRect(14, 5, min(44, widget.width() - 28), 2, 1, 1)


def apply_overlay_window(widget: QWidget) -> None:
    widget.setWindowFlags(
        Qt.Window | Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.Tool
    )
    widget.setAttribute(Qt.WA_TranslucentBackground)
    widget.setAttribute(Qt.WA_ShowWithoutActivating)
    widget.setStyleSheet("")


def build_overlay_chrome(widget: QWidget, title: str, icon_kind: str = "mark") -> dict:
    overlay = QHBoxLayout(widget)
    overlay.setContentsMargins(12, 9, 14, 9)
    overlay.setSpacing(11)

    icon = OverlayIcon(icon_kind, widget)
    overlay.addWidget(icon, 0, Qt.AlignVCenter)

    text_col = QVBoxLayout()
    text_col.setContentsMargins(0, 0, 0, 0)
    text_col.setSpacing(3)

    top_row = QHBoxLayout()
    top_row.setContentsMargins(0, 0, 0, 0)
    top_row.setSpacing(8)

    title_label = QLabel(title)
    title_label.setStyleSheet(
        f"color: #F4F7FA; font-size: 13px; font-weight: 700; font-family: '{OVERLAY_FONT}'; background: transparent;"
    )
    top_row.addWidget(title_label, 0, Qt.AlignLeft | Qt.AlignVCenter)
    top_row.addStretch()

    counter_label = QLabel("0")
    counter_label.setAlignment(Qt.AlignRight | Qt.AlignVCenter)
    counter_label.setStyleSheet(
        f"color: #DCE7EA; font-size: 12px; font-weight: 700; font-family: '{OVERLAY_FONT}'; "
        "background: rgba(255, 255, 255, 18); border: 1px solid rgba(255, 255, 255, 32); "
        "border-radius: 7px; padding: 1px 6px;"
    )
    top_row.addWidget(counter_label, 0, Qt.AlignRight | Qt.AlignVCenter)
    text_col.addLayout(top_row)

    status_label = QLabel(OVERLAY_STATUS_IDLE)
    status_label.setStyleSheet(overlay_status_style(OVERLAY_STATUS_IDLE))
    text_col.addWidget(status_label)

    hotkeys_row = QHBoxLayout()
    hotkeys_row.setContentsMargins(0, 2, 0, 0)
    hotkeys_row.setSpacing(5)

    f7_label = QLabel("<b>F7</b>&nbsp;&nbsp;START")
    f7_label.setStyleSheet(
        f"color: #8DECF0; font-size: 10px; font-weight: 600; font-family: '{OVERLAY_FONT}'; "
        "background-color: rgba(0, 173, 181, 45); border: 1px solid rgba(0, 205, 214, 110); "
        "border-radius: 5px; padding: 2px 7px;"
    )
    f7_label.setAlignment(Qt.AlignCenter)
    hotkeys_row.addWidget(f7_label, 0, Qt.AlignLeft | Qt.AlignVCenter)

    f8_label = QLabel("<b>F8</b>&nbsp;&nbsp;PAUSE")
    f8_label.setStyleSheet(
        f"color: #F4C978; font-size: 10px; font-weight: 600; font-family: '{OVERLAY_FONT}'; "
        "background-color: rgba(196, 143, 45, 42); border: 1px solid rgba(224, 173, 76, 105); "
        "border-radius: 5px; padding: 2px 7px;"
    )
    f8_label.setAlignment(Qt.AlignCenter)
    hotkeys_row.addWidget(f8_label, 0, Qt.AlignLeft | Qt.AlignVCenter)
    hotkeys_row.addStretch()
    text_col.addLayout(hotkeys_row)
    overlay.addLayout(text_col, 1)

    for child in widget.findChildren(QWidget):
        child.setAttribute(Qt.WA_TransparentForMouseEvents)

    width = 268 if len(title) < 12 else 300
    widget.setFixedSize(width, 78)
    move_overlay_top_right(widget)

    return {
        "icon": icon,
        "title": title_label,
        "status": status_label,
        "counter": counter_label,
        "hotkeys": hotkeys_row,
    }


def move_overlay_top_right(widget: QWidget) -> None:
    screen = QApplication.desktop().availableGeometry()
    widget.move(max(0, screen.width() - widget.width() - 20), 10)


def setup_overlay_hotkeys(widget: QWidget, on_f7: Callable, on_f8: Callable) -> None:
    f7 = QShortcut(QKeySequence("F7"), widget)
    f7.setContext(Qt.ApplicationShortcut)
    f7.activated.connect(on_f7)
    f8 = QShortcut(QKeySequence("F8"), widget)
    f8.setContext(Qt.ApplicationShortcut)
    f8.activated.connect(on_f8)
    widget._overlay_f7_shortcut = f7
    widget._overlay_f8_shortcut = f8

    listener = None
    if KEYBOARD_LIB == "pynput":
        def on_press(key):
            try:
                vk = getattr(key, "vk", None)
                name = getattr(key, "name", "")
                if key == pynput_keyboard.Key.f7 or vk == 0x76 or name == "f7":
                    QTimer.singleShot(0, on_f7)
                elif key == pynput_keyboard.Key.f8 or vk == 0x77 or name == "f8":
                    QTimer.singleShot(0, on_f8)
            except Exception:
                pass

        listener = pynput_keyboard.Listener(on_press=on_press)
        listener.daemon = True
        listener.start()
    elif KEYBOARD_LIB == "keyboard":
        import keyboard as keyboard_lib
        keyboard_lib.add_hotkey("f7", lambda: QTimer.singleShot(0, on_f7))
        keyboard_lib.add_hotkey("f8", lambda: QTimer.singleShot(0, on_f8))

    widget._overlay_hotkey_listener = listener


def stop_overlay_hotkeys(widget: QWidget) -> None:
    listener = getattr(widget, "_overlay_hotkey_listener", None)
    if listener is not None:
        try:
            listener.stop()
        except Exception:
            pass
        widget._overlay_hotkey_listener = None


def overlay_mouse_press(widget: QWidget, event) -> None:
    if event.button() == Qt.LeftButton:
        widget._overlay_drag_position = event.globalPos() - widget.frameGeometry().topLeft()
        event.accept()


def overlay_mouse_move(widget: QWidget, event) -> None:
    pos = getattr(widget, "_overlay_drag_position", None)
    if event.buttons() == Qt.LeftButton and pos:
        widget.move(event.globalPos() - pos)
        event.accept()


def overlay_mouse_release(widget: QWidget, event) -> None:
    widget._overlay_drag_position = None
    event.accept()
