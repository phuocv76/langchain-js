'use client';

import { useEffect, useState } from 'react';

import { cn } from '@repo/ui/cn';
import { getHistoryTurns, type HistoryTurn } from '@/lib/memory/history';

export const D1History = ({
  threadId,
  refreshKey,
}: {
  readonly threadId: string;
  readonly refreshKey: number;
}): React.JSX.Element | null => {
  const [turns, setTurns] = useState<readonly HistoryTurn[]>([]);

  useEffect(() => {
    let active = true;
    void getHistoryTurns(threadId)
      .then((history) => {
        if (active) setTurns(history);
      })
      .catch(() => {
        if (active) setTurns([]);
      });
    return () => {
      active = false;
    };
  }, [threadId, refreshKey]);

  if (turns.length === 0) return null;

  return (
    <div className="mb-4 space-y-4">
      {turns.map((turn) => (
        <div
          key={turn.id}
          className={cn(
            'max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap',
            turn.role === 'user'
              ? 'ml-auto bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
          )}
        >
          {turn.content}
        </div>
      ))}
    </div>
  );
};
