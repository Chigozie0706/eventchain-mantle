# EventChain

**Decentralized Event Collateral & Escrow Protocol**
Track: **DeFi & Composability – Collateral Strategies**

EventChain is a DeFi protocol that secures event ticket payments using on-chain collateral and trustless escrow. Ticket funds are locked in smart contracts and only released when predefined event conditions are met, removing the need for centralized intermediaries.

---

## 🧩 Tech Stack

- **Frontend:** Next.js (App Router)
- **Smart Contracts:** Solidity
- **Framework:** Foundry
- **Blockchain:** Mantle Sepolia Testnet
- **Wallet / RPC:** Any EVM-compatible wallet (e.g. MetaMask)

---

## 🏗️ Architecture Overview

```
User
  ↓
Next.js Frontend
  ↓
EventChain Smart Contracts
  ↓
Mantle Sepolia Blockchain
```

The frontend interacts with the deployed smart contracts to lock ticket payments as collateral and handle settlement or refunds based on event conditions.

---

## 🔐 Smart Contract Overview

### EventChain.sol

Core responsibilities:

- Accept ticket payments as collateral
- Lock funds until event conditions are met
- Release funds to organizers or refund users

Key functions:

- `buyTicket()` – Locks ticket payment in escrow
- `releaseFunds()` – Releases funds to organizer
- `requestRefund()` – Refunds attendees if event fails
- `withdraw()` – Withdraw funds to user's wallet

---

## 🚀 Deployment (Mantle Sepolia Testnet)

### 1. Prerequisites

- Node.js (v18+ recommended)
- Foundry installed
- Wallet with Mantle Sepolia Testnet

---

### 2. Environment Setup

Create a `.env` file based on `.env.example`:

```
NEXT_PUBLIC_PINATA_JWT = YOUR_NEXT_PUBLIC_PINATA_JWT
NEXT_PUBLIC_MAPBOX_TOKEN = YOUR_NEXT_PUBLIC_MAPBOX_TOKEN
```

---

### 3. Smart Contract Deployment (Foundry)

```bash
cd Backend
forge install
forge build

forge script script/EventChain.s.sol:EventChainScript \
  --rpc-url $MANTLE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

After deployment, copy the deployed contract address and update the frontend environment variables.

---

## 🌐 Frontend Setup (Next.js)

```bash
cd eventchain
pnpm install
pnpm run dev
```

The frontend connects to the deployed EventChain contract on Mantle Sepolia and allows users to simulate ticket purchases and escrow settlement.

---

## 🧪 Testing

Run smart contract tests using Foundry:

```bash
forge test
```

---

## 🛣️ Roadmap

- [x] Core escrow & collateral smart contracts
- [x] Deployment on Mantle Sepolia
- [x] Basic frontend interaction
- [ ] Organizer dashboard
- [ ] Multi-event support
- [ ] Yield on locked funds (future)

---

## 🏁 Hackathon Notes

This project is an early-stage prototype built for a hackathon. The focus is on demonstrating how DeFi collateral strategies can be applied to real-world event payments using simple, transparent, and trustless smart contracts.

---

## 📄 License

MIT
