import { useState, ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  BarChart3,
  Package,
  Upload,
  FolderTree,
  Users,
  TrendingUp,
  Layers,
  CalendarDays,
  TrendingDown,
  Sparkles,
  LineChart,
  FileText,
  AlertTriangle,
  Settings,
  Menu,
  X,
  SlidersHorizontal,
  LogOut,
  LayoutDashboard,
  Calendar,
  Target,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProcurementData } from '@/hooks/useProcurementData';
import { cn } from '@/lib/utils';
import { Breadcrumb } from './Breadcrumb';
import { FilterPane } from './FilterPane';

/**
 * Check if the current user has admin role
 */
function isAdmin(): boolean {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    return user?.profile?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Navigation item configuration
 * Each item represents a tab in the dashboard
 */
interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

/**
 * Complete navigation configuration for all 13 tabs
 * Organized logically by analysis type
 */
const NAV_ITEMS: NavItem[] = [
  {
    path: '/upload',
    label: 'Upload Data',
    icon: Upload,
    description: 'Upload procurement data files',
  },
  {
    path: '/',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Dashboard overview',
  },
  {
    path: '/categories',
    label: 'Categories',
    icon: FolderTree,
    description: 'Spend analysis by category',
  },
  {
    path: '/suppliers',
    label: 'Suppliers',
    icon: Users,
    description: 'Supplier performance and insights',
  },
  {
    path: '/pareto',
    label: 'Pareto Analysis',
    icon: TrendingUp,
    description: '80/20 rule insights',
  },
  {
    path: '/stratification',
    label: 'Spend Stratification',
    icon: Layers,
    description: 'Spend tier analysis',
  },
  {
    path: '/seasonality',
    label: 'Seasonality',
    icon: Calendar,
    description: 'Time-based spending patterns',
  },
  {
    path: '/yoy',
    label: 'Year-over-Year',
    icon: BarChart3,
    description: 'Trend comparison',
  },
  {
    path: '/tail-spend',
    label: 'Tail Spend',
    icon: Target,
    description: 'Long-tail spending analysis',
  },
  {
    path: '/ai-insights',
    label: 'AI Insights',
    icon: Sparkles,
    description: 'Smart recommendations',
  },
  {
    path: '/predictive',
    label: 'Predictive Analytics',
    icon: LineChart,
    description: 'Forecasting and predictions',
  },
  {
    path: '/contracts',
    label: 'Contract Optimization',
    icon: FileText,
    description: 'Contract analysis',
  },
  {
    path: '/maverick',
    label: 'Maverick Spend',
    icon: AlertTriangle,
    description: 'Policy compliance tracking',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Configuration and preferences',
  },
];

/**
 * Logout button component
 */
function LogoutButton() {
  const { logout } = useAuth();
  
  return (
    <button
      onClick={logout}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
      title="Logout"
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Logout</span>
    </button>
  );
}

interface DashboardLayoutProps {
  children?: ReactNode;
}

/**
 * Main dashboard layout component with responsive sidebar navigation
 * 
 * Features:
 * - Responsive design with mobile menu
 * - Active route highlighting
 * - Accessibility support (ARIA labels, keyboard navigation)
 * - Data validation (prompts user to upload if no data)
 * 
 * @param {ReactNode} children - Content to render in the main area
 */
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFilterPaneOpen, setIsFilterPaneOpen] = useState(true);
  const { data = [] } = useProcurementData();

  /**
   * Check if a navigation item is currently active
   * Handles both exact matches and root path
   */
  const isActive = (path: string): boolean => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  /**
   * Toggle mobile menu state
   * Follows accessibility best practices with ARIA attributes
   */
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  /**
   * Close mobile menu when navigation occurs
   * Improves UX on mobile devices
   */
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/vtx_logo2.png" 
              alt="Versatex Logo" 
              className="h-10 w-auto"
            />
            <h1 className="text-xl font-bold text-gray-900">Analytics Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Logout button */}
            <LogoutButton />
            
            {/* Filter pane toggle */}
            <button
              onClick={() => setIsFilterPaneOpen(!isFilterPaneOpen)}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Toggle filters"
              aria-expanded={isFilterPaneOpen}
              title="Toggle filter pane"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside
          id="mobile-navigation"
          className={cn(
            'fixed lg:sticky top-[73px] left-0 h-[calc(100vh-73px)] w-64 bg-white border-r',
            'overflow-y-auto transition-transform duration-200 z-30',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <nav
            className="p-4 space-y-1"
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              // For Settings, render Admin Panel link before it if user is admin
              if (item.path === '/settings' && isAdmin()) {
                return (
                  <div key="admin-section">
                    {/* Admin Panel Link */}
                    <a
                      href={`${window.location.protocol}//${window.location.hostname}:8001/admin/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                        'text-gray-700 hover:text-gray-900'
                      )}
                      title="Django Admin Panel (admins only)"
                    >
                      <Shield className="h-5 w-5 text-gray-500" />
                      <span className="text-sm">Admin Panel</span>
                    </a>

                    {/* Settings Link */}
                    <Link
                      href={item.path}
                      onClick={handleNavClick}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                        active
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:text-gray-900'
                      )}
                      aria-current={active ? 'page' : undefined}
                      title={item.description}
                    >
                      <Icon className={cn('h-5 w-5', active ? 'text-blue-600' : 'text-gray-500')} />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </div>
                );
              }

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                    'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                    active
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:text-gray-900'
                  )}
                  aria-current={active ? 'page' : undefined}
                  title={item.description}
                >
                  <Icon className={cn('h-5 w-5', active ? 'text-blue-600' : 'text-gray-500')} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumb />
          {/* Show upload prompt if no data */}
          {data.length === 0 && location !== '/' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>No data uploaded yet.</strong> Please{' '}
                <Link 
                  href="/"
                  className="underline font-medium hover:text-yellow-900"
                >
                  upload your procurement data
                </Link>{' '}
                to view analytics.
              </p>
            </div>
          )}

          {/* Render children or default message */}
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              {children || (
                <div className="text-center py-12 text-gray-500">
                  <p>Select a tab from the navigation to view analytics.</p>
                </div>
              )}
            </div>

            {/* Filter Pane */}
            {isFilterPaneOpen && data.length > 0 && (
              <aside className="w-80 flex-shrink-0 hidden lg:block">
                <FilterPane />
              </aside>
            )}
          </div>
        </main>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
