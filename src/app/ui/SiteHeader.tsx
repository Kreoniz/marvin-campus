import { Badge } from 'unlikely-ui/badge';
import type { ReactNode } from 'react';
import HelpDialog from './HelpDialog.tsx';
import IconButton from '../../shared/ui/IconButton.tsx';

export default function SiteHeader({
  theme,
  vucOnly = false,
  onToggleTheme,
  viewControl,
  settingsControl,
}: {
  theme: string;
  vucOnly?: boolean;
  onToggleTheme: () => void;
  viewControl?: ReactNode;
  settingsControl: ReactNode;
}) {
  return (
    <header className="site-header mb-5 flex items-center gap-1.5 border-b border-[var(--u-line-soft)] pt-2 pb-4 compact:sticky compact:top-0 compact:z-20 compact:-mx-3 compact:-mt-1 compact:mb-1 compact:min-h-11 compact:flex-nowrap compact:gap-0 compact:border-b-0 compact:bg-[var(--u-canvas)] compact:px-1 compact:py-0">
      <a
        className="brand flex items-center gap-2 no-underline compact:gap-1"
        href="/"
        aria-label="Кампус, главная"
      >
        <img
          className="brand-avatar size-14 shrink-0 object-contain compact:size-6"
          src="/assets/mascot-mint-head-v1.webp"
          width="60"
          height="60"
          alt=""
        />
        <span className="flex items-center gap-3 compact:max-[420px]:hidden">
          <span className="brand-name whitespace-nowrap text-[26px] font-extrabold tracking-[-1px] compact:text-lg compact:tracking-[-0.7px]">
            Кампус
          </span>
          <Badge className="border-u-accent-border bg-[var(--u-accent-soft)] text-[11px] tracking-[1px] text-[var(--u-accent-text)] max-[1160px]:hidden">
            Don't Panic
          </Badge>
        </span>
      </a>
      <nav
        className="ml-2 flex items-center gap-3 text-sm max-[1000px]:hidden"
        aria-label="Разделы расписаний"
      >
        <a
          href="/"
          aria-current={!vucOnly ? 'page' : undefined}
          className={!vucOnly ? 'font-semibold' : 'text-u-muted'}
        >
          Расписания
        </a>
        <a
          href="/vuc"
          aria-current={vucOnly ? 'page' : undefined}
          className={vucOnly ? 'font-semibold' : 'text-u-muted'}
        >
          ВУЦ
        </a>
      </nav>
      <div
        className="space-doodle ml-5 hidden min-[1300px]:flex items-center gap-2 text-[11px] leading-[1.4] font-semibold compact:hidden"
        aria-hidden="true"
      >
        <span className="rotate-[-12deg] bg-[#ffe393] px-[7px] py-[3px] text-[17px] text-[#171b18] dark:bg-[#ddc36d]">
          42
        </span>
        <img
          className="size-[54px] shrink-0 object-contain dark:invert"
          src="/assets/planet.webp"
          width="60"
          height="60"
          alt=""
        />
        <span className="max-[1100px]:hidden">
          В хорошей компании
          <br />и время летит приятнее.
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center">{viewControl}</div>
      <div className="header-actions flex shrink-0 items-center gap-0">
        <HelpDialog />
        <IconButton
          name={theme === 'dark' ? 'sun' : 'moon'}
          label={
            theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'
          }
          aria-pressed={theme === 'dark'}
          onClick={onToggleTheme}
        />
        {settingsControl}
      </div>
    </header>
  );
}
