import { useState, useEffect } from 'react';

interface TimerBadgeProps {
  createdAt: string;
  priority: string;
}

export function TimerBadge({ createdAt, priority }: TimerBadgeProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${minutes}:${String(seconds).padStart(2, '0')}`;

  const colorClass =
    priority === 'RUSH'
      ? 'bg-red-100 text-red-700'
      : priority === 'DELAYED'
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-green-100 text-green-700';

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${colorClass}`}>
      {display}
    </span>
  );
}
