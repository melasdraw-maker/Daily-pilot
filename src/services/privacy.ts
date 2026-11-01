/**
 * Privacy & Sensitive Data Protection Service
 * Protects user and client personal identifying information (PII)
 */

export function maskPhoneNumber(phone?: string, enabled: boolean = true): string {
  if (!phone || !enabled) return phone || '';
  const cleaned = phone.trim();
  if (cleaned.length < 6) return '•• •• ••';
  // Keep first 2 and last 2 digits
  return cleaned.replace(/(\d{2})[\s.-]?(\d{2})[\s.-]?(\d{2})[\s.-]?(\d{2})[\s.-]?(\d{2})/, '$1 •• •• •• $5');
}

export function maskAddress(address?: string, enabled: boolean = true): string {
  if (!address || !enabled) return address || '';
  // Mask street number and keep street name
  return address.replace(/^\d+[\s,]+/, '•• ');
}

export function maskContactName(name?: string, enabled: boolean = true): string {
  if (!name || !enabled) return name || '';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

export function sanitizeMissionForExternalApi(mission: any): any {
  if (!mission) return null;
  // Strip sensitive client contacts and raw notes before sending to external LLM/APIs
  const { contactPhone, contactName, ...safeMission } = mission;
  return safeMission;
}
