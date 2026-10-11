<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { motionDuration } from '../lib/motion.ts';
  import Icon from './Icon.svelte';
  import Hint from './Hint.svelte';
  let {
    kind,
    message,
    ondismiss,
  }: {
    kind: 'success' | 'error' | 'info';
    message: string;
    ondismiss: () => void;
  } = $props();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let remaining = 4500;
  let started = 0;
  let hovered = false;
  let focused = false;
  function pause() {
    if (!timer) return;
    clearTimeout(timer);
    timer = undefined;
    remaining -= Date.now() - started;
  }
  function resume() {
    if (hovered || focused || timer) return;
    started = Date.now();
    timer = setTimeout(ondismiss, Math.max(remaining, 0));
  }
  onMount(() => {
    remaining = kind === 'error' ? 7000 : 4500;
    resume();
    return () => clearTimeout(timer);
  });
</script>

<div
  class={`toast toast-${kind}`}
  role={kind === 'error' ? 'alert' : 'status'}
  aria-atomic="true"
  transition:fly={{ y: 8, duration: motionDuration(180) }}
  onpointerenter={() => {
    hovered = true;
    pause();
  }}
  onpointerleave={() => {
    hovered = false;
    resume();
  }}
  onfocusin={() => {
    focused = true;
    pause();
  }}
  onfocusout={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      focused = false;
      resume();
    }
  }}
>
  <Icon
    name={kind === 'success' ? 'check' : kind === 'error' ? 'alert' : 'info'}
    size={20}
  />
  <p>{message}</p>
  <Hint label="Закрыть уведомление"
    >{#snippet children(props)}
      <button
        {...props}
        class="icon-button"
        aria-label="Закрыть уведомление"
        onclick={ondismiss}><Icon name="close" size={16} /></button
      >
    {/snippet}</Hint
  >
</div>
