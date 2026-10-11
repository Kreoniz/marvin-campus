<script lang="ts">
  import { pwa, installPwa } from '../lib/pwa.svelte.ts';
</script>

<div class="pwa-help">
  <p class="help-note">
    <strong>Приложение (PWA).</strong>
    {#if pwa.installed}Установлено.{:else if !pwa.install}Меню браузера →
      «Установить»; iPhone: «Поделиться» → «На экран Домой».{/if}
    Открытые расписания доступны офлайн с датой проверки. Новые данные требуют сети.
  </p>
  {#if pwa.install && !pwa.installed}
    <button class="button" onclick={() => void installPwa()}
      >Установить приложение</button
    >
  {/if}
</div>

<style>
  .pwa-help {
    border-top: 1px solid var(--grid);
    margin-top: 12px;
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
