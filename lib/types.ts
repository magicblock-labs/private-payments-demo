import { PrivatePayments } from '@/program/private_payments';
import { IdlAccounts } from '@coral-xyz/anchor';

export type DepositAccount = IdlAccounts<PrivatePayments>['deposit'];

export interface TokenListEntry {
  mint: string;
  creator: string;
}
