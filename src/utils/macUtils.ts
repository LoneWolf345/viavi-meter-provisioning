/**
 * MAC address utilities for the provisioning tool
 */

export interface MacGenerationResult {
  success: boolean;
  macs?: string[];
  error?: string;
}

/**
 * Generates sequential MAC addresses (+1, +2, +3) from a base MAC
 * Uses 48-bit big-endian arithmetic across the full address
 */
export function generateSequentialMacs(baseMac: string): MacGenerationResult {
  try {
    // Remove colons and convert to number
    const cleanMac = baseMac.replace(/:/g, '');
    const baseNumber = BigInt('0x' + cleanMac);
    
    const macs: string[] = [];
    
    // Generate base + 0, +1, +2, +3
    for (let i = 0; i < 4; i++) {
      const newNumber = baseNumber + BigInt(i);
      
      // Check for overflow (48-bit limit)
      if (newNumber > BigInt('0xFFFFFFFFFFFF')) {
        return {
          success: false,
          error: `MAC overflow: Cannot generate MAC +${i} (exceeds 48-bit limit)`
        };
      }
      
      // Convert back to MAC format
      const hex = newNumber.toString(16).toUpperCase().padStart(12, '0');
      const formattedMac = hex.match(/.{2}/g)?.join(':') || '';
      macs.push(formattedMac);
    }
    
    return {
      success: true,
      macs
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to generate sequential MACs: ' + (error as Error).message
    };
  }

}

/**
 * Validates MAC address format (colon-separated, uppercase hex)
 */
export function validateMacFormat(mac: string): boolean {
  const macRegex = /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/;
  return macRegex.test(mac);
}

/**
 * Normalizes MAC input to uppercase colon-separated format
 */
export function normalizeMac(input: string): string {
  // Remove all non-hex characters, convert to uppercase
  const cleaned = input.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  
  // Add colons every 2 characters if we have exactly 12 characters
  if (cleaned.length === 12) {
    return cleaned.match(/.{2}/g)?.join(':') || '';
  }
  
  return input.toUpperCase().replace(/[^0-9A-F:]/g, '');
}

/**
 * Extracts OUI (first 6 hex characters) from MAC address
 */
export function extractOui(mac: string): string {
  return mac.replace(/:/g, '').slice(0, 6);
}
