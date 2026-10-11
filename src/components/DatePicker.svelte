<script lang="ts">
  import { untrack } from 'svelte';
  import { Calendar } from 'bits-ui';
  import { parseDate } from '@internationalized/date';
  import { addDays, monday, omskToday, weekLabel } from '../lib/dates.ts';
  import Icon from './Icon.svelte';
  let { day, onselect }: { day: string; onselect: (day: string) => void } =
    $props();
  let value = $derived(parseDate(day));
  let placeholder = $state(untrack(() => parseDate(day)));
  let previewWeek = $state('');
</script>

<Calendar.Root
  type="single"
  {value}
  bind:placeholder
  onValueChange={(date) => date && onselect(date.toString())}
  locale="ru-RU"
  weekdayFormat="short"
  calendarLabel="Выбор даты расписания"
  weekStartsOn={1}
  fixedWeeks
  preventDeselect
  initialFocus
  minValue={parseDate(addDays(omskToday(), -730))}
  maxValue={parseDate(addDays(omskToday(), 730))}
  class="date-picker"
>
  {#snippet children({ months, weekdays })}
    <Calendar.Header class="date-picker-header">
      <Calendar.PrevButton class="icon-button" aria-label="Предыдущий месяц"
        ><Icon name="left" /></Calendar.PrevButton
      >
      <Calendar.Heading />
      <Calendar.NextButton class="icon-button" aria-label="Следующий месяц"
        ><Icon name="right" /></Calendar.NextButton
      >
    </Calendar.Header>
    {#each months as month}
      <Calendar.Grid class="date-picker-grid">
        <Calendar.GridHead
          ><Calendar.GridRow>
            {#each weekdays as weekday}<Calendar.HeadCell
                >{weekday}</Calendar.HeadCell
              >{/each}
          </Calendar.GridRow></Calendar.GridHead
        >
        <Calendar.GridBody>
          {#each month.weeks as dates}<Calendar.GridRow
              class={`date-picker-week ${monday(dates[0].toString()) === monday(day) ? 'selected-week' : ''} ${previewWeek === monday(dates[0].toString()) ? 'preview-week' : ''}`}
              onpointerenter={() => (previewWeek = monday(dates[0].toString()))}
              onpointerleave={() => (previewWeek = '')}
              onfocusin={() => (previewWeek = monday(dates[0].toString()))}
              onfocusout={() => (previewWeek = '')}
            >
              {#each dates as date}<Calendar.Cell {date} month={month.value}>
                  <Calendar.Day class="date-picker-day">{date.day}</Calendar.Day
                  >
                </Calendar.Cell>{/each}
            </Calendar.GridRow>{/each}
        </Calendar.GridBody>
      </Calendar.Grid>
    {/each}
  {/snippet}
</Calendar.Root>
<p class="date-picker-week-label" aria-live="polite">
  Неделя: {weekLabel(previewWeek || monday(day))}
</p>
<button class="button date-picker-today" onclick={() => onselect(omskToday())}
  >Сегодня</button
>
