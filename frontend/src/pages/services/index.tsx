import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Clock, DollarSign, Briefcase, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/form-elements';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { formatCurrency, formatDuration } from '@/lib/utils/format';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/lib/api/hooks';
import type { Service } from '@/types';

const categories = [
  { value: 'consultation', label: 'Consultation', color: 'primary' },
  { value: 'treatment', label: 'Treatment', color: 'secondary' },
  { value: 'maintenance', label: 'Maintenance', color: 'success' },
  { value: 'cosmetic', label: 'Cosmetic', color: 'warning' },
  { value: 'emergency', label: 'Emergency', color: 'error' },
];

export default function ServicesPage() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch services from API
  const { data: servicesResponse, isLoading, refetch } = useServices();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  
  const servicesList = servicesResponse?.data || [];

  const filteredServices = selectedCategory === 'all' 
    ? servicesList 
    : servicesList.filter(s => s.category === selectedCategory);

  // Group by category
  const groupedServices = filteredServices.reduce((acc, service) => {
    const cat = service.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

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
    if (!confirm(`Are you sure you want to delete ${service.name}?`)) return;
    
    try {
      await deleteService.mutateAsync(service.id);
      toast.success('Service deleted');
      refetch();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const handleNewServiceSuccess = () => {
    setShowNewModal(false);
    refetch();
  };

  if (isLoading) {
    return (
      <PageContainer title="Services" description="Manage the services your business offers">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Services"
      description="Manage the services your business offers"
      actions={
        <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Service
        </Button>
      }
    >
      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button 
          variant={selectedCategory === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {filteredServices.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No services found"
          description="Add services that your business offers"
          action={
            <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add Service
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedServices).map(([category, services]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-4 capitalize">{category}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((service, i) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={`p-5 ${!service.is_active && 'opacity-60'}`}>
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
                            <DropdownMenuItem>
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
                          <div className="flex items-center gap-1.5 text-sm">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>{formatCurrency(service.price)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <Badge 
                          variant={service.is_active ? 'success' : 'default'}
                          size="sm"
                        >
                          {service.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Service Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>
          <NewServiceForm onSuccess={handleNewServiceSuccess} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// New Service Form
function NewServiceForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: 0,
    category: 'consultation',
    is_active: true,
  });
  
  const createService = useCreateService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Please enter a service name');
      return;
    }
    
    try {
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
      onSuccess();
    } catch (error) {
      toast.error('Failed to add service');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Service Name *</label>
        <Input 
          placeholder="e.g., Teeth Cleaning" 
          required 
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
          <label className="text-sm font-medium">Duration *</label>
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
            {categories.map((cat) => (
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
        <Button type="submit" loading={createService.isPending}>
          Add Service
        </Button>
      </div>
    </form>
  );
}
