import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { useUIStore } from '@/stores/ui-store';
import { useIsMobile, useIsTablet } from '@/lib/hooks';
import { cn } from '@/lib/utils';

export function AppShell() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed,
    sidebarMobileOpen,
    setSidebarMobileOpen 
  } = useUIStore();

  // Auto-collapse on tablet
  useEffect(() => {
    if (isTablet && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [isTablet, sidebarCollapsed, setSidebarCollapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarMobileOpen(false);
  }, [location.pathname, setSidebarMobileOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        mobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
      />

      {/* Header */}
      <Header
        onMenuClick={() => setSidebarMobileOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen pt-16 pb-20 transition-all duration-300',
          'md:pb-0',
          isMobile ? 'pl-0' : sidebarCollapsed ? 'pl-20' : 'pl-[280px]'
        )}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}
