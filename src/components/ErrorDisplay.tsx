import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClassifiedError } from '@/utils/errorUtils';
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  ChevronDown,
  Info,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface ErrorDisplayProps {
  error: ClassifiedError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showTechnicalDetails?: boolean;
  compact?: boolean;
}

const CATEGORY_ICONS: Record<ClassifiedError['category'], React.ElementType> = {
  network: WifiOff,
  cors: Ban,
  server: AlertCircle,
  validation: AlertTriangle,
  timeout: Wifi,
  config: Info,
  oui: ShieldAlert,
  auth: ShieldAlert,
  unknown: XCircle,
};

const CATEGORY_VARIANTS: Record<ClassifiedError['category'], 'default' | 'destructive'> = {
  network: 'destructive',
  cors: 'destructive',
  server: 'destructive',
  validation: 'destructive',
  timeout: 'default',
  config: 'destructive',
  oui: 'default',
  auth: 'destructive',
  unknown: 'destructive',
};

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showTechnicalDetails = true,
  compact = false,
}: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const Icon = CATEGORY_ICONS[error.category];
  const variant = CATEGORY_VARIANTS[error.category];

  if (compact) {
    return (
      <Alert variant={variant} className="py-3">
        <Icon className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error.message}</span>
          {error.isRetryable && onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry} className="ml-2 h-7 gap-1">
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant={variant} className="space-y-3">
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2">
          <AlertTitle className="text-base">{error.title}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error.message}</p>

            <div className="space-y-1 text-sm">
              <p>
                <strong className="font-medium">Likely cause:</strong>{' '}
                {error.likelyCause}
              </p>
              <p>
                <strong className="font-medium">What to do:</strong>{' '}
                {error.suggestion}
              </p>
            </div>

            {showTechnicalDetails && error.technicalDetail && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 -ml-2">
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                    Technical details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <code className="block mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
                    {error.technicalDetail}
                  </code>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex gap-2 pt-1">
              {error.isRetryable && onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
