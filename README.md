#  SmartSettle

**Real-time, offline-first group expense sharing with optimized debt settlement.**

SmartSettle lets a group of friends log shared expenses on a trip, see who owes whom in real time, and settle up with the **minimum number of payments** — including a UPI deep-link and a two-step confirmation handshake so nobody has to take "I paid you" on faith.

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?logo=socketdotio&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)

---

##  Features

- **Trip rooms** – create a trip with a shareable code (e.g. `GOA-2026`) and let friends join with just a name.
- **Real-time ledger** – every expense, participant, and settlement update is pushed instantly to everyone in the room via WebSockets.
- **Flexible splits** – choose who paid and which participants share each expense.
- **Minimum-transaction settlement** – a greedy graph-minimization engine reduces group debt to at most **N − 1** payments.
- **UPI integration** – one-tap `upi://pay` deep links; participants without a UPI ID fall back to cash.
- **Confirmation handshake** – the payer marks a payment as sent, the receiver confirms or rejects it, and confirmed payments are auto-logged into the ledger.
- **Offline-first** – expenses added without a connection are queued locally and synced automatically when you're back online, with duplicate protection.
- **Installable PWA** – service worker + manifest via `vite-plugin-pwa`.
- **Mobile-first UI** – built with React and Tailwind CSS.

---

##  Tech Stack

| Layer      | Technologies                                                         |
| ---------- | -------------------------------------------------------------------- |
| Frontend   | React, Vite, Tailwind CSS, lucide-react, socket.io-client            |
| Backend    | Node.js, Express, Socket.io                                          |
| Database   | MongoDB with Mongoose                                                |
| Offline/PWA| `localStorage` queue, Workbox via `vite-plugin-pwa`                  |
| Tooling    | ESLint, Nodemon                                                      |

---

##  How the Settlement Algorithm Works

Located in `backend/utils/settlementEngine.js`.

1. **Compute net balances.** For every expense, the payer is credited the full amount and each participant in the split is debited their equal share.
2. **Partition** participants into *debtors* (negative balance) and *creditors* (positive balance), ignoring dust below ₹0.01.
3. **Sort** both lists in descending order of absolute amount.
4. **Two-pointer greedy match.** Repeatedly settle `min(debtor, creditor)` between the largest debtor and largest creditor, advancing whichever pointer reaches zero.

**Result:** at most **N − 1** transactions for N participants, computed in **O(N log N)**.

> Example: if Amit paid ₹3000 for a 3-way split, Sneha and Rohan each owe Amit ₹1000 — two payments instead of a web of back-and-forth transfers.

Confirmed settlement payments are stored as expenses flagged `isSettlement: true`, so balances update automatically after each payment.

---

##  Offline-First Sync

Implemented in `frontend/hooks/useSmartSettle.js` and `frontend/utils/offlineStorage.js`.

- Each expense gets a **client-generated unique `expenseId`** at the moment the user taps *Add*.
- If the device is offline, the expense is saved to a `localStorage` queue and shown instantly in the UI (optimistic update).
- On reconnect (`online` event), the queue is replayed through the socket.
- The server **deduplicates by `expenseId`**, so retries never create double entries.
- The active trip is cached locally for instant loading.

---

##  Payment Handshake

1. **Debtor** taps *Pay via UPI* (or pays cash) and then **Mark as Paid**.
2. **Creditor** receives a real-time confirmation prompt.
3. **Confirm Received** → the payment is recorded as a settlement expense and balances are recalculated for everyone.
4. **Reject** → the request is marked `rejected` and the debt remains.

Request states: `awaiting_confirmation` → `confirmed` | `rejected`.

---

##  Project Structure

```
SmartSettle/
├── backend/
│   ├── controllers/
│   │   └── tripController.js      # Create / get / join trip handlers
│   ├── models/
│   │   ├── Expense.js             # Expense sub-schema
│   │   └── Trip.js                # Trip, participants, settlement requests
│   ├── routes/
│   │   └── tripRoutes.js          # REST routes
│   ├── utils/
│   │   └── settlementEngine.js    # Greedy debt minimization
│   ├── server.js                  # Express + Socket.io entry point
│   └── testAlgorithm.js           # Algorithm test script
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── Onboarding.jsx             # Create / join trip
    │   │   ├── Dashboard.jsx              # Ledger, participants, feed
    │   │   ├── ExpenseModal.jsx           # Log an expense
    │   │   ├── Settlement.jsx             # Settlement hub + UPI links
    │   │   └── PendingSettlementModal.jsx # Real-time confirm / reject
    │   ├── hooks/
    │   │   └── useSmartSettle.js          # Socket + offline sync logic
    │   ├── utils/
    │   │   └── offlineStorage.js          # localStorage queue & cache
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    └── vite.config.js
```

---

##  Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A MongoDB database (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/SmartSettle.git
cd SmartSettle
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file (see [Environment Variables](#-environment-variables)), then start the server:

```bash
npm run dev      # or: node server.js
```

The API and WebSocket server run on `http://localhost:5000`.

### 3. Set up the frontend

```bash
cd ../frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173`.

### 4. Try it out

1. Open the app and **Create a Trip**.
2. Open a second browser window (or share the code with a friend) and **Join** using the trip code.
3. Add expenses and watch both screens update live.
4. Open **Settle Up** to see the optimized payments.

---

##  Environment Variables

### `backend/.env`

```env
MONGO_URI=mongodb://localhost:27017/smartsettle
PORT=5000
CLIENT_URL=http://localhost:5173
```

### `frontend/.env`

```env
VITE_BACKEND_URL=http://localhost:5000
```

> ⚠️ Never commit `.env` files. Make sure they are listed in `.gitignore`.

---

##  API Reference

Base URL: `/api`

| Method | Endpoint                | Description                                   |
| ------ | ----------------------- | --------------------------------------------- |
| `GET`  | `/health`               | Server health check                           |
| `POST` | `/trips`                | Create a trip                                 |
| `GET`  | `/trips/:tripId`        | Get trip details and optimized settlements    |
| `POST` | `/trips/:tripId/join`   | Join an existing trip                         |

**Create a trip**

```http
POST /api/trips
Content-Type: application/json

{
  "tripId": "GOA-2026",
  "title": "Goa Beach Trip",
  "hostName": "Amit",
  "hostUpiId": "amit@okaxis"
}
```

**Join a trip**

```http
POST /api/trips/GOA-2026/join
Content-Type: application/json

{ "name": "Sneha", "upiId": "sneha@oksbi" }
```

---

##  Socket.io Events

**Client → Server**

| Event                 | Payload                                          | Purpose                          |
| --------------------- | ------------------------------------------------ | -------------------------------- |
| `join_trip`           | `{ tripId, userName }`                           | Join a trip room                 |
| `add_expense`         | `{ tripId, expense }`                            | Log an expense (deduplicated)    |
| `initiate_settlement` | `{ tripId, settlementId, from, to, amount }`     | Payer marks a payment as sent    |
| `confirm_settlement`  | `{ tripId, settlementId }`                       | Receiver confirms payment        |
| `reject_settlement`   | `{ tripId, settlementId }`                       | Receiver rejects payment         |

**Server → Client**

| Event                         | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| `participants_updated`        | Updated participant list                             |
| `expense_updated`             | New expense, full expense list, recalculated settlements |
| `settlement_requests_updated` | Updated settlement requests                          |
| `settlement_confirmed_sync`   | Payment confirmed; expenses and settlements refreshed |
| `settlement_rejected_sync`    | Payment rejected                                     |
| `error`                       | Error message                                        |

---

##  Author

**Shweta Wadkar**
B.Tech, Information Technology — A.P. Shah Institute of Technology, Thane
