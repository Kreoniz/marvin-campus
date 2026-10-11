<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';
  let {
    label,
    children,
  }: { label: string; children: Snippet<[Record<string, unknown>]> } = $props();
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}{@render children(props)}{/snippet}
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Content class="tooltip" sideOffset={7}>{label}</Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
