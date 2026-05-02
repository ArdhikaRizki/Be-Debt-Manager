# Debt-Chain Settle Backend API

Dokumentasi endpoint untuk integrasi Frontend (Flutter).

## Base URL

- Local: `http://localhost:3000`
- Prefix auth: `/api/v1/auth`

## Response Format

### Success

```json
{
  "status": "success",
  "message": "...",
  "data": {}
}
```

### Fail / Error

```json
{
  "status": "fail",
  "message": "..."
}
```

atau

```json
{
  "status": "error",
  "message": "..."
}
```

## Health Check

### GET /

Cek apakah server hidup.

#### Response 200

```json
{
  "message": "API Debt-Chain Settle is Running!"
}
```

---

## Auth Endpoints

## 1) Request OTP

### POST /api/v1/auth/request-otp

Kirim OTP ke email user yang belum terdaftar.

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Response 200

```json
{
  "status": "success",
  "message": "OTP berhasil dikirim ke email."
}
```

### Kemungkinan Error

- `400`: Email wajib diisi.
- `400`: Email sudah terdaftar. Silakan login.
- `500`: Gagal kirim email / server error.

---

## 2) Verify OTP

### POST /api/v1/auth/verify-otp

Validasi OTP dari email. Endpoint menerima field `otp` atau `otp_code`.

### Request Body (opsi 1)

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### Request Body (opsi 2)

```json
{
  "email": "user@example.com",
  "otp_code": "123456"
}
```

### Response 200

```json
{
  "status": "success",
  "message": "Email valid! Silakan lanjut isi form pendaftaran."
}
```

### Kemungkinan Error

- `400`: Email dan OTP wajib diisi.
- `404`: Minta OTP terlebih dahulu.
- `400`: OTP salah.
- `400`: OTP kedaluwarsa.

---

## 3) Register

### POST /api/v1/auth/register

Daftar akun baru. Email wajib sudah lolos verifikasi OTP.

### Request Body

```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "Password123!"
}
```

### Response 201

```json
{
  "status": "success",
  "message": "User berhasil didaftarkan!",
  "data": {
    "id": 1,
    "username": "newuser"
  }
}
```

### Kemungkinan Error

- `400`: Email wajib diisi.
- `400`: Email sudah terdaftar.
- `400`: Username sudah dipakai.
- `403`: Email belum diverifikasi.

---

## 4) Login

### POST /api/v1/auth/login

Login user dan ambil token.

### Request Body

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### Response 200

```json
{
  "status": "success",
  "token": "<jwt_token>",
  "data": {
    "id": 1,
    "username": "newuser"
  }
}
```

### Kemungkinan Error

- `400`: Email dan password wajib diisi.
- `401`: Email atau password salah.

---

## Debt Endpoints
*(Memerlukan Header: `Authorization: Bearer <token>`)*

**Base URL:** `/api/v1/debts`

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/` | Mengambil daftar utang milik/terkait dengan user login |
| `POST` | `/` | Membuat catatan utang baru |
| `GET` | `/:id` | Mengambil detail utang berdasarkan ID |
| `PATCH` | `/:id` | Mengupdate data catatan utang berdasarkan ID |
| `DELETE` | `/:id` | Menghapus data utang |
| `PATCH` | `/:id/confirm` | Mengonfirmasi status utang |
| `POST` | `/:id/settlement-request` | Mengajukan request pelunasan untuk spesifik utang ini |

### 1) Create Debt - POST /api/v1/debts

**Request Body** (Opsi 1 - Menggunakan Email)
```json
{
  "amount": 50000,
  "description": "Uang makan bersama",
  "due_date": "2026-05-15",
  "otherEmail": "teman@example.com"
}
```

**Request Body** (Opsi 2 - Menggunakan Username)
```json
{
  "amount": 50000,
  "description": "Uang makan bersama",
  "due_date": "2026-05-15",
  "otherUsername": "namateman"
}
```

**Response 201**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "userId": 5,
    "otherUserId": 10,
    "amount": "50000.00",
    "description": "Uang makan bersama",
    "status": "pending",
    "is_paid": false,
    "due_date": "2026-05-15T00:00:00.000Z",
    "createdAt": "2026-05-02T10:30:00.000Z",
    "updatedAt": "2026-05-02T10:30:00.000Z"
  }
}
```

**Kemungkinan Error**
- `400`: amount wajib diisi.
- `404`: User dengan email/username tidak ditemukan.
- `400`: Tidak bisa membuat debt ke diri sendiri.

---

## Group Transaction Endpoints
*(Memerlukan Header: `Authorization: Bearer <token>`)*

**Base URL:** `/api/v1/group-transactions`

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/group/:groupId` | Mengambil daftar transaksi dalam sebuah grup |
| `POST` | `/group/:groupId` | Membuat transaksi baru di dalam grup (split bill) |
| `GET` | `/:id` | Mengambil detail transaksi berdasarkan ID |
| `DELETE` | `/:id` | Menghapus transaksi grup berdasarkan ID |

---

## Settlement Endpoints
*(Memerlukan Header: `Authorization: Bearer <token>`)*

**Base URL:** `/api/v1/settlement-requests`

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/` | Mengambil daftar request pelunasan (settlement) |
| `POST` | `/` | Membuat request pelunasan baru |
| `PATCH` | `/:id/approve` | Menyetujui (approve) request pelunasan berdasarkan ID |
| `PATCH` | `/:id/reject` | Menolak (reject) request pelunasan berdasarkan ID |

---

## Alur Integrasi FE yang Disarankan

1. Panggil `POST /api/v1/auth/request-otp` dengan email.
2. User input OTP dari email.
3. Panggil `POST /api/v1/auth/verify-otp`.
4. Jika sukses, panggil `POST /api/v1/auth/register`.
5. Setelah register sukses, panggil `POST /api/v1/auth/login`.

## Catatan untuk FE

- Email di-backend dinormalisasi (trim + lowercase).
- OTP berlaku 10 menit.
- Rate limit global pada prefix `/api` adalah 100 request per jam per IP.
- Pastikan `Content-Type: application/json` di setiap request POST.
