import { Badge } from 'unlikely-ui/badge';
import HelpDialog from './HelpDialog.tsx';
import IconButton from './IconButton.tsx';

export default function SiteHeader({
  theme,
  onToggleTheme,
}: {
  theme: string;
  onToggleTheme: () => void;
}) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Кампус, главная">
        <img
          className="brand-avatar"
          src="/assets/mascot-mint-head-v1.webp"
          width="60"
          height="60"
          alt=""
        />
        <span className="brand-copy">
          <span className="brand-name">Кампус</span>
          <Badge className="brand-tag">Don't Panic</Badge>
        </span>
      </a>
      <span className="brand-description">Расписание ОмГТУ</span>
      <div className="space-doodle" aria-hidden="true">
        <span className="forty-two">42</span>
        <img src="/assets/planet.webp" width="60" height="60" alt="" />
        <span>
          В хорошей компании
          <br />и время летит приятнее.
        </span>
      </div>
      <div className="header-actions">
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
    </header>
  );
}
