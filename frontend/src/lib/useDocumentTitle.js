import { useEffect, useRef } from 'react';

/**
 * Updates the browser tab title while the component is mounted.
 *
 * @param {string} title - The full title to display in the document tab.
 */
export default function useDocumentTitle(title) {
  const previousTitleRef = useRef(typeof document !== 'undefined' ? document.title : undefined);

  useEffect(() => {
    if (typeof document === 'undefined' || !title) {
      return undefined;
    }

    const previous = document.title;
    document.title = title;

    return () => {
      document.title = previous;
    };
  }, [title]);

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined' && previousTitleRef.current !== undefined) {
        document.title = previousTitleRef.current;
      }
    };
  }, []);
}
