import React from 'react';
import { useModalStore } from '@/stores/modalStore';
import { BotSettingsModal }       from './BotSettingsModal';
import { RoutineHelperModal }     from './RoutineHelperModal';
import { StopBotModal }           from './StopBotModal';
import { StartAllBotsModal }      from './StartAllBotsModal';
import { LogoutConfirmModal }     from './LogoutConfirmModal';
import { SessionExpiredModal }    from './SessionExpiredModal';
import { SubscriptionExpiredModal } from './SubscriptionExpiredModal';
import { NoBotAccessModal }       from './NoBotAccessModal';
import { UpdateAvailableModal }   from './UpdateAvailableModal';
import { BotErrorModal }          from './BotErrorModal';
import { AccountBlockedModal }    from './AccountBlockedModal';
import { LoginErrorModal }        from './LoginErrorModal';
import { ClearLogsModal }         from './ClearLogsModal';
import { BotDashboard }           from './BotDashboard';

export function ModalManager() {
  const { type, data, closeModal } = useModalStore();

  if (!type) return null;

  const common = { isOpen: true, onClose: closeModal };

  switch (type) {
    case 'botSettings':
      return (
        <BotSettingsModal
          {...common}
          botId={data.botId as string}
          firstLaunch={data.firstLaunch as boolean | undefined}
          onConfirmAndStart={data.onConfirmAndStart as (() => void) | undefined}
        />
      );

    case 'routineHelper':
      return (
        <RoutineHelperModal
          {...common}
          onPick={data.onPick as ((profile: string) => void) | undefined}
        />
      );

    case 'stopBot':
      return <StopBotModal {...common} botId={data.botId as string} />;

    case 'startAllBots':
      return <StartAllBotsModal {...common} />;

    case 'logoutConfirm':
      return <LogoutConfirmModal {...common} />;

    case 'sessionExpired':
      return <SessionExpiredModal {...common} />;

    case 'subscriptionExpired':
      return <SubscriptionExpiredModal {...common} />;

    case 'noBotAccess':
      return <NoBotAccessModal {...common} botId={data.botId as string | undefined} />;

    case 'updateAvailable':
      return (
        <UpdateAvailableModal
          {...common}
          version={data.version as string | undefined}
          changelog={data.changelog as string | undefined}
          critical={false}
        />
      );

    case 'criticalUpdate':
      return (
        <UpdateAvailableModal
          {...common}
          version={data.version as string | undefined}
          changelog={data.changelog as string | undefined}
          critical
        />
      );

    case 'botError':
      return (
        <BotErrorModal
          {...common}
          botId={data.botId as string | undefined}
          errorMessage={data.errorMessage as string | undefined}
        />
      );

    case 'accountBlocked':
      return <AccountBlockedModal {...common} reason={data.reason as string | undefined} />;

    case 'loginError':
      return <LoginErrorModal {...common} errorMessage={data.errorMessage as string | undefined} />;

    case 'clearLogs':
      return <ClearLogsModal {...common} />;

    case 'botDashboard':
      return <BotDashboard {...common} botId={data.botId as string} />;

    default:
      return null;
  }
}
