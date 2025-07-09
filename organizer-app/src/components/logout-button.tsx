'use client';

import { signOut } from 'next-auth/react';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function LogoutButton({ 
  variant = 'ghost', 
  size = 'default', 
  className = '',
  showIcon = true,
  children
}: LogoutButtonProps) {
  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={className}
    >
      {showIcon && <LogOut className="w-4 h-4 mr-2" />}
      {children || 'Выйти'}
    </Button>
  );
}