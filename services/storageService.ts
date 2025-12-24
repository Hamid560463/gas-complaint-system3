
import { Industry, ConsumptionRecord, Restriction } from '../types';

const STORAGE_KEYS = {
  INDUSTRIES: 'gas_monitoring_industries',
  CONSUMPTION: 'gas_monitoring_consumption',
  RESTRICTIONS: 'gas_monitoring_restrictions'
};

export const storageService = {
  saveIndustries: (data: Industry[]) => {
    localStorage.setItem(STORAGE_KEYS.INDUSTRIES, JSON.stringify(data));
  },
  getIndustries: (): Industry[] => {
    const data = localStorage.getItem(STORAGE_KEYS.INDUSTRIES);
    return data ? JSON.parse(data) : [];
  },
  saveConsumption: (data: ConsumptionRecord[]) => {
    localStorage.setItem(STORAGE_KEYS.CONSUMPTION, JSON.stringify(data));
  },
  getConsumption: (): ConsumptionRecord[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CONSUMPTION);
    return data ? JSON.parse(data) : [];
  },
  saveRestrictions: (data: Restriction[]) => {
    localStorage.setItem(STORAGE_KEYS.RESTRICTIONS, JSON.stringify(data));
  },
  getRestrictions: (): Restriction[] => {
    const data = localStorage.getItem(STORAGE_KEYS.RESTRICTIONS);
    return data ? JSON.parse(data) : [];
  }
};
