
import React, { useState, useEffect } from 'react';
import { Industry, ConsumptionRecord, Restriction, ViewType } from './types';
import { storageService } from './services/storageService';
import Dashboard from './components/Dashboard';
import DataManagement from './components/DataManagement';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ExecutionReports from './components/ExecutionReports';
import HeadquartersReports from './components/HeadquartersReports';
import TariffHistory from './components/TariffHistory';
import Help from './components/Help';
import { LayoutDashboard, FileSpreadsheet, Settings as SettingsIcon, BarChart3, Copyright, Printer, ClipboardList, Building2, Flame, HelpCircle, History } from 'lucide-react';
import { Skeleton, Button } from './components/ui/Base';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType | 'HELP'>('DASHBOARD');
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // New State for Dashboard focus
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Load data asynchronously on startup
  useEffect(() => {
    const loadAllData = async () => {
      setTimeout(async () => {
        try {
          const [inds, cons, rests] = await Promise.all([
            storageService.getIndustries(),
            storageService.getConsumption(),
            storageService.getRestrictions()
          ]);
          
          const mapLegacyCode = (code: string) => {
             const c = code ? code.trim() : '';
             switch(c) {
               case '7': return 'تعرفه 7 (کاشی و سرامیک)';
               case '10': return 'تعرفه 10 (گچ و آهک)';
               case '6': return 'تعرفه 6 (شیشه)';
               case '5': return 'تعرفه 5 (قند و شکر)';
               case '8': return 'تعرفه 8 (صنایع فلزی)';
               case '4': return 'تعرفه 4 (آجر)';
               default: return c;
             }
          };

          const migratedIndustries = inds.map(i => ({
              ...i,
              usageCode: mapLegacyCode(i.usageCode)
          }));

          const migratedRestrictions = rests.map(r => ({
              ...r,
              usageCode: mapLegacyCode(r.usageCode)
          }));
          
          setIndustries(migratedIndustries);
          setConsumptionRecords(cons);
          setRestrictions(migratedRestrictions);
          
          if (migratedIndustries.length > 0 && selectedIds.length === 0) {
            setSelectedIds([migratedIndustries[0].subscriptionId]);
          }
        } catch (error) {
          console.error("Failed to load data", error);
        } finally {
          setIsLoaded(true);
        }
      }, 800);
    };

    loadAllData();
  }, []);

  useEffect(() => { if (isLoaded) storageService.saveIndustries(industries); }, [industries, isLoaded]);
  useEffect(() => { if (isLoaded) storageService.saveConsumption(consumptionRecords); }, [consumptionRecords, isLoaded]);
  useEffect(() => { if (isLoaded) storageService.saveRestrictions(restrictions); }, [restrictions, isLoaded]);

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': 
        return <Dashboard industries={industries} consumption={consumptionRecords} restrictions={restrictions} selectedIds={selectedIds} onSelectIds={setSelectedIds} />;
      case 'DATA_ENTRY': return <DataManagement industries={industries} setIndustries={setIndustries} consumption={consumptionRecords} setConsumption={setConsumptionRecords} />;
      case 'REPORTS': return <Reports industries={industries} consumption={consumptionRecords} restrictions={restrictions} />;
      case 'EXECUTION_REPORTS': return <ExecutionReports industries={industries} consumption={consumptionRecords} restrictions={restrictions} />;
      case 'HEADQUARTERS_REPORTS': return <HeadquartersReports industries={industries} consumption={consumptionRecords} restrictions={restrictions} />;
      case 'TARIFF_HISTORY': return <TariffHistory industries={industries} consumption={consumptionRecords} />;
      case 'SETTINGS': return <Settings restrictions={restrictions} setRestrictions={setRestrictions} industries={industries} />;
      case 'HELP': return <Help />;
      default: return <Dashboard industries={industries} consumption={consumptionRecords} restrictions={restrictions} selectedIds={selectedIds} onSelectIds={setSelectedIds} />;
    }
  };

  const handlePrint = () => {
    setTimeout(() => { window.print(); }, 100);
  };

  const menuItems = [
    { id: 'DASHBOARD', label: 'داشبورد مدیریتی', icon: LayoutDashboard },
    { id: 'DATA_ENTRY', label: 'مدیریت داده‌ها', icon: FileSpreadsheet },
    { id: 'TARIFF_HISTORY', label: 'سوابق مصارف', icon: History },
    { id: 'SETTINGS', label: 'تنظیمات محدودیت', icon: SettingsIcon },
    { id: 'EXECUTION_REPORTS', label: 'پایش و تخلفات', icon: ClipboardList },
    { id: 'HEADQUARTERS_REPORTS', label: 'گزارشات ستاد', icon: Building2 },
    { id: 'REPORTS', label: 'خروجی نهایی', icon: BarChart3 },
    { id: 'HELP', label: 'راهنمای سیستم', icon: HelpCircle },
  ];

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full bg-slate-50">
        <div className="w-72 bg-white border-l p-6 space-y-4 hidden md:block">
           <Skeleton className="h-12 w-full rounded-xl" />
           <div className="space-y-2 mt-8">
             {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
           </div>
        </div>
        <div className="flex-1 p-8 space-y-6">
           <div className="flex justify-between">
              <Skeleton className="h-10 w-64 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
           </div>
           <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
           </div>
           <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900 text-slate-300 flex-shrink-0 no-print flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3 justify-center mb-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
               <Flame size={28} fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">سامانه پایش گاز</h1>
          </div>
          <p className="text-xs text-center uppercase tracking-widest opacity-70 font-medium">نسخه سازمانی ۱۴۰۴</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
             const isActive = currentView === item.id;
             // @ts-ignore
             const Icon = item.icon;
             return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={`w-full flex items-center gap-4 p-3.5 rounded-lg text-base font-medium transition-all duration-200 group relative ${
                  isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'} />
                <span>{item.label}</span>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white/20 rounded-r-full" />}
              </button>
             );
          })}
        </nav>
        
        <div className="p-6 text-xs text-slate-400 border-t border-slate-800/50 text-center leading-relaxed">
           <p>واحد کنترل و پایش مصرف انرژی</p>
           <p className="mt-1 opacity-70">استانداری یزد</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 print:block print:h-auto print:overflow-visible relative">
        <div className="flex-1 p-6 md:p-8 overflow-y-auto print:overflow-visible print:h-auto z-10">
          <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center no-print gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                {menuItems.find(m => m.id === currentView)?.label}
              </h2>
              <p className="text-base text-slate-500 mt-1">
                آخرین بروزرسانی: {new Date().toLocaleDateString('fa-IR')}
              </p>
            </div>
            <div className="flex gap-2">
                 <Button 
                    variant="outline"
                    onClick={handlePrint}
                    className="gap-2 shadow-sm bg-white text-base h-11 px-6"
                >
                    <Printer size={18} />
                    <span>چاپ سریع</span>
                </Button>
            </div>
          </header>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
            {renderView()}
          </div>

          <footer className="mt-12 py-6 border-t border-slate-200/60 text-center no-print">
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400 font-medium">
                 <Copyright size={14} />
                 <span>۱۴۰۴ | سامانه جامع مدیریت مصرف گاز صنایع</span>
              </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;
