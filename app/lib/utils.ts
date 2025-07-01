import { PublicKey } from '@solana/web3.js';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function shortKey(key: PublicKey | string) {
  return key.toString().slice(0, 4) + '...' + key.toString().slice(-4);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
