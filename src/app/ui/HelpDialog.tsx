import { Dialog } from 'unlikely-ui/dialog';
import IconButton from '../../shared/ui/IconButton.tsx';
import PwaHelp from './PwaHelp.tsx';

export default function HelpDialog({
  open,
  onOpenChange,
  hideTrigger = false,
  returnFocus,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  returnFocus?: () => HTMLElement | true;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <Dialog.Trigger
          render={<IconButton name="info" label="Как работает сравнение" />}
        />
      )}
      <Dialog.Content
        className="help-dialog max-h-[calc(100dvh-40px)] overflow-auto"
        finalFocus={returnFocus}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <Dialog.Title className="text-xl leading-7">
            Как пользоваться
          </Dialog.Title>
          <Dialog.Close
            render={<IconButton name="close" label="Закрыть справку" />}
          />
        </div>
        <Dialog.Description>
          Добавь группы, преподавателей, аудитории или взводы ВУЦ. Для группы
          выбери подгруппу. Время — по Омску.
        </Dialog.Description>
        <dl className="my-3 space-y-2 text-[13px] leading-relaxed">
          <div>
            <dt className="inline font-bold">В вузе</dt>{' '}
            <dd className="inline text-u-muted">
              — янтарная линия: общее время от первой до последней очной пары.
            </dd>
          </div>
          <div>
            <dt className="inline font-bold">Общие окна</dt>{' '}
            <dd className="inline text-u-muted">
              — зелёные полосы: в это время ни у кого нет занятий.
            </dd>
          </div>
        </dl>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          Нажми на занятие, чтобы открыть подробности. В меню расписания можно
          выделить его пары; в «Отображение» — скрыть слои или виды карточек.
          Часы отмечают сохранённые данные.
        </p>
        <details className="my-3 text-xs leading-relaxed text-u-muted">
          <summary className="min-h-9 cursor-pointer rounded-u-control py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-u-focus">
            Расчёты и источники
          </summary>
          <p className="mt-2">
            Присутствие включает перерывы между очными парами. Онлайн-пары
            занимают время, но не расширяют присутствие. Корпуса могут
            различаться.
          </p>
          <p className="mt-2">
            Для преподавателей учтены только учебные занятия. Аудитории
            показывают занятость и не участвуют в расчёте общих окон.
          </p>
          <p className="mt-2">
            ВУЦ — из документов за указанный период. Неизвестные даты и
            неоднозначные строки не считаются пустым расписанием.
          </p>
          <p className="mt-2">
            Текущую неделю ОмГТУ проверяем при обращении, не чаще раза в 30
            минут. Недоступные расписания исключаются из расчёта; состав
            неполного сравнения указан рядом с результатом.
          </p>
        </details>
        <details className="my-3 text-xs leading-relaxed text-u-muted">
          <summary className="min-h-9 cursor-pointer rounded-u-control py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-u-focus">
            Клавиатура и Vim-шорткаты
          </summary>
          <p className="mt-2">
            На кнопках дней: ← → — день, Home / End — начало / конец недели,
            Page Up / Page Down — неделя. На выборе недели работают и ← →.
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 [&>dt]:font-mono [&>dd]:m-0">
            <dt>h / l</dt>
            <dd>Предыдущий / следующий день</dd>
            <dt>Shift+h / l</dt>
            <dd>На неделю назад / вперёд</dd>
            <dt>j / k</dt>
            <dd>Прокрутка вниз / вверх</dd>
            <dt>gg / Shift+g</dt>
            <dd>Начало / конец календаря</dd>
            <dt>t</dt>
            <dd>Сегодня</dd>
            <dt>/</dt>
            <dd>Поиск расписания</dd>
            <dt>1 / 2 / 3</dt>
            <dd>День / неделя / список</dd>
            <dt>?</dt>
            <dd>Эта справка</dd>
          </dl>
          <p className="mt-2">
            Работают и в русской раскладке, вне ввода и открытых окон.
            Отключаются в настройках отображения.
          </p>
        </details>
        <details className="mt-3 text-xs leading-relaxed text-u-muted">
          <summary className="min-h-9 cursor-pointer rounded-u-control py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-u-focus">
            Приложение и офлайн
          </summary>
          <PwaHelp />
        </details>
      </Dialog.Content>
    </Dialog.Root>
  );
}
