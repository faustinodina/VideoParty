import { useEffect, useState } from 'react';

import { getUserName, onIdentityReset } from '@/services/userIdentity';

/**
 * The name this device is registered under, or null while it loads from
 * storage. Re-reads after an identity reset, which re-registers the device.
 */
export function useUserName(): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      getUserName().then((value) => {
        if (active) setName(value);
      });
    };
    load();
    const unsubscribe = onIdentityReset(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return name;
}
