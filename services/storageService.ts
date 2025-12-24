
import { Industry, ConsumptionRecord, Restriction } from '../types';

const STORAGE_KEYS = {
  INDUSTRIES: 'gas_monitoring_industries',
  CONSUMPTION: 'gas_monitoring_consumption',
  RESTRICTIONS: 'gas_monitoring_restrictions'
};

export const storageService = {
  saveIndustries: async (data: Industry[]) => {
    if (window.electronAPI) {
      await window.electronAPI.saveData(STORAGE_KEYS.INDUSTRIES, data);
    } else {
      localStorage.setItem(STORAGE_KEYS.INDUSTRIES, JSON.stringify(data));
    }
  },
  
  getIndustries: async (): Promise<Industry[]> => {
    if (window.electronAPI) {
      const data = await window.electronAPI.loadData(STORAGE_KEYS.INDUSTRIES);
      return data || [];
    } else {
      const data = localStorage.getItem(STORAGE_KEYS.INDUSTRIES);
      return data ? JSON.parse(data) : [];
    }
  },

  saveConsumption: async (data: ConsumptionRecord[]) => {
    if (window.electronAPI) {
      await window.electronAPI.saveData(STORAGE_KEYS.CONSUMPTION, data);
    } else {
      localStorage.setItem(STORAGE_KEYS.CONSUMPTION, JSON.stringify(data));
    }
  },

  getConsumption: async (): Promise<ConsumptionRecord[]> => {
    if (window.electronAPI) {
      const data = await window.electronAPI.loadData(STORAGE_KEYS.CONSUMPTION);
      return data || [];
    } else {
      const data = localStorage.getItem(STORAGE_KEYS.CONSUMPTION);
      return data ? JSON.parse(data) : [];
    }
  },

  saveRestrictions: async (data: Restriction[]) => {
    if (window.electronAPI) {
      await window.electronAPI.saveData(STORAGE_KEYS.RESTRICTIONS, data);
    } else {
      localStorage.setItem(STORAGE_KEYS.RESTRICTIONS, JSON.stringify(data));
    }
  },

  getRestrictions: async (): Promise<Restriction[]> => {
    if (window.electronAPI) {
      const data = await window.electronAPI.loadData(STORAGE_KEYS.RESTRICTIONS);
      return data || [];
    } else {
      const data = localStorage.getItem(STORAGE_KEYS.RESTRICTIONS);
      return data ? JSON.parse(data) : [];
    }
  }
};
