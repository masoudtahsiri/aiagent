import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Clock,
  Briefcase,
  Save,
  Plus,
  Edit,
  Trash2,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea, Switch } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
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
  return (
    <PageContainer
      title="Business"
      description="Manage your business profile, hours, and services"
    >
      <BusinessContent />
    </PageContainer>
  );
}

// Business Content - 2x2 Grid Layout
function BusinessContent() {
  const { data: business, isLoading: businessLoading, refetch: refetchBusiness } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const { data: hoursData, isLoading: hoursLoading, refetch: refetchHours } = useBusinessHours();
  const updateHours = useUpdateBusinessHours();
  const { data: servicesResponse, isLoading: servicesLoading, refetch: refetchServices } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [formData, setFormData] = useState<Partial<Business>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Hours state
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [schedule, setSchedule] = useState<Record<number, { is_open: boolean; open_time: string; close_time: string }>>({});
  const [hoursHasChanges, setHoursHasChanges] = useState(false);

  // Services state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const servicesList = servicesResponse?.data || [];

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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleToggleDay = (dayIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], is_open: !prev[dayIndex]?.is_open },
    }));
    setHoursHasChanges(true);
  };

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayIndex]: { ...prev[dayIndex], [field]: value },
    }));
    setHoursHasChanges(true);
  };

  const handleSave = async () => {
    try {
      if (hasChanges) {
        await updateBusiness.mutateAsync(formData);
        setHasChanges(false);
        refetchBusiness();
      }

      if (hoursHasChanges) {
        const hoursArray = Object.entries(schedule).map(([day, data]) => ({
          day_of_week: parseInt(day),
          is_open: data.is_open,
          open_time: data.open_time + ':00',
          close_time: data.close_time + ':00',
        })) as BusinessHours[];
        await updateHours.mutateAsync(hoursArray);
        setHoursHasChanges(false);
        refetchHours();
      }

      toast.success('Changes saved');
    } catch (error) {
      toast.error('Failed to save changes');
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
    setHoursHasChanges(true);
    toast.success('Applied Monday schedule to all weekdays');
  };

  const handleDeleteService = async (service: Service) => {
    if (!confirm(`Delete ${service.name}?`)) return;
    try {
      await deleteService.mutateAsync(service.id);
      toast.success('Service deleted');
      refetchServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleServiceSuccess = () => {
    setShowServiceModal(false);
    setEditingService(null);
    refetchServices();
  };

  if (businessLoading || hoursLoading || servicesLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Row 1, Col 1 - Business Identity */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Business Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Business Name</label>
            <Input
              value={formData.business_name || ''}
              onChange={(e) => handleChange('business_name', e.target.value)}
              placeholder="Your business name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Industry</label>
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <Input
              type="tel"
              value={formData.phone_number || ''}
              onChange={(e) => handleChange('phone_number', e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Row 1, Col 2 - Location */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Street Address</label>
            <Input
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid gap-4 grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">City</label>
              <Input
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">State</label>
              <Input
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">ZIP</label>
              <Input
                value={formData.zip_code || ''}
                onChange={(e) => handleChange('zip_code', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Timezone</label>
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

      {/* Row 2, Col 1 - Business Hours */}
      <Card className="flex flex-col">
        <CardHeader className="pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Business Hours
            </CardTitle>
            <Button variant="outline" size="sm" onClick={applyToWeekdays}>
              Copy Mon
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-1.5">
            {days.map((day, index) => (
              <div
                key={day}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg border transition-colors',
                  schedule[index]?.is_open
                    ? 'bg-card border-border'
                    : 'bg-muted/50 border-border'
                )}
              >
                <Switch
                  checked={schedule[index]?.is_open ?? index < 5}
                  onCheckedChange={() => handleToggleDay(index)}
                />
                <span className={cn(
                  'font-medium text-sm w-10',
                  !schedule[index]?.is_open && 'text-muted-foreground'
                )}>
                  {day.slice(0, 3)}
                </span>

                {schedule[index]?.is_open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={schedule[index]?.open_time || '09:00'}
                      onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)}
                      className="w-24 h-8 text-xs"
                    />
                    <span className="text-muted-foreground text-xs">-</span>
                    <Input
                      type="time"
                      value={schedule[index]?.close_time || '17:00'}
                      onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)}
                      className="w-24 h-8 text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 2, Col 2 - Services */}
      <Card className="flex flex-col lg:overflow-hidden">
        <CardHeader className="pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              Services
            </CardTitle>
            <Button size="sm" onClick={() => setShowServiceModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="lg:flex-1 lg:min-h-0 lg:overflow-hidden">
          {servicesList.length === 0 ? (
            <div className="py-8 text-center">
              <Briefcase className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium mb-1">No services yet</p>
              <p className="text-xs text-muted-foreground mb-3">
                Add services for booking
              </p>
              <Button size="sm" variant="outline" onClick={() => setShowServiceModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </Button>
            </div>
          ) : (
            <div className="space-y-2 lg:h-full lg:overflow-y-auto">
              {servicesList.map((service) => (
                <div
                  key={service.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    !service.is_active && 'opacity-60'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{service.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(service.duration_minutes)}
                      </span>
                      {service.price != null && service.price > 0 && (
                        <span className="text-xs font-medium">
                          {formatCurrency(service.price)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingService(service)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteService(service)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {(hasChanges || hoursHasChanges) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button
            size="lg"
            onClick={handleSave}
            loading={updateBusiness.isPending || updateHours.isPending}
            className="shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </motion.div>
      )}

      {/* Service Modal */}
      <Dialog
        open={showServiceModal || !!editingService}
        onOpenChange={(open) => {
          if (!open) {
            setShowServiceModal(false);
            setEditingService(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={editingService}
            onSuccess={handleServiceSuccess}
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
