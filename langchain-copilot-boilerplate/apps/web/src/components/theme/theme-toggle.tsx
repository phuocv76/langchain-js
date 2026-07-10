'use client';

// Libs for third party
import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

// Internal
import { cn } from '@repo/ui/cn';
import { useIsMounted } from '@/hooks/use-is-mounted';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
] as const;

/** Segmented control to switch between light, dark, and system themes. */
export const ThemeToggle = (): React.JSX.Element => {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  const active = mounted ? (theme ?? 'system') : undefined;

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={active === value}
          title={label}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground',
            active === value && 'bg-secondary text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
};
