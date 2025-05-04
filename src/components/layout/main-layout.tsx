import type { ReactNode } from 'react';
import { FileArchive, LogIn, LogOut, UserCircle, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import GoogleIcon from '@/components/icons/google-icon'; // Assuming you create this
import AppleIcon from '@/components/icons/apple-icon'; // Assuming you create this

interface MainLayoutProps {
  children: ReactNode;
  isLoggedIn: boolean;
  onLogin: (provider: 'google' | 'apple') => void;
  onLogout: () => void;
  userName?: string;
  userImage?: string;
}

export function MainLayout({ children, isLoggedIn, onLogin, onLogout, userName, userImage }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20 dark:bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background shadow-sm">
        <div className="container flex h-16 items-center justify-between space-x-4">
          <div className="flex items-center gap-2">
             <FileArchive className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              FileWise
            </span>
          </div>
           <div className="flex items-center gap-4">
            {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={userImage} alt={userName || 'User'} />
                        <AvatarFallback>{userName ? userName.charAt(0).toUpperCase() : <UserCircle />}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userName || 'User'}</p>
                        {/* You can add email here if available */}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <LogIn className="mr-2 h-4 w-4" /> Login
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel>Sign in with</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onLogin('google')} className="cursor-pointer">
                           <GoogleIcon className="mr-2 h-4 w-4" />
                            <span>Google</span>
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => onLogin('apple')} className="cursor-pointer">
                            <AppleIcon className="mr-2 h-4 w-4" />
                            <span>Apple</span>
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                 </DropdownMenu>
            )}
             {isLoggedIn && (
                <Button variant="outline" size="sm">
                  <Cloud className="mr-2 h-4 w-4" /> Connect Cloud
                </Button>
              )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container py-8">
          {children}
        </div>
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t bg-background">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} FileWise. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

