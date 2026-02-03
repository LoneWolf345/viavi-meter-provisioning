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
 * Supports: colons, hyphens, dots (Cisco), spaces, no separator
 * Handles progressive formatting during typing
 */
export function normalizeMac(input: string): string {
  // Strip all non-hex characters and uppercase
  const cleaned = input.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  
  // Insert colons every 2 characters for what we have
  const pairs = cleaned.match(/.{1,2}/g) || [];
  return pairs.join(':');
}

/**
 * Checks if the normalized MAC has complete 12 hex digits
 */
export function isCompleteMac(mac: string): boolean {
  const hexOnly = mac.replace(/:/g, '');
  return hexOnly.length === 12;
}

/**
 * Extracts OUI (first 6 hex characters) from MAC address
 */
export function extractOui(mac: string): string {
  return mac.replace(/:/g, '').slice(0, 6);
}
