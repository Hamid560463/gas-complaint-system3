
import React, { useState, useEffect } from 'react';
import { Industry, ConsumptionRecord, Restriction, ViewType } from './types';
import { storageService } from './services/storageService';
import Dashboard from './components/Dashboard';
import DataManagement from './components/DataManagement';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { LayoutDashboard, FileSpreadsheet, Settings as SettingsIcon, BarChart3, Copyright, Printer } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('DASHBOARD');
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  
  // New State for Dashboard focus
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const inds = storageService.getIndustries();
    const cons = storageService.getConsumption();
    const rests = storageService.getRestrictions();
    setIndustries(inds);
    setConsumptionRecords(cons);
    setRestrictions(rests);
    
    // Default selection
    if (inds.length > 0 && selectedIds.length === 0) {
      setSelectedIds([inds[0].subscriptionId]);
    }
  }, []);

  useEffect(() => { storageService.saveIndustries(industries); }, [industries]);
  useEffect(() => { storageService.saveConsumption(consumptionRecords); }, [consumptionRecords]);
  useEffect(() => { storageService.saveRestrictions(restrictions); }, [restrictions]);

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': 
        return <Dashboard 
          industries={industries} 
          consumption={consumptionRecords} 
          restrictions={restrictions} 
          selectedIds={selectedIds}
          onSelectIds={setSelectedIds}
        />;
      case 'DATA_ENTRY': return <DataManagement industries={industries} setIndustries={setIndustries} consumption={consumptionRecords} setConsumption={setConsumptionRecords} />;
      case 'REPORTS': return <Reports industries={industries} consumption={consumptionRecords} restrictions={restrictions} />;
      case 'SETTINGS': return <Settings restrictions={restrictions} setRestrictions={setRestrictions} industries={industries} />;
      default: return <Dashboard industries={industries} consumption={consumptionRecords} restrictions={restrictions} selectedIds={selectedIds} onSelectIds={setSelectedIds} />;
    }
  };

  const handlePrint = () => {
    // Small delay to ensure UI interactions complete before blocking with print dialog
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 text-white flex-shrink-0 no-print">
        <div className="p-8 border-b border-slate-700">
          <h1 className="text-xl font-bold text-center tracking-tight">سامانه پایش هوشمند گاز</h1>
          <p className="text-[10px] text-slate-400 text-center mt-3 uppercase tracking-widest opacity-60">Industrial Monitoring Solution</p>
        </div>
        <nav className="p-6 space-y-3">
          <button
            onClick={() => setCurrentView('DASHBOARD')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${currentView === 'DASHBOARD' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/30' : 'hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-bold">داشبورد مدیریتی</span>
          </button>
          <button
            onClick={() => setCurrentView('DATA_ENTRY')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${currentView === 'DATA_ENTRY' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/30' : 'hover:bg-slate-800'}`}
          >
            <FileSpreadsheet size={20} />
            <span className="font-bold">مدیریت داده‌ها</span>
          </button>
          <button
            onClick={() => setCurrentView('SETTINGS')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${currentView === 'SETTINGS' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/30' : 'hover:bg-slate-800'}`}
          >
            <SettingsIcon size={20} />
            <span className="font-bold">تنظیمات محدودیت</span>
          </button>
          <button
            onClick={() => setCurrentView('REPORTS')}
            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${currentView === 'REPORTS' ? 'bg-indigo-600 shadow-lg shadow-indigo-500/30' : 'hover:bg-slate-800'}`}
          >
            <BarChart3 size={20} />
            <span className="font-bold">گزارشات نهایی</span>
          </button>
        </nav>
        <div className="mt-auto p-8 text-[10px] text-slate-500 border-t border-slate-800">
          واحد کنترل و پایش مصرف
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 print:block print:h-auto print:overflow-visible">
        <div className="flex-1 p-6 md:p-10 overflow-auto print:overflow-visible print:h-auto">
          <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center no-print gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-900">
                {currentView === 'DASHBOARD' && 'تحلیل وضعیت مصرف'}
                {currentView === 'DATA_ENTRY' && 'بانک اطلاعات مرکزی'}
                {currentView === 'SETTINGS' && 'پیکربندی سقف مصرف'}
                {currentView === 'REPORTS' && 'خروجی رسمی و گزارشات'}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-slate-500 font-medium">به‌روزرسانی شده در: {new Date().toLocaleDateString('fa-IR')} ساعت {new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
            </div>
            <div className="flex gap-3">
               <button 
                type="button"
                onClick={handlePrint}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
              >
                <Printer size={20} />
                <span>چاپ و دریافت PDF</span>
              </button>
            </div>
          </header>

          <div className="bg-white shadow-xl shadow-slate-200/50 rounded-3xl p-8 min-h-[75vh] border border-slate-100">
            {renderView()}
          </div>

          <footer className="mt-16 mb-6 py-8 border-t border-slate-200">
              <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <Copyright size={12} />
                    <span>۱۴۰۴ | سامانه جامع مدیریت مصرف گاز استان</span>
                  </div>
                  <div className="text-sm font-black text-slate-600 bg-slate-100 px-6 py-2 rounded-full border border-slate-200">
                    طراحی و توسعه : حمیدرضا نعمت اللهی
                  </div>
              </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;
