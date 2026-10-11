<script lang="ts">
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Moon from '@lucide/svelte/icons/moon';
  import Sun from '@lucide/svelte/icons/sun';
  import Copy from '@lucide/svelte/icons/copy';
  import Info from '@lucide/svelte/icons/info';
  import Check from '@lucide/svelte/icons/circle-check';
  import Search from '@lucide/svelte/icons/search';
  import Monitor from '@lucide/svelte/icons/monitor';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Alert from '@lucide/svelte/icons/circle-alert';
  import Grip from '@lucide/svelte/icons/grip-vertical';
  import Up from '@lucide/svelte/icons/chevron-up';
  const icons = {
    pin: MapPin,
    plus: Plus,
    close: X,
    left: ChevronLeft,
    right: ChevronRight,
    down: ChevronDown,
    calendar: Calendar,
    moon: Moon,
    sun: Sun,
    copy: Copy,
    info: Info,
    check: Check,
    search: Search,
    monitor: Monitor,
    external: ExternalLink,
    alert: Alert,
    order: Grip,
    up: Up,
  };
  let { name, size = 20 }: { name: keyof typeof icons; size?: number } =
    $props();
  const Component = $derived(icons[name]);
</script>

<Component {size} strokeWidth={1.8} aria-hidden="true" />
