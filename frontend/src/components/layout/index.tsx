import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle,
  Briefcase,
  Phone,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Menu,
} from 'lucide-react';
import { Avatar } from '../ui';
import { useCurrentBusiness } from '../../lib/api/hooks';

// Navigation items
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, path: '/appointments' },
  { id: 'staff', label: 'Staff', icon: Users, path: '/staff' },
  { id: 'customers', label: 'Customers', icon: UserCircle, path: '/customers' },
  { id: 'services', label: 'Services', icon: Briefcase, path: '/services' },
  { id: 'calls', label: 'Call Logs', icon: Phone, path: '/calls' },
  { id: 'ai', label: 'AI Config', icon: Bot, path: '/ai-config' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

// Sidebar Component
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: business } = useCurrentBusiness();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">AI Reception</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Business Name */}
      {!collapsed && business && (
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-400">Current Business</p>
          <p className="font-medium truncate">{business.business_name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={clsx(
                'flex items-center rounded-lg px-3 py-2.5 transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center w-full rounded-lg px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors'
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

// Header Component
interface HeaderProps {
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ sidebarCollapsed, onMenuClick }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30 transition-all duration-300',
        sidebarCollapsed ? 'left-16' : 'left-64'
      )}
    >
      {/* Mobile menu button */}
      <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </button>

        {/* User menu */}
        <div className="flex items-center space-x-3">
          <Avatar name="Admin User" size="sm" />
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">Admin</p>
            <p className="text-xs text-gray-500">admin@example.com</p>
          </div>
        </div>
      </div>
    </header>
  );
};

// PageContainer Component
interface PageContainerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  actions,
  children,
}) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        {actions && <div className="flex items-center space-x-3">{actions}</div>}
      </div>

      {/* Page Content */}
      {children}
    </div>
  );
};

// Main Layout Component
interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Header */}
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Main content */}
      <main
        className={clsx(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  change?: { value: number; type: 'increase' | 'decrease' };
  icon: React.ReactNode;
  iconColor?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon,
  iconColor = 'bg-blue-100 text-blue-600',
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p
              className={clsx(
                'mt-1 text-sm font-medium',
                change.type === 'increase' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {change.type === 'increase' ? '↑' : '↓'} {Math.abs(change.value)}%
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-lg', iconColor)}>{icon}</div>
      </div>
    </div>
  );
};

// AI Status Widget
interface AIStatusWidgetProps {
  status: 'online' | 'offline' | 'busy';
  activeCallsCount?: number;
  todayCallsCount?: number;
}

export const AIStatusWidget: React.FC<AIStatusWidgetProps> = ({
  status,
  activeCallsCount = 0,
  todayCallsCount = 0,
}) => {
  const statusConfig = {
    online: { label: 'Online', color: 'bg-green-500', textColor: 'text-green-600' },
    offline: { label: 'Offline', color: 'bg-gray-400', textColor: 'text-gray-600' },
    busy: { label: 'On Call', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  };

  const config = statusConfig[status];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">AI Receptionist</h3>
        <div className="flex items-center space-x-2">
          <span className={clsx('h-2.5 w-2.5 rounded-full animate-pulse', config.color)} />
          <span className={clsx('text-sm font-medium', config.textColor)}>{config.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{activeCallsCount}</p>
          <p className="text-xs text-gray-500">Active Calls</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-900">{todayCallsCount}</p>
          <p className="text-xs text-gray-500">Calls Today</p>
        </div>
      </div>
    </div>
  );
};
