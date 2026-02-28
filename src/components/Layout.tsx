import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;

  const isActive = (path: string) => pathname === path;

  // Hide layout on splash and login pages
  if (pathname === '/' || pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-text-dark dark:text-white min-h-screen pb-20 scroll-smooth">
      <main className="flex-1 relative">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-[90px] glass-nav z-50 flex items-end justify-center pb-6">
        <div className="relative w-full max-w-md mx-auto grid grid-cols-5 items-end px-2">
          <Link to="/shorts" className="flex flex-col items-center gap-1.5 group pb-1">
            <span className={cn("material-icons text-[26px] transition-transform group-hover:scale-110", isActive('/shorts') ? "text-primary" : "text-gray-500 dark:group-hover:text-white group-hover:text-gray-900")}>smart_display</span>
            <span className={cn("text-[10px] font-medium tracking-wide transition-colors", isActive('/shorts') ? "text-primary" : "text-gray-500 dark:group-hover:text-white group-hover:text-gray-900")}>Shorts</span>
          </Link>

          <Link to="/search" className="flex flex-col items-center gap-1.5 group pb-1">
            <span className={cn("material-icons text-[26px] transition-transform group-hover:scale-110", isActive('/search') ? "text-primary font-bold drop-shadow-[0_0_8px_rgba(242,13,13,0.5)]" : "text-gray-500 dark:group-hover:text-white group-hover:text-gray-900")}>search</span>
            <span className={cn("text-[10px] font-medium tracking-wide transition-colors", isActive('/search') ? "text-primary font-bold" : "text-gray-500 dark:group-hover:text-white group-hover:text-gray-900")}>Buscar</span>
          </Link>

          <div className="flex flex-col items-center justify-end -mb-4 relative z-10">
            <Link to="/home">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
              <div className={cn("w-16 h-16 rounded-full bg-white dark:bg-[#16161f] border border-border-light dark:border-white/10 shadow-card-light dark:shadow-[0_0_20px_rgba(242,13,13,0.4)] flex items-center justify-center -translate-y-4 transform hover:scale-105 transition-transform cursor-pointer relative overflow-hidden group", isActive('/home') && "border-primary/50")}>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-50"></div>
                <img src="/logo.png" alt="Início" className="w-9 h-9 object-contain relative z-10 group-hover:scale-110 transition-transform drop-shadow-md" />
                {isActive('/home') && <div className="absolute inset-0 rounded-full border border-primary/30 animate-pulse-slow"></div>}
              </div>
              <span className={cn("text-[10px] font-medium -translate-y-2 block text-center transition-colors", isActive('/home') ? "text-text-dark dark:text-white" : "text-gray-500 dark:text-gray-400")}>Início</span>
            </Link>
          </div>

          <Link to="/favorites" className="flex flex-col items-center gap-1.5 group pb-1">
            <span className={cn("material-icons text-[26px] transition-transform group-hover:scale-110", isActive('/favorites') ? "text-primary" : "text-gray-500 dark:group-hover:text-white group-hover:text-gray-900")}>favorite</span>
            <span className={cn("text-[10px] font-medium tracking-wide transition-colors", isActive('/favorites') ? "text-primary" : "text-gray-500 dark:group-hover:text-white group-hover:text-gray-900")}>Favoritos</span>
          </Link>

          <Link to="/profile" className="flex flex-col items-center gap-1.5 group pb-1">
            <span className={cn("material-icons text-[26px] transition-transform group-hover:scale-110", isActive('/profile') ? "text-primary" : "text-gray-500 dark:group-hover:text-white group-hover:text-gray-900")}>person</span>
            <span className={cn("text-[10px] font-medium tracking-wide transition-colors", isActive('/profile') ? "text-primary" : "text-gray-500 dark:group-hover:text-white group-hover:text-gray-900")}>Perfil</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
