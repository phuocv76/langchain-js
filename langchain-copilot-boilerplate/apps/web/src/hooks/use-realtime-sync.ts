import { useEffect, useRef } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { useThreadList } from '@/components/history/thread-list-context';
import { REALTIME_WS_URL } from '@/lib/config';
import {
  RealtimeConnection,
  type RealtimeEvent,
} from '@/services/websocket/client';

/**
 * Keeps the signed-in session connected to the realtime worker and fans
 * thread-list events into ThreadListProvider. Message events for the active
 * thread are forwarded via a custom DOM event so ThreadHydrator can merge.
 */
export const useRealtimeSync = ({
  activeThreadId,
  onThreadDeleted,
}: {
  readonly activeThreadId: string;
  readonly onThreadDeleted: (threadId: string) => void;
}): void => {
  const { idToken } = useAuth();
  const { applyRealtimeEvent } = useThreadList();
  const tokenRef = useRef(idToken);
  const activeRef = useRef(activeThreadId);
  const onDeletedRef = useRef(onThreadDeleted);

  useEffect(() => {
    tokenRef.current = idToken;
  }, [idToken]);

  useEffect(() => {
    activeRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    onDeletedRef.current = onThreadDeleted;
  }, [onThreadDeleted]);

  useEffect(() => {
    if (!REALTIME_WS_URL || !idToken) return;

    const connection = new RealtimeConnection({
      url: REALTIME_WS_URL,
      getToken: () => tokenRef.current,
      onEvent: (event: RealtimeEvent) => {
        if (event.type === 'CONNECTED') return;

        applyRealtimeEvent(event);

        if (event.type === 'THREAD_DELETED' && event.threadId) {
          if (event.threadId === activeRef.current) {
            onDeletedRef.current(event.threadId);
          }
          return;
        }

        if (
          event.type === 'MESSAGE_CREATED' &&
          event.threadId === activeRef.current
        ) {
          window.dispatchEvent(
            new CustomEvent('realtime:message-created', {
              detail: event,
            }),
          );
        }
      },
    });

    connection.start();
    return () => connection.stop();
  }, [idToken, applyRealtimeEvent]);
};
