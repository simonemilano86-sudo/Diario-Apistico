import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  // Protegge da valori "sporchi" salvati come stringa
  if (raw === 'undefined' || raw === 'null') return fallback;

  try {
    const parsed = JSON.parse(raw) as T;
    // Se parse ritorna null/undefined, torna al fallback
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    return safeParse(window.localStorage.getItem(key), initialValue);
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue((prevValue) => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }

        return valueToStore;
      });
    } catch (error) {
      console.error(error);
    }
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key) return;

      // se e.newValue è null (key rimossa), ripristina initialValue
      setStoredValue(safeParse<T>(e.newValue, initialValue));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;