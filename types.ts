
export type TransactionType = 'BUY' | 'SELL';

export interface GoldRecord {
  id: string;
  type: TransactionType;
  date: string;
  price: number;
  weight: number;
  total: number;
  fee?: number;
}

export interface GoldCategory {
  id: string;
  name: string;
  records: GoldRecord[];
  isExpanded: boolean;
}

export interface FixedDeposit {
  id: string;
  bank: string;
  startDate: string;
  durationMonths: number;
  endDate: string;
  amount: number;
  annualRate: number;
  interest: number;
  isWithdrawn?: boolean;
  currency: 'CNY' | 'USD';
  isDemandDeposit?: boolean;
}

export interface AssetSnapshot {
  timestamp: number;
  goldWeight: number;
  cnyAssets: number;
  usdAssets: number;
}

export type TimeDimension = 'month' | 'quarter' | 'year';

export type SortField = 'startDate' | 'endDate' | 'amount' | 'bank';
export type SortOrder = 'asc' | 'desc';

export interface AppState {
  goldCategories: GoldCategory[];
  fixedDeposits: FixedDeposit[];
  fixedDepositSort: {
    field: SortField;
    order: SortOrder;
  };
  darkMode: boolean;
  referenceGoldPrice: number;
  referenceUsdRate: number;
  demandDepositAmount: number;
  assetSnapshots: AssetSnapshot[];
  timeDimension: TimeDimension;
}

export type NavigationPage = 'home' | 'gold' | 'fd' | 'usdFd' | 'expiredFd';
