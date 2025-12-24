import { useState } from 'react';
import { Plus, Edit, Trash2, Mail, Phone } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { Button, Card, Modal, Input, Badge, Skeleton, EmptyState, Table } from '@/components/ui';
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, useCurrentBusiness } from '@/lib/api';
import type { Staff } from '@/types';

interface StaffFormData {
  name: string;
  email: string;
  phone: string;
  title: string;
  specialty: string;
  bio: string;
  color_code: string;
  is_active: boolean;
}

const initialFormData: StaffFormData = {
  name: '',
  email: '',
  phone: '',
  title: '',
  specialty: '',
  bio: '',
  color_code: '#3B82F6',
  is_active: true,
};

export default function StaffPage() {
  const { data: business } = useCurrentBusiness();
  const businessId = business?.id || '';
  
  const { data: staff, isLoading } = useStaff(businessId);
  
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(initialFormData);

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      title: staffMember.title || '',
      specialty: staffMember.specialty || '',
      bio: staffMember.bio || '',
      color_code: staffMember.color_code,
      is_active: staffMember.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      title: formData.title || undefined,
      specialty: formData.specialty || undefined,
      bio: formData.bio || undefined,
      color_code: formData.color_code,
      is_active: formData.is_active,
      business_id: businessId,
    };

    if (editingStaff) {
      await updateStaff.mutateAsync({ id: editingStaff.id, data });
    } else {
      await createStaff.mutateAsync(data);
    }
    
    setIsModalOpen(false);
    setFormData(initialFormData);
  };

  const handleDelete = async () => {
    if (staffToDelete) {
      await deleteStaff.mutateAsync(staffToDelete.id);
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
    }
  };

  const confirmDelete = (staffMember: Staff) => {
    setStaffToDelete(staffMember);
    setIsDeleteModalOpen(true);
  };

  if (isLoading) {
    return (
      <PageContainer title="Staff" description="Manage your team members">
        <Card>
          <Card.Body>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" className="h-16 w-full" />
              ))}
            </div>
          </Card.Body>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Staff"
      description="Manage your team members"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      }
    >
      {!staff || staff.length === 0 ? (
        <EmptyState
          title="No staff members"
          description="Add your first team member to get started."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Name</Table.Header>
                <Table.Header>Contact</Table.Header>
                <Table.Header>Title</Table.Header>
                <Table.Header>Specialty</Table.Header>
                <Table.Header>Status</Table.Header>
                <Table.Header className="w-20">Actions</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {staff.map((member) => (
                <Table.Row key={member.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: member.color_code }}
                      >
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="space-y-1">
                      {member.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </div>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>{member.title || '-'}</Table.Cell>
                  <Table.Cell>{member.specialty || '-'}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={member.is_active ? 'success' : 'default'}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(member)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Senior Stylist, Manager"
          />
          <Input
            label="Specialty"
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            placeholder="e.g., Hair Coloring, Massage"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={formData.color_code}
              onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
              className="h-10 w-20 rounded border cursor-pointer"
            />
          </div>
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
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createStaff.isPending || updateStaff.isPending}>
              {editingStaff ? 'Save Changes' : 'Add Staff'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Staff Member"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>{staffToDelete?.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteStaff.isPending}>
            Delete
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
