import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Save, RotateCcw, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/form-elements';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBusinessHours, useUpdateBusinessHours, useBusinessId } from '@/lib/api/hooks';

interface DaySchedule {
  day: string;
  dayIndex: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const defaultSchedule: DaySchedule[] = [
  { day: 'Monday', dayIndex: 0, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Tuesday', dayIndex: 1, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Wednesday', dayIndex: 2, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Thursday', dayIndex: 3, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Friday', dayIndex: 4, isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Saturday', dayIndex: 5, isOpen: false, openTime: '10:00', closeTime: '14:00' },
  { day: 'Sunday', dayIndex: 6, isOpen: false, openTime: '10:00', closeTime: '14:00' },
];

export default function BusinessHoursPage() {
  const businessId = useBusinessId();
  const { data: hoursData, isLoading } = useBusinessHours();
  const updateHours = useUpdateBusinessHours();
  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);
  const [hasChanges, setHasChanges] = useState(false);

  // Convert API data to local schedule format
  useEffect(() => {
    if (hoursData && Array.isArray(hoursData)) {
      const newSchedule = defaultSchedule.map(day => {
        const apiDay = hoursData.find(h => h.day_of_week === day.dayIndex);
        if (apiDay) {
          return {
            ...day,
            isOpen: apiDay.is_open !== false,
            openTime: apiDay.open_time?.slice(0, 5) || day.openTime,
            closeTime: apiDay.close_time?.slice(0, 5) || day.closeTime,
          };
        }
        return day;
      });
      setSchedule(newSchedule);
    }
  }, [hoursData]);

  const handleToggleDay = (dayIndex: number) => {
    setSchedule(prev => prev.map(day =>
      day.dayIndex === dayIndex ? { ...day, isOpen: !day.isOpen } : day
    ));
    setHasChanges(true);
  };

  const handleTimeChange = (dayIndex: number, field: 'openTime' | 'closeTime', value: string) => {
    setSchedule(prev => prev.map(day =>
      day.dayIndex === dayIndex ? { ...day, [field]: value } : day
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Convert schedule to API format
      const hoursPayload = schedule.map(day => ({
        day_of_week: day.dayIndex,
        open_time: day.openTime + ':00',
        close_time: day.closeTime + ':00',
        is_open: day.isOpen,
      }));

      await updateHours.mutateAsync(hoursPayload as any);
      toast.success('Business hours saved successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save business hours');
    }
  };

  const handleReset = () => {
    setSchedule(defaultSchedule);
    setHasChanges(true);
  };

  const applyToWeekdays = () => {
    const mondaySchedule = schedule.find(d => d.dayIndex === 0);
    if (!mondaySchedule) return;

    setSchedule(prev => prev.map(day => {
      if (day.dayIndex >= 0 && day.dayIndex <= 4) {
        return {
          ...day,
          isOpen: mondaySchedule.isOpen,
          openTime: mondaySchedule.openTime,
          closeTime: mondaySchedule.closeTime,
        };
      }
      return day;
    }));
    setHasChanges(true);
    toast.success('Applied Monday schedule to all weekdays');
  };

  if (isLoading) {
    return (
      <PageContainer
        title="Business Hours"
        description="Set when your business is open to receive calls"
      >
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Business Hours"
      description="Set when your business is open to receive calls"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} loading={updateHours.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      }
    >
      {/* Info Banner */}
      <Card className="bg-primary/5 border-primary/20 mb-6">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">AI Availability</p>
              <p className="text-sm text-muted-foreground">
                Your AI assistant will only handle calls during these hours. Outside business hours,
                callers will hear a customized message or be sent to voicemail.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={applyToWeekdays}>
          Apply Monday to Weekdays
        </Button>
      </div>

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Configure your operating hours for each day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {schedule.map((day, index) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                  day.isOpen
                    ? 'bg-card border-border'
                    : 'bg-muted/50 border-border'
                )}
              >
                {/* Day Name & Toggle */}
                <div className="flex items-center gap-4 w-40">
                  <Switch
                    checked={day.isOpen}
                    onCheckedChange={() => handleToggleDay(day.dayIndex)}
                  />
                  <span className={cn(
                    'font-medium',
                    !day.isOpen && 'text-muted-foreground'
                  )}>
                    {day.day}
                  </span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 w-24">
                  {day.isOpen ? (
                    <span className="flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400">
                      <Check className="h-4 w-4" />
                      Open
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <X className="h-4 w-4" />
                      Closed
                    </span>
                  )}
                </div>

                {/* Time Inputs */}
                <div className={cn(
                  'flex items-center gap-3 flex-1',
                  !day.isOpen && 'opacity-50 pointer-events-none'
                )}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground w-12">From</label>
                    <Input
                      type="time"
                      value={day.openTime}
                      onChange={(e) => handleTimeChange(day.dayIndex, 'openTime', e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <span className="text-muted-foreground">—</span>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground w-8">To</label>
                    <Input
                      type="time"
                      value={day.closeTime}
                      onChange={(e) => handleTimeChange(day.dayIndex, 'closeTime', e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>

                {/* Duration Display */}
                {day.isOpen && (
                  <div className="hidden md:block text-sm text-muted-foreground w-20 text-right">
                    {calculateDuration(day.openTime, day.closeTime)}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* After Hours Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>After Hours Behavior</CardTitle>
          <CardDescription>Configure what happens when your business is closed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Play closed message</p>
                  <p className="text-sm text-muted-foreground">
                    Inform callers about your business hours
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Offer callback scheduling</p>
                  <p className="text-sm text-muted-foreground">
                    Let callers schedule a callback during business hours
                  </p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <Card className="border-warning-500/50 bg-warning-500/10 shadow-lg">
            <CardContent className="p-4 flex items-center gap-4">
              <AlertCircle className="h-5 w-5 text-warning-600" />
              <span className="text-sm font-medium">You have unsaved changes</span>
              <Button size="sm" onClick={handleSave} loading={updateHours.isPending}>
                Save Now
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </PageContainer>
  );
}

// Helper function to calculate duration
function calculateDuration(start: string, end: string): string {
  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
