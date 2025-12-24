import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Calendar, Mail, Phone, UserCog } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/form-elements';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

// Mock staff data
const mockStaff = [
  {
    id: '1',
    name: 'Dr. Sarah Wilson',
    title: 'Senior Dentist',
    email: 'sarah@clinic.com',
    phone: '+15550201',
    specialty: 'General Dentistry',
    color_code: '#3B82F6',
    is_active: true,
    appointments_today: 8,
    appointments_week: 32,
  },
  {
    id: '2',
    name: 'Dr. Michael Brown',
    title: 'Orthodontist',
    email: 'michael@clinic.com',
    phone: '+15550202',
    specialty: 'Orthodontics',
    color_code: '#8B5CF6',
    is_active: true,
    appointments_today: 6,
    appointments_week: 28,
  },
  {
    id: '3',
    name: 'Dr. Emma Lee',
    title: 'Dental Hygienist',
    email: 'emma@clinic.com',
    phone: '+15550203',
    specialty: 'Preventive Care',
    color_code: '#06B6D4',
    is_active: true,
    appointments_today: 10,
    appointments_week: 45,
  },
  {
    id: '4',
    name: 'Dr. James Taylor',
    title: 'Periodontist',
    email: 'james@clinic.com',
    phone: '+15550204',
    specialty: 'Periodontics',
    color_code: '#F59E0B',
    is_active: false,
    appointments_today: 0,
    appointments_week: 0,
  },
];

const colorOptions = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#06B6D4', label: 'Teal' },
  { value: '#22C55E', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#EC4899', label: 'Pink' },
];

export default function StaffPage() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [isLoading] = useState(false);

  if (isLoading) {
    return (
      <PageContainer title="Staff" description="Manage your team">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Staff"
      description="Manage your team members and their availability"
      actions={
        <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Add Staff
        </Button>
      }
    >
      {mockStaff.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No staff members"
          description="Add your first staff member to start scheduling appointments"
          action={
            <Button onClick={() => setShowNewModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
              Add Staff
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mockStaff.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="overflow-hidden">
                {/* Color Bar */}
                <div className="h-2" style={{ backgroundColor: member.color_code }} />
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        name={member.name} 
                        color={member.color_code}
                        size="lg"
                        status={member.is_active ? 'online' : 'offline'}
                      />
                      <div>
                        <Link 
                          to={`/staff/${member.id}`}
                          className="font-semibold hover:text-primary transition-colors"
                        >
                          {member.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{member.title}</p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/staff/${member.id}`}>View Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Manage Availability</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Specialty */}
                  <Badge variant="default" className="mb-4">
                    {member.specialty}
                  </Badge>

                  {/* Contact */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-semibold">{member.appointments_today}</span> today
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{member.appointments_week}</span> this week
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Staff Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <NewStaffForm onSuccess={() => setShowNewModal(false)} />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// New Staff Form
function NewStaffForm({ onSuccess }: { onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

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
        <label className="text-sm font-medium">Full Name *</label>
        <Input placeholder="Dr. Jane Smith" required />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Title</label>
        <Input placeholder="Senior Dentist" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" placeholder="jane@clinic.com" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phone</label>
          <Input type="tel" placeholder="+1 (555) 000-0000" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Specialty</label>
        <Input placeholder="General Dentistry" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Calendar Color</label>
        <div className="flex gap-2">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setSelectedColor(color.value)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                selectedColor === color.value 
                  ? 'border-foreground scale-110' 
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div>
          <p className="font-medium">Active</p>
          <p className="text-sm text-muted-foreground">Staff member can receive appointments</p>
        </div>
        <Switch defaultChecked />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          Add Staff Member
        </Button>
      </div>
    </form>
  );
}
