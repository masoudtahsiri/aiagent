import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Clock, DollarSign, Briefcase, Edit, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/form-elements';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/form-elements';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { formatCurrency, formatDuration } from '@/lib/utils/format';

// Mock services data
const mockServices = [
  {
    id: '1',
    name: 'General Consultation',
    description: 'Initial consultation to assess patient needs and create a treatment plan.',
    duration_minutes: 30,
    price: 75,
    category: 'consultation',
    is_active: true,
  },
  {
    id: '2',
    name: 'Teeth Cleaning',
    description: 'Professional teeth cleaning and oral hygiene assessment.',
    duration_minutes: 45,
    price: 120,
    category: 'maintenance',
    is_active: true,
  },
  {
    id: '3',
    name: 'Dental Filling',
    description: 'Cavity treatment with composite or amalgam filling.',
    duration_minutes: 60,
    price: 200,
    category: 'treatment',
    is_active: true,
  },
  {
    id: '4',
    name: 'Root Canal',
    description: 'Endodontic treatment to save an infected tooth.',
    duration_minutes: 90,
    price: 800,
    category: 'treatment',
    is_active: true,
  },
  {
    id: '5',
    name: 'Teeth Whitening',
    description: 'Professional whitening treatment for a brighter smile.',
    duration_minutes: 60,
    price: 350,
    category: 'cosmetic',
    is_active: false,
  },
];

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

  const filteredServices = selectedCategory === 'all' 
    ? mockServices 
    : mockServices.filter(s => s.category === selectedCategory);

  // Group by category
  const groupedServices = filteredServices.reduce((acc, service) => {
    const cat = service.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, typeof mockServices>);

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
                            <DropdownMenuItem>
                              {service.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
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
                        {service.price && (
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
          <NewServiceForm onSuccess={() => setShowNewModal(false)} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// New Service Form
function NewServiceForm({ onSuccess }: { onSuccess: () => void }) {
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
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Service Name *</label>
        <Input placeholder="e.g., Teeth Cleaning" required />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description</label>
        <Textarea placeholder="Describe this service..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Duration *</label>
          <Select defaultValue="30">
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
          <Input type="number" placeholder="0.00" min="0" step="0.01" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Category</label>
        <Select defaultValue="consultation">
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
        <Switch defaultChecked />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          Add Service
        </Button>
      </div>
    </form>
  );
}
