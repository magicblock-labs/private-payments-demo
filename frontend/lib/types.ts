import { IdlAccounts } from '@coral-xyz/anchor';

import { PrivatePayments } from '@/program/private_payments';

export type DepositAccount = IdlAccounts<PrivatePayments>['deposit'];

export interface TokenListEntry {
  mint: string;
  creator: string;
}
