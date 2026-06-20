'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { FileText } from 'lucide-react';

interface LandingHeaderProps {
  onLogin?: () => void;
}

export default function LandingHeader({ onLogin }: LandingHeaderProps) {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">简历 AI</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">功能</a>
          <a href="#steps" className="hover:text-foreground">流程</a>
          <a href="#pricing" className="hover:text-foreground">价格</a>
          <a href="#faq" className="hover:text-foreground">常见问题</a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard">
              <Button size="sm">进入控制台</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={onLogin}>
              登录 / 注册
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
