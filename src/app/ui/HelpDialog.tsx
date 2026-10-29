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
          Добавь группы и подгруппы. Время — по Омску.
        </Dialog.Description>
        <dl className="my-3.5">
          <dt className="mt-3 text-sm font-bold">В вузе</dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-u-muted">
            Когда все выбранные группы в вузе: от первой до последней очной
            пары, включая перерывы.
          </dd>
          <dt className="mt-3 text-sm font-bold">Без занятий</dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-u-muted">
            Общие перерывы в это время. Онлайн-пары тоже учитываем.
          </dd>
        </dl>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          У каждой группы свой цвет. Значок фокуса рядом с группой выделяет её
          занятия; можно выделить несколько групп. Нажми на пару, чтобы открыть
          подробности.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          Янтарная линия — общее время в вузе, зелёные полосы — общие окна без
          занятий. Видимость обоих слоёв меняется в настройках отображения.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          Текущую неделю проверяем при обращении, не чаще раза в 30 минут.
          Значок часов означает сохранённые данные.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          Сравниваем расписания — корпуса могут различаться.
        </p>
        <details className="my-3 text-xs leading-relaxed text-u-muted">
          <summary className="cursor-pointer rounded-u-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-u-focus">
            Клавиатура
          </summary>
          <p className="mt-2">
            На кнопках дней: ← → — день, Home / End — начало / конец недели,
            Page Up / Page Down — неделя. На выборе недели работают и ← →.
          </p>
        </details>
        <PwaHelp />
      </Dialog.Content>
    </Dialog.Root>
  );
}
