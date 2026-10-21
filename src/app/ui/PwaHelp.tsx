import { Button } from 'unlikely-ui/button';
import { usePwa, installPwa } from '../../lib/pwa.ts';

export default function PwaHelp() {
  const pwa = usePwa();
  return (
    <div className="mt-4 border-t border-[var(--u-line-soft)]">
      <p className="my-3 text-xs leading-relaxed text-u-muted">
        <strong>Приложение.</strong>{' '}
        {pwa.installed
          ? 'Установлено.'
          : !pwa.install
            ? 'Меню браузера → «Установить». На iPhone: «Поделиться» → «На экран Домой».'
            : ''}{' '}
        Недавно открытые расписания доступны офлайн.
      </p>
      {pwa.install && !pwa.installed && (
        <Button variant="secondary" onClick={() => void installPwa()}>
          Установить приложение
        </Button>
      )}
    </div>
  );
}
