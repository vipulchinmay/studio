import type { ReactNode } from 'react';
import { FileArchive, LogIn, LogOut, UserCircle, Cloud, Settings, LifeBuoy } from 'lucide-react'; // Added icons
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import GoogleIcon from '@/components/icons/google-icon'; // Assuming you create this
import AppleIcon from '@/components/icons/apple-icon'; // Assuming you create this
import { cn } from '@/lib/utils';

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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/30 dark:bg-gradient-to-br dark:from-background dark:via-background dark:to-secondary/10"> {/* Subtle gradient */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg shadow-sm"> {/* Semi-transparent header */}
        <div className="container flex h-16 items-center justify-between space-x-4 px-4 sm:px-6 lg:px-8"> {/* Responsive padding */}
          <div className="flex items-center gap-2 transition-opacity hover:opacity-80"> {/* Hover effect */}
             <FileArchive className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              FileWise
            </span>
          </div>
           <div className="flex items-center gap-3 sm:gap-4"> {/* Adjusted gap */}
            {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full transition-transform hover:scale-105 active:scale-95"> {/* Hover/Active scale */}
                      <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary/50 transition-all"> {/* Added border */}
                        <AvatarImage src={userImage} alt={userName || 'User'} />
                        <AvatarFallback className="bg-muted text-muted-foreground">{userName ? userName.charAt(0).toUpperCase() : <UserCircle />}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userName || 'User'}</p>
                        {/* <p className="text-xs leading-none text-muted-foreground">demo@example.com</p> */}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuGroup>
                         <DropdownMenuItem className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                         </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                             <LifeBuoy className="mr-2 h-4 w-4" />
                             <span>Support</span>
                         </DropdownMenuItem>
                     </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="transition-transform hover:scale-105 active:scale-95"> {/* Hover/Active scale */}
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
                <Button variant="outline" size="sm" className="transition-transform hover:scale-105 active:scale-95 hidden sm:inline-flex"> {/* Hide on small screens */}
                  <Cloud className="mr-2 h-4 w-4" /> Connect Cloud
                </Button>
              )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        {/* Added max-width and centered content */}
        <div className="container max-w-5xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <footer className="mt-16 py-6 md:px-8 md:py-8 border-t bg-background/50"> {/* Added margin-top and more padding */}
        <div className="container max-w-5xl mx-auto flex flex-col items-center justify-center gap-4 md:h-auto md:flex-row md:justify-between"> {/* Adjusted height and added justify-between */}
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} FileWise. All rights reserved.
          </p>
           {/* Add some footer links if desired */}
           <div className="flex gap-4 text-sm text-muted-foreground">
               {/* <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
               <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a> */}
           </div>
        </div>
      </footer>
    </div>
  );
}
