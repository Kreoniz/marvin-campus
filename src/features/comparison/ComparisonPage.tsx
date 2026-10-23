import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { Alert } from 'unlikely-ui/alert';
import { Button } from 'unlikely-ui/button';
import { Card } from 'unlikely-ui/card';
import { Theme, type Appearance } from 'unlikely-ui/theme';
import { Toast } from 'unlikely-ui/toast';
import { useComparison, type Notify } from './model/use-comparison.ts';
import { initAnalytics, track } from '../../lib/analytics.ts';
import { usePwa, updatePwa } from '../../lib/pwa.ts';
import { scheduleNavigation } from '../../lib/keyboard.ts';
import SiteHeader from '../../app/ui/SiteHeader.tsx';
import GroupOrder from '../groups/ui/GroupOrder.tsx';
import GroupPicker from '../groups/ui/GroupPicker.tsx';
import ComparisonToolbar from './ui/ComparisonToolbar.tsx';
import ComparisonStatus from './ui/ComparisonStatus.tsx';
import MobileDayNav from './ui/MobileDayNav.tsx';
import MobileComparisonPanel from './ui/MobileComparisonPanel.tsx';
import Calendar from '../schedule/ui/Calendar.tsx';
import DayDetail from './ui/DayDetail.tsx';
import Icon from '../../shared/ui/Icon.tsx';

const compactQuery =
  '(max-width: 700px), (max-width: 1000px) and (max-height: 500px)';

export default function ComparisonPage() {
  const manager = Toast.useToastManager();
  const notify = useCallback<Notify>(
    (message, kind = 'success') => {
      manager.add({ title: message, type: kind === 'error' ? 'danger' : kind });
    },
    [manager],
  );
  const { view, links, source, colors, subgroupCatalog } =
    useComparison(notify);
  const pwa = usePwa();
  const [theme, setTheme] = useState<Appearance>(
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  const [mobile, setMobile] = useState(() => matchMedia(compactQuery).matches);
  const [mobileView, setMobileView] = useState<'day' | 'week'>('day');
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderFocus, setOrderFocus] = useState(0);
  const groups = view.groups,
    week = view.week,
    day = view.day,
    mode = view.mode;
  const busy = links.opening || source.pending;

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('campus-theme', next);
    } catch {}
    track('theme_changed', { theme: next });
  }
  useEffect(() => {
    document.title = `Кампус — ${groups.length ? groups.map((group) => group.label).join(' + ') : 'найдём время пересечься'}`;
  }, [groups]);
  useEffect(() => {
    void initAnalytics();
    const size = matchMedia(compactQuery);
    const preference = matchMedia('(prefers-color-scheme: dark)');
    const resize = () => setMobile(size.matches);
    const applyTheme = () => {
      try {
        if (localStorage.getItem('campus-theme')) return;
      } catch {}
      const next = preference.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    size.addEventListener('change', resize);
    preference.addEventListener('change', applyTheme);
    return () => {
      size.removeEventListener('change', resize);
      preference.removeEventListener('change', applyTheme);
    };
  }, []);
  useEffect(() => {
    const navigate = (event: KeyboardEvent) => {
      if (
        links.opening ||
        links.error ||
        !(event.target instanceof HTMLElement)
      )
        return;
      const target = event.target;
      const openPopup = [
        ...document.querySelectorAll<HTMLElement>(
          '[role="dialog"], [role="menu"], [role="listbox"]',
        ),
      ].some(
        (popup) =>
          popup.getClientRects().length > 0 &&
          !popup.closest('[hidden], [inert], [aria-hidden="true"]'),
      );
      if (
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
        ) ||
        openPopup
      )
        return;
      const dayButton = target.closest<HTMLElement>('[data-schedule-day]');
      if (!dayButton && !target.closest('[data-schedule-week]')) return;
      const action = scheduleNavigation(
        event,
        dayButton ? 'day' : 'week',
        dayButton?.dataset.scheduleDay ?? view.day,
        view.week,
      );
      if (!action) return;
      event.preventDefault();
      const controls = dayButton?.closest('[data-schedule-days]');
      flushSync(() => {
        if (action.type === 'week') view.selectWeek(action.value);
        else view.selectDay(action.value);
      });
      controls
        ?.querySelector<HTMLButtonElement>(`[data-schedule-day="${view.day}"]`)
        ?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, [view, links]);

  return (
    <Theme
      appearance={theme}
      className="campus-theme min-h-svh bg-u-canvas text-u-ink"
      tokens={{ '--u-accent': '#87f19d' }}
    >
      <a
        className="fixed top-2 left-2 z-[200] -translate-y-[160%] rounded-u-control bg-u-accent p-2.5 text-u-accent-ink focus:translate-y-0"
        href="#comparison"
      >
        Перейти к расписанию
      </a>
      <GroupOrder
        groups={groups}
        colors={colors}
        open={orderOpen}
        onOpenChange={setOrderOpen}
        onMove={view.move}
        returnFocus={orderFocus}
      />
      <div className="app-shell mx-auto max-w-[1440px] px-6 pt-2 compact:px-3 compact:pt-1">
        <SiteHeader theme={theme} onToggleTheme={toggleTheme} />
        <main>
          {pwa.offline && (
            <p className="my-2 text-xs text-u-muted" role="status">
              Нет сети. Доступны сохранённые расписания.
            </p>
          )}
          <h1 className="sr-only">Сравнение расписаний ОмГТУ</h1>
          {links.error ? (
            <Card.Root
              id="comparison"
              className="grid min-h-[200px] justify-items-start gap-5 p-7"
              aria-live="polite"
            >
              <Alert.Root tone="danger">
                <Alert.Title>Не удалось открыть сравнение</Alert.Title>
                <Alert.Description>{links.error}</Alert.Description>
              </Alert.Root>
              {links.canRetryOpening && (
                <Button onClick={links.retryOpening}>Повторить открытие</Button>
              )}
              <Button
                render={<a href="/" aria-label="Открыть своё расписание" />}
              >
                Открыть своё расписание
              </Button>
            </Card.Root>
          ) : (
            <>
              <Card.Root
                id="comparison"
                className="comparison overflow-hidden compact:-mx-3 compact:rounded-none compact:border-x-0"
                role="region"
                aria-label="Сравнение расписаний"
                aria-busy={busy}
              >
                <ComparisonToolbar
                  view={view}
                  schedules={source.schedules}
                  subgroupCatalog={subgroupCatalog}
                  colors={colors}
                  opening={links.opening}
                  onOrder={(id) => {
                    setOrderFocus(id);
                    setOrderOpen(true);
                  }}
                  onError={(message) => notify(message, 'error')}
                />
                {groups.length || links.opening ? (
                  <>
                    {mobile && (
                      <MobileDayNav
                        view={view}
                        opening={links.opening}
                        mobileView={mobileView}
                        onMobileViewChange={setMobileView}
                      />
                    )}
                    {mobile ? (
                      <MobileComparisonPanel
                        section="controls"
                        view={view}
                        schedules={source.schedules}
                        links={links}
                        fetching={links.opening || source.fetching}
                        loading={busy}
                        opening={links.opening}
                      />
                    ) : (
                      <ComparisonStatus
                        schedules={source.schedules}
                        fetching={links.opening || source.fetching}
                        links={links}
                      />
                    )}
                    <Calendar
                      schedules={source.schedules}
                      colors={colors}
                      subgroupCatalog={subgroupCatalog}
                      week={week}
                      day={day}
                      mode={mode}
                      loading={busy}
                      placeholder={links.opening}
                      onDay={view.selectDay}
                      compact={mobile}
                      singleDay={mobile && mobileView === 'day'}
                    />
                    {mobile && (
                      <MobileComparisonPanel
                        section="result"
                        view={view}
                        schedules={source.schedules}
                        links={links}
                        fetching={links.opening || source.fetching}
                        loading={busy}
                        opening={links.opening}
                      />
                    )}
                  </>
                ) : (
                  <div className="welcome flex min-h-[340px] items-center justify-center gap-10 px-6 py-9 compact:min-h-[380px] compact:flex-col compact:gap-4 compact:px-[15px] compact:py-6 compact:text-center">
                    <img
                      className="h-[210px] w-[190px] shrink-0 object-contain compact:h-[145px] compact:w-[135px]"
                      src="/assets/mascot-m2-thinking-v1.webp"
                      width="190"
                      height="210"
                      alt="Робот ждёт расписание"
                    />
                    <div>
                      <h2 className="mb-3 text-[28px] font-bold tracking-[-1px] compact:text-2xl">
                        С кем пересечёмся?
                      </h2>
                      <p className="mb-5 text-[15px] leading-relaxed text-u-muted compact:mb-[15px] compact:text-[13px]">
                        Добавь свою группу и группу друга.
                        <br />С одной группой можно посмотреть своё расписание.
                      </p>
                      <GroupPicker
                        labelled
                        selected={groups}
                        onAdd={view.add}
                        onError={(message) => notify(message, 'error')}
                      />
                      <button
                        className="example-button mt-3.5 block cursor-pointer border-0 bg-transparent p-0 text-xs text-u-muted underline underline-offset-4 compact:mx-auto"
                        onClick={view.example}
                      >
                        Посмотреть ИВТ-241 и ИВТ-242{' '}
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                )}
              </Card.Root>
              {(groups.length > 0 || links.opening) && !mobile && (
                <DayDetail
                  schedules={source.schedules}
                  colors={colors}
                  subgroupCatalog={subgroupCatalog}
                  day={day}
                  mode={mode}
                  loading={busy}
                  placeholder={links.opening}
                />
              )}
            </>
          )}
        </main>
        <footer className="app-footer my-5 flex justify-end border-t border-[var(--u-line-soft)] pt-3.5 text-[11px] text-u-muted compact:text-[10px]">
          <a
            className="inline-flex items-center gap-[5px] no-underline hover:underline"
            href="https://rasp.omgtu.ru"
            target="_blank"
            rel="noreferrer"
          >
            Источник расписания <Icon name="external" size={13} />
          </a>
        </footer>
      </div>
      {pwa.waiting && (
        <aside
          className="pwa-update fixed bottom-[18px] left-1/2 z-[80] flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 rounded-[var(--u-panel-radius)] border border-u-line bg-u-raised p-3 text-[13px] shadow-[var(--u-shadow-md)]"
          role="status"
        >
          <span>Доступно обновление приложения.</span>
          <Button disabled={pwa.updating} onClick={updatePwa}>
            Обновить
          </Button>
        </aside>
      )}
      <Toast.Viewport
        aria-label="Уведомления"
        closeLabel="Закрыть уведомление"
      />
    </Theme>
  );
}
