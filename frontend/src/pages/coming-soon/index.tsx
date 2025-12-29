import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ComingSoonPage() {
  const navigate = useNavigate();

  return (
    <PageContainer
      title="Coming Soon"
      description="This feature is under development"
    >
      <Card className="max-w-lg mx-auto">
        <CardContent className="py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Construction className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground mb-6">
            We're working hard to bring you this feature. Stay tuned for updates!
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
