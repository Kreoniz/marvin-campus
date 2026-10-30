import { useCallback, useEffect, useRef, useState } from 'react';
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
import { monday, omskToday } from '../../lib/dates.ts';
import useScheduleHotkeys from './model/use-schedule-hotkeys.ts';
import SiteHeader from '../../app/ui/SiteHeader.tsx';
import GroupPicker, { GroupPickerTrigger } from '../groups/ui/GroupPicker.tsx';
import ComparisonToolbar from './ui/ComparisonToolbar.tsx';
import ComparisonStatus from './ui/ComparisonStatus.tsx';
import MobileDayNav from './ui/MobileDayNav.tsx';
import Calendar from '../schedule/ui/Calendar.tsx';
import SourceDayCalendar from '../schedule/ui/SourceDayCalendar.tsx';
import ComparisonSummary from './ui/ComparisonSummary.tsx';
import DayDetail from './ui/DayDetail.tsx';
import Icon from '../../shared/ui/Icon.tsx';
import DisplaySettings from './ui/DisplaySettings.tsx';
import type { CalendarLayers } from '../schedule/ui/ComparisonHighlights.tsx';
import DayAgenda from '../schedule/ui/DayAgenda.tsx';
import type { ScheduleKind, Selection } from '../../lib/types.ts';
import { scheduleKey, selectionKind } from '../../lib/schedule-ref.ts';
import VucSources from '../resources/VucSources.tsx';
import VucCatalogue from '../resources/VucCatalogue.tsx';
import { nearestVucDate } from '../../lib/vuc-navigation.ts';
import { ResourceProvider } from '../resources/ResourceInspector.tsx';
import ScheduleViewPicker, {
  type ScheduleView,
} from './ui/ScheduleViewPicker.tsx';

const compactQuery =
  '(max-width: 700px), (max-width: 1000px) and (max-height: 500px)';

export default function ComparisonPage({
  vucOnly = false,
}: {
  vucOnly?: boolean;
}) {
  const manager = Toast.useToastManager();
  const searchMutation = useRef(false);
  const notify = useCallback<Notify>(
    (message, kind = 'success') => {
      if (searchMutation.current && kind === 'success') return;
      manager.add({ title: message, type: kind === 'error' ? 'danger' : kind });
    },
    [manager],
  );
  const { view, links, source, colors, subgroupCatalog } = useComparison(
    notify,
    vucOnly,
  );
  const pwa = usePwa();
  const [theme, setTheme] = useState<Appearance>(
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  const [mobile, setMobile] = useState(() => matchMedia(compactQuery).matches);
  const [scheduleView, setScheduleView] = useState<ScheduleView>(() =>
    vucOnly || matchMedia(compactQuery).matches ? 'day' : 'week',
  );
  const [dayReveal, setDayReveal] = useState(0);
  const [spotlightGroupIds, setSpotlightGroupIds] = useState<string[]>([]);
  const addGroupRef = useRef<HTMLButtonElement>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [layers, setLayers] = useState<CalendarLayers>({
    presence: true,
    free: true,
  });
  const [orderFocus, setOrderFocus] = useState('');
  const [hiddenKinds, setHiddenKinds] = useState<ScheduleKind[]>([]);
  const [vimHotkeys, setVimHotkeys] = useState(() => {
    try {
      return localStorage.getItem('campus-vim-hotkeys') !== 'off';
    } catch {
      return true;
    }
  });
  function toggleVimHotkeys(value: boolean) {
    setVimHotkeys(value);
    try {
      localStorage.setItem('campus-vim-hotkeys', value ? 'on' : 'off');
    } catch {}
  }
  const groups = view.groups,
    week = view.week,
    day = view.day,
    mode = view.mode;
  const busy = links.opening || source.pending;
  const spotlightIds =
    groups.length > 1
      ? spotlightGroupIds.filter((id) =>
          groups.some(
            (group) =>
              scheduleKey(group) === id &&
              !hiddenKinds.includes(selectionKind(group)),
          ),
        )
      : [];
  const spotlightLabel =
    groups
      .filter((group) => spotlightIds.includes(scheduleKey(group)))
      .map((group) => group.label)
      .join(', ') || undefined;
  useEffect(() => {
    setSpotlightGroupIds((current) => {
      const next =
        groups.length > 1
          ? current.filter((id) =>
              groups.some((group) => scheduleKey(group) === id),
            )
          : [];
      return next.length === current.length ? current : next;
    });
  }, [groups]);
  function addSchedule(selection: Selection) {
    if (
      view.groups.some(
        (current) => scheduleKey(current) === scheduleKey(selection),
      )
    ) {
      notify(`${selection.label} уже в календаре.`, 'info');
      return;
    }
    if (view.groups.length >= 30) {
      notify(
        'Можно выбрать до 30 расписаний. Убери одно, чтобы добавить другое.',
        'info',
      );
      return;
    }
    view.addSchedule(
      selection,
      !groups.length ? nearestVucDate(selection, day) : undefined,
    );
  }
  function fromSearch(action: () => void) {
    searchMutation.current = true;
    try {
      action();
    } finally {
      searchMutation.current = false;
    }
  }
  function selectFormat(value: ScheduleView) {
    view.cancelInitialDate();
    if (value === scheduleView) return;
    setScheduleView(value);
    track('mobile_view_changed', { view: value });
  }
  function selectToday() {
    view.cancelInitialDate();
    const today = omskToday();
    if (view.day !== today || view.week !== monday(today))
      view.selectDate(today);
    // A repeated request must also reveal an already selected, offscreen day.
    setDayReveal((current) => current + 1);
  }

  useScheduleHotkeys({
    view,
    enabled: vimHotkeys && !links.opening && !links.error,
    onSearch: () => {
      setOrderFocus('');
      setOrderOpen(true);
    },
    onView: selectFormat,
    onToday: selectToday,
  });

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
    document.title = `${vucOnly ? 'ВУЦ · ' : ''}Кампус — ${groups.length ? groups.map((group) => group.label).join(' + ') : 'найдём время пересечься'}`;
  }, [groups, vucOnly]);
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
      <ResourceProvider onAdd={addSchedule} schedules={source.schedules}>
        <a
          className="fixed top-2 left-2 z-[200] -translate-y-[160%] rounded-u-control bg-u-accent p-2.5 text-u-accent-ink focus:translate-y-0"
          href="#comparison"
        >
          Перейти к расписанию
        </a>
        <div className="app-shell mx-auto max-w-[1440px] px-6 pt-2 compact:px-3 compact:pt-1">
          <SiteHeader
            vucOnly={vucOnly}
            theme={theme}
            onToggleTheme={toggleTheme}
            viewControl={
              (groups.length > 0 || links.opening) && (
                <ScheduleViewPicker
                  value={scheduleView}
                  onChange={selectFormat}
                  disabled={links.opening}
                />
              )
            }
            settingsControl={
              <DisplaySettings
                vimHotkeys={vimHotkeys}
                onVimHotkeys={toggleVimHotkeys}
                layers={layers}
                onLayers={setLayers}
                hiddenKinds={hiddenKinds}
                onHiddenKinds={setHiddenKinds}
                spotlightLabel={spotlightLabel}
                onClearSpotlight={() => setSpotlightGroupIds([])}
              />
            }
          />
          <main>
            {pwa.offline && (
              <p className="my-2 text-xs text-u-muted" role="status">
                Нет сети. Доступны сохранённые расписания.
              </p>
            )}
            <h1 className="sr-only">
              {vucOnly
                ? 'Сравнение расписаний ВУЦ'
                : 'Сравнение расписаний ОмГТУ'}
            </h1>
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
                  <Button onClick={links.retryOpening}>
                    Повторить открытие
                  </Button>
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
                  className="comparison overflow-clip compact:-mx-3 compact:rounded-none compact:border-x-0"
                  role="region"
                  aria-label="Сравнение расписаний"
                  aria-busy={busy}
                >
                  <GroupPicker
                    vucOnly={vucOnly}
                    hiddenKinds={hiddenKinds}
                    selected={groups}
                    onAdd={(selection) =>
                      fromSearch(() => addSchedule(selection))
                    }
                    returnFocus={addGroupRef}
                    open={orderOpen}
                    onOpenChange={setOrderOpen}
                    colors={colors}
                    onMove={(key, offset) =>
                      fromSearch(() => view.move(key, offset))
                    }
                    onReorder={(groups) =>
                      fromSearch(() => view.reorder(groups))
                    }
                    onRemove={(key) => fromSearch(() => view.remove(key))}
                    focusScheduleKey={orderFocus}
                  >
                    <ComparisonToolbar
                      view={view}
                      schedules={source.schedules}
                      hiddenKinds={hiddenKinds}
                      subgroupCatalog={subgroupCatalog}
                      colors={colors}
                      opening={links.opening}
                      onOrder={(id) => {
                        setOrderFocus(id);
                        setOrderOpen(true);
                      }}
                      spotlightIds={spotlightIds}
                      onRemove={view.remove}
                      onClearSpotlights={() => setSpotlightGroupIds([])}
                      hasSpotlights={spotlightGroupIds.length > 0}
                      onSpotlight={(id) =>
                        setSpotlightGroupIds((current) =>
                          current.includes(id)
                            ? current.filter((value) => value !== id)
                            : [...current, id],
                        )
                      }
                      addGroupRef={addGroupRef}
                      onGroups={() => setOrderFocus('')}
                      onToday={selectToday}
                    />
                    {groups.length || links.opening ? (
                      <>
                        {(mobile || scheduleView !== 'week') && (
                          <MobileDayNav
                            vucOnly={vucOnly}
                            view={view}
                            opening={links.opening}
                            showWeekControls={mobile}
                            onToday={selectToday}
                          />
                        )}
                        {!mobile && !vucOnly && (
                          <ComparisonStatus
                            schedules={source.schedules}
                            day={day}
                            fetching={links.opening || source.fetching}
                            links={links}
                          />
                        )}
                        {scheduleView === 'list' ? (
                          <DayAgenda
                            schedules={source.schedules}
                            colors={colors}
                            subgroupCatalog={subgroupCatalog}
                            day={day}
                            loading={busy}
                            placeholder={links.opening}
                            spotlightIds={spotlightIds}
                            hiddenKinds={hiddenKinds}
                          />
                        ) : scheduleView === 'day' ? (
                          <SourceDayCalendar
                            vucOnly={vucOnly}
                            schedules={source.schedules}
                            colors={colors}
                            subgroupCatalog={subgroupCatalog}
                            day={day}
                            layers={layers}
                            loading={busy}
                            placeholder={links.opening}
                            spotlightIds={spotlightIds}
                            hiddenKinds={hiddenKinds}
                          />
                        ) : (
                          <Calendar
                            vucOnly={vucOnly}
                            schedules={source.schedules}
                            colors={colors}
                            subgroupCatalog={subgroupCatalog}
                            week={week}
                            day={day}
                            layers={layers}
                            loading={busy}
                            placeholder={links.opening}
                            onDay={view.selectDay}
                            dayReveal={dayReveal}
                            compact={mobile}
                            singleDay={false}
                            spotlightIds={spotlightIds}
                            hiddenKinds={hiddenKinds}
                          />
                        )}
                        {groups.some((group) =>
                          hiddenKinds.includes(selectionKind(group)),
                        ) && (
                          <div
                            className="flex flex-wrap items-center justify-between gap-2 border-t border-u-line-soft px-3 py-1 text-xs text-u-muted"
                            role="status"
                          >
                            <span>
                              Часть карточек скрыта. Состав расчёта сохранён.
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-8 text-xs underline"
                              onClick={() => setHiddenKinds([])}
                            >
                              Показать всё
                            </Button>
                          </div>
                        )}
                        {(mobile || vucOnly || scheduleView !== 'week') && (
                          <div className="calendar-result px-3 py-2">
                            <ComparisonSummary
                              schedules={source.schedules}
                              hiddenKinds={hiddenKinds}
                              day={day}
                              mode={mode}
                              loading={busy}
                              placeholder={links.opening}
                              compact
                            />
                          </div>
                        )}
                        <VucSources schedules={source.schedules} />
                        {(mobile || vucOnly) && (
                          <ComparisonStatus
                            schedules={source.schedules}
                            day={day}
                            fetching={links.opening || source.fetching}
                            links={links}
                          />
                        )}
                      </>
                    ) : vucOnly ? (
                      <VucCatalogue
                        onAdd={(selection) => {
                          addSchedule(selection);
                          setOrderFocus('');
                          setOrderOpen(true);
                        }}
                      />
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
                            Добавь группу, преподавателя, аудиторию или взвод.
                            <br />
                            Все выбранные расписания — в одном календаре.
                          </p>
                          <GroupPickerTrigger labelled />
                          <a
                            href="/vuc"
                            className="ml-3 inline-flex min-h-11 items-center text-sm underline underline-offset-2"
                          >
                            Расписания ВУЦ →
                          </a>
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
                  </GroupPicker>
                </Card.Root>
                {(groups.length > 0 || links.opening) &&
                  !mobile &&
                  !vucOnly &&
                  scheduleView === 'week' && (
                    <DayDetail
                      schedules={source.schedules}
                      hiddenKinds={hiddenKinds}
                      colors={colors}
                      subgroupCatalog={subgroupCatalog}
                      day={day}
                      mode={mode}
                      layers={layers}
                      loading={busy}
                      placeholder={links.opening}
                      spotlightIds={spotlightIds}
                      spotlightLabel={spotlightLabel}
                      onClearSpotlight={() => setSpotlightGroupIds([])}
                    />
                  )}
              </>
            )}
          </main>
          <footer className="app-footer my-4 flex justify-end text-[11px] text-u-muted compact:text-[10px]">
            <a
              className="inline-flex items-center gap-[5px] no-underline hover:underline"
              href={vucOnly ? 'https://vuc.omgtu.ru' : 'https://rasp.omgtu.ru'}
              target="_blank"
              rel="noreferrer"
            >
              {vucOnly ? 'Сайт ВУЦ' : 'Источник расписания'}{' '}
              <Icon name="external" size={13} />
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
      </ResourceProvider>
    </Theme>
  );
}
