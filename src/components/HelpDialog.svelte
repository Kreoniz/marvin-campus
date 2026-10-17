<script lang="ts">
  import { Dialog } from 'bits-ui';
  import Hint from './Hint.svelte';
  import Icon from './Icon.svelte';
  import PwaHelp from './PwaHelp.svelte';
</script>

<Dialog.Root
  ><Hint label="Как работает сравнение"
    >{#snippet children(props)}<Dialog.Trigger
        {...props}
        class="icon-button help-button"
        aria-label="Как работает сравнение"><Icon name="info" /></Dialog.Trigger
      >{/snippet}</Hint
  ><Dialog.Portal
    ><Dialog.Overlay class="dialog-overlay" /><Dialog.Content
      class="dialog-content help-dialog"
      ><div class="dialog-heading">
        <Dialog.Title>Как найдём общее время</Dialog.Title><Hint
          label="Закрыть справку"
          >{#snippet children(props)}<Dialog.Close
              {...props}
              class="icon-button"
              aria-label="Закрыть справку"><Icon name="close" /></Dialog.Close
            >{/snippet}</Hint
        >
      </div>
      <Dialog.Description
        >Выбери группы и подгруппы. Время — по Омску; сравниваем всех выбранных.</Dialog.Description
      >
      <dl>
        <dt>В вузе</dt>
        <dd>
          Пересечение времени от первой до последней очной пары, включая
          перерывы.
        </dd>
        <dt>Без занятий</dt>
        <dd>
          Внутри общего времени в вузе ни у кого нет занятий. Онлайн-пары тоже
          занимают время.
        </dd>
        <dt>Общие занятия</dt>
        <dd>
          Одно занятие источника у всех групп, а не просто одинаковый предмет.
        </dd>
      </dl>
      <p class="help-note">
        <strong>Данные.</strong> По запросу: текущая неделя — 10 мин; будущая — 1
        ч; прошлая и поиск — 24 ч. Свежие данные используем повторно.
      </p>
      <p class="help-note">
        <strong>Цвета.</strong> У каждой группы свой цвет. Сохраняем при перестановке;
        новой группе подбираем свободный. Полоска объединяет участников общей пары;
        бейдж — тип занятия. Диагональные полосы — несколько отдельных занятий одной
        группы одновременно; подробности по нажатию.
      </p>
      <p class="help-note">
        Корпуса могут различаться. Присутствие предполагаем по расписанию;
        сохранённые данные отмечаем значком часов, а подробности доступны в
        состоянии данных.
      </p>
      <p class="help-note">
        <strong>Клавиатура.</strong> На кнопках дней: ← и → — выбрать день, Home и
        End — начало и конец недели. Page Up и Page Down — предыдущая и следующая
        неделя. На кнопках выбора недели работают и ← / →. В полях ввода и открытых
        меню эти команды не действуют.
      </p>
      <PwaHelp /></Dialog.Content
    ></Dialog.Portal
  ></Dialog.Root
>

<style>
  :global(.help-dialog) dl {
    margin-block: 12px;
  }
  :global(.help-dialog) dt {
    font-weight: 750;
    margin-top: 10px;
    font-size: 14px;
  }
  :global(.help-dialog) dd {
    margin: 4px 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--muted);
  }
  .help-note {
    margin: 10px 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
  }
  .help-note strong {
    color: var(--ink);
  }
</style>
