# Library Management System

A comprehensive, modern library management system for local libraries. Built with Next.js 15, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Access at `http://localhost:3000`

### Default Login Credentials

**Admin Account:**
- Email: `admin@library.com`
- Password: `admin123`

**Librarian Account:**
- Email: `librarian@library.com`
- Password: `lib123`

**Children's Librarian:**
- Username: `juvenile`
- Password: `kid123`

---

## ✨ Key Features

### Core Features
- 📚 **Complete Book Management** - CRUD operations, filtering, sorting, pagination
- 👥 **Member Management** - Registration with photo upload (webcam/file), printable cards
- ✍️ **Author Management** - Full profiles with book associations
- 🔄 **Circulation System** - Borrowing, returns, overdue tracking, fine calculation
- 📊 **Analytics & Reports** - Dashboard with real-time statistics
- 🔐 **Role-Based Access** - Admin and Librarian roles
- 💾 **Data Import/Export** - CSV/Excel bulk import
- ☁️ **Cloud Backup** - Supabase integration with automatic backups

### Advanced Features
- 📸 **Webcam Photo Capture** - Take member photos directly
- 🎫 **Printable Membership Cards** - With photos, barcodes, and QR codes
- 🔍 **Advanced Filtering** - Multi-criteria search and filtering
- 📄 **Pagination** - Efficient data browsing
- 🏷️ **Smart Autocomplete** - For publishers and authors
- ⚡ **Automatic Cloud Backups** - Scheduled backups at custom times

---

## 📦 Build Options

**Web Deployment:**
```bash
npm run build:web
```

**Desktop Application:**
```bash
npm run build:electron
```

---

## 📚 Complete Feature List

### Books Management
- Add/Edit/Delete books with full cataloging
- ISBN, publisher, authors, Dewey Decimal classification
- **Search & Filter by:**
  - Title, ISBN, author, publisher, year
  - Genre (Fiction, Non-Fiction, Science, etc.)
  - Category and availability
- **Sorting:** By title, genre, or category
- **Pagination:** 20 books per page
- **Publisher Autocomplete:** Smart suggestions
- **Multi-Author Support:** Link multiple authors
- **Reference Materials:** Separate collection tracking

### Member Management
- Add/Edit/Delete members with validation
- **Photo Management:**
  - Webcam capture
  - File upload (max 2MB)
  - Base64 storage
- **Printable Membership Cards:**
  - Member photo
  - Barcode and QR code
  - Library branding
- **Filters:**
  - Status (Active/Inactive/Expired)
  - Gender
  - Join date range
- **CSV/Excel Import:** Bulk member registration
- **Auto-Generated Fields:**
  - Membership ID (M-000001)
  - Expiry date (3 months from join)

### Circulation System
- **Borrowing:** Member/book selection with validation
- **Returning:** Quick return with fine calculation
- **Renewal:** Extend loan periods
- **Overdue Management:**
  - Automatic detection
  - Fine calculation ($0.50/day)
  - Member blocking for overdue items

### Cloud Backup (Supabase)
- **Automatic Backups:**
  - Hourly, Daily, Weekly, or Custom Time
  - Background scheduler
  - Automatic file naming
- **Manual Operations:**
  - Upload to cloud
  - Restore from cloud
  - Delete old backups
- **Data Protection:**
  - Private storage
  - Encrypted transit
  - Complete data snapshots

### Analytics & Reports
- Real-time dashboard statistics
- Popular books and authors
- Genre distribution
- Monthly usage trends
- Global search across all data

### Admin Panel
- User management (create/edit/delete)
- Role assignment (Admin/Librarian)
- Backup and restore
- CSV/Excel data import
- System configuration

---

## ☁️ Cloud Backup Setup

### Prerequisites
1. Create a free Supabase account at https://supabase.com
2. Create a new project (or use existing)

### Step 1: Get Supabase Credentials

1. Go to your Supabase Dashboard
2. Select your project
3. Click **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (long string)

### Step 2: Add to Project

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Step 3: Create Storage Bucket

1. In Supabase Dashboard, click **Storage**
2. Click **Create a new bucket**
3. Name: `library-backups`
4. Make it **Private** (uncheck "Public bucket")
5. Click **Create bucket**

### Step 4: Set Bucket Policies

**Option A: Quick Setup**
1. Click on `library-backups` bucket
2. Go to **Policies** tab
3. Click **New Policy** → **Get started quickly**
4. Select **Allow all operations**
5. Click **Save policy**

**Option B: Custom Policy**
1. Click **New Policy** → **For full customization**
2. Policy Name: `Allow all operations`
3. Allowed operation: Check ALL (SELECT, INSERT, UPDATE, DELETE)
4. Policy definition: `true`
5. Target roles: `authenticated` and `public`
6. Click **Save policy**

### Step 5: Restart and Test

```bash
# Restart dev server
npm run dev
```

1. Go to **Backup → Cloud Storage**
2. Click **Check Configuration** (should show "Connected")
3. Click **Refresh** to verify bucket
4. Test by clicking **Upload to Cloud**

---

## ⚡ Automatic Backups Setup

### Enable Automatic Backups

1. Go to **Backup → Cloud Storage**
2. Ensure cloud storage is configured
3. Toggle **Enable Automatic Backups** to ON
4. Choose your backup frequency:
   - **Hourly** - Every hour (24/day)
   - **Daily** - Once per day (recommended)
   - **Weekly** - Once per week (4/month)
   - **Custom Time** - Daily at specific time (e.g., 02:00)
5. Click **Backup Now** for first backup

### How It Works

- Runs in background while app is open
- Checks every 60 seconds
- Creates timestamped backups automatically
- Named: `auto-backup-YYYY-MM-DD-HHmmss.json`
- Shows next scheduled backup time

### Best Practices

- **Active library:** Daily or Hourly backups
- **Regular library:** Daily backups
- **Small library:** Weekly backups
- Keep 3-5 recent backups
- Test restore periodically
- Use Custom Time for off-hours (e.g., 02:00)

---

## 📥 Data Import (CSV/Excel)

### Import Members

**Required Columns:**
```csv
firstName,lastName,gender,joinDate,phone,address
Jane,Doe,Female,2025-01-15,555-0100,"123 Main St"
John,Smith,Male,2025-01-16,555-0101,"456 Oak Ave"
```

- `gender`: Male, Female, Other, or Unspecified
- `joinDate`: YYYY-MM-DD format

**Auto-Generated:**
- Membership ID
- Expiry date (joinDate + 3 months)
- Active status

### Import Books

**Required Columns:**
```csv
title,author,publisher,isbn,genre,publishedYear,totalCopies
The Great Gatsby,F. Scott Fitzgerald,Scribner,978-0-7432-7356-5,Fiction,1925,3
```

### Import Authors

**Required Columns:**
```csv
firstName,lastName,nationality,birthDate,biography
Harper,Lee,American,1926-04-28,American novelist
```

---

## 🎨 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Storage:** LocalStorage / IndexedDB / Electron Store
- **Cloud Storage:** Supabase
- **Authentication:** Session-based with roles

---

## 📱 System Requirements

- **Browser:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Node.js:** 18+ (for development)
- **Storage:** 10MB minimum browser storage
- **Cloud Backup:** Supabase account (free tier works)

---

## 🔧 Troubleshooting

### Cloud Backup Issues

**"Supabase not configured"**
- Check `.env.local` exists and has correct values
- Restart dev server after adding credentials

**"Failed to upload backup"**
- Verify `library-backups` bucket exists
- Check bucket policies allow INSERT operation
- Ensure internet connection is stable

**"Cannot download backups"**
- Add SELECT policy to storage bucket
- Policy expression should be: `true`
- Restart app and try again

**Automatic backups not running**
- Check toggle is enabled
- Keep app open for backups to run
- Verify next backup time is set
- Test with "Backup Now" button

### General Issues

**Cannot login**
- Use correct default credentials
- Clear browser cache and localStorage
- Try incognito/private mode

**Data not saving**
- Check localStorage quota in browser settings
- Enable cookies/localStorage
- Try different browser

**Photo upload not working**
- File must be under 2MB
- Use JPG, PNG, or similar format
- Grant camera permissions for webcam
- Ensure HTTPS in production

---

## 📂 Project Structure

```
librarymanapp/
├── app/                    # Next.js pages
│   ├── page.tsx            # Dashboard
│   ├── books/              # Books management
│   ├── members/            # Member management
│   ├── authors/            # Author management
│   ├── circulation/        # Borrow/return
│   ├── visitors/           # Visitor log
│   ├── reports/            # Reports
│   ├── analytics/          # Analytics
│   ├── admin/              # Admin panel
│   ├── backup/             # Backup management
│   ├── cloudbackup/        # Cloud backup page
│   └── children/           # Juvenile section
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── auth-provider.tsx   # Authentication
│   ├── protected-route.tsx # Route protection
│   └── webcam-scanner.tsx  # Webcam component
├── lib/                    # Business logic
│   ├── database.ts         # LocalDatabase class
│   ├── types.ts            # TypeScript types
│   ├── auth.ts             # Authentication
│   ├── supabase-config.ts  # Supabase client
│   ├── cloud-backup-scheduler.ts  # Auto backup
│   └── backup-utils.ts     # Backup utilities
└── public/                 # Static assets
```

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🆘 Support

For issues or questions:
1. Check this README
2. Review browser console for errors
3. Verify all setup steps completed
4. Test with default/sample data

---

**Library Management System v1.0** - Complete Library Management Solution

Built with ❤️ for libraries everywhere
# Takoradi-Library-
# Takoradi-Library-
# Takoradi-Library-Main
# Nexus-Lib
