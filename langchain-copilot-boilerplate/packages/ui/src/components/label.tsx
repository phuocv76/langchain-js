// Libs for third party
import * as React from 'react';

// Internal
import { cn } from '../lib/cn';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/** Form label with consistent typography. */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = 'Label';
