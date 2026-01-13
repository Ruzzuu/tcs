# Cuci Premium - Service Management Application

A production-ready web application for managing a cleaning service business (shoes, bags, helmets, sofa, carpet, etc.).

## 🚀 Features

### Customer
- **Simple Form Submission** - No login required
- **Auto Price Calculation** - Real-time price estimation
- **Mobile-First Design** - Optimized for all devices
- **WhatsApp Integration** - Direct communication

### Admin
- **Dashboard** - KPIs, charts, recent orders
- **Pending Verification** - Anti-spam approval system
- **Order Management** - Status updates, notes, photos
- **Nota Generation** - Generate receipt images

## 📁 Project Structure

```
cleaning-service/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Redirects to /form
│   │   ├── globals.css             # Tailwind + custom styles
│   │   │
│   │   ├── form/                   # Customer Form
│   │   │   ├── page.tsx            # Form page
│   │   │   └── success/page.tsx    # Success confirmation
│   │   │
│   │   ├── admin/                  # Admin Panel
│   │   │   ├── layout.tsx          # Admin layout with nav
│   │   │   ├── page.tsx            # Dashboard
│   │   │   ├── pending/page.tsx    # Pending verification
│   │   │   └── orders/[id]/page.tsx # Order detail
│   │   │
│   │   └── api/                    # API Routes
│   │       ├── dashboard/route.ts  # Dashboard KPIs
│   │       └── orders/             # Order CRUD
│   │
│   ├── lib/
│   │   ├── mongodb.ts              # Database connection
│   │   ├── services.ts             # Service pricing config
│   │   ├── utils.ts                # Helper functions
│   │   └── models/
│   │       └── Order.ts            # Mongoose schema
│   │
│   └── types/
│       └── index.ts                # TypeScript definitions
│
├── scripts/
│   └── seed.ts                     # Database seeding script
│
└── .env.local                      # Environment variables
```

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
cd cleaning-service
npm install
```

### 2. Setup MongoDB

#### Option A: MongoDB Atlas (Recommended for Production)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Create a database user
4. Get your connection string
5. Update `.env.local`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/cleaning-service?retryWrites=true&w=majority
```

#### Option B: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use default connection in `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/cleaning-service
```

### 3. Seed Database (Optional)
```bash
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📱 Pages

| Route | Description |
|-------|-------------|
| `/form` | Customer submission form |
| `/form/success` | Success confirmation |
| `/admin` | Admin dashboard |
| `/admin/pending` | Pending verification |
| `/admin/orders/[id]` | Order detail |

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Get dashboard KPIs |
| GET | `/api/orders` | List orders |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/[id]` | Get single order |
| PATCH | `/api/orders/[id]` | Update order |
| DELETE | `/api/orders/[id]` | Delete order |
| POST | `/api/orders/[id]/verify` | Approve/Reject order |
| GET | `/api/orders/pending` | Get unverified orders |

## ⚙️ Environment Variables

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/cleaning-service

# NextAuth (optional - for admin auth)
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# App URL
NEXT_PUBLIC_URL=http://localhost:3000
```

## 💰 Service Pricing Configuration

Edit `src/lib/services.ts` to customize:
- Service types
- Prices
- Service names

```typescript
export const SERVICES = {
  sepatu: { name: 'Cuci Sepatu', price: 35000 },
  tas: { name: 'Cuci Tas', price: 50000 },
  // Add more services...
};
```

## 🚢 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Manual
```bash
npm run build
npm start
```

## 📝 Order Flow

1. **Customer** → Submits form
2. **System** → Creates order (unverified)
3. **Admin** → Views pending orders
4. **Admin** → Chats via WhatsApp
5. **Admin** → Approves or Rejects
6. **Admin** → Updates status (pending → in_progress → finished)
7. **Admin** → Generates Nota
8. **System** → Auto-deletes after 30 days (TTL)

## 🔒 Security Notes

- Customers don't need authentication
- Admin authentication can be added with NextAuth
- WhatsApp links use safe `wa.me` format
- Data auto-expires after 30 days

## 📄 License

Private - All rights reserved
