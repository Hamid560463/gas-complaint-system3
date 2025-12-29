
import { Industry, ConsumptionRecord, Restriction, SmsLog } from '../types';

// These keys will be used as filenames (e.g., industries.json) in the Electron backend
const STORAGE_KEYS = {
  INDUSTRIES: 'industries',
  CONSUMPTION: 'consumption',
  RESTRICTIONS: 'restrictions',
  SMS_LOGS: 'sms_logs'
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
  },

  saveSmsLogs: async (data: SmsLog[]) => {
    if (window.electronAPI) {
      await window.electronAPI.saveData(STORAGE_KEYS.SMS_LOGS, data);
    } else {
      localStorage.setItem(STORAGE_KEYS.SMS_LOGS, JSON.stringify(data));
    }
  },

  getSmsLogs: async (): Promise<SmsLog[]> => {
    if (window.electronAPI) {
      const data = await window.electronAPI.loadData(STORAGE_KEYS.SMS_LOGS);
      return data || [];
    } else {
      const data = localStorage.getItem(STORAGE_KEYS.SMS_LOGS);
      return data ? JSON.parse(data) : [];
    }
  }
};
