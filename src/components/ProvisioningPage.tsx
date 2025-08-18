import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MacValidator } from './MacValidator';
import { MacStatusTable, MacStatus } from './MacStatusTable';
import { generateSequentialMacs } from '@/utils/macUtils';
import { provisioningApi } from '@/services/provisioningApi';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Network, CheckCircle, X } from 'lucide-react';

interface ProvisionDefaults {
  account: string;
  isp: string;
  configfiles: string[];
}

export function ProvisioningPage() {
  const [currentStep, setCurrentStep] = useState<'input' | 'status' | 'provisioning'>('input');
  const [baseMac, setBaseMac] = useState('');
  const [macs, setMacs] = useState<MacStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [provisionDefaults, setProvisionDefaults] = useState<ProvisionDefaults | null>(null);
  const { toast } = useToast();

  const loadProvisionDefaults = async (): Promise<ProvisionDefaults | null> => {
    try {
      const response = await fetch('/config/provision-defaults.json');
      const defaults: ProvisionDefaults = await response.json();
      setProvisionDefaults(defaults);
      return defaults;
    } catch (error) {
      console.error('Failed to load provision defaults:', error);
      toast({
        title: "Configuration Error",
        description: "Failed to load provisioning configuration",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleMacValidated = async (mac: string) => {
    setBaseMac(mac);
    setIsLoading(true);
    setStatusError('');
    
    // Load defaults if not already loaded
    const defaults = provisionDefaults || await loadProvisionDefaults();
    if (!defaults) {
      setIsLoading(false);
      return;
    }

    // Generate sequential MACs
    const result = generateSequentialMacs(mac);
    if (!result.success || !result.macs) {
      toast({
        title: "MAC Generation Error",
        description: result.error || "Failed to generate sequential MACs",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Initialize MAC status array
    const initialMacs: MacStatus[] = result.macs.map((macAddr, index) => ({
      mac: macAddr,
      index,
      configfile: defaults.configfiles[index],
      status: 'checking',
      provisionState: 'pending'
    }));

    setMacs(initialMacs);
    setCurrentStep('status');

    // Check status for all MACs
    const updatedMacs = [...initialMacs];
    let hasServerError = false;

    for (let i = 0; i < result.macs.length; i++) {
      try {
        const searchResult = await provisioningApi.searchByMac(result.macs[i]);
        
        if (searchResult.length > 0) {
          updatedMacs[i] = {
            ...updatedMacs[i],
            status: 'found',
            currentData: searchResult[0]
          };
        } else {
          updatedMacs[i] = {
            ...updatedMacs[i],
            status: 'not-found'
          };
        }
      } catch (error) {
        console.error(`Status check failed for ${result.macs[i]}:`, error);
        updatedMacs[i] = {
          ...updatedMacs[i],
          status: 'unknown'
        };
        hasServerError = true;
      }
      
      // Update state after each check for real-time feedback
      setMacs([...updatedMacs]);
    }

    if (hasServerError) {
      setStatusError('Status check unavailable for some MACs; you can still proceed with provisioning.');
    }

    setIsLoading(false);
  };

  const hasExistingMacs = () => {
    return macs.some(mac => mac.status === 'found');
  };

  const handleProvisionClick = () => {
    if (hasExistingMacs()) {
      setShowConfirmDialog(true);
    } else {
      startProvisioning();
    }
  };

  const startProvisioning = async () => {
    setShowConfirmDialog(false);
    setCurrentStep('provisioning');

    const defaults = provisionDefaults ?? await loadProvisionDefaults();
    if (!defaults) return;
    setProvisionDefaults(defaults);

    const updatedMacs = [...macs];
    let successCount = 0;

    // Sequential provisioning
    for (let i = 0; i < updatedMacs.length; i++) {
      updatedMacs[i] = {
        ...updatedMacs[i],
        provisionState: 'provisioning'
      };
      setMacs([...updatedMacs]);

      try {
        const request = {
          mac: updatedMacs[i].mac,
          account: defaults.account,
          configfile: updatedMacs[i].configfile,
          isp: defaults.isp
        };

        const result = await provisioningApi.addHsd(request);

        if (result.success) {
          updatedMacs[i] = {
            ...updatedMacs[i],
            provisionState: 'complete'
          };
          successCount++;
        } else {
          updatedMacs[i] = {
            ...updatedMacs[i],
            provisionState: 'error',
            error: result.detail || result.error || 'Unknown error'
          };
        }
      } catch (error) {
        updatedMacs[i] = {
          ...updatedMacs[i],
          provisionState: 'error',
          error: (error as Error).message
        };
      }

      setMacs([...updatedMacs]);
    }

    // Show final summary
    toast({
      title: "Provisioning Complete",
      description: `Provisioned ${successCount} of ${macs.length} MACs successfully`,
      variant: successCount === macs.length ? "default" : "destructive",
    });
  };

  const handleReset = () => {
    setCurrentStep('input');
    setBaseMac('');
    setMacs([]);
    setStatusError('');
    setShowConfirmDialog(false);
  };

  const getStepIndicator = () => {
    const steps = [
      { key: 'input', label: 'Validate MAC' },
      { key: 'status', label: 'Check Status' },
      { key: 'provisioning', label: 'Provision' }
    ];

    return (
      <div className="flex items-center gap-2 mb-6">
        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === step.key 
                ? 'bg-primary text-primary-foreground'
                : steps.findIndex(s => s.key === currentStep) > index
                ? 'bg-success text-success-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {steps.findIndex(s => s.key === currentStep) > index ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className={`text-sm ${
              currentStep === step.key ? 'font-medium' : 'text-muted-foreground'
            }`}>
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <div className="w-8 h-px bg-border mx-2" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Network className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">MAC Provisioning Tool</h1>
            <p className="text-muted-foreground">Validate, check status, and provision sequential MAC addresses</p>
          </div>
        </div>

        {/* Step Indicator */}
        {getStepIndicator()}

        {/* Status Error Banner */}
        {statusError && (
          <Alert className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              {statusError}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {currentStep === 'input' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                Step 1: Validate MAC Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MacValidator onValidated={handleMacValidated} isLoading={isLoading} />
            </CardContent>
          </Card>
        )}

        {currentStep !== 'input' && (
          <div className="space-y-6">
            {/* MAC Overview */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Base MAC: <code className="font-mono text-primary">{baseMac}</code></h2>
                <p className="text-sm text-muted-foreground">
                  Generated {macs.length} sequential addresses for provisioning
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
                {currentStep === 'status' && !isLoading && (
                  <Button onClick={handleProvisionClick} className="gap-2">
                    <Network className="h-4 w-4" />
                    Provision MACs
                  </Button>
                )}
              </div>
            </div>

            {/* Status Table */}
            <MacStatusTable 
              macs={macs} 
              showProvisionColumn={currentStep === 'provisioning'}
            />

            {/* Existing MACs Warning */}
            {hasExistingMacs() && currentStep === 'status' && (
              <Alert className="border-warning bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground">
                  <strong>Warning:</strong> One or more MACs already exist in the system.
                  Provisioning will reapply the configuration.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Confirm Provisioning
              </DialogTitle>
              <DialogDescription>
                One or more MACs already exist in the system. Proceeding will reapply 
                the configuration to these devices. Are you sure you want to continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button onClick={startProvisioning}>
                Proceed with Provisioning
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
