import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tenants', icon: Users, label: 'Tenants' },
    { to: '/admin', icon: Settings, label: 'Admin' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] bg-m3-background text-m3-on-background font-sans">
      {/* Navigation Rail (Desktop) */}
      <nav className="hidden md:flex flex-col items-center w-[80px] bg-m3-surface border-r border-m3-surface-variant py-4 gap-8 z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 group",
                isActive ? "text-m3-on-surface" : "text-m3-on-surface-variant hover:text-m3-on-surface"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "w-14 h-8 flex items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-m3-primary-container text-m3-on-primary-container" : "group-hover:bg-m3-surface-variant"
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[12px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto mobile-safe-container">
        <div className="max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
      
      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-m3-surface border-t border-m3-surface-variant flex justify-around items-center px-2 z-50 mobile-safe-nav max-h-screen-hide-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 group",
                isActive ? "text-m3-on-surface" : "text-m3-on-surface-variant hover:text-m3-on-surface"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "w-16 h-8 flex items-center justify-center rounded-full transition-colors",
                  isActive ? "bg-m3-primary-container text-m3-on-primary-container" : "group-hover:bg-m3-surface-variant"
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[12px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
