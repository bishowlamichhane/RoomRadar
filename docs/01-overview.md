# 01 — Project Overview & Requirements

This mirrors the submitted project report. Build to match it so the code and the document agree at defence.

## Problem
Finding a rented room/flat in the Kathmandu Valley is fragmented: listings are scattered across Facebook groups and brokers, with no price transparency. A seeker cannot easily tell if an advertised rent is fair.

## Solution
A web platform (mobile-friendly) with:
- structured, map-based listings for **Kathmandu, Lalitpur, Bhaktapur**
- an ML model that predicts a **fair monthly rent** from a property's features
- a **Fair-Price badge** comparing listed vs. predicted rent

## Actors
- **Seeker** — search, filter, view listings on map, view fair-price badge, view listing detail.
- **Owner** — register/login, create/edit/delete own listings, receive suggested rent while posting.
- **Admin** — moderate (delete) any listing, manage users.

## Functional requirements (must all work)
1. Register & login as seeker or owner; secure auth with hashed passwords.
2. Owner can create, edit, delete listings with location, size, floor, amenities, photo URL.
3. Seeker can search & filter by city/area, price range, size, room type, amenities.
4. Listings shown on an interactive map with markers.
5. Model predicts fair rent from features; suggested to owner while posting.
6. Fair-price badge on each listing (Below / Fair / Above predicted).
7. Admin interface to moderate listings and manage users.

## Non-functional requirements
- Predictions & search return within ~2s.
- Simple, mobile-friendly UI.
- Graceful handling of invalid input (Zod validation everywhere).
- Restricted admin access (role check).
- Modular code so the ML model can be retrained/replaced independently.

## Result-analysis deliverable (for the defence)
A `/results` page (or an admin section) showing:
- model comparison table: Linear Regression vs Random Forest vs Gradient Boosting — MAE (NPR), RMSE, R²
- an "actual vs predicted" scatter plot (Recharts)
- a feature-importance bar chart (Recharts)

These come from the ML training output (`ml/metrics.json`).

## Feature set per listing (this drives BOTH the schema and the ML model)
- `city` (Kathmandu | Lalitpur | Bhaktapur)
- `area` (neighbourhood name)
- `roomType` (Single Room | 1BHK | 2BHK | Flat | Hostel)
- `sizeSqft` (number)
- `floor` (number; 0 = ground)
- `bedrooms` (number)
- `bathrooms` (number)
- `furnished` (boolean)
- amenities (booleans): `waterSupply`, `parking`, `attachedBathroom`, `wifiReady`, `kitchen`, `balcony`
- `latitude`, `longitude`
- `rent` (NPR/month) — the target the model learns to predict

Keep this feature list identical across the schema, seed data, ML training, and the TS inference module. If they drift, predictions break.
