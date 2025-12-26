import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Clock,
  Briefcase,
  Save,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  MapPin,
  Phone,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea, Switch } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDuration } from '@/lib/utils/format';
import {
  useBusiness,
  useUpdateBusiness,
  useBusinessHours,
  useUpdateBusinessHours,
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from '@/lib/api/hooks';
import type { Business, BusinessHours, Service } from '@/types';

const tabs = [
  { id: 'profile', label: 'Profile', icon: Building2 },
  { id: 'hours', label: 'Hours', icon: Clock },
  { id: 'services', label: 'Services', icon: Briefcase },
];

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'GMT (London)' },
  { value: 'Europe/Istanbul', label: 'Turkey Time (TRT)' },
  { value: 'Asia/Dubai', label: 'Gulf Time (Dubai)' },
];

const industries = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'dental', label: 'Dental' },
  { value: 'salon', label: 'Salon & Spa' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'travel', label: 'Travel & Tourism' },
  { value: 'other', label: 'Other' },
];

const serviceCategories = [
  { value: 'consultation', label: 'Consultation', color: 'primary' },
  { value: 'treatment', label: 'Treatment', color: 'secondary' },
  { value: 'maintenance', label: 'Maintenance', color: 'success' },
  { value: 'cosmetic', label: 'Cosmetic', color: 'warning' },
  { value: 'emergency', label: 'Emergency', color: 'error' },
  { value: 'general', label: 'General', color: 'default' },
];

export default function BusinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <PageContainer
      title="Business"
      description="Manage your business profile, hours, and services"
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ProfileTab />
          </motion.div>
        )}
        {activeTab === 'hours' && (
          <motion.div
            key="hours"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <HoursTab />
          </motion.div>
        )}
        {activeTab === 'services' && (
          <motion.div
            key="services"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ServicesTab />
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
}

// Profile Tab
function ProfileTab() {
  const { data: business, isLoading, refetch } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (business) {
      setFormData({
        business_name: business.business_name,
        industry: business.industry,
        timezone: business.timezone,
        default_language: business.default_language,
        address: business.address,
        city: business.city,
        state: business.state,
        zip_code: business.zip_code,
        phone_number: business.phone_number,
        country: business.country,
      });
    }
  }, [business]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateBusiness.mutateAsync(formData);
      toast.success('Business profile saved');
      setHasChanges(false);
      refetch();
    } catch (error) {
      toast.error('Failed to save business profile');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Identity
          </CardTitle>
          <CardDescription>
            Basic information about your business
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Business Name</label>
              <Input
                value={formData.business_name || ''}
                onChange={(e) => handleChange('business_name', e.target.value)}
                placeholder="Your business name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Industry</label>
              <Select
                value={formData.industry || 'other'}
                onValueChange={(v) => handleChange('industry', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </label>
            <Input
              type="tel"
              value={formData.phone_number || ''}
              onChange={(e) => handleChange('phone_number', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <CardDescription>
            Your business address and timezone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Street Address</label>
            <Input
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">City</label>
              <Input
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">State</label>
              <Input
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ZIP Code</label>
              <Input
                value={formData.zip_code || ''}
                onChange={(e) => handleChange('zip_code', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Timezone
            </label>
            <Select
              value={formData.timezone || 'America/New_York'}
              onValueChange={(v) => handleChange('timezone', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            size="lg"
            onClick={handleSave}
            loading={updateBusiness.isPending}
            className="shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// Hours Tab
function HoursTab() {
  const { data: hoursData, isLoading, refetch } = useBusinessHours();
  const updateHours = useUpdateBusinessHours();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [schedule, setSchedule] = useState<Record<number, { is_open: boolean; open_time: string; close_time: string }>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (hoursData) {
      const hoursMap: Record<number, { is_open: boolean; open_time: string; close_time: string }> = {};
      hoursData.forEach(h => {
        hoursMap[h.day_of_week] = {
          is_open: h.is_open !== false,
          open_time: h.open_time?.slice(0, 5) || '09:00',
          close_time: h.close_time?.slice(0, 5) || '17:00',
        };
      });
      // Fill in missing days with defaults
      for (let i = 0; i < 7; i++) {
        if (!hoursMap[i]) {
          hoursMap[i] = {
            is_open: i < 5,
            open_time: '09:00',
            close_time: '17:00',
          };
        }
      }
      setSchedule(hoursMap);
    }
  }, [hoursData]);

  const handleToggleDay = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], is_open: !prev[dayIndex]?.is_open },
    }));
    setHasChanges(true);
  };

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const hoursArray = Object.entries(schedule).map(([day, data]) => ({
        day_of_week: parseInt(day),
        is_open: data.is_open,
        open_time: data.open_time + ':00',
        close_time: data.close_time + ':00',
      })) as BusinessHours[];

      await updateHours.mutateAsync(hoursArray);
      toast.success('Business hours saved');
      setHasChanges(false);
      refetch();
    } catch (error) {
      toast.error('Failed to save business hours');
    }
  };

  const applyToWeekdays = () => {
    const monday = schedule[0];
    if (!monday) return;

    setSchedule(prev => {
      const newSchedule = { ...prev };
      for (let i = 0; i <= 4; i++) {
        newSchedule[i] = { ...monday };
      }
      return newSchedule;
    });
    setHasChanges(true);
    toast.success('Applied Monday schedule to all weekdays');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">AI Availability</p>
              <p className="text-sm text-muted-foreground">
                Your AI assistant will handle calls during these hours. Outside business hours,
                callers will hear a customized message.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={applyToWeekdays}>
          Apply Monday to Weekdays
        </Button>
      </div>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Set when your business is open</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {days.map((day, index) => (
              <div
                key={day}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                  schedule[index]?.is_open
                    ? 'bg-card border-border'
                    : 'bg-muted/50 border-border'
                )}
              >
                <div className="flex items-center gap-4 w-40">
                  <Switch
                    checked={schedule[index]?.is_open ?? index < 5}
                    onCheckedChange={() => handleToggleDay(index)}
                  />
                  <span className={cn(
                    'font-medium',
                    !schedule[index]?.is_open && 'text-muted-foreground'
                  )}>
                    {day}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-24">
                  {schedule[index]?.is_open ? (
                    <span className="flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400">
                      <Check className="h-4 w-4" />
                      Open
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <X className="h-4 w-4" />
                      Closed
                    </span>
                  )}
                </div>

                <div className={cn(
                  'flex items-center gap-3 flex-1',
                  !schedule[index]?.is_open && 'opacity-50 pointer-events-none'
                )}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground w-12">From</label>
                    <Input
                      type="time"
                      value={schedule[index]?.open_time || '09:00'}
                      onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <span className="text-muted-foreground">—</span>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground w-8">To</label>
                    <Input
                      type="time"
                      value={schedule[index]?.close_time || '17:00'}
                      onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            size="lg"
            onClick={handleSave}
            loading={updateHours.isPending}
            className="shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Hours
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// Services Tab
function ServicesTab() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { data: servicesResponse, isLoading, refetch } = useServices();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const servicesList = servicesResponse?.data || [];

  const filteredServices = selectedCategory === 'all'
    ? servicesList
    : servicesList.filter(s => s.category === selectedCategory);

  const handleToggleActive = async (service: Service) => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        data: { is_active: !service.is_active }
      });
      toast.success(`${service.name} ${service.is_active ? 'deactivated' : 'activated'}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Delete ${service.name}?`)) return;
    try {
      await deleteService.mutateAsync(service.id);
      toast.success('Service deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleSuccess = () => {
    setShowNewModal(false);
    setEditingService(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="bg-secondary/5 border-secondary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Briefcase className="h-5 w-5 text-secondary mt-0.5" />
            <div>
              <p className="font-medium">Services</p>
              <p className="text-sm text-muted-foreground">
                Define the services your business offers. The AI will use this information
                to help customers book appointments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter + Add Button */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All ({servicesList.length})
          </Button>
          {serviceCategories.map((cat) => {
            const count = servicesList.filter(s => s.category === cat.value).length;
            if (count === 0 && selectedCategory !== cat.value) return null;
            return (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
              >
                {cat.label} ({count})
              </Button>
            );
          })}
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <Card className="p-8 text-center">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-semibold mb-2">No services yet</h3>
          <p className="text-muted-foreground mb-4">
            Add services so your AI knows what customers can book
          </p>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Service
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn('h-full', !service.is_active && 'opacity-60')}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{service.name}</h4>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingService(service)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(service)}>
                          {service.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(service)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDuration(service.duration_minutes)}</span>
                    </div>
                    {service.price != null && service.price > 0 && (
                      <div className="text-sm font-medium">
                        {formatCurrency(service.price)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <Badge
                      variant={serviceCategories.find(c => c.value === service.category)?.color as any || 'default'}
                      size="sm"
                    >
                      {serviceCategories.find(c => c.value === service.category)?.label || 'General'}
                    </Badge>
                    <Badge
                      variant={service.is_active ? 'success' : 'default'}
                      size="sm"
                    >
                      {service.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* New/Edit Service Modal */}
      <Dialog
        open={showNewModal || !!editingService}
        onOpenChange={(open) => {
          if (!open) {
            setShowNewModal(false);
            setEditingService(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={editingService}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Service Form Component
function ServiceForm({ service, onSuccess }: { service?: Service | null; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    category: 'general',
    is_active: true,
  });

  const createService = useCreateService();
  const updateService = useUpdateService();

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        duration_minutes: service.duration_minutes,
        price: service.price || 0,
        category: service.category || 'general',
        is_active: service.is_active,
      });
    }
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Please enter a service name');
      return;
    }

    try {
      if (service) {
        await updateService.mutateAsync({
          id: service.id,
          data: {
            name: formData.name,
            description: formData.description || undefined,
            duration_minutes: formData.duration_minutes,
            price: formData.price || undefined,
            category: formData.category,
            is_active: formData.is_active,
          }
        });
        toast.success('Service updated');
      } else {
        await createService.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
          duration_minutes: formData.duration_minutes,
          price: formData.price || undefined,
          category: formData.category,
          is_active: formData.is_active,
          requires_staff: true,
        });
        toast.success('Service added');
      }
      onSuccess();
    } catch (error) {
      toast.error(service ? 'Failed to update service' : 'Failed to add service');
    }
  };

  const isLoading = createService.isPending || updateService.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Service Name</label>
        <Input
          placeholder="e.g., Haircut, Consultation, Cleaning"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          placeholder="Describe this service..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration</label>
          <Select
            value={formData.duration_minutes.toString()}
            onValueChange={(v) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(v) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Price</label>
          <Input
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={formData.price || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Category</label>
        <Select
          value={formData.category}
          onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {serviceCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div>
          <p className="font-medium">Active</p>
          <p className="text-sm text-muted-foreground">Service is available for booking</p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {service ? 'Save Changes' : 'Add Service'}
        </Button>
      </div>
    </form>
  );
}
