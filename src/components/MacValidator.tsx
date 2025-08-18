import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface MacValidatorProps {
  onValidated: (mac: string) => void;
  isLoading?: boolean;
  }


export function MacValidator({ onValidated, isLoading = false }: MacValidatorProps) {
  const [mac, setMac] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const normalizeMac = (input: string): string => {
    // Remove all non-hex characters, convert to uppercase
    const cleaned = input.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    
    // Add colons every 2 characters
    if (cleaned.length === 12) {
      return cleaned.match(/.{2}/g)?.join(':') || '';
    }
    return cleaned;
  };

  const validateMacFormat = (mac: string): boolean => {
    const macRegex = /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/;
    return macRegex.test(mac);
  };

  const checkOui = async (mac: string): Promise<boolean> => {
    try {
      const response = await fetch('/config/approved-ouis.json');
      const config = await response.json();
      const oui = mac.replace(/:/g, '').slice(0, 6);
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
    if (!validateMacFormat(mac)) {
      setError('MAC must be UPPERCASE and colon-separated (AA:BB:CC:DD:EE:FF)');
      return;
    }

    const ouiApproved = await checkOui(mac);
    if (!ouiApproved) {
      setError('OUI not recognized/approved');
      return;
    }

    setError('');
    setIsValid(true);
    onValidated(mac);
  };

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
            placeholder="AA:BB:CC:DD:EE:FF"
            className="font-mono text-sm"
            maxLength={17}
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
