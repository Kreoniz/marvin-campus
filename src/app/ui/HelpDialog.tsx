import { Dialog } from 'unlikely-ui/dialog';
import IconButton from '../../shared/ui/IconButton.tsx';
import PwaHelp from './PwaHelp.tsx';

export default function HelpDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={<IconButton name="info" label="Как работает сравнение" />}
      />
      <Dialog.Content className="help-dialog max-h-[calc(100dvh-40px)] overflow-auto">
        <div className="mb-3 flex items-start justify-between gap-3">
          <Dialog.Title className="text-xl leading-7">
            Как найдём общее время
          </Dialog.Title>
          <Dialog.Close
            render={<IconButton name="close" label="Закрыть справку" />}
          />
        </div>
        <Dialog.Description>
          Выбери группы и подгруппы. Время — по Омску; сравниваем всех
          выбранных.
        </Dialog.Description>
        <dl className="my-3.5">
          <dt className="mt-3 text-sm font-bold">В вузе</dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-u-muted">
            Пересечение времени от первой до последней очной пары, включая
            перерывы.
          </dd>
          <dt className="mt-3 text-sm font-bold">Без занятий</dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-u-muted">
            Внутри общего времени в вузе ни у кого нет занятий. Онлайн-пары тоже
            занимают время.
          </dd>
          <dt className="mt-3 text-sm font-bold">Общие занятия</dt>
          <dd className="mt-1 text-[13px] leading-relaxed text-u-muted">
            Одно занятие источника у всех групп, а не просто одинаковый предмет.
          </dd>
        </dl>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          <strong>Данные.</strong> По запросу: текущая неделя — 10 мин; будущая
          — 1 ч; прошлая и поиск — 24 ч. Свежие данные используем повторно.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          <strong>Цвета.</strong> У каждой группы свой цвет. Сохраняем при
          перестановке; новой группе подбираем свободный. Полоска объединяет
          участников общей пары; бейдж — тип занятия. Диагональные полосы —
          несколько отдельных занятий одной группы одновременно; подробности по
          нажатию.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          Корпуса могут различаться. Присутствие предполагаем по расписанию;
          сохранённые данные отмечаем значком часов, а подробности доступны в
          состоянии данных.
        </p>
        <p className="my-3 text-xs leading-relaxed text-u-muted">
          <strong>Клавиатура.</strong> На кнопках дней: ← и → — выбрать день,
          Home и End — начало и конец недели. Page Up и Page Down — предыдущая и
          следующая неделя. На кнопках выбора недели работают и ← / →. В полях
          ввода и открытых меню эти команды не действуют.
        </p>
        <PwaHelp />
      </Dialog.Content>
    </Dialog.Root>
  );
}
