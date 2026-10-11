<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { mergeProps } from 'bits-ui';
  import Icon from './Icon.svelte';
  import Hint from './Hint.svelte';
  let {
    label,
    name,
    size = 20,
    class: className = 'icon-button',
    ...rest
  }: HTMLButtonAttributes & {
    label: string;
    name: ComponentProps<typeof Icon>['name'];
    size?: number;
  } = $props();
</script>

<Hint {label}
  >{#snippet children(props)}
    <button {...mergeProps(props, rest)} class={className} aria-label={label}
      ><Icon {name} {size} /></button
    >
  {/snippet}</Hint
>
