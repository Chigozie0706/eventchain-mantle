// utils/format.ts
import { formatEther } from "viem";

// Token information - should match your tokens.ts
const tokenDecimals: Record<string, number> = {
  "0x0000000000000000000000000000000000000000": 18,
};

export function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString();
}

export function formatTime(seconds: bigint): string {
  const hours = Math.floor(Number(seconds) / 3600);
  const minutes = Math.floor((Number(seconds) % 3600) / 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}

export function formatPrice(price: bigint, tokenAddress: string = ""): string {
  const normalizedAddress = tokenAddress.toLowerCase();
  const decimals = tokenDecimals[normalizedAddress] || 18;

  // Convert from contract's 18 decimal storage to token's actual decimals
  if (decimals !== 18) {
    const conversionFactor = BigInt(10 ** (18 - decimals));
    const adjustedPrice = price / conversionFactor;
    return (Number(adjustedPrice) / 10 ** decimals).toFixed(decimals);
  }

  // For 18 decimal tokens, use standard ether formatting
  return formatEther(price);
}

export function formatEventDate(timestamp: number | bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatEventTime(secondsSinceMidnight: number): string {
  const hours = Math.floor(secondsSinceMidnight / 3600);
  const minutes = Math.floor((secondsSinceMidnight % 3600) / 60);
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}
