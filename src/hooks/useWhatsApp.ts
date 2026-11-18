import { useContact } from '@/contexts/ContactContext';
import { whatsappLinks } from '@/lib/whatsapp';

export const useWhatsApp = () => {
  const { contactInfo } = useContact();
  const phoneNumber = contactInfo.phone1;

  const sendBookingConfirmation = (bookingCode: string, customerName?: string) => {
    const message = `Halo Kuala Outdoor,\n\nSaya ${customerName || 'customer'} sudah membuat booking dengan kode: *${bookingCode}*\n\nMohon konfirmasi ketersediaan dan detail pembayaran.\n\nTerima kasih!`;
    
    const whatsappURL = whatsappLinks(phoneNumber, message).clickToChat;
    window.open(whatsappURL, '_blank');
  };

  const sendTripInquiry = (tripTitle: string, tripDate?: string) => {
    const message = `Halo Kuala Outdoor,\n\nSaya tertarik dengan trip: *${tripTitle}*${tripDate ? `\nTanggal: ${tripDate}` : ''}\n\nMohon info lebih lanjut tentang trip ini.\n\nTerima kasih!`;
    
    const whatsappURL = whatsappLinks(phoneNumber, message).clickToChat;
    window.open(whatsappURL, '_blank');
  };

  const sendInquiry = (message: string) => {
    const whatsappURL = whatsappLinks(phoneNumber, message).clickToChat;
    window.open(whatsappURL, '_blank');
  };

  return { 
    sendBookingConfirmation,
    sendTripInquiry,
    sendInquiry,
    phoneNumber 
  };
};
