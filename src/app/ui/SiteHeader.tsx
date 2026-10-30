import { Badge } from 'unlikely-ui/badge';
import type { ReactNode } from 'react';
import HelpDialog from './HelpDialog.tsx';
import IconButton from '../../shared/ui/IconButton.tsx';

export default function SiteHeader({
  theme,
  onToggleTheme,
  viewControl,
  settingsControl,
}: {
  theme: string;
  onToggleTheme: () => void;
  viewControl?: ReactNode;
  settingsControl: ReactNode;
}) {
  return (
    <header className="site-header mb-5 flex items-center gap-4 border-b border-[var(--u-line-soft)] pt-2 pb-4 compact:-mx-3 compact:mb-1 compact:min-h-11 compact:flex-nowrap compact:gap-0.5 compact:max-[359px]:gap-0 compact:border-b-0 compact:px-1 compact:py-0">
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
          <Badge className="border-u-accent-border bg-[var(--u-accent-soft)] text-[11px] tracking-[1px] text-[var(--u-accent-text)] compact:hidden">
            Don't Panic
          </Badge>
        </span>
      </a>
      <span className="mr-auto text-sm text-u-muted compact:hidden">
        Расписание ОмГТУ
      </span>
      <div
        className="space-doodle flex items-center gap-3 text-[11px] leading-[1.4] font-semibold compact:hidden"
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
      <div className="ml-auto hidden shrink-0 items-center compact:flex">
        {viewControl}
      </div>
      <div className="header-actions flex shrink-0 gap-0.5 compact:[&_.icon-button]:size-11 compact:[&_.icon-button]:min-h-11 compact:[&_.icon-button]:min-w-11">
        <HelpDialog />
        <IconButton
          name={theme === 'dark' ? 'sun' : 'moon'}
          label={
            theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'
          }
          aria-pressed={theme === 'dark'}
          onClick={onToggleTheme}
        />
      </div>
      {settingsControl}
    </header>
  );
}
