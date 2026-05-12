import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromChain, toChain, amount, privateKey } = body;

    if (!fromChain || !toChain || !amount) {
      return NextResponse.json({ error: "Missing required fields: fromChain, toChain, amount" }, { status: 400 });
    }

    // Dynamic import to keep server-side only
    const { AppKit } = await import("@circle-fin/app-kit");
    const { createViemAdapterFromPrivateKey } = await import("@circle-fin/adapter-viem-v2");

    const kit = new AppKit();

    // Use provided private key or server env key
    const key = privateKey || process.env.BRIDGE_PRIVATE_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "No private key provided. Add BRIDGE_PRIVATE_KEY to env or provide it in the request." },
        { status: 400 }
      );
    }

    const adapter = createViemAdapterFromPrivateKey({
      privateKey: key as `0x${string}`,
    });

    const result = await kit.bridge({
      from: { adapter, chain: fromChain },
      to: { adapter, chain: toChain },
      amount: String(amount),
    });

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
