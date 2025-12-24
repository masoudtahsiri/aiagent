import { useState } from 'react';
import { Plus, Edit, Trash2, Clock, DollarSign, Tag } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { Button, Card, Modal, Input, Textarea, Badge, Skeleton, EmptyState } from '@/components/ui';
import { useServices, useCreateService, useUpdateService, useDeleteService, useCurrentBusiness } from '@/lib/api';
import type { Service } from '@/types';

interface ServiceFormData {
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  category: string;
  is_active: boolean;
  requires_staff: boolean;
}

const initialFormData: ServiceFormData = {
  name: '',
  description: '',
  duration_minutes: 60,
  price: 0,
  category: '',
  is_active: true,
  requires_staff: true,
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export default function ServicesPage() {
  const { data: business } = useCurrentBusiness();
  const businessId = business?.id || '';
  
  const { data: services, isLoading } = useServices(businessId);
  
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price || 0,
      category: service.category || '',
      is_active: service.is_active,
      requires_staff: service.requires_staff,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      description: formData.description || undefined,
      duration_minutes: formData.duration_minutes,
      price: formData.price || undefined,
      category: formData.category || undefined,
      is_active: formData.is_active,
      requires_staff: formData.requires_staff,
      business_id: businessId,
    };

    if (editingService) {
      await updateService.mutateAsync({ id: editingService.id, data });
    } else {
      await createService.mutateAsync(data);
    }
    
    setIsModalOpen(false);
    setFormData(initialFormData);
  };

  const handleDelete = async () => {
    if (serviceToDelete) {
      await deleteService.mutateAsync(serviceToDelete.id);
      setIsDeleteModalOpen(false);
      setServiceToDelete(null);
    }
  };

  const confirmDelete = (service: Service) => {
    setServiceToDelete(service);
    setIsDeleteModalOpen(true);
  };

  if (isLoading) {
    return (
      <PageContainer title="Services" description="Manage your service offerings">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" className="h-48" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Services"
      description="Manage your service offerings"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      }
    >
      {!services || services.length === 0 ? (
        <EmptyState
          title="No services"
          description="Add your first service to get started."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="relative group">
              <Card.Body>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(service)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirmDelete(service)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Tag className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    {service.category && (
                      <span className="text-sm text-gray-500">{service.category}</span>
                    )}
                  </div>
                  <Badge variant={service.is_active ? 'success' : 'default'} size="sm">
                    {service.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {service.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {service.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(service.duration_minutes)}</span>
                  </div>
                  {service.price !== undefined && service.price > 0 && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span>${service.price.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Edit Service' : 'Add Service'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Service Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Haircut, Massage"
            required
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <Input
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Hair, Nails, Wellness"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (minutes)"
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
              min={5}
              step={5}
              required
            />
            <Input
              label="Price ($)"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.01}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires_staff"
                checked={formData.requires_staff}
                onChange={(e) => setFormData({ ...formData, requires_staff: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="requires_staff" className="text-sm text-gray-700">Requires Staff</label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createService.isPending || updateService.isPending}>
              {editingService ? 'Save Changes' : 'Add Service'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Service"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{serviceToDelete?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteService.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
