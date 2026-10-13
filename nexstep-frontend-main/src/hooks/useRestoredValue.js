import { useEffect, useState } from 'react';

/** Keep a form field in sync when the saved profile arrives after refresh. */
export function useRestoredValue(saved, fallback = '') {
  const initial = saved === undefined || saved === null || saved === '' ? fallback : saved;
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (saved === undefined || saved === null || saved === '') return;
    setValue(saved);
  }, [saved]);
  return [value, setValue];
}
