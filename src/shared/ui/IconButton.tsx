import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Button } from 'unlikely-ui/button';
import Icon from './Icon.tsx';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'name'
> {
  name: string;
  label: string;
  size?: number;
}
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { name, label, size = 20, className = '', ...props },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        className={`icon-button motion-safe:transition-colors motion-safe:duration-150 ${className}`}
        {...props}
      >
        <Icon name={name} size={size} />
      </Button>
    );
  },
);
export default IconButton;
