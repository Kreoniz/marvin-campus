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
          style={{ width: 308, maxWidth: '100%', height: 340 }}
          aria-label="Загружаем календарь"
        />
      }
    >
      <DatePicker {...props} />
    </Suspense>
  );
}
