import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { snapshotChangeAt, usableSnapshot } from '../../lib/cache-policy.ts';
import { monday, omskToday } from '../../lib/dates.ts';
import { vucSearchOptions } from './api.ts';

export default function useVucCatalogue() {
  const query = useQuery(vucSearchOptions(''));
  const [clock, setClock] = useState(Date.now);
  const now = Math.max(clock, Date.now());
  const week = monday(omskToday(new Date(now)));
  const changeAt = snapshotChangeAt(query.data, week, now);
  useEffect(() => {
    if (changeAt === undefined) return;
    const timer = setTimeout(
      () => setClock(Date.now()),
      Math.min(2147483647, Math.max(1, changeAt - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [changeAt]);
  const snapshot = usableSnapshot(query.data, week, now);
  return {
    query,
    entries: snapshot?.data ?? [],
    expired: !!query.data && !snapshot,
  };
}
