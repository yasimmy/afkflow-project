import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { Sounds } from '@/hooks/useSound';

interface ProfileHeaderProps {
  onClick?: () => void;
}

export function ProfileHeader({ onClick }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.webp?size=80`
    : null;

  const handleClick = onClick ?? (() => navigate('/profile'));

  return (
    <button
      onClick={handleClick}
      aria-label="Открыть профиль"
      className="
        flex items-center gap-3
        rounded-lg
        hover:bg-bg-hover
        transition-all duration-150 outline-none
        focus-visible:ring-2 focus-visible:ring-accent
        group px-2 py-1.5
      "
    >
      <Avatar
        src={avatarUrl}
        fallback={user.username}
        size="lg"
        alt={`Аватар ${user.username}`}
        className="shrink-0"
      />

      <div className="flex flex-col items-start min-w-0">
        <span className="text-[14px] font-semibold text-white leading-tight truncate max-w-[130px]">
          {user.username}
        </span>
        <span className="text-[12px] text-text-secondary leading-tight mt-0.5">
          Профиль
        </span>
      </div>

      <ChevronRight
        size={15}
        className="text-text-muted group-hover:text-text-secondary transition-colors shrink-0 ml-0.5"
      />
    </button>
  );
}
