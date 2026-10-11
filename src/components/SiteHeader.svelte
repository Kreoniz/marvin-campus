<script lang="ts">
  import HelpDialog from './HelpDialog.svelte';
  import IconButton from './IconButton.svelte';
  let { theme, ontoggletheme }: { theme: string; ontoggletheme: () => void } =
    $props();
</script>

<header class="site-header">
  <a class="brand" href="/" aria-label="Марвин Campus, главная"
    ><span class="brand-avatar"
      ><img
        src="/assets/marvin-logo-v3.webp"
        width="60"
        height="60"
        alt=""
      /></span
    >
    <span class="brand-copy"
      ><span class="brand-name">Марвин Campus</span><span class="eyebrow"
        >Don't Panic</span
      ></span
    ></a
  >
  <span class="brand-description">Расписание ОмГТУ</span>
  <div class="space-doodle" aria-hidden="true">
    <span class="forty-two">42</span><img
      src="/assets/planet.webp"
      width="60"
      height="60"
      alt=""
    /><span class="space-note"
      >В хорошей компании<br />и время летит приятнее.</span
    >
  </div>
  <div class="header-actions">
    <HelpDialog />
    <IconButton
      class="icon-button theme-button"
      name={theme === 'dark' ? 'sun' : 'moon'}
      label={theme === 'dark'
        ? 'Включить светлую тему'
        : 'Включить тёмную тему'}
      aria-pressed={theme === 'dark'}
      onclick={ontoggletheme}
    />
  </div>
</header>

<style>
  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 6px 0 10px;
    margin-bottom: 14px;
    border-bottom: 1.5px solid var(--line);
  }
  .brand {
    display: flex;
    gap: 4px;
    align-items: center;
    text-decoration: none;
    min-width: 0;
  }
  .brand-avatar {
    display: block;
    width: 60px;
    height: 60px;
    flex: none;
  }
  .brand-avatar img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .brand-copy {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-name {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -1px;
    white-space: nowrap;
  }
  .brand-description {
    font-size: 14px;
    color: var(--muted);
    margin-right: auto;
  }
  .header-actions {
    display: flex;
    gap: 2px;
    align-items: center;
  }
  .eyebrow {
    display: inline-block;
    background: var(--sage);
    color: #172214;
    font-size: 11px;
    letter-spacing: 1.3px;
    font-weight: 800;
    padding: 5px 11px;
    border-radius: 5px;
    margin-bottom: 0;
  }
  .space-doodle {
    position: relative;
    width: 240px;
    height: 46px;
    flex: none;
  }
  .space-doodle img {
    position: absolute;
    width: 60px;
    height: 60px;
    left: 42px;
    top: -7px;
  }
  :global([data-theme='dark']) .space-doodle img {
    filter: invert(1);
  }
  .forty-two {
    background: var(--yellow);
    color: #171b18;
    padding: 2px 6px;
    font-size: 17px;
    position: absolute;
    top: 8px;
    left: 1px;
    transform: rotate(-13deg);
  }
  .space-note {
    position: absolute;
    left: 108px;
    top: 10px;
    font-size: 10px;
    font-weight: 650;
    line-height: 1.3;
  }
  @media (max-width: 700px) {
    .site-header {
      padding: 12px 1px;
      gap: 7px;
    }
    .brand {
      gap: 2px;
    }
    .brand-avatar {
      width: 52px;
      height: 52px;
    }
    .brand-copy {
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
    }
    .brand-name {
      font-size: 20px;
      letter-spacing: -0.9px;
    }
    .brand-description,
    .space-doodle {
      display: none;
    }
    .header-actions {
      gap: 0;
    }
    .header-actions :global(.icon-button) {
      width: 40px;
      height: 44px;
    }
    .eyebrow {
      font-size: 8px;
      padding: 2px 6px;
      letter-spacing: 1px;
    }
  }
  @media (max-width: 1100px) {
    .space-note {
      display: none;
    }
    .space-doodle {
      width: 100px;
    }
  }
  @media (max-width: 360px) {
    .brand-name {
      font-size: 18px;
    }
    .header-actions :global(.icon-button) {
      width: 36px;
    }
  }
</style>
