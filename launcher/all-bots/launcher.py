"""
Python bot launcher for AFKFlow (Tauri).

Launches a specific bot from all-bots based on BOT_ID.
Settings from BOT_CONFIG are written into the in-memory config
(and persisted to settings.json) before the bot window is created.
The bot's own PyQt5 window is shown — the user interacts with it directly.
"""
import json
import os
import sys
import traceback
from pathlib import Path

BOT_CONFIG_SECTION: dict[str, str] = {
    'bot_anti_afk':     'antiafk',
    'bot_wheel':        'lucky_wheel',
    'bot_cooking':      'cooking',
    'bot_gym':          'gym',
    'bot_construction': 'builder',
    'bot_port':         'port',
    'bot_mine':         'mining',
    'bot_farm':         'farm_cows',
    'bot_turner':       'turner',
    'bot_seamstress':   'seamstress',
    'bot_catch_pda':    'catch_pda',
    'bot_rutine_helper': 'rutine_helper',
}


def apply_config_overrides(bot_id: str, overrides: dict) -> None:
    if not overrides:
        return

    section = BOT_CONFIG_SECTION.get(bot_id)
    if not section:
        return

    # Tauri settings used `cycles` for the wheel; the bot stores hours.
    if bot_id == 'bot_wheel' and 'cycles' in overrides and 'hours' not in overrides:
        overrides = dict(overrides)
        overrides['hours'] = overrides.pop('cycles')

    from components.config_manager import config as cfg_manager
    cfg_manager.set_multiple(section, overrides, auto_save=True)


def auto_start(bot_id: str, window) -> None:
    """Run only the bot-specific startup actions that are safe to automate."""
    try:
        if bot_id == 'bot_anti_afk':
            window._toggle_bot()
        elif bot_id == 'bot_cooking':
            return
        elif bot_id == 'bot_gym':
            window.start_training()
        elif bot_id == 'bot_rutine_helper':
            window.start()
        elif bot_id == 'bot_catch_pda':
            window.start_tracking()
        elif bot_id == 'bot_construction':
            return
        else:
            window._start_bot()
    except Exception as exc:
        print(f"[launcher] auto-start failed for {bot_id}: {exc}", file=sys.stderr)
        traceback.print_exc()


def poll_control(bot_id: str, window) -> None:
    command_path = Path(__file__).resolve().parent / 'control' / f'{bot_id}.cmd'
    if not command_path.exists():
        return
    try:
        command = command_path.read_text(encoding='utf-8').strip()
        command_path.unlink(missing_ok=True)
        method_name = {'pause': 'pause_training', 'resume': 'resume_training'}.get(command)
        if method_name and hasattr(window, method_name):
            getattr(window, method_name)()
        elif command == 'pause' and hasattr(window, 'pause'):
            window.pause()
        elif command == 'resume' and hasattr(window, 'resume'):
            window.resume()
    except Exception as exc:
        print(f'[launcher] control command failed: {exc}', file=sys.stderr)


def launch_bot(bot_id: str, overrides: dict) -> None:
    apply_config_overrides(bot_id, overrides)

    from PyQt5.QtCore import QTimer
    from PyQt5.QtWidgets import QApplication

    app = QApplication(sys.argv)
    window = None

    if bot_id == 'bot_anti_afk':
        from antiafk import MainWindow
        window = MainWindow()
    elif bot_id == 'bot_wheel':
        from lucky_wheel import LuckyWheelApp
        window = LuckyWheelApp()
    elif bot_id == 'bot_cooking':
        from cooking import CookingBotApp
        window = CookingBotApp()
    elif bot_id == 'bot_gym':
        from gym import GymApp
        window = GymApp()
    elif bot_id == 'bot_construction':
        from builder import BuilderApp
        window = BuilderApp()
    elif bot_id == 'bot_port':
        from port import PortApp
        window = PortApp()
    elif bot_id == 'bot_mine':
        from mining import MiningBotApp
        window = MiningBotApp()
    elif bot_id == 'bot_farm':
        from farm_cows import FarmCowsApp
        window = FarmCowsApp()
    elif bot_id == 'bot_turner':
        from turner import TurnerApp
        window = TurnerApp()
    elif bot_id == 'bot_seamstress':
        from seamstress import SeamstressApp
        window = SeamstressApp()
    elif bot_id == 'bot_catch_pda':
        from catch_pda import CatchPDAApp
        window = CatchPDAApp()
    elif bot_id == 'bot_rutine_helper':
        from rutine_helper import RutineHelperApp
        window = RutineHelperApp()
    else:
        print(f"[launcher] Unknown bot ID: {bot_id}", file=sys.stderr)
        sys.exit(1)

    control_timer = QTimer(window)
    control_timer.timeout.connect(lambda: poll_control(bot_id, window))
    control_timer.start(100)

    window.show()
    # Start the worker after the Qt event loop is ready so every launcher path
    # runs the actual bot instead of only opening its window.
    if os.environ.get('BOT_AUTO_START', '1') != '0':
        QTimer.singleShot(0, lambda: auto_start(bot_id, window))

    sys.exit(app.exec_())


def main():
    bot_id = os.environ.get('BOT_ID', '').strip()
    config_str = os.environ.get('BOT_CONFIG', '{}')

    if not bot_id:
        print("[launcher] BOT_ID is not set", file=sys.stderr)
        sys.exit(1)

    print(f"[launcher] Starting bot: {bot_id}")

    try:
        overrides: dict = json.loads(config_str) if config_str else {}
        if not isinstance(overrides, dict):
            overrides = {}
    except json.JSONDecodeError as exc:
        print(f"[launcher] Warning: could not parse BOT_CONFIG ({exc}), using defaults")
        overrides = {}

    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir not in sys.path:
        sys.path.insert(0, script_dir)
    os.chdir(script_dir)

    try:
        launch_bot(bot_id, overrides)
    except Exception:
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
