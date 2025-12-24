import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, Plus, MoreHorizontal, Phone, Mail, Calendar,
  ChevronLeft, ChevronRight, Users, Filter
} from 'lucide-react';
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

// Mock customers data
const mockCustomers = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Smith',
    phone: '+15550123',
    email: 'john.smith@email.com',
    total_appointments: 12,
    last_visit_date: '2024-12-20',
    customer_since: '2024-01-15',
  },
  {
    id: '2',
    first_name: 'Emily',
    last_name: 'Johnson',
    phone: '+15550124',
    email: 'emily.j@email.com',
    total_appointments: 8,
    last_visit_date: '2024-12-18',
    customer_since: '2024-03-22',
  },
  {
    id: '3',
    first_name: 'Robert',
    last_name: 'Davis',
    phone: '+15550125',
    email: 'r.davis@email.com',
    total_appointments: 15,
    last_visit_date: '2024-12-15',
    customer_since: '2023-11-08',
  },
  {
    id: '4',
    first_name: 'Sarah',
    last_name: 'Wilson',
    phone: '+15550126',
    email: 'sarah.w@email.com',
    total_appointments: 5,
    last_visit_date: '2024-12-10',
    customer_since: '2024-06-01',
  },
  {
    id: '5',
    first_name: 'Michael',
    last_name: 'Brown',
    phone: '+15550127',
    email: 'mike.brown@email.com',
    total_appointments: 22,
    last_visit_date: '2024-12-22',
    customer_since: '2023-08-14',
  },
];

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [isLoading] = useState(false);
  const [page, setPage] = useState(1);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredCustomers = mockCustomers.filter(customer => {
    const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
    const search = debouncedSearch.toLowerCase();
    return fullName.includes(search) || 
           customer.phone.includes(search) || 
           customer.email?.toLowerCase().includes(search);
  });

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
            onChange={(e) => setSearchQuery(e.target.value)}
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
      ) : filteredCustomers.length === 0 ? (
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
        <MobileCustomerList customers={filteredCustomers} />
      ) : (
        <DesktopCustomerTable customers={filteredCustomers} />
      )}

      {/* Pagination */}
      {filteredCustomers.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCustomers.length} of {mockCustomers.length} customers
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
            <span className="text-sm px-2">Page {page}</span>
            <Button 
              variant="outline" 
              size="icon-sm"
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
          <NewCustomerForm onSuccess={() => setShowNewModal(false)} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// Mobile Customer List
function MobileCustomerList({ customers }: { customers: typeof mockCustomers }) {
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
                <Avatar name={`${customer.first_name} ${customer.last_name}`} size="lg" />
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
                    <Button variant="ghost" size="icon-sm">
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
function DesktopCustomerTable({ customers }: { customers: typeof mockCustomers }) {
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
                    <Avatar name={`${customer.first_name} ${customer.last_name}`} />
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
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">First Name *</label>
          <Input placeholder="John" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Last Name *</label>
          <Input placeholder="Smith" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Phone Number *</label>
        <Input type="tel" placeholder="+1 (555) 000-0000" required />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Email</label>
        <Input type="email" placeholder="john@example.com" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Notes</label>
        <textarea 
          className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary"
          placeholder="Any notes about this customer..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          Add Customer
        </Button>
      </div>
    </form>
  );
}
