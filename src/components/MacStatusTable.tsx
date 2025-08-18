import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';

export interface MacStatus {
  mac: string;
  index: number;
  configfile: string;
  status: 'pending' | 'checking' | 'found' | 'not-found' | 'unknown' | 'provisioning' | 'complete' | 'error';
  currentData?: {
    account: string;
    configfile: string;
    isp: string;
    customFields?: Record<string, unknown>;
  };
  error?: string;
  provisionState: 'pending' | 'provisioning' | 'complete' | 'error';
  }


interface MacStatusTableProps {
  macs: MacStatus[];
  onStatusUpdated?: (macs: MacStatus[]) => void;
  showProvisionColumn?: boolean;
}

export function MacStatusTable({ macs, onStatusUpdated, showProvisionColumn = false }: MacStatusTableProps) {
  const [localMacs, setLocalMacs] = useState<MacStatus[]>(macs);

  useEffect(() => {
    setLocalMacs(macs);
  }, [macs]);

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

  const getConfigLabel = (index: number) => {
    const labels = ['Original', '+1', '+2', '+3'];
    return labels[index] || `+${index}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">MAC Status Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MAC Address</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Current Status</TableHead>
              <TableHead>Config to Apply</TableHead>
              {showProvisionColumn && <TableHead>Provision State</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {localMacs.map((macEntry) => (
              <TableRow key={macEntry.mac}>
                <TableCell className="font-mono text-sm">
                  {macEntry.mac}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getConfigLabel(macEntry.index)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(macEntry.status)}
                  {macEntry.currentData && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {macEntry.currentData.account} • {macEntry.currentData.configfile}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {macEntry.configfile}
                  </code>
                </TableCell>
                {showProvisionColumn && (
                  <TableCell>
                    {getProvisionBadge(macEntry.provisionState)}
                    {macEntry.error && (
                      <div className="text-xs text-destructive mt-1" title={macEntry.error}>
                        {macEntry.error.length > 50 ? macEntry.error.substring(0, 50) + '...' : macEntry.error}
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
