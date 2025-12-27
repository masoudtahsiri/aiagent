import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/loading-screen';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/auth-provider';
import { useIsMobile } from '@/lib/hooks';
import { useIndustryOptional } from '@/contexts/industry-context';
import { getIndustryNavigation, type NavItem } from '@/config/industries/navigation';
import { BUSINESS_TYPES, getIndustryMeta, getIndustryBadgeClasses } from '@/config/industries';

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

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
  const industryContext = useIndustryOptional();

  // Get navigation items - either from industry context or fallback to generic
  const { main: mainNavItems, bottom: bottomNavItems } = industryContext?.navigation ??
    getIndustryNavigation(BUSINESS_TYPES.GENERIC);

  // Get industry meta and badge styling for branding
  const industryMeta = industryContext?.meta ?? getIndustryMeta(BUSINESS_TYPES.GENERIC);
  const badgeClasses = getIndustryBadgeClasses(industryContext?.businessType ?? BUSINESS_TYPES.GENERIC);

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
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-border shrink-0',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <Logo collapsed={collapsed} />
        {isMobile && mobileOpen && (
          <Button variant="ghost" size="icon" onClick={onMobileClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Industry Badge */}
      {!collapsed && industryMeta && industryMeta.id !== 'generic' && (
        <div className="px-3 pt-3">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border',
            badgeClasses.bg,
            badgeClasses.border
          )}>
            <industryMeta.icon className={cn('h-4 w-4 shrink-0', badgeClasses.icon)} />
            <span className={cn('text-xs font-medium truncate', badgeClasses.text)}>
              {industryMeta.name}
            </span>
          </div>
        </div>
      )}

      {/* AI Status Indicator */}
      <div className={cn('px-3 pt-3', collapsed && 'px-2 pt-4')}>
        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl bg-success-500/10 border border-success-500/20',
            collapsed && 'justify-center p-2'
          )}
        >
          <div className="relative">
            <Zap className={cn('h-5 w-5 text-success-500', collapsed && 'h-6 w-6')} />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-success-500 rounded-full animate-pulse" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-success-700 dark:text-success-400">AI Active</p>
              <p className="text-xs text-success-600/70 dark:text-success-500/70">Ready for calls</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={isMobile ? onMobileClose : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              collapsed && 'justify-center px-2',
              isActiveRoute(item.href)
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border p-3 space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={isMobile ? onMobileClose : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
              collapsed && 'justify-center px-2',
              isActiveRoute(item.href)
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border"
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
        'fixed inset-y-0 left-0 z-30 border-r border-border',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {sidebarContent}
    </aside>
  );
}
