import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  Brain,
  Clock,
  Users,
  Briefcase,
  Phone,
  Calendar,
  Plug,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  HelpCircle,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/loading-screen';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { useIsMobile } from '@/lib/hooks';

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string | number;
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    ],
  },
  {
    title: 'AI Assistant',
    items: [
      { label: 'Configuration', icon: Bot, href: '/ai-config' },
      { label: 'Knowledge Base', icon: Brain, href: '/ai-config/knowledge' },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Services', icon: Briefcase, href: '/services' },
      { label: 'Staff', icon: Users, href: '/staff' },
      { label: 'Business Hours', icon: Clock, href: '/hours' },
    ],
  },
  {
    title: 'Data',
    items: [
      { label: 'Customers', icon: Users, href: '/customers' },
      { label: 'Appointments', icon: Calendar, href: '/appointments' },
      { label: 'Call Logs', icon: Phone, href: '/calls' },
    ],
  },
  {
    title: 'Connect',
    items: [
      { label: 'Integrations', icon: Plug, href: '/integrations' },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar({
  collapsed = false,
  onCollapse,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-border shrink-0',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <Logo collapsed={collapsed} />

        {/* Mobile close button */}
        {isMobile && mobileOpen && (
          <Button variant="ghost" size="icon" onClick={onMobileClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && !collapsed && (
              <h3 className="px-3 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            {section.title && collapsed && <div className="h-px bg-border mx-2 mb-3" />}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={isMobile ? onMobileClose : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      collapsed && 'justify-center px-2',
                      isActiveRoute(item.href)
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              'text-xs font-semibold px-2 py-0.5 rounded-full',
                              isActiveRoute(item.href)
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : 'bg-primary/10 text-primary'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-1">
        {/* AI Status Indicator */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg bg-success-500/10 border border-success-500/20">
            <div className="relative">
              <Zap className="h-4 w-4 text-success-500" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-success-500 rounded-full animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-success-700 dark:text-success-400">AI Active</p>
              <p className="text-[10px] text-success-600/70 dark:text-success-500/70">Ready to handle calls</p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center mb-2">
            <div className="relative p-2">
              <Zap className="h-5 w-5 text-success-500" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-success-500 rounded-full animate-pulse" />
            </div>
          </div>
        )}

        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={isMobile ? onMobileClose : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
              collapsed && 'justify-center px-2',
              isActiveRoute(item.href)
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
            'text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>

        {/* Collapse button - desktop only */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full mt-2', collapsed ? 'justify-center' : 'justify-start')}
            onClick={() => onCollapse?.(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  // Mobile: Overlay drawer
  if (isMobile) {
    return (
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={onMobileClose}
            />

            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-card border-r border-border"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 border-r border-border bg-card',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
