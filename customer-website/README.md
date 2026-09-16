# BESTIET FRESH — Customer E-Commerce Website

This standalone module contains the complete customer-facing e-commerce storefront for **Bestiet Fresh** ("Your Fresh Friend At The Door").

## Core Architecture

- **Shared Database**: Directly shares the Supabase database instance with the Admin & Super-Admin dashboards as well as the WhatsApp chatbot.
- **Branch-Based Inventory**: Dynamically loads real-time branch inventory based on the customer's selected delivery location (Manvila Kazhakkoottam vs Peroorkada).
- **Commerce-First UI**: Product-first, image-first, food-focused visual design system built with Next.js, TailwindCSS, and Lucide Icons.

## Customer Features

- **Location Selection & Branch Assignment**: GPS geolocation & manual area search.
- **Product Catalog & Cuts**: Fish, Seafood, Chicken, Mutton, Ready to Cook, and Combos with customizable cut options (Whole, Cleaned, Curry Cut, Fry Cut, Fillet, Boneless).
- **Dynamic Pricing Math**: Instant price calculation per 500g, 1kg, 1.5kg, 2kg, and 3kg.
- **Instant Cart Controls**: `[+ ADD]` and `[-] QTY [+]` state controls with strict stock limits.
- **Multi-Step Checkout**: Delivery address details, delivery slot selection, promo coupon validation (`BESTIET100`, `FRESH20`), and payment method (Pay on Delivery / Online UPI).
- **Order Tracking**: 5-stage animated tracking timeline connected to live Supabase database order status.
