import { Button } from 'unlikely-ui/button';
import { usePwa, installPwa } from '../../lib/pwa.ts';

export default function PwaHelp() {
  const pwa = usePwa();
  return (
    <div className="mt-4 border-t border-[var(--u-line-soft)]">
      <p className="my-3 text-xs leading-relaxed text-u-muted">
        <strong>Приложение (PWA).</strong>{' '}
        {pwa.installed
          ? 'Установлено.'
          : !pwa.install
            ? 'Меню браузера → «Установить»; iPhone: «Поделиться» → «На экран Домой».'
            : ''}{' '}
        Открытые расписания доступны офлайн с датой проверки. Новые данные
        требуют сети.
      </p>
      {pwa.install && !pwa.installed && (
        <Button variant="secondary" onClick={() => void installPwa()}>
          Установить приложение
        </Button>
      )}
    </div>
  );
}
