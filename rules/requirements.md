# Business & Domain Requirements: SariPOS

## Overview
SariPOS is a web-based, mobile-responsive Point of Sale (POS) and inventory management system designed specifically for sari-sari stores in the Philippines. It optimizes local, fast checkout while ensuring strict inventory and revenue control.

## User Roles & Authorization
1. **Store Owner (Admin):**
   - Full access to POS, inventory stock adjustments, product pricing, sales analytics, user management, and audit logs.
   - Access to set store-wide and item-level discount permissions.
2. **Cashier:**
   - Restricted access: POS checkout screen, product search, and personal session summary.
   - Cannot modify product baseline costs or view gross profit margins.

## POS & Checkout Logic
- **Online-Only Synchronization:** All completed sales must be synced directly to the database via trusted backend RPC calls (`public.sync_sale`).
- **Atomic Operations:** A transaction must either completely succeed (stock deducted, sale recorded, sale items logged) or completely fail/rollback.
- **Stock Protection:** Transactions must fail if any cart item quantity exceeds available inventory (`stock_quantity < required_quantity`).

## Discount & Pricing Policy
- **Item-Level Discount:** Applied directly to individual cart lines.
- **Overall Sale Discount:** Applied to the subtotal of the cart.
- **Mathematical Integrity:** Database constraint `grand_total = subtotal - discount_amount` must hold true for every sale record, where `discount_amount` represents the total combined discount value.

## MFA & Security
- **Mandatory MFA:** Multi-Factor Authentication (TOTP via Authenticator apps) is required for **all** user accounts (Owners and Cashiers alike) before reaching any operational dashboard.