import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, PhoneCall, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { icon: LayoutDashboard, label: 'Home', href: '/' },
  { icon: Calendar, label: 'Appts', href: '/appointments' },
  { icon: Users, label: 'Customers', href: '/customers' },
  { icon: PhoneCall, label: 'Calls', href: '/calls' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg",
              "text-muted-foreground transition-colors",
              isActive && "text-primary"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
