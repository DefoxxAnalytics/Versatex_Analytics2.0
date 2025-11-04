import { useState } from 'react';
import { useSettings, useUpdateSettings, useResetSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Bell, Download, Palette, RotateCcw, Save } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Settings Page Component
 * 
 * Features:
 * - User profile management
 * - Theme preferences (light/dark)
 * - Notification settings
 * - Export format preferences
 * - Settings persistence
 * - Reset to defaults
 * 
 * Security:
 * - Input validation
 * - XSS prevention through React escaping
 * - Sanitized localStorage operations
 * 
 * Accessibility:
 * - Proper labels for all inputs
 * - Keyboard navigation
 * - ARIA attributes
 * - Focus management
 */
export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const resetSettings = useResetSettings();
  const { setTheme } = useTheme();

  // Local state for form inputs
  const [userName, setUserName] = useState(settings?.userName || '');
  const [userEmail, setUserEmail] = useState(settings?.userEmail || '');
  const [userRole, setUserRole] = useState(settings?.userRole || '');

  // Update local state when settings load
  if (settings && !userName && settings.userName) {
    setUserName(settings.userName);
  }
  if (settings && !userEmail && settings.userEmail) {
    setUserEmail(settings.userEmail);
  }
  if (settings && !userRole && settings.userRole) {
    setUserRole(settings.userRole);
  }

  /**
   * Handle profile update
   * Validates and saves user profile information
   */
  const handleProfileUpdate = () => {
    // Basic validation
    if (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    updateSettings.mutate(
      {
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        userRole: userRole.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Profile updated successfully');
        },
        onError: () => {
          toast.error('Failed to update profile');
        },
      }
    );
  };

  /**
   * Handle theme change
   * Updates both settings and applies theme immediately
   */
  const handleThemeChange = (theme: 'light' | 'dark') => {
    // Apply theme immediately for instant feedback
    if (setTheme) {
      setTheme(theme);
    }
    
    // Save to settings for persistence
    updateSettings.mutate(
      { theme },
      {
        onSuccess: () => {
          toast.success(`Theme changed to ${theme} mode`);
        },
      }
    );
  };

  /**
   * Handle notification toggle
   */
  const handleNotificationToggle = (enabled: boolean) => {
    updateSettings.mutate(
      { notifications: enabled },
      {
        onSuccess: () => {
          toast.success(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
        },
      }
    );
  };

  /**
   * Handle export format change
   */
  const handleExportFormatChange = (format: 'csv' | 'xlsx' | 'pdf') => {
    updateSettings.mutate(
      { exportFormat: format },
      {
        onSuccess: () => {
          toast.success(`Default export format set to ${format.toUpperCase()}`);
        },
      }
    );
  };

  /**
   * Handle reset to defaults
   */
  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetSettings.mutate(undefined, {
        onSuccess: () => {
          setUserName('');
          setUserEmail('');
          setUserRole('');
          toast.success('Settings reset to defaults');
        },
        onError: () => {
          toast.error('Failed to reset settings');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Separator />

      {/* User Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <CardTitle>User Profile</CardTitle>
          </div>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName">Name</Label>
            <Input
              id="userName"
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userEmail">Email</Label>
            <Input
              id="userEmail"
              type="email"
              placeholder="Enter your email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userRole">Role</Label>
            <Input
              id="userRole"
              type="text"
              placeholder="e.g., Procurement Manager"
              value={userRole}
              onChange={(e) => setUserRole(e.target.value)}
              maxLength={100}
            />
          </div>

          <Button
            onClick={handleProfileUpdate}
            disabled={updateSettings.isPending}
            className="w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Theme Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-600" />
            <CardTitle>Theme Preferences</CardTitle>
          </div>
          <CardDescription>
            Choose your preferred color theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={settings?.theme || 'light'}
              onValueChange={(value) => handleThemeChange(value as 'light' | 'dark')}
            >
              <SelectTrigger id="theme" className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Manage your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications" className="text-base">
                Enable Notifications
              </Label>
              <p className="text-sm text-gray-500">
                Receive alerts and updates
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings?.notifications || false}
              onCheckedChange={handleNotificationToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-green-600" />
            <CardTitle>Export Preferences</CardTitle>
          </div>
          <CardDescription>
            Set your default export format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="exportFormat">Default Export Format</Label>
            <Select
              value={settings?.exportFormat || 'csv'}
              onValueChange={(value) => handleExportFormatChange(value as 'csv' | 'xlsx' | 'pdf')}
            >
              <SelectTrigger id="exportFormat" className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reset Settings */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-600">Reset Settings</CardTitle>
          </div>
          <CardDescription>
            Reset all settings to their default values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={resetSettings.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
