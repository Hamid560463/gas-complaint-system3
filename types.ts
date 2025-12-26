
export interface Industry {
  subscriptionId: string;
  name: string;
  city: string;
  usageCode: string;
  stationCapacity: number;
  address: string;
  phone: string;
  baseMonthAvg: number; // Added to match the screenshot "متوسط مصرف روزانه آبان"
}

export interface ConsumptionRecord {
  subscriptionId: string;
  source: 'Faratrah' | 'RTU' | 'MeterReading' | 'File';
  baseMonthAvg: number; // Kept for compatibility but logic should prefer Industry.baseMonthAvg
  dailyConsumptions: number[]; // Array of values (Day 1 to 31)
  lastRecordDate?: string; // e.g. "1404/10/02"
}

export interface Restriction {
  usageCode: string;
  percentage: number; // 0 to 100
}

export type ViewType = 'DASHBOARD' | 'DATA_ENTRY' | 'REPORTS' | 'SETTINGS' | 'EXECUTION_REPORTS' | 'HEADQUARTERS_REPORTS' | 'TARIFF_HISTORY';

export interface DashboardState {
  selectedIds: string[];
  startDay: number;
  endDay: number;
}

// Interface for Electron Preload Script
declare global {
  interface Window {
    electronAPI?: {
      saveData: (key: string, data: any) => Promise<void>;
      loadData: (key: string) => Promise<any>;
      openDataFolder: () => Promise<void>;
    };
  }
}
