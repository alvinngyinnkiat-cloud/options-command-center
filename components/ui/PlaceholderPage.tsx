import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./Card";
import { PageHeader } from "./PageHeader";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase?: string;
}

export function PlaceholderPage({
  title,
  description,
  phase = "Coming in a future phase",
}: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Module Placeholder</CardTitle>
          <CardDescription>
            This section will be built in a future development phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 h-12 w-12 rounded-lg border border-terminal-border bg-terminal-elevated flex items-center justify-center">
              <span className="font-mono text-lg text-terminal-muted">—</span>
            </div>
            <p className="text-sm text-terminal-muted max-w-md">
              {phase}. The dashboard shell is ready — navigation, layout, and
              reusable components are in place.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
