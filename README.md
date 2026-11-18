# PBL Kuala Outdoor

**Platform web penyewaan perlengkapan outdoor, paket rental, dan pengelolaan pemesanan.**

Proyek *Project-Based Learning* (PBL) ini menggabungkan katalog untuk pelanggan dan dashboard administrasi dalam satu sistem. Antarmuka dibuat menggunakan **React + TypeScript**, terhubung ke **API PHP** dan **database MySQL** untuk pengelolaan data produk, keranjang, serta pemesanan.

**Teknologi utama:** React 18 · TypeScript · Vite 5 · PHP · MySQL · Tailwind CSS

---

## Gambaran Proyek

Kuala Outdoor dirancang untuk membantu pelanggan menjelajahi perlengkapan outdoor, melihat paket rental dan open trip, lalu melanjutkan proses pemesanan. Di sisi pengelola, tersedia halaman admin untuk mengatur katalog, inventaris, trip, dan status pemesanan.

## Fitur Utama

### Pengunjung & Pelanggan

- **Katalog peralatan outdoor** — pencarian, filter kategori, informasi stok, harga sewa, dan detail peralatan.
- **Paket rental** — daftar paket dengan harga dan rincian perlengkapan yang termasuk.
- **Open trip & merchandise** — halaman informasi kegiatan dan produk pendukung.
- **Akun pelanggan** — login, registrasi, profil, dan dukungan integrasi Google OAuth.
- **Keranjang & booking** — pemilihan peralatan/paket, pengaturan jumlah, dan formulir pemesanan.
- **Kontak WhatsApp** — alur untuk menyiapkan pesan pemesanan ke kontak usaha.

### Dashboard Admin

- **Pengelolaan equipment** — data produk, kategori, stok, harga, dan foto.
- **Pengelolaan paket & trip** — pembuatan dan perubahan informasi katalog.
- **Manajemen booking** — daftar/detail pesanan dan pembaruan status melalui endpoint backend.
- **Pengelolaan merchandise dan informasi kontak**.

> Ketersediaan masing-masing alur bergantung pada konfigurasi server, database, dan layanan yang aktif. Repository ini menampilkan source code portofolio, bukan layanan siap pakai tanpa konfigurasi.

## Screenshot Aplikasi

### Katalog Peralatan Outdoor

![Halaman katalog peralatan outdoor Kuala Outdoor](screenshots/katalog-peralatan.png)

*Halaman katalog menampilkan produk, kategori, stok, harga sewa, serta tombol detail dan keranjang.*

### Paket Rental Outdoor

![Halaman daftar paket rental Kuala Outdoor](screenshots/paket-rental.png)

*Halaman paket menampilkan pilihan rental beserta kapasitas dan rincian isi paket.*

<!-- Tambahkan screenshot lain setelah diperiksa agar bebas data pelanggan pribadi.
Contoh: screenshots/dashboard-admin.png, screenshots/keranjang.png, screenshots/booking.png
-->

## Teknologi

| Kategori | Teknologi |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 5 |
| Styling & komponen | Tailwind CSS 3, shadcn/ui, Radix UI |
| Routing | React Router DOM 6 |
| State & pengambilan data | React Context, TanStack React Query |
| Formulir | React Hook Form, Zod |
| Backend | PHP |
| Database | MySQL (PDO / MySQLi) |
| HTTP | Fetch API, Axios |
| Integrasi yang disiapkan | Google OAuth, Supabase, WhatsApp |

## Struktur Repository

```text
PBL-KUALA-OUTDOOR/
├── src/
│   ├── components/       # Komponen frontend & UI
│   ├── contexts/         # Context autentikasi, keranjang, kontak
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Halaman customer & admin
│   ├── services/         # Layanan API
│   └── App.tsx           # Routing utama aplikasi
├── api/
│   ├── admin/            # Endpoint administrasi
│   ├── public/           # Endpoint publik & pelanggan
│   ├── packages/         # Endpoint paket rental
│   ├── packages_cart/    # Keranjang paket
│   ├── packages_bookings/# Pemesanan paket
│   ├── controllers/      # Controller PHP
│   ├── models/           # Model PHP
│   └── config/           # Konfigurasi backend
├── public/               # Aset statis frontend
├── uploads/              # Aset demo yang aman dibagikan
├── screenshots/          # Pratinjau tampilan aplikasi
├── package.json
├── vite.config.ts
└── README.md
```

## Arsitektur Singkat

```text
Pelanggan / Admin
        │
        ▼
React + TypeScript (Vite)
        │  HTTP Request
        ▼
      API PHP
        │
        ▼
     MySQL
```

## Catatan Keamanan & Penggunaan

Untuk menjaga keamanan dan privasi, file **`.env`**, dump/migrasi **`.sql`**, dokumentasi internal, serta berkas unggahan pelanggan tidak disertakan dalam repository portofolio ini. Menjalankan sistem secara lokal memerlukan konfigurasi backend dan skema database yang sesuai.

Screenshot yang ditampilkan merupakan contoh tampilan saat pengembangan. Jangan menggunakan data pelanggan asli, nomor identitas, atau kredensial rahasia sebagai materi screenshot publik.

## Pengembang

**GitHub:** [@naufalzakwan](https://github.com/naufalzakwan)

---

*PBL Kuala Outdoor — Full-Stack Web Development Portfolio*
