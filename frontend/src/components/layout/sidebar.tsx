import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Calendar, Users, UserCog, Briefcase,
  PhoneCall, Bot, MessageSquare, Settings, ChevronLeft,
  ChevronRight, Sparkles, BookOpen, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/lib/hooks';
import { Logo } from '@/components/shared/loading-screen';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, href: '/appointments' },
  { id: 'customers', label: 'Customers', icon: Users, href: '/customers' },
  { id: 'staff', label: 'Staff', icon: UserCog, href: '/staff' },
  { id: 'services', label: 'Services', icon: Briefcase, href: '/services' },
  { id: 'calls', label: 'Call Logs', icon: PhoneCall, href: '/calls' },
  { 
    id: 'ai-config', 
    label: 'AI Configuration', 
    icon: Bot, 
    href: '/ai-config',
    children: [
      { id: 'ai-roles', label: 'AI Roles', icon: Sparkles, href: '/ai-config/roles' },
      { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, href: '/ai-config/knowledge' },
    ]
  },
  { id: 'messaging', label: 'Messaging', icon: MessageSquare, href: '/messaging' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar({ 
  collapsed = false, 
  onCollapse,
  mobileOpen = false,
  onMobileClose 
}: SidebarProps) {
  const isMobile = useIsMobile();
  const [expandedItems, setExpandedItems] = useState<string[]>(['ai-config']);

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-border px-4",
        collapsed && "justify-center px-2"
      )}>
        <Logo collapsed={collapsed} />
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon-sm" 
            className="ml-auto"
            onClick={onMobileClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      "transition-colors duration-200",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          expandedItems.includes(item.id) && "rotate-90"
                        )} />
                      </>
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedItems.includes(item.id) && !collapsed && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-1 space-y-1 overflow-hidden pl-4"
                      >
                        {item.children.map((child) => (
                          <li key={child.id}>
                            <NavLink
                              to={child.href}
                              onClick={isMobile ? onMobileClose : undefined}
                              className={({ isActive }) => cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                "transition-colors duration-200",
                                isActive && "bg-primary/10 text-primary font-medium"
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              <span>{child.label}</span>
                            </NavLink>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <NavLink
                  to={item.href}
                  onClick={isMobile ? onMobileClose : undefined}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    "transition-colors duration-200",
                    isActive && "bg-primary/10 text-primary",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse Button */}
      {!isMobile && (
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
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
        </div>
      )}
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
              className="fixed inset-0 z-40 bg-black/50"
              onClick={onMobileClose}
            />
            
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-background border-r border-border"
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
        "fixed inset-y-0 left-0 z-30 border-r border-border bg-background",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-[280px]"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
