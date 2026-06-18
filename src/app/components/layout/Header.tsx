import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  rightAction?: ReactNode;
  transparent?: boolean;
  onBack?: () => void;
}

export function Header({ title, showBack = true, rightAction, transparent, onBack }: HeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        transparent ? 'bg-transparent' : 'bg-card border-b border-border'
      }`}
    >
      <div className="w-10 flex items-center">
        {showBack && (
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
        )}
      </div>
      {title && (
        <span className="text-base font-semibold text-foreground truncate">{title}</span>
      )}
      <div className="w-10 flex items-center justify-end">
        {rightAction}
      </div>
    </div>
  );
}
