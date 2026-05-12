# Arc Bridge — Cross-chain USDC Transfer App

A real, working bridge app built with Circle's Arc App Kit SDK. Bridge USDC across 20+ blockchains using Circle's CCTP (Cross-Chain Transfer Protocol).

## 🚀 Features

- ✅ **Real bridging** — uses `@circle-fin/app-kit` (not a demo)
- ✅ **20+ chains** — Ethereum, Base, Arbitrum, Arc, Polygon, Solana, and more
- ✅ **Testnet & Mainnet** — toggle between environments
- ✅ **Fee estimation** — get quotes before bridging
- ✅ **Transaction tracking** — step-by-step CCTP progress
- ✅ **MetaMask / wallet connect** — browser wallet integration
- ✅ **Vercel ready** — one-click deploy

## 📦 Tech Stack

- **Next.js 14** (App Router)
- **@circle-fin/app-kit** — Arc's official SDK
- **@circle-fin/adapter-viem-v2** — EVM adapter
- **Wagmi v2** — wallet connections
- **CCTP** — Circle's cross-chain protocol (burn + attestation + mint)

## 🛠 Setup

### 1. Clone & Install
```bash
git clone <your-repo>
cd arc-bridge-app
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```

Fill in:
```env
# Required for WalletConnect (get from cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Required for server-side bridging
# Use a TESTNET wallet private key only
BRIDGE_PRIVATE_KEY=0x...your_testnet_private_key
```

### 3. Run Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🌐 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars
vercel env add BRIDGE_PRIVATE_KEY
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
```

Or click: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## 💰 Get Testnet Tokens

1. **Testnet USDC**: https://faucet.circle.com
2. **Ethereum Sepolia ETH**: https://www.alchemy.com/faucets/ethereum-sepolia
3. **Arc Testnet ETH**: https://console.circle.com/faucet

## 🔗 How It Works (CCTP Flow)

```
User → Approve USDC → Burn on Source Chain
         ↓
Circle Attestation Service (~20 seconds)
         ↓
Mint USDC on Destination Chain → User receives USDC
```

The Arc App Kit SDK handles all of this with a single `kit.bridge()` call.

## 📖 References

- [Arc Docs — Bridge](https://docs.arc.network/app-kit/bridge)
- [Arc Community](https://community.arc.network)
- [Circle CCTP](https://developers.circle.com/cctp)
- [Arc Testnet Explorer](https://testnet.arcscan.app)

## ⚠️ Security Notes

- **Never** expose real mainnet private keys in the app
- Use server-side API routes (already done) for key handling
- For production, use Circle Wallets adapter instead of raw private keys
- The `BRIDGE_PRIVATE_KEY` env var is server-only (not exposed to browser)

## 🏆 Challenges

This app qualifies for:
- **Stablecoins Commerce Stack Challenge** by Ignyte × Circle × Arc
- **Arc Builder Program** — build on Arc, earn rewards

Register at: https://app.ignyte.ae/public/challenges/4B436318-C737-F111-9A49-6045BD14D400
