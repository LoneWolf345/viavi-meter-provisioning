import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { normalizeMac, validateMacFormat, isCompleteMac, extractOui } from '@/utils/macUtils';

interface MacValidatorProps {
  onValidated: (mac: string) => void;
  isLoading?: boolean;
}

export function MacValidator({ onValidated, isLoading = false }: MacValidatorProps) {
  const [mac, setMac] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const checkOui = async (mac: string): Promise<boolean> => {
    try {
      const response = await fetch('/config/approved-ouis.json');
      const config = await response.json();
      const oui = extractOui(mac);
      return config.approved_ouis.includes(oui);
    } catch (error) {
      console.error('Failed to load OUI config:', error);
      return false;
    }
  };

  const handleInputChange = (value: string) => {
    const normalized = normalizeMac(value);
    setMac(normalized);
    setError('');
    setIsValid(false);
  };

  const handleValidate = async () => {
    if (!isCompleteMac(mac)) {
      setError('Please enter a complete MAC address (12 hex digits)');
      return;
    }

    if (!validateMacFormat(mac)) {
      setError('Invalid MAC address format');
      return;
    }

    const ouiApproved = await checkOui(mac);
    if (!ouiApproved) {
      setError('This is not a known Viavi meter.');
      return;
    }

    setError('');
    setIsValid(true);
    onValidated(mac);
  };

  const showCompletionHint = isCompleteMac(mac) && !isValid && !error;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mac-input" className="text-sm font-medium">
          MAC Address
        </Label>
        <div className="flex gap-2">
          <Input
            id="mac-input"
            value={mac}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Enter MAC (any format)"
            className="font-mono text-sm"
            maxLength={23}
          />
          <Button 
            onClick={handleValidate} 
            disabled={!mac || isLoading}
            className="min-w-[100px]"
          >
            Validate
          </Button>
        </div>
        
        
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        {showCompletionHint && (
          <p className="text-xs text-muted-foreground">
            Press Validate to continue
          </p>
        )}
        
        {isValid && !error && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle className="h-4 w-4" />
            <span>MAC validated successfully</span>
          </div>
        )}
      </div>
    </div>
  );
}
