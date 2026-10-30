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
        <dl className="my-3.5">
          <dt className="mt-3 text-sm font-bold">В вузе</dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-u-muted">
            Общее время участников расчёта: от первой до последней очной пары
            каждого, включая перерывы.
          </dd>
          <dt className="mt-3 text-sm font-bold">Без занятий</dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-u-muted">
            Общие перерывы в это время. Онлайн-пары тоже учитываем.
          </dd>
        </dl>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          У каждого расписания свой цвет. Значок фокуса рядом с ним выделяет его
          занятия; можно выделить несколько расписаний. Нажми на пару, чтобы
          открыть подробности.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          Янтарная линия — общее время в вузе, зелёные полосы — общие окна без
          занятий. Видимость обоих слоёв меняется в настройках отображения.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          Для преподавателей учтены только учебные занятия. Аудитории не
          участвуют в расчёте. ВУЦ — из документов: неизвестные и неоднозначные
          даты исключаются из расчёта, а не считаются пустыми.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          Расписание ОмГТУ на текущую неделю проверяем при обращении, не чаще
          раза в 30 минут. Значок часов означает сохранённые данные.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          Сравниваем расписания — корпуса могут различаться.
        </p>
        <details className="my-3 text-xs leading-relaxed text-u-muted">
          <summary className="cursor-pointer rounded-u-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-u-focus">
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
        <PwaHelp />
      </Dialog.Content>
    </Dialog.Root>
  );
}
