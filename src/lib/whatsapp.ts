export function normalizeWhatsAppNumber(value: string): string | null {
  const cleaned = value.trim().replace(/[\s().-]/g, '');
  if (!/^(?:\+?62|0)8\d{8,11}$/.test(cleaned)) return null;
  return cleaned.startsWith('0') ? `62${cleaned.slice(1)}` : cleaned.replace(/^\+/, '');
}

export function whatsappLinks(number: string, message: string) {
  const phone = normalizeWhatsAppNumber(number);
  if (!phone) throw new Error('Nomor WhatsApp admin belum diatur atau tidak valid.');
  const text = encodeURIComponent(message);
  return { clickToChat: `https://wa.me/${phone}?text=${text}`, web: `https://web.whatsapp.com/send?phone=${phone}&text=${text}` };
}

export function contactWhatsAppLink(number: string, message: string): string | undefined {
  return normalizeWhatsAppNumber(number) ? whatsappLinks(number, message).clickToChat : undefined;
}
