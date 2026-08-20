export function normalizePhone(phone: string): string | null {
  if (!phone) return null;

  const cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    const digits = cleaned.substring(1);
    if (digits.length >= 10 && digits.length <= 15) {
      return cleaned;
    }
    return null;
  }

  if (cleaned.startsWith("1") && cleaned.length === 11) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  return null;
}

export function formatPhoneInput(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 10);
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 3) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length === 10;
}

export function lastFourDigits(phone: string | null | undefined): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 4) return null;
  return digits.slice(-4);
}
