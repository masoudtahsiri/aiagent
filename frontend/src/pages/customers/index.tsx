import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, Plus, MoreHorizontal, Phone, Mail, Calendar,
  ChevronLeft, ChevronRight, Users, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useDebounce, useIsMobile } from '@/lib/hooks';
import { formatDate, formatPhone } from '@/lib/utils/format';
import { useCustomers, useCreateCustomer, useDeleteCustomer } from '@/lib/api/hooks';
import type { Customer } from '@/types';

const ITEMS_PER_PAGE = 20;

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [page, setPage] = useState(1);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const debouncedSearch = useDebounce(searchQuery, 300);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  
  // Fetch customers from API
  const { data: customersResponse, isLoading, refetch } = useCustomers(
    debouncedSearch || undefined, 
    ITEMS_PER_PAGE, 
    offset
  );
  
  const customers = customersResponse?.data || [];
  const totalCustomers = customersResponse?.total || 0;
  const totalPages = Math.ceil(totalCustomers / ITEMS_PER_PAGE);

  const handleNewCustomerSuccess = () => {
    setShowNewModal(false);
    refetch();
  };

  return (
    <PageContainer
      title="Customers"
      description="Manage your customer database"
      actions={
        <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Customer
        </Button>
      }
    >
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            className="pl-10"
          />
        </div>
        <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
          Filters
        </Button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description={searchQuery ? "Try a different search term" : "Add your first customer to get started"}
          action={
            <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add Customer
            </Button>
          }
        />
      ) : isMobile ? (
        <MobileCustomerList customers={customers} />
      ) : (
        <DesktopCustomerTable customers={customers} onRefresh={refetch} />
      )}

      {/* Pagination */}
      {customers.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1}-{Math.min(offset + customers.length, totalCustomers)} of {totalCustomers} customers
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">Page {page} of {totalPages || 1}</span>
            <Button 
              variant="outline" 
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <NewCustomerForm onSuccess={handleNewCustomerSuccess} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Mobile Customer List
function MobileCustomerList({ customers }: { customers: Customer[] }) {
  return (
    <div className="space-y-3">
      {customers.map((customer, i) => (
        <motion.div
          key={customer.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link to={`/customers/${customer.id}`}>
            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <Avatar name={`${customer.first_name || ''} ${customer.last_name || ''}`} size="lg" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">
                    {customer.first_name} {customer.last_name}
                  </h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {formatPhone(customer.phone)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="default" size="sm">
                      {customer.total_appointments} visits
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" onClick={(e) => e.preventDefault()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Book Appointment</DropdownMenuItem>
                    <DropdownMenuItem>Send Message</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

// Desktop Customer Table
function DesktopCustomerTable({ 
  customers, 
  onRefresh 
}: { 
  customers: Customer[]; 
  onRefresh: () => void;
}) {
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    
    try {
      await deleteCustomer.mutateAsync(id);
      toast.success('Customer deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contact</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Visits</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Visit</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer Since</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, i) => (
              <motion.tr
                key={customer.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-border hover:bg-muted/50 transition-colors"
              >
                <td className="p-4">
                  <Link to={`/customers/${customer.id}`} className="flex items-center gap-3">
                    <Avatar name={`${customer.first_name || ''} ${customer.last_name || ''}`} />
                    <span className="font-medium hover:text-primary">
                      {customer.first_name} {customer.last_name}
                    </span>
                  </Link>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatPhone(customer.phone)}
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {customer.email}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant="default">{customer.total_appointments}</Badge>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {customer.last_visit_date ? formatDate(customer.last_visit_date) : 'Never'}
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {formatDate(customer.customer_since)}
                </td>
                <td className="p-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/customers/${customer.id}`}>View Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Book Appointment</DropdownMenuItem>
                      <DropdownMenuItem>Send Message</DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(customer.id, `${customer.first_name} ${customer.last_name}`)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// New Customer Form
function NewCustomerForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    notes: '',
  });
  
  const createCustomer = useCreateCustomer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createCustomer.mutateAsync({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email || undefined,
        notes: formData.notes || undefined,
        language: 'en',
      });
      toast.success('Customer created successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create customer');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">First Name *</label>
          <Input 
            placeholder="John" 
            required 
            value={formData.first_name}
            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Last Name *</label>
          <Input 
            placeholder="Smith" 
            required 
            value={formData.last_name}
            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Phone Number *</label>
        <Input 
          type="tel" 
          placeholder="+1 (555) 000-0000" 
          required 
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <Input 
          type="email" 
          placeholder="john@example.com" 
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes</label>
        <textarea 
          className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
          placeholder="Any notes about this customer..."
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={createCustomer.isPending}>
          Add Customer
        </Button>
      </div>
    </form>
  );
}
