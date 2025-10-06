import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MacValidator } from './MacValidator';
import { MacStatusCard, MacStatus } from './MacStatusCard';
import { provisioningApi } from '@/services/provisioningApi';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Network, CheckCircle } from 'lucide-react';

interface ProvisionDefaults {
  account: string;
  isp: string;
  configfile: string;
}

export function ProvisioningPage() {
  const [currentStep, setCurrentStep] = useState<'input' | 'status' | 'provisioning'>('input');
  const [mac, setMac] = useState<MacStatus | null>(null);
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

  const handleMacValidated = async (validatedMac: string) => {
    setIsLoading(true);
    setStatusError('');
    
    // Load defaults if not already loaded
    const defaults = provisionDefaults || await loadProvisionDefaults();
    if (!defaults) {
      setIsLoading(false);
      return;
    }

    // Initialize MAC status
    const macStatus: MacStatus = {
      mac: validatedMac,
      configfile: defaults.configfile,
      status: 'checking',
      provisionState: 'pending'
    };

    setMac(macStatus);
    setCurrentStep('status');

    // Check status for the MAC
    try {
      const searchResult = await provisioningApi.searchByMac(validatedMac);
      
      if (searchResult.length > 0) {
        setMac({
          ...macStatus,
          status: 'found',
          currentData: searchResult[0]
        });
      } else {
        setMac({
          ...macStatus,
          status: 'not-found'
        });
      }
    } catch (error) {
      console.error(`Status check failed for ${validatedMac}:`, error);
      setMac({
        ...macStatus,
        status: 'unknown'
      });
      setStatusError('Status check unavailable; you can still proceed with provisioning.');
    }

    setIsLoading(false);
  };

  const handleProvisionClick = () => {
    if (mac?.status === 'found') {
      setShowConfirmDialog(true);
    } else {
      startProvisioning();
    }
  };

  const startProvisioning = async () => {
    setShowConfirmDialog(false);
    setCurrentStep('provisioning');

    if (!mac) return;

    const defaults = provisionDefaults ?? await loadProvisionDefaults();
    if (!defaults) return;

    // Update to provisioning state
    setMac({
      ...mac,
      provisionState: 'provisioning'
    });

    try {
      const request = {
        mac: mac.mac,
        account: defaults.account,
        configfile: mac.configfile,
        isp: defaults.isp
      };

      const result = await provisioningApi.addHsd(request);

      if (result.success) {
        setMac({
          ...mac,
          provisionState: 'complete'
        });
        toast({
          title: "Provisioning Complete",
          description: "MAC address provisioned successfully",
        });
      } else {
        setMac({
          ...mac,
          provisionState: 'error',
          error: result.detail || result.error || 'Unknown error'
        });
        toast({
          title: "Provisioning Failed",
          description: result.detail || result.error || 'Unknown error',
          variant: "destructive",
        });
      }
    } catch (error) {
      setMac({
        ...mac,
        provisionState: 'error',
        error: (error as Error).message
      });
      toast({
        title: "Provisioning Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setCurrentStep('input');
    setMac(null);
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Network className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">MAC Provisioning Tool</h1>
            <p className="text-muted-foreground">Validate, check status, and provision MAC address</p>
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

        {currentStep !== 'input' && mac && (
          <div className="space-y-6">
            {/* MAC Overview */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">MAC Address: <code className="font-mono text-primary">{mac.mac}</code></h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
                {currentStep === 'status' && !isLoading && (
                  <Button onClick={handleProvisionClick} className="gap-2">
                    <Network className="h-4 w-4" />
                    Provision MAC
                  </Button>
                )}
              </div>
            </div>

            {/* Status Card */}
            <MacStatusCard 
              mac={mac}
              showProvisionState={currentStep === 'provisioning'}
            />

            {/* Existing MAC Warning */}
            {mac.status === 'found' && currentStep === 'status' && (
              <Alert className="border-warning bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground">
                  <strong>Warning:</strong> This MAC already exists in the system.
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
                This MAC already exists in the system. Proceeding will reapply 
                the configuration to this device. Are you sure you want to continue?
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
