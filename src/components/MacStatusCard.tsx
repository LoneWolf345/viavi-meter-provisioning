import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';

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
  const getStatusBadge = (status: MacStatus['status']) => {
    switch (status) {
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
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">MAC Address</span>
            <code className="font-mono text-sm font-medium">{mac.mac}</code>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current Status</span>
            <div className="flex flex-col items-end gap-1">
              {getStatusBadge(mac.status)}
              {mac.currentData && (
                <div className="text-xs text-muted-foreground">
                  {mac.currentData.account} • {mac.currentData.configfile}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Config to Apply</span>
            <code className="text-xs bg-muted px-2 py-1 rounded">
              {mac.configfile}
            </code>
          </div>

          {showProvisionState && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Provision State</span>
              <div className="flex flex-col items-end gap-1">
                {getProvisionBadge(mac.provisionState)}
                {mac.error && (
                  <div className="text-xs text-destructive max-w-[200px] text-right" title={mac.error}>
                    {mac.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
