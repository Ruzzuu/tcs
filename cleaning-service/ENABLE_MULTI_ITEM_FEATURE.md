# Multi-Item Feature Activation Guide

## ✅ Local Development - DONE
Feature flags have been enabled in `.env.local`:
```env
NEXT_PUBLIC_FEATURE_MULTI_ITEM=true
NEXT_PUBLIC_FEATURE_AUTO_MERGE=true
```

Your local dev server is now running with multi-item orders enabled at http://localhost:3000

## 🚀 Vercel Production Deployment

To enable this feature on your Vercel deployment, you need to add the environment variables:

### Option 1: Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Select your `cleaning-service` project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:
   - Name: `NEXT_PUBLIC_FEATURE_MULTI_ITEM`
     Value: `true`
     
   - Name: `NEXT_PUBLIC_FEATURE_AUTO_MERGE`
     Value: `true`
     
5. Click **Save**
6. Go to **Deployments** tab
7. Click the **⋯** menu on your latest deployment
8. Click **Redeploy** to rebuild with new environment variables

### Option 2: Using Vercel CLI
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Add environment variables
vercel env add NEXT_PUBLIC_FEATURE_MULTI_ITEM
# Enter: true

vercel env add NEXT_PUBLIC_FEATURE_AUTO_MERGE
# Enter: true

# Redeploy
vercel --prod
```

## 🧪 How It Works Now

### Before (Feature Disabled):
- Customer submits "One-Day Service" → Creates Order #1
- Customer submits "Yellow Stain Removal" → Creates Order #2
- Result: 2 separate orders

### After (Feature Enabled):
- Customer submits "One-Day Service" → Creates Order #1 with 1 item
- **Same customer** submits "Yellow Stain Removal" within same day → Appends to Order #1
- Result: 1 order with 2 items

### Auto-Merge Conditions:
Orders are merged when ALL these conditions are met:
1. Same phone number
2. Order status is `pending`
3. Both orders created on the same day
4. Feature flags are enabled

## 📝 Testing Checklist

### Local Testing (http://localhost:3000):
- [ ] Go to `/form` (customer form)
- [ ] Submit first item (e.g., "One-Day Service")
- [ ] Note the order number returned
- [ ] Submit second item with SAME phone number (e.g., "Yellow Stain Removal")
- [ ] Check admin dashboard - should see 1 order with 2 items, not 2 orders

### Production Testing (after Vercel env vars added):
- [ ] Same steps as above on your Vercel URL
- [ ] Verify orders are merged correctly
- [ ] Check MongoDB to confirm single document with items array

## 🔄 Migration (Optional)

If you have existing single-item orders in your database, you can migrate them:

```bash
cd cleaning-service
npm run migrate:multi-item
```

This will convert old single-item orders to the new format with items array.

## 🎯 Next Steps - Phase 3: Admin UI

Currently, the admin dashboard still shows orders in the old single-item format. To fully utilize multi-item orders, you need Phase 3:

- Display items as a table in order detail page
- Add "Add Item" button
- Add "Delete Item" button per item
- Update nota template to list all items

Refer to `MULTI_ITEM_IMPLEMENTATION.md` for Phase 3 implementation details.

## ⚠️ Important Notes

1. **Backwards Compatible**: The system still supports old single-item orders
2. **Safe to Enable**: No existing data will be affected
3. **Gradual Rollout**: You can enable just `MULTI_ITEM_ORDERS` first, then `AUTO_MERGE_ORDERS` later
4. **Rollback**: If needed, set env vars to `false` and redeploy

---

Last Updated: January 21, 2026
