import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';

const DatePicker = lazy(() => import('./DatePicker.tsx'));

export default function LazyDatePicker(
  props: ComponentProps<typeof DatePicker>,
) {
  return (
    <Suspense
      fallback={
        <Skeleton
          className="h-[340px] w-[308px] max-w-full"
          aria-label="Загружаем календарь"
        />
      }
    >
      <DatePicker {...props} />
    </Suspense>
  );
}
