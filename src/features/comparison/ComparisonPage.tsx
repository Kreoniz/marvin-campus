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
import ComparisonSummary from './ui/ComparisonSummary.tsx';
import MobileDayNav from './ui/MobileDayNav.tsx';
import Calendar from '../schedule/ui/Calendar.tsx';
import DayDetail from './ui/DayDetail.tsx';
import Icon from '../../shared/ui/Icon.tsx';

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
  const [mobile, setMobile] = useState(innerWidth <= 700);
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
    const size = matchMedia('(max-width: 700px)');
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
      className="campus-theme"
      tokens={{ '--u-accent': '#87f19d' }}
    >
      <a className="skip-link" href="#comparison">
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
      <div className="app-shell">
        <SiteHeader theme={theme} onToggleTheme={toggleTheme} />
        <main>
          {pwa.offline && (
            <p className="offline-note" role="status">
              Нет сети. Доступны сохранённые расписания.
            </p>
          )}
          <h1 className="sr-only">Сравнение расписаний ОмГТУ</h1>
          {links.error ? (
            <Card.Root
              id="comparison"
              className="share-state"
              aria-live="polite"
            >
              <Alert.Root tone="danger">
                <Alert.Title>Не удалось открыть сравнение</Alert.Title>
                <Alert.Description>{links.error}</Alert.Description>
              </Alert.Root>
              <Button render={<a href="/" />}>Открыть своё расписание</Button>
            </Card.Root>
          ) : (
            <>
              <Card.Root
                id="comparison"
                className="comparison"
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
                    <ComparisonStatus
                      schedules={source.schedules}
                      fetching={links.opening || source.fetching}
                      links={links}
                    />
                    {mobile && (
                      <div className="mobile-result">
                        <ComparisonSummary
                          schedules={source.schedules}
                          day={day}
                          mode={mode}
                          loading={busy}
                          placeholder={links.opening}
                          compact
                        />
                      </div>
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
                      singleDay={mobile && mobileView === 'day'}
                      compactHeader={mobile}
                    />
                  </>
                ) : (
                  <div className="welcome">
                    <img
                      src="/assets/mascot-m2-thinking-v1.webp"
                      width="190"
                      height="210"
                      alt="Робот ждёт расписание"
                    />
                    <div>
                      <h2>С кем пересечёмся?</h2>
                      <p>
                        Добавь свою группу и группу друга.
                        <br />С одной группой можно посмотреть своё расписание.
                      </p>
                      <GroupPicker
                        selected={groups}
                        onAdd={view.add}
                        onError={(message) => notify(message, 'error')}
                      />
                      <button className="example-button" onClick={view.example}>
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
        <footer className="app-footer">
          <a href="https://rasp.omgtu.ru" target="_blank" rel="noreferrer">
            Источник расписания <Icon name="external" size={13} />
          </a>
        </footer>
      </div>
      {pwa.waiting && (
        <aside className="pwa-update" role="status">
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
