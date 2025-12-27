import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  MoreHorizontal,
  Clock,
  Edit,
  Trash2,
  Briefcase,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea, Switch } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useIsMobile } from '@/lib/hooks';
import { formatCurrency, formatDuration } from '@/lib/utils/format';
import { cn } from '@/lib/utils';
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from '@/lib/api/hooks';
import { useIndustry } from '@/contexts/industry-context';
import type { Service } from '@/types';

const serviceCategories = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'general', label: 'General' },
];

export default function ServicesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const isMobile = useIsMobile();

  // Get industry-specific terminology
  const { terminology } = useIndustry();
  const serviceLabel = terminology.service;
  const serviceLabelPlural = terminology.servicePlural;

  const { data: servicesResponse, isLoading, refetch } = useServices();
  const deleteService = useDeleteService();

  const servicesList = servicesResponse?.data || [];

  // Filter services by search query and status
  const filteredServices = servicesList.filter((service) => {
    // Status filter
    if (statusFilter === 'active' && !service.is_active) return false;
    if (statusFilter === 'inactive' && service.is_active) return false;

    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      service.name.toLowerCase().includes(query) ||
      service.description?.toLowerCase().includes(query) ||
      service.category?.toLowerCase().includes(query)
    );
  });

  // Count active/inactive for filter badges
  const activeCount = servicesList.filter(s => s.is_active).length;
  const inactiveCount = servicesList.filter(s => !s.is_active).length;

  const handleDelete = async (service: Service) => {
    if (!confirm(`Delete "${service.name}"?`)) return;
    try {
      await deleteService.mutateAsync(service.id);
      toast.success(`${serviceLabel} deleted`);
      refetch();
    } catch (error) {
      toast.error(`Failed to delete ${serviceLabel.toLowerCase()}`);
    }
  };

  const handleSuccess = () => {
    setShowModal(false);
    setEditingService(null);
    refetch();
  };

  if (isLoading) {
    return (
      <PageContainer
        title={serviceLabelPlural}
        description={`Manage your ${serviceLabelPlural.toLowerCase()} and pricing`}
      >
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={serviceLabelPlural}
      description={`Manage your ${serviceLabelPlural.toLowerCase()} and pricing`}
      actions={
        <Button onClick={() => setShowModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add {serviceLabel}
        </Button>
      }
    >
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${serviceLabelPlural.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All ({servicesList.length})
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Active ({activeCount})
          </Button>
          <Button
            variant={statusFilter === 'inactive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive ({inactiveCount})
          </Button>
        </div>
      </div>

      {/* Results */}
      {filteredServices.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={searchQuery ? `No ${serviceLabelPlural.toLowerCase()} found` : `No ${serviceLabelPlural.toLowerCase()} yet`}
          description={
            searchQuery
              ? 'Try a different search term'
              : `Add your first ${serviceLabel.toLowerCase()} to start booking appointments`
          }
          action={
            !searchQuery && (
              <Button onClick={() => setShowModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
                Add {serviceLabel}
              </Button>
            )
          }
        />
      ) : isMobile ? (
        <MobileServiceList
          services={filteredServices}
          serviceLabel={serviceLabel}
          onEdit={setEditingService}
          onDelete={handleDelete}
          onRefresh={refetch}
        />
      ) : (
        <DesktopServiceTable
          services={filteredServices}
          serviceLabel={serviceLabel}
          onEdit={setEditingService}
          onDelete={handleDelete}
          onRefresh={refetch}
        />
      )}

      {/* Add/Edit Modal */}
      <Dialog
        open={showModal || !!editingService}
        onOpenChange={(open) => {
          if (!open) {
            setShowModal(false);
            setEditingService(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingService ? `Edit ${serviceLabel}` : `Add ${serviceLabel}`}
            </DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={editingService}
            onSuccess={handleSuccess}
            serviceLabel={serviceLabel}
          />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Mobile Service List
function MobileServiceList({
  services,
  serviceLabel,
  onEdit,
  onDelete,
  onRefresh,
}: {
  services: Service[];
  serviceLabel: string;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onRefresh: () => void;
}) {
  const updateService = useUpdateService();

  const handleToggleActive = async (service: Service) => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        data: { is_active: !service.is_active },
      });
      toast.success(`${service.name} ${service.is_active ? 'deactivated' : 'activated'}`);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-3">
      {services.map((service, i) => (
        <motion.div
          key={service.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className={cn('p-4', !service.is_active && 'opacity-60')}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold truncate">{service.name}</h4>
                  {!service.is_active && (
                    <Badge variant="secondary" size="sm">Inactive</Badge>
                  )}
                </div>
                {service.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {service.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDuration(service.duration_minutes)}</span>
                  </div>
                  <span className="font-medium">
                    {service.price != null && service.price > 0
                      ? formatCurrency(service.price)
                      : 'Free'}
                  </span>
                  {service.category && (
                    <Badge variant="default" size="sm">
                      {service.category}
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(service)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleActive(service)}>
                    {service.is_active ? (
                      <>
                        <ToggleLeft className="h-4 w-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <ToggleRight className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(service)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// Desktop Service Table
function DesktopServiceTable({
  services,
  serviceLabel,
  onEdit,
  onDelete,
  onRefresh,
}: {
  services: Service[];
  serviceLabel: string;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  onRefresh: () => void;
}) {
  const updateService = useUpdateService();

  const handleToggleActive = async (service: Service) => {
    try {
      await updateService.mutateAsync({
        id: service.id,
        data: { is_active: !service.is_active },
      });
      toast.success(`${service.name} ${service.is_active ? 'deactivated' : 'activated'}`);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                {serviceLabel}
              </th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                Duration
              </th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                Price
              </th>
              <th className="text-center p-4 text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map((service, i) => (
              <motion.tr
                key={service.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'border-b border-border hover:bg-muted/50 transition-colors',
                  !service.is_active && 'opacity-60'
                )}
              >
                <td className="p-4">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    {service.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
                        {service.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {formatDuration(service.duration_minutes)}
                  </div>
                </td>
                <td className="p-4">
                  <span className="font-medium">
                    {service.price != null && service.price > 0
                      ? formatCurrency(service.price)
                      : '—'}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(service)}
                    className={cn(
                      service.is_active ? 'text-success-600' : 'text-muted-foreground'
                    )}
                  >
                    {service.is_active ? (
                      <>
                        <ToggleRight className="h-4 w-4 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4 mr-1" />
                        Inactive
                      </>
                    )}
                  </Button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(service)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Service Form Component
function ServiceForm({
  service,
  onSuccess,
  serviceLabel = 'Service',
}: {
  service?: Service | null;
  onSuccess: () => void;
  serviceLabel?: string;
}) {
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
      toast.error(`Please enter a ${serviceLabel.toLowerCase()} name`);
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
          },
        });
        toast.success(`${serviceLabel} updated`);
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
        toast.success(`${serviceLabel} added`);
      }
      onSuccess();
    } catch (error) {
      toast.error(
        service
          ? `Failed to update ${serviceLabel.toLowerCase()}`
          : `Failed to add ${serviceLabel.toLowerCase()}`
      );
    }
  };

  const isLoading = createService.isPending || updateService.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{serviceLabel} Name *</label>
        <Input
          placeholder="e.g., Consultation, Haircut, Cleaning..."
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          placeholder="Describe this service..."
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration *</label>
          <Select
            value={formData.duration_minutes.toString()}
            onValueChange={(v) =>
              setFormData((prev) => ({ ...prev, duration_minutes: parseInt(v) }))
            }
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
              <SelectItem value="180">3 hours</SelectItem>
              <SelectItem value="240">4 hours</SelectItem>
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
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Category</label>
        <Select
          value={formData.category}
          onValueChange={(v) => setFormData((prev) => ({ ...prev, category: v }))}
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
          <p className="text-sm text-muted-foreground">
            {serviceLabel} is available for booking
          </p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) =>
            setFormData((prev) => ({ ...prev, is_active: checked }))
          }
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {service ? 'Save Changes' : `Add ${serviceLabel}`}
        </Button>
      </div>
    </form>
  );
}
