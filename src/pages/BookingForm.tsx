import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Mail,
  MessageSquare,
  MessageCircle,
  Package,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react'
import { useContact } from '@/contexts/ContactContext'
import { useToast } from '@/hooks/use-toast'
import { BookingSuccessDialog } from '@/components/BookingSuccessDialog';
import { normalizeWhatsAppNumber, whatsappLinks } from '@/lib/whatsapp';

// ✅ API Base URL for production deployment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://pbl-kuala-outdoor-production.up.railway.app/api';
const UPLOADS_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://pbl-kuala-outdoor-production.up.railway.app';

const BookingForm = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { contactInfo, refreshContactInfo } = useContact()
  const { toast } = useToast()

  const { cartItems, totalItems, totalPrice, fromCart } = location.state || {}

  const [bookingData, setBookingData] = useState({
    customerName: '',
    phone: '',
    email: '',
    identityNumber: '',
    rentalStartDate: '',
    rentalEndDate: '',
    notes: ''
  })

  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const submitting = useRef(false);
  const [preparedMessage, setPreparedMessage] = useState('');
  const [preparedPhone, setPreparedPhone] = useState('');
  const [savedItems, setSavedItems] = useState<any[] | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    id?: string;
    code?: string;
  }>({});

  // ✅ FETCH PROFILE - AUTO-FILL FORM
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        console.log('⚠️ User belum login')
        setProfileLoading(false)
        return
      }

      try {
        console.log('🔄 Fetching profile for customer_id:', user.id)

        const response = await fetch(
          `${API_BASE_URL}/customer/profile.php?id=${user.id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )

        console.log('📡 Response status:', response.status)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('📦 API Response:', data)

        if (data.success && data.data) {
          console.log('✅ Customer data loaded:', data.data)
          
          // ✅ SET DATA KE FORM
          setBookingData(prev => ({
            ...prev,
            customerName: data.data.full_name || '',
            phone: data.data.phone || '',
            email: data.data.email || '',
            identityNumber: data.data.identity_number || ''
          }))

          // ✅ CEK KELENGKAPAN DATA
          const isComplete = data.data.full_name && 
                            data.data.phone && 
                            data.data.email && 
                            data.data.identity_number

          if (isComplete) {
            toast({
              title: '✅ Data Terisi Otomatis',
              description: 'Data penyewa diambil dari profil Anda',
            })
          } else {
            toast({
              title: '⚠️ Profil Belum Lengkap',
              description: 'Silakan lengkapi profil Anda terlebih dahulu',
              variant: 'destructive'
            })
          }
        } else {
          throw new Error(data.message || 'Gagal memuat profil')
        }
      } catch (error: any) {
        console.error('❌ Error fetching profile:', error)
        
        let errorMessage = 'Tidak dapat memuat data profil. Silakan isi manual.'
        
        if (error.message.includes('404')) {
          errorMessage = 'API profile tidak ditemukan. Hubungi admin.'
        } else if (error.message.includes('CORS')) {
          errorMessage = 'Masalah koneksi server. Coba refresh halaman.'
        }
        
        toast({
          title: '⚠️ Peringatan',
          description: errorMessage,
          variant: 'destructive'
        })
      } finally {
        setProfileLoading(false)
      }
    }

    fetchUserProfile()
  }, [user, toast])

  // CEK APAKAH ADA DATA CART
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      const confirmRedirect = window.confirm(
        'Keranjang kosong!\n\nKlik OK untuk kembali ke halaman keranjang.'
      )
      if (confirmRedirect) {
        navigate('/cart')
      }
    }
  }, [cartItems, navigate])

  // HITUNG DURASI RENTAL
  const calculateDays = () => {
    if (!bookingData.rentalStartDate || !bookingData.rentalEndDate) return 0
    const start = new Date(bookingData.rentalStartDate)
    const end = new Date(bookingData.rentalEndDate)
    const diffTime = end.getTime() - start.getTime()
    if (diffTime < 0) return 0
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays || 1
  }

  const rentalDays = calculateDays()
  const displayedSubtotal = savedItems ? savedItems.reduce((sum, item) => sum + item.price_per_day * item.quantity, 0) : totalPrice;
  const grandTotal = displayedSubtotal * rentalDays

  const validateBooking = () => {
    if (!bookingData.customerName.trim() || !bookingData.phone.trim() || !bookingData.rentalStartDate || !bookingData.rentalEndDate)
      throw new Error('Lengkapi nama, nomor telepon, dan tanggal sewa.');
    if (!rentalDays) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (bookingData.rentalStartDate < localToday) throw new Error('Tanggal mulai tidak boleh di masa lalu.');
    if (!Array.isArray(cartItems) || !cartItems.length || cartItems.some((item: any) => !Number.isInteger(item.quantity) || item.quantity < 1 || (item.cart_type === 'equipment' ? !item.equipment?.equipment_id : item.cart_type === 'package' ? !item.package_id : true)))
      throw new Error('Item atau jumlah dalam keranjang tidak valid.');
  };

  const generateWhatsAppMessage = (items: any[], duration: number, code?: string) => {
    const currency = (amount: number) => `Rp ${Number(amount).toLocaleString('id-ID')}`;
    const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const subtotal = items.reduce((sum, item) => sum + Number(item.price_per_day) * item.quantity, 0);
    const details = items.map((item, index) => `${index + 1}. ${item.name}\n   Jumlah: ${item.quantity}\n   Harga: ${currency(item.price_per_day)}/hari\n   Total: ${currency(item.price_per_day * item.quantity * duration)}`).join('\n\n');
    return [`*BOOKING KELANA OUTDOOR*${code ? `\nKode booking: ${code}` : ''}`, `*DATA PENYEWA*\nNama: ${bookingData.customerName}\nNo. HP: ${bookingData.phone}${bookingData.email ? `\nEmail: ${bookingData.email}` : ''}`, `*DETAIL PEMESANAN*\n${details}`, `*TANGGAL PENYEWAAN*\nTanggal Mulai: ${date(bookingData.rentalStartDate)}\nTanggal Selesai: ${date(bookingData.rentalEndDate)}\nDurasi: ${duration} hari`, `*RINCIAN PEMBAYARAN*\nSubtotal per hari: ${currency(subtotal)}\nTotal Pembayaran: ${currency(subtotal * duration)}`, ...(bookingData.notes.trim() ? [`*CATATAN*\n${bookingData.notes}`] : []), 'Halo Admin Kelana Outdoor, saya ingin melakukan konfirmasi booking sesuai rincian di atas. Mohon informasi ketersediaan dan langkah berikutnya. Terima kasih.'].join('\n\n');
  };

  const handleWhatsApp = async () => {
    const popup = window.open('', '_blank');
    if (popup) popup.opener = null;
    try {
      validateBooking();
      const active = await refreshContactInfo();
      if (!active || !normalizeWhatsAppNumber(active.phone1)) throw new Error('Nomor WhatsApp admin belum diatur atau tidak valid.');
      if (!preparedMessage) throw new Error('Simpan booking terlebih dahulu untuk mendapatkan rincian harga terbaru.');
      const message = preparedMessage;
      setPreparedMessage(message); setPreparedPhone(active.phone1);
      if (popup) popup.location.href = whatsappLinks(active.phone1, message).clickToChat;
      else toast({ title: 'Popup diblokir', description: 'Gunakan tombol WhatsApp Web atau salin pesan di bawah.' });
    } catch (error) {
      popup?.close();
      toast({ title: 'Tidak dapat membuka WhatsApp', description: error instanceof Error ? error.message : 'Terjadi kesalahan.', variant: 'destructive' });
    }
  };

  // SUBMIT KE API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting.current || bookingResult.id) return;
    submitting.current = true;
    const popup = window.open('', '_blank');
    if (popup) popup.opener = null;
    setLoading(true)

    try {
      validateBooking();
      const activeContact = await refreshContactInfo();
      if (!activeContact || !normalizeWhatsAppNumber(activeContact.phone1)) throw new Error('Nomor WhatsApp admin belum diatur atau tidak valid.');
      // ✅ VALIDASI DATA
      if (!bookingData.customerName || !bookingData.phone || 
          !bookingData.rentalStartDate || !bookingData.rentalEndDate) {
        toast({
          title: '⚠️ Data Belum Lengkap',
          description: 'Mohon lengkapi semua data yang wajib diisi!',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      // ✅ PISAHKAN EQUIPMENT DAN PAKET DARI CART
      const equipmentItems = cartItems
        .filter((item: any) => item.cart_type === 'equipment' && item.equipment)
        .map((item: any) => ({
          equipment_id: item.equipment.equipment_id,
          quantity: item.quantity || 1
        }))

      const packageItems = cartItems
        .filter((item: any) => item.cart_type === 'package' && item.package_id)
        .map((item: any) => ({
          package_id: item.package_id,
          quantity: item.quantity || 1
        }))

      // ✅ DEBUG LOG
      console.log('📦 Cart Items:', cartItems)
      console.log('🔧 Equipment Items:', equipmentItems)
      console.log('📦 Package Items:', packageItems)

      // ✅ VALIDASI ADA ITEM
      if (equipmentItems.length === 0 && packageItems.length === 0) {
        toast({
          title: '⚠️ Keranjang Kosong',
          description: 'Minimal harus ada 1 equipment atau 1 paket',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      // ✅ PAYLOAD UNTUK API
      const payload = {
        customer_name: bookingData.customerName,
        customer_phone: bookingData.phone,
        customer_email: bookingData.email || null,
        customer_identity_number: bookingData.identityNumber || null,
        customer_id: user?.id || null,
        start_date: bookingData.rentalStartDate,
        end_date: bookingData.rentalEndDate,
        notes: bookingData.notes || '',
        equipment_items: equipmentItems,
        package_items: packageItems
      }

      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
      const signature = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
      const savedRequest = JSON.parse(sessionStorage.getItem('kelana_booking_request') || 'null');
      const requestKey = savedRequest?.signature === signature ? savedRequest.key : crypto.randomUUID();
      sessionStorage.setItem('kelana_booking_request', JSON.stringify({ signature, key: requestKey }));


      const response = await fetch(`${API_BASE_URL}/public/booking.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, request_key: requestKey })
      })

      const result = await response.json()
      console.log('✅ Response:', result)

      if (!result.success) {
        throw new Error(result.message || 'Gagal membuat booking')
      }

      const message = generateWhatsAppMessage(result.items, result.duration, result.booking_code);
      setSavedItems(result.items);
      setPreparedMessage(message);
      setPreparedPhone(activeContact.phone1);
      if (popup) popup.location.href = whatsappLinks(activeContact.phone1, message).clickToChat;
      else toast({ title: 'Popup diblokir', description: 'Gunakan tombol WhatsApp Web atau salin pesan.' });

      // ✅ GANTI WINDOW.CONFIRM DENGAN INI (LOGIC SAMA, TAMPILAN BEDA)
      setBookingResult({
        id: result.booking_id,
        code: result.booking_code,
      })
      setSuccessDialogOpen(true)
    } catch (error: any) {
      popup?.close();
      console.error('❌ Booking error:', error)
      toast({
        title: '❌ Gagal Membuat Booking',
        description: error.message || 'Terjadi kesalahan saat memproses booking',
        variant: 'destructive'
      })
    } finally {
      submitting.current = false;
      setLoading(false)
    }
  }

  // LOADING STATE
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data profil...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memproses booking...</p>
        </div>
      </div>
    )
  }

  // KERANJANG KOSONG
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-xl mb-2">Keranjang Booking Kosong</p>
          <p className="text-gray-500 mb-6">Silakan tambah equipment terlebih dahulu</p>
          <Button 
            onClick={() => navigate('/browse')}
            className="bg-green-600 hover:bg-green-700"
          >
            <Package className="h-4 w-4 mr-2" />
            Browse Equipment
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/cart')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Keranjang
            </Button>
            <h1 className="text-3xl font-bold">Form Booking</h1>
            <p className="text-gray-600">Lengkapi data untuk melanjutkan pemesanan</p>
          </div>

          {/* ✅ INFO ALERT - DATA AUTO-FILL */}
          {user && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">📋 Data Otomatis Terisi</p>
                <p className="text-blue-700">
                  Data <strong>Nama, Telepon, Email, dan No. KTP</strong> diambil dari profil Anda.
                  {!bookingData.customerName && (
                    <span className="block mt-1 text-red-600">
                      ⚠️ Profil Anda belum lengkap. <button onClick={() => navigate('/profile')} className="underline font-semibold">Lengkapi sekarang</button>
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* FORM */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Penyewa</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <fieldset disabled={!!bookingResult.id} className="space-y-4">
                  
                    {/* ✅ NAMA LENGKAP - READONLY */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <User className="h-4 w-4 inline mr-1" />
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          user ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                        }`}
                        value={bookingData.customerName}
                        onChange={(e) => !user && setBookingData({...bookingData, customerName: e.target.value})}
                        placeholder="Masukkan nama lengkap"
                        required
                        readOnly={!!user}
                      />
                      {user && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <span className="text-green-600">✓</span> Data dari profil Anda
                        </p>
                      )}
                    </div>

                    {/* ✅ NO. TELEPON - READONLY */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Phone className="h-4 w-4 inline mr-1" />
                        No. Telepon <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          user ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                        }`}
                        value={bookingData.phone}
                        onChange={(e) => !user && setBookingData({...bookingData, phone: e.target.value})}
                        placeholder="08xxxxxxxxxx"
                        required
                        readOnly={!!user}
                      />
                      {user && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <span className="text-green-600">✓</span> Data dari profil Anda
                        </p>
                      )}
                    </div>

                    {/* ✅ EMAIL - READONLY */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Email (Opsional)
                      </label>
                      <input
                        type="email"
                        className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          user ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                        }`}
                        value={bookingData.email}
                        onChange={(e) => !user && setBookingData({...bookingData, email: e.target.value})}
                        placeholder="email@example.com"
                        readOnly={!!user}
                      />
                      {user && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <span className="text-green-600">✓</span> Data dari profil Anda
                        </p>
                      )}
                    </div>

                    {/* ✅ NO. KTP - READONLY */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <User className="h-4 w-4 inline mr-1" />
                        No. KTP (Opsional)
                      </label>
                      <input
                        type="text"
                        className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          user ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                        }`}
                        value={bookingData.identityNumber}
                        onChange={(e) => !user && setBookingData({...bookingData, identityNumber: e.target.value})}
                        placeholder="Masukkan nomor KTP"
                        readOnly={!!user}
                      />
                      {user && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <span className="text-green-600">✓</span> Data dari profil Anda
                        </p>
                      )}
                    </div>
                  
                    {/* ✅ TANGGAL RENTAL - USER INPUT */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Tanggal Mulai <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={bookingData.rentalStartDate}
                          onChange={(e) => setBookingData({...bookingData, rentalStartDate: e.target.value})}
                          min={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Tanggal Selesai <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={bookingData.rentalEndDate}
                          onChange={(e) => setBookingData({...bookingData, rentalEndDate: e.target.value})}
                          min={bookingData.rentalStartDate || new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                    </div>
                  
                    {/* ✅ CATATAN - USER INPUT */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <MessageSquare className="h-4 w-4 inline mr-1" />
                        Catatan (Opsional)
                      </label>
                      <textarea
                        className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        rows={4}
                        value={bookingData.notes}
                        onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                        placeholder="Tambahkan catatan khusus untuk pesanan Anda..."
                      />
                    </div>
                  
                    {/* ✅ SUBMIT BUTTON */}
                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                      disabled={loading || !!bookingResult.id || !bookingData.customerName || !bookingData.phone}
                    >
                      {loading ? 'Memproses...' : 'Konfirmasi Booking'}
                    </Button>
                    </fieldset>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* RINGKASAN PESANAN */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Ringkasan Pesanan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Item List */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {cartItems.map((item: any) => {
                      const isPackage = item.cart_type === 'package'
                      const name = isPackage ? item.package_name : item.equipment.name
                      const id = isPackage ? item.package_id : item.equipment.equipment_id;
                      const saved = savedItems?.find(savedItem => savedItem.id === id && savedItem.type === item.cart_type);
                      const pricePerDay = saved ? saved.price_per_day : isPackage ? item.price_per_day : item.equipment.price_per_day
                      const itemTotal = pricePerDay * item.quantity

                      return (
                        <div key={isPackage ? `pkg-${item.package_id}` : `eq-${item.equipment.equipment_id}`} className="flex justify-between border-b pb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{name}</p>
                            <p className="text-xs text-gray-600">
                              {item.quantity}x • Rp {pricePerDay.toLocaleString('id-ID')}/hari
                            </p>
                            {isPackage && (
                              <Badge className="mt-1 bg-orange-100 text-orange-800 text-[10px]">
                                PAKET
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold text-sm">
                            Rp {itemTotal.toLocaleString('id-ID')}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Calculation */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal ({totalItems} items)</span>
                      <span>Rp {displayedSubtotal?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Durasi Sewa</span>
                      <span className="font-semibold">
                        {rentalDays > 0 ? `${rentalDays} hari` : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-green-700 pt-2 border-t">
                      <span>Total</span>
                      <span>
                        {rentalDays > 0 ? `Rp ${grandTotal.toLocaleString('id-ID')}` : 'Rp 0'}
                      </span>
                    </div>
                  </div>

                  {/* TOMBOL WHATSAPP */}
                  <Button 
                    variant="outline" 
                    className="w-full h-12"
                    onClick={handleWhatsApp}
                    disabled={!preparedMessage}
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Kirim via WhatsApp
                  </Button>
                  {preparedMessage && preparedPhone && (
                    <div className="space-y-2">
                      <a className="block text-sm text-green-700 underline" href={whatsappLinks(preparedPhone, preparedMessage).web} target="_blank" rel="noopener noreferrer">Lanjutkan melalui WhatsApp Web</a>
                      <Button type="button" variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(preparedMessage); toast({ title: 'Pesan disalin' }); } catch { toast({ title: 'Gagal menyalin pesan', description: 'Salin teks dari kotak pesan.', variant: 'destructive' }); } }}>Salin pesan</Button>
                      <textarea readOnly value={preparedMessage} aria-label="Pesan booking" className="w-full border rounded p-2 text-sm" rows={4} />
                      <p className="text-xs text-gray-600">Pesan belum dikirim. Tekan Kirim di WhatsApp.</p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 space-y-1">
                    <p className="font-semibold">📞 Admin: {contactInfo.phone1}</p>
                    <p>✅ Gratis pickup & return di lokasi kami</p>
                    <p>⏱️ Konfirmasi via WhatsApp max 1 jam</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Add dialog at the end */}
      <BookingSuccessDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        bookingId={bookingResult.id}
        bookingCode={bookingResult.code}
        onWhatsAppClick={handleWhatsApp} // ✅ TAMBAHKAN INI
      />
    </>
  )
}

export default BookingForm
