import { useEffect, useState } from 'react';
import { fetchReferenceData } from './referenceData';

const cache = {
  data: null,
  error: null,
  status: 'idle',
  promise: null,
};

export default function useReferenceData() {
  const [state, setState] = useState(() => ({
    data: cache.data,
    error: cache.error,
    status: cache.data ? 'success' : cache.status,
  }));

  useEffect(() => {
    let active = true;
    if (cache.data) {
      setState({ data: cache.data, error: null, status: 'success' });
      return () => {
        active = false;
      };
    }

    if (!cache.promise) {
      cache.status = 'loading';
      cache.promise = fetchReferenceData()
        .then((response) => {
          cache.data = response.referenceData || response;
          cache.error = null;
          cache.status = 'success';
          return cache.data;
        })
        .catch((error) => {
          cache.error = error;
          cache.status = 'error';
          throw error;
        })
        .finally(() => {
          cache.promise = null;
        });
    }

    cache.promise
      .then((data) => {
        if (!active) return;
        setState({ data, error: null, status: 'success' });
      })
      .catch((error) => {
        if (!active) return;
        setState({ data: null, error, status: 'error' });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
