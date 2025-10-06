/**
 * MAC address utilities for the provisioning tool
 */

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
