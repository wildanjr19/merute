import { useEffect } from 'react';
import { useRouteStore } from '../stores/routeStore';

export default function KeyboardShortcuts() {
  const { undo, redo, canUndo, canRedo, clearAll } = useRouteStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z - Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      // Ctrl+Shift+Z - Redo
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      // Escape - Clear All (with confirmation)
      if (e.key === 'Escape') {
        e.preventDefault();
        const confirmed = window.confirm(
          'Hapus semua waypoint? Tindakan ini tidak dapat dibatalkan.'
        );
        if (confirmed) {
          clearAll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, canUndo, canRedo, clearAll]);

  return null;
}
