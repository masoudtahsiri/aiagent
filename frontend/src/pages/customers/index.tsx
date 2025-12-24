import { useState, useMemo } from 'react';
import { Plus, Edit, Mail, Phone, Search } from 'lucide-react';
import { format } from 'date-fns';
import { PageContainer } from '@/components/layout';
import { Button, Card, Modal, Input, Textarea, Avatar, Skeleton, EmptyState, Table } from '@/components/ui';
import { useCustomers, useCreateCustomer, useUpdateCustomer, useCurrentBusiness } from '@/lib/api';
import type { Customer } from '@/types';

interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  language: string;
}

const initialFormData: CustomerFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  notes: '',
  language: 'en',
};

export default function CustomersPage() {
  const { data: business } = useCurrentBusiness();
  const businessId = business?.id || '';
  
  const { data: customersResponse, isLoading } = useCustomers(businessId);
  const customers = customersResponse?.data || [];
  
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter((c) => {
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      return (
        fullName.includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query)
      );
    });
  }, [customers, searchQuery]);

  const getDisplayName = (customer: Customer) => {
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.phone;
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone,
      notes: customer.notes || '',
      language: customer.language,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      first_name: formData.first_name || undefined,
      last_name: formData.last_name || undefined,
      email: formData.email || undefined,
      phone: formData.phone,
      notes: formData.notes || undefined,
      language: formData.language,
      business_id: businessId,
    };

    if (editingCustomer) {
      await updateCustomer.mutateAsync({ id: editingCustomer.id, data });
    } else {
      await createCustomer.mutateAsync(data);
    }
    
    setIsModalOpen(false);
    setFormData(initialFormData);
  };

  if (isLoading) {
    return (
      <PageContainer title="Customers" description="Manage your customer database">
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
      title="Customers"
      description="Manage your customer database"
      actions={
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      }
    >
      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Your customers will appear here when they call or book appointments."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          }
        />
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <Card.Body className="py-12 text-center">
            <p className="text-gray-500">No customers match your search.</p>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.Header>Customer</Table.Header>
                <Table.Header>Contact</Table.Header>
                <Table.Header>Appointments</Table.Header>
                <Table.Header>Last Visit</Table.Header>
                <Table.Header className="w-20">Actions</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {filteredCustomers.map((customer) => (
                <Table.Row key={customer.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleOpenEdit(customer)}>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <Avatar name={getDisplayName(customer)} size="sm" />
                      <span className="font-medium">{getDisplayName(customer)}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{customer.total_appointments}</Table.Cell>
                  <Table.Cell>
                    {customer.last_visit_date 
                      ? format(new Date(customer.last_visit_date), 'MMM d, yyyy')
                      : 'Never'
                    }
                  </Table.Cell>
                  <Table.Cell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(customer);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
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
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
            <Input
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>
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
            required
          />
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />

          {editingCustomer && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Customer Stats</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Appointments:</span>
                  <span className="ml-2 font-medium">{editingCustomer.total_appointments}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Spent:</span>
                  <span className="ml-2 font-medium">${editingCustomer.total_spent.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Customer Since:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(editingCustomer.customer_since), 'MMM d, yyyy')}
                  </span>
                </div>
                {editingCustomer.last_visit_date && (
                  <div>
                    <span className="text-gray-500">Last Visit:</span>
                    <span className="ml-2 font-medium">
                      {format(new Date(editingCustomer.last_visit_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createCustomer.isPending || updateCustomer.isPending}>
              {editingCustomer ? 'Save Changes' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
