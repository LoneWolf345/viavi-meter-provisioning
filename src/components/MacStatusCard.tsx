import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Clock, X, RefreshCw } from 'lucide-react';

export interface MacStatus {
  mac: string;
  configfile: string;
  status: 'pending' | 'checking' | 'found' | 'not-found' | 'unknown';
  currentData?: {
    account: string;
    configfile: string;
    isp: string;
  };
  error?: string;
  provisionState: 'pending' | 'provisioning' | 'complete' | 'error';
}

interface MacStatusCardProps {
  mac: MacStatus;
  showProvisionState?: boolean;
}

export function MacStatusCard({ mac, showProvisionState = false }: MacStatusCardProps) {
  const isComplete = mac.provisionState === 'complete';
  const hadPreviousData = mac.status === 'found' && mac.currentData;

  const getStatusBadge = () => {
    // After successful provisioning, show "Replaced" if there was previous data
    if (isComplete && hadPreviousData) {
      return (
        <Badge className="gap-1 bg-success text-success-foreground">
          <RefreshCw className="h-3 w-3" />
          Replaced
        </Badge>
      );
    }

    switch (mac.status) {
      case 'checking':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking...
          </Badge>
        );
      case 'found':
        return (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Exists
          </Badge>
        );
      case 'not-found':
        return (
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Available
          </Badge>
        );
      case 'unknown':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Unknown
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const getProvisionBadge = (state: MacStatus['provisionState']) => {
    switch (state) {
      case 'provisioning':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Provisioning...
          </Badge>
        );
      case 'complete':
        return (
          <Badge className="gap-1 bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3" />
            Complete
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <X className="h-3 w-3" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">MAC Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 max-w-md">
          {/* MAC Address */}
          <span className="text-sm text-muted-foreground">MAC Address</span>
          <code className="font-mono text-sm font-medium justify-self-end">{mac.mac}</code>
          
          {/* Previous Status - contextual label */}
          <span className="text-sm text-muted-foreground">
            {isComplete ? 'Previous Status' : 'Current Status'}
          </span>
          <div className="flex flex-col items-end gap-1 justify-self-end">
            {getStatusBadge()}
            {mac.currentData && (
              <div className="text-xs text-muted-foreground">
                {mac.currentData.account} • {mac.currentData.configfile}
              </div>
            )}
          </div>

          {/* Config to Apply / Applied Config */}
          <span className="text-sm text-muted-foreground">
            {isComplete ? 'Applied Config' : 'Config to Apply'}
          </span>
          <div className="justify-self-end">
            {isComplete ? (
              <Badge className="gap-1 bg-success text-success-foreground">
                <CheckCircle className="h-3 w-3" />
                {mac.configfile}
              </Badge>
            ) : (
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {mac.configfile}
              </code>
            )}
          </div>

          {/* Provision State */}
          {showProvisionState && (
            <>
              <span className="text-sm text-muted-foreground pt-2 border-t border-border col-span-2" />
              <span className="text-sm text-muted-foreground">Provision State</span>
              <div className="flex flex-col items-end gap-1 justify-self-end">
                {getProvisionBadge(mac.provisionState)}
                {mac.error && (
                  <div className="text-xs text-destructive max-w-[200px] text-right" title={mac.error}>
                    {mac.error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
