import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  Clock3,
  Copy,
  ExternalLink,
  GripVertical,
  Info,
  MapPin,
  Monitor,
  Moon,
  Plus,
  Search,
  SlidersHorizontal,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
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
  check: CircleCheck,
  search: Search,
  monitor: Monitor,
  external: ExternalLink,
  alert: CircleAlert,
  order: GripVertical,
  up: ChevronUp,
  clock: Clock3,
  settings: SlidersHorizontal,
};
export default function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const Component = icons[name] ?? Info;
  return <Component size={size} strokeWidth={1.8} aria-hidden="true" />;
}
