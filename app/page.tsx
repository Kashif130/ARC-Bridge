"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useConnectors } from "wagmi";
import { BRIDGE_CHAIN_INFO } from "@/lib/wagmi-config";
import {
  ArrowDownUp, Wallet, Zap, ExternalLink, CheckCircle2,
  XCircle, Loader2, ChevronDown, Info, Activity, X,
} from "lucide-react";

type BridgeChainKey = keyof typeof BRIDGE_CHAIN_INFO;

const TESTNET_CHAINS: BridgeChainKey[] = ["Arc_Testnet","Ethereum_Sepolia","Arbitrum_Sepolia","Base_Sepolia"];
const MAINNET_CHAINS: BridgeChainKey[] = ["Arc","Ethereum","Arbitrum","Base","Polygon","Optimism","Avalanche"];

type TxStep = { name: string; state: "pending"|"success"|"error"|"waiting"; txHash?: string; explorerUrl?: string };
type BridgeStatus = "idle"|"quoting"|"bridging"|"success"|"error";

// Wallet icons as SVG/emoji (no external deps)
const WALLET_ICONS: Record<string, string> = {
  MetaMask: "🦊",
  "MetaMask SDK": "🦊",
  "Injected": "🌐",
  "Browser Wallet": "🌐",
  OKX: "⬛",
  "OKX Wallet": "⬛",
  Trust: "💙",
  "Trust Wallet": "💙",
  Rabby: "🐰",
  "Rabby Wallet": "🐰",
  Coinbase: "🔵",
  Brave: "🦁",
};

export default function BridgePage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const connectors = useConnectors();

  const [fromChain, setFromChain] = useState<BridgeChainKey>("Ethereum_Sepolia");
  const [toChain, setToChain]     = useState<BridgeChainKey>("Arc_Testnet");
  const [amount, setAmount]       = useState("");
  const [useTestnet, setUseTestnet] = useState(true);
  const [status, setStatus]       = useState<BridgeStatus>("idle");
  const [txSteps, setTxSteps]     = useState<TxStep[]>([]);
  const [errorMsg, setErrorMsg]   = useState("");
  const [quote, setQuote]         = useState<{gasFee?:string;bridgeFee?:string;estimatedTime?:string}|null>(null);
  const [showFromDrop, setShowFromDrop] = useState(false);
  const [showToDrop, setShowToDrop]     = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connectingId, setConnectingId] = useState<string|null>(null);

  const availableChains = useTestnet ? TESTNET_CHAINS : MAINNET_CHAINS;

  useEffect(() => {
    if (useTestnet) { setFromChain("Ethereum_Sepolia"); setToChain("Arc_Testnet"); }
    else            { setFromChain("Ethereum");         setToChain("Arc"); }
  }, [useTestnet]);

  const swapChains = () => { setFromChain(toChain); setToChain(fromChain); };

  const fetchQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setStatus("quoting");
    try {
      const res = await fetch("/api/quote", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ fromChain, toChain, amount }),
      });
      const data = await res.json();
      if (data.success) setQuote(data.estimate);
    } catch {
      setQuote({ gasFee:"~$0.01", bridgeFee:"~$0.05", estimatedTime:"~20 sec" });
    }
    setStatus("idle");
  }, [amount, fromChain, toChain]);

  useEffect(() => {
    const t = setTimeout(() => { if (amount && parseFloat(amount) > 0) fetchQuote(); }, 800);
    return () => clearTimeout(t);
  }, [amount, fromChain, toChain, fetchQuote]);

  const handleConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId || c.name === connectorId);
    if (!connector) return;
    setConnectingId(connectorId);
    try {
      await connect({ connector });
      setShowWalletModal(false);
    } catch (e) {
      console.error(e);
    }
    setConnectingId(null);
  };

  const handleBridge = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setStatus("bridging");
    setTxSteps([
      { name: "Approve USDC",        state: "pending"  },
      { name: "Burn on Source",       state: "waiting"  },
      { name: "Circle Attestation",   state: "waiting"  },
      { name: "Mint on Destination",  state: "waiting"  },
    ]);
    setErrorMsg("");

    // Animate step 1 immediately
    await new Promise((r) => setTimeout(r, 900));
    setTxSteps((p) => p.map((s,i) => i===0 ? {...s,state:"success"} : i===1 ? {...s,state:"pending"} : s));

    try {
      const res = await fetch("/api/bridge", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ fromChain, toChain, amount }),
      });
      const data = await res.json();

      if (data.success) {
        const steps: TxStep[] = data.result?.steps?.map((s: {name:string;state:string;txHash?:string;data?:{explorerUrl?:string}}) => ({
          name: s.name, state: s.state==="success"?"success":"error",
          txHash: s.txHash, explorerUrl: s.data?.explorerUrl,
        })) || [];
        setTxSteps(steps.length > 0 ? steps : [
          { name:"Approve USDC",       state:"success" },
          { name:"Burn on Source",     state:"success" },
          { name:"Attestation",        state:"success" },
          { name:"Mint on Destination",state:"success" },
        ]);
        setStatus("success");
      } else {
        setErrorMsg(data.error || "Bridge failed");
        setTxSteps((p) => p.map((s) => s.state==="pending" ? {...s,state:"error"} : s));
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  };

  const fromInfo = BRIDGE_CHAIN_INFO[fromChain];
  const toInfo   = BRIDGE_CHAIN_INFO[toChain];
  const canBridge = amount && parseFloat(amount) > 0 && fromChain !== toChain && status === "idle";

  // Deduplicate connectors by name for display
  const displayConnectors = connectors.filter((c, i, arr) =>
    arr.findIndex((x) => x.name === c.name) === i
  );

  return (
    <div className="min-h-screen flex flex-col relative z-10">

      {/* ── Wallet Modal ── */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWalletModal(false)} />
          <div className="relative bg-arc-card border border-arc-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-sans font-700 text-lg">Connect Wallet</h2>
                <p className="chain-badge text-arc-muted mt-0.5">Choose your wallet to continue</p>
              </div>
              <button onClick={() => setShowWalletModal(false)} className="text-arc-muted hover:text-arc-text p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {displayConnectors.map((connector) => {
                const icon = WALLET_ICONS[connector.name] || "🔌";
                const isConnecting = connectingId === connector.id || connectingId === connector.name;
                return (
                  <button
                    key={connector.id}
                    onClick={() => handleConnect(connector.id)}
                    disabled={!!connectingId}
                    className="w-full flex items-center gap-4 bg-arc-bg hover:bg-arc-border/50 border border-arc-border hover:border-arc-muted rounded-xl px-4 py-3.5 transition-all text-left group"
                  >
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1">
                      <div className="font-sans font-600 text-sm group-hover:text-arc-accent transition-colors">
                        {connector.name}
                      </div>
                      <div className="chain-badge text-arc-muted">
                        {connector.name === "MetaMask" || connector.name === "MetaMask SDK"
                          ? "Browser extension"
                          : connector.name === "Injected"
                          ? "OKX · Trust · Rabby · Coinbase · Brave"
                          : "EIP-1193 wallet"}
                      </div>
                    </div>
                    {isConnecting ? (
                      <Loader2 className="w-4 h-4 text-arc-accent animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-arc-muted -rotate-90 group-hover:text-arc-accent transition-colors" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="chain-badge text-arc-muted text-center mt-5">
              OKX, Trust, Rabby, Brave wallets appear under &quot;Injected&quot; if installed
            </p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-arc-border">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Zap className="w-6 h-6 text-arc-accent" />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-arc-green dot-live" />
          </div>
          <span className="font-sans font-700 text-lg tracking-tight">Arc Bridge</span>
          <span className="chain-badge bg-arc-border text-arc-muted px-2 py-0.5 rounded-full">USDC · CCTP</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUseTestnet(!useTestnet)}
            className={`chain-badge px-3 py-1.5 rounded-full border transition-all ${
              useTestnet ? "border-arc-yellow text-arc-yellow bg-yellow-950/20" : "border-arc-border text-arc-muted hover:border-arc-muted"
            }`}
          >
            {useTestnet ? "TESTNET" : "MAINNET"}
          </button>

          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border border-arc-border rounded-xl px-3 py-2 bg-arc-card">
                <div className="dot-live" />
                <span className="font-mono text-xs">{address?.slice(0,6)}...{address?.slice(-4)}</span>
              </div>
              <button
                onClick={() => disconnect()}
                className="text-arc-muted hover:text-arc-text text-xs border border-arc-border rounded-xl px-3 py-2 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className="flex items-center gap-2 bg-arc-accent hover:bg-blue-500 text-white font-sans font-600 text-sm px-4 py-2 rounded-xl transition-all glow-blue"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-4">

          <div className="text-center mb-8">
            <h1 className="text-4xl font-sans font-800 tracking-tight mb-2">
              Bridge{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-arc-accent to-blue-400">USDC</span>
            </h1>
            <p className="text-arc-muted font-mono text-sm">Cross-chain transfers powered by Circle CCTP × Arc</p>
          </div>

          {/* Bridge Card */}
          <div className="bg-arc-card border border-arc-border rounded-2xl p-6 space-y-4 glow-border">

            {/* From */}
            <div className="space-y-2">
              <label className="chain-badge text-arc-muted">FROM</label>
              <div className="relative">
                <button
                  onClick={() => { setShowFromDrop(!showFromDrop); setShowToDrop(false); }}
                  className="w-full flex items-center justify-between bg-arc-bg border border-arc-border rounded-xl px-4 py-3 hover:border-arc-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{fromInfo.logo}</span>
                    <div className="text-left">
                      <div className="font-sans font-600 text-sm">{fromInfo.name}</div>
                      <div className="chain-badge text-arc-muted">Chain ID: {fromInfo.chainId}</div>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-arc-muted transition-transform ${showFromDrop?"rotate-180":""}`} />
                </button>
                {showFromDrop && (
                  <div className="absolute top-full mt-2 w-full bg-arc-card border border-arc-border rounded-xl overflow-hidden z-40 shadow-2xl">
                    {availableChains.map((c) => (
                      <button key={c} onClick={() => { setFromChain(c); setShowFromDrop(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-bg transition-colors text-left ${c===fromChain?"bg-arc-bg border-l-2 border-arc-accent":""}`}>
                        <span>{BRIDGE_CHAIN_INFO[c].logo}</span>
                        <span className="font-sans text-sm">{BRIDGE_CHAIN_INFO[c].name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="chain-badge text-arc-muted">AMOUNT (USDC)</label>
              <div className="relative bg-arc-bg border border-arc-border rounded-xl overflow-hidden focus-within:border-arc-accent transition-colors">
                <input
                  type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00" min="0" step="0.01"
                  className="w-full bg-transparent px-4 py-4 font-mono text-2xl text-arc-text outline-none placeholder-arc-border"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="chain-badge text-arc-muted">USDC</span>
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">$</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {["1","10","100"].map((p) => (
                  <button key={p} onClick={() => setAmount(p)}
                    className="chain-badge text-arc-muted border border-arc-border rounded-lg px-3 py-1 hover:border-arc-muted hover:text-arc-text transition-colors">
                    {p} USDC
                  </button>
                ))}
              </div>
            </div>

            {/* Swap */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-arc-border" />
              <button onClick={swapChains}
                className="border border-arc-border rounded-full p-2 hover:border-arc-accent hover:text-arc-accent text-arc-muted transition-all hover:rotate-180 duration-300">
                <ArrowDownUp className="w-4 h-4" />
              </button>
              <div className="flex-1 h-px bg-arc-border" />
            </div>

            {/* To */}
            <div className="space-y-2">
              <label className="chain-badge text-arc-muted">TO</label>
              <div className="relative">
                <button
                  onClick={() => { setShowToDrop(!showToDrop); setShowFromDrop(false); }}
                  className="w-full flex items-center justify-between bg-arc-bg border border-arc-border rounded-xl px-4 py-3 hover:border-arc-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{toInfo.logo}</span>
                    <div className="text-left">
                      <div className="font-sans font-600 text-sm">{toInfo.name}</div>
                      <div className="chain-badge text-arc-muted">Chain ID: {toInfo.chainId}</div>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-arc-muted transition-transform ${showToDrop?"rotate-180":""}`} />
                </button>
                {showToDrop && (
                  <div className="absolute top-full mt-2 w-full bg-arc-card border border-arc-border rounded-xl overflow-hidden z-40 shadow-2xl">
                    {availableChains.filter((c) => c!==fromChain).map((c) => (
                      <button key={c} onClick={() => { setToChain(c); setShowToDrop(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-arc-bg transition-colors text-left ${c===toChain?"bg-arc-bg border-l-2 border-arc-accent":""}`}>
                        <span>{BRIDGE_CHAIN_INFO[c].logo}</span>
                        <span className="font-sans text-sm">{BRIDGE_CHAIN_INFO[c].name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quote */}
            {quote && amount && (
              <div className="bg-arc-bg border border-arc-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3 h-3 text-arc-accent" />
                  <span className="chain-badge text-arc-accent">ESTIMATE</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="font-mono text-arc-text text-sm">{quote.gasFee||"~$0.01"}</div>
                    <div className="chain-badge text-arc-muted mt-1">Gas Fee</div>
                  </div>
                  <div className="text-center border-x border-arc-border">
                    <div className="font-mono text-arc-text text-sm">{quote.bridgeFee||"~$0.05"}</div>
                    <div className="chain-badge text-arc-muted mt-1">Bridge Fee</div>
                  </div>
                  <div className="text-center">
                    <div className="font-mono text-arc-text text-sm">{quote.estimatedTime||"~20s"}</div>
                    <div className="chain-badge text-arc-muted mt-1">Est. Time</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-arc-border mt-3">
                  <Info className="w-3 h-3 text-arc-muted" />
                  <span className="chain-badge text-arc-muted">You receive: ~{amount} USDC on {toInfo.name}</span>
                </div>
              </div>
            )}

            {/* Bridge Button */}
            <button
              onClick={!isConnected ? () => setShowWalletModal(true) : handleBridge}
              disabled={isConnected && !canBridge}
              className={`w-full font-sans font-700 text-base py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 ${
                !isConnected
                  ? "bg-arc-border hover:bg-arc-accent hover:text-white text-arc-muted cursor-pointer"
                  : canBridge
                  ? "bg-arc-accent hover:bg-blue-500 text-white glow-blue hover:scale-[1.01] active:scale-[0.99]"
                  : "bg-arc-border text-arc-muted cursor-not-allowed"
              }`}
            >
              {!isConnected ? (
                <><Wallet className="w-5 h-5" />Connect Wallet to Bridge</>
              ) : status === "bridging" ? (
                <><Loader2 className="w-5 h-5 animate-spin" />Bridging via CCTP...</>
              ) : status === "quoting" ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Getting quote...</>
              ) : (
                <><Zap className="w-5 h-5" />Bridge {amount||"0"} USDC</>
              )}
            </button>
          </div>

          {/* TX Steps */}
          {txSteps.length > 0 && (
            <div className="bg-arc-card border border-arc-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-arc-accent" />
                <span className="font-sans font-600 text-sm">Transaction Progress</span>
              </div>
              <div className="space-y-3">
                {txSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      {step.state==="success" ? <CheckCircle2 className="w-5 h-5 text-arc-green" />
                        : step.state==="error"   ? <XCircle className="w-5 h-5 text-red-500" />
                        : step.state==="pending" ? <Loader2 className="w-5 h-5 text-arc-accent animate-spin" />
                        : <div className="w-5 h-5 rounded-full border border-arc-border" />}
                      {i < txSteps.length-1 && (
                        <div className={`w-px h-6 mt-1 ${step.state==="success"?"bg-arc-green":"bg-arc-border"}`} />
                      )}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className={`font-sans text-sm font-500 ${step.state==="success"?"text-arc-text":step.state==="error"?"text-red-400":step.state==="pending"?"text-arc-accent":"text-arc-muted"}`}>
                        {step.name}
                      </div>
                      {step.explorerUrl && (
                        <a href={step.explorerUrl} target="_blank" rel="noopener noreferrer"
                          className="chain-badge text-arc-accent hover:underline flex items-center gap-1 mt-0.5">
                          View on explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {status==="success" && (
                <div className="bg-green-950/30 border border-green-900/50 rounded-xl p-4 mt-4">
                  <div className="flex items-center gap-2 text-arc-green">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-sans font-600 text-sm">Bridge Complete!</span>
                  </div>
                  <p className="chain-badge text-arc-muted mt-1">{amount} USDC bridged to {toInfo.name} via CCTP.</p>
                </div>
              )}
              {status==="error" && errorMsg && (
                <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 mt-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span className="font-sans font-600 text-sm">Bridge Failed</span>
                  </div>
                  <p className="chain-badge text-arc-muted mt-1 break-all">{errorMsg}</p>
                  <button onClick={() => { setStatus("idle"); setTxSteps([]); setErrorMsg(""); }}
                    className="mt-3 chain-badge text-arc-accent hover:underline">Try again</button>
                </div>
              )}
            </div>
          )}

          {/* Footer info */}
          <div className="flex items-start gap-3 bg-arc-card/50 border border-arc-border/50 rounded-xl p-4">
            <Info className="w-4 h-4 text-arc-muted flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="chain-badge text-arc-muted">
                Powered by <span className="text-arc-accent">Circle CCTP</span> via Arc App Kit SDK.
                USDC only · 20+ chains · ~20s finality.
              </p>
              <div className="flex gap-3">
                <a href="https://docs.arc.network/app-kit/bridge" target="_blank" rel="noopener noreferrer"
                  className="chain-badge text-arc-accent hover:underline flex items-center gap-1">
                  Arc Docs <ExternalLink className="w-3 h-3" />
                </a>
                <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                  className="chain-badge text-arc-accent hover:underline flex items-center gap-1">
                  Get Testnet USDC <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
