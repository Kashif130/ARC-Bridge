"use client";
import { createConfig, http } from "wagmi";
import { mainnet, sepolia, arbitrum, base, polygon, optimism, avalanche } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";

// Arc Testnet custom chain definition
export const arcTestnet = {
  id: 2259,
  name: "Arc Testnet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.arc.network/testnet"] },
    public: { http: ["https://rpc.arc.network/testnet"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
} as const;

export const arcMainnet = {
  id: 1314,
  name: "Arc",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.arc.network"] },
    public: { http: ["https://rpc.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://arcscan.app" },
  },
} as const;

export const wagmiConfig = createConfig({
  chains: [arcTestnet, arcMainnet, mainnet, sepolia, arbitrum, base, polygon, optimism, avalanche],
  connectors: [
    metaMask(),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [arcTestnet.id]: http("https://rpc.arc.network/testnet"),
    [arcMainnet.id]: http("https://rpc.arc.network"),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [avalanche.id]: http(),
  },
});

export const CHAIN_TO_BRIDGE_CHAIN: Record<number, string> = {
  2259: "Arc_Testnet",
  1314: "Arc",
  1: "Ethereum",
  11155111: "Ethereum_Sepolia",
  42161: "Arbitrum",
  8453: "Base",
  137: "Polygon",
  10: "Optimism",
  43114: "Avalanche",
};

export const BRIDGE_CHAIN_INFO: Record<
  string,
  { name: string; logo: string; chainId: number; testnet: boolean; color: string }
> = {
  Arc_Testnet:      { name: "Arc Testnet",      logo: "⚡", chainId: 2259,    testnet: true,  color: "#3B82F6" },
  Arc:              { name: "Arc",              logo: "⚡", chainId: 1314,    testnet: false, color: "#3B82F6" },
  Ethereum_Sepolia: { name: "Ethereum Sepolia", logo: "Ξ",  chainId: 11155111, testnet: true, color: "#627EEA" },
  Ethereum:         { name: "Ethereum",         logo: "Ξ",  chainId: 1,      testnet: false, color: "#627EEA" },
  Arbitrum:         { name: "Arbitrum",         logo: "🔷", chainId: 42161,  testnet: false, color: "#12AAFF" },
  Arbitrum_Sepolia: { name: "Arbitrum Sepolia", logo: "🔷", chainId: 421614, testnet: true,  color: "#12AAFF" },
  Base:             { name: "Base",             logo: "🔵", chainId: 8453,   testnet: false, color: "#0052FF" },
  Base_Sepolia:     { name: "Base Sepolia",     logo: "🔵", chainId: 84532,  testnet: true,  color: "#0052FF" },
  Polygon:          { name: "Polygon",          logo: "🟣", chainId: 137,    testnet: false, color: "#8247E5" },
  Optimism:         { name: "OP Mainnet",       logo: "🔴", chainId: 10,     testnet: false, color: "#FF0420" },
  Avalanche:        { name: "Avalanche",        logo: "🔺", chainId: 43114,  testnet: false, color: "#E84142" },
  Solana:           { name: "Solana",           logo: "◎",  chainId: 0,      testnet: false, color: "#9945FF" },
};
