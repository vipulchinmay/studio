import type { ReactNode } from 'react';
import { FileArchive } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex items-center gap-2">
             <FileArchive className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              FileWise
            </span>
          </div>
          {/* Add navigation or user profile section here if needed later */}
        </div>
      </header>
      <main className="flex-1">
        <div className="container py-8">
          {children}
        </div>
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} FileWise. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
