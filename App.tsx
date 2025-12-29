
import React, { useState, useEffect } from 'react';
import { Industry, ConsumptionRecord, Restriction, ViewType, SmsLog } from './types';
import { storageService } from './services/storageService';
import Dashboard from './components/Dashboard';
import DataManagement from './components/DataManagement';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ExecutionReports from './components/ExecutionReports';
import HeadquartersReports from './components/HeadquartersReports';
import TariffHistory from './components/TariffHistory';
import SmsPanel from './components/SmsPanel';
import Help from './components/Help';
import { LayoutDashboard, FileSpreadsheet, Settings as SettingsIcon, BarChart3, Copyright, Printer, ClipboardList, Building2, Flame, HelpCircle, History, MessageSquare, Globe, Menu, X } from 'lucide-react';
import { Skeleton, Button } from './components/ui/Base';
import { START_DATE } from './services/dateUtils';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType | 'HELP'>('DASHBOARD');
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // New State for Dashboard focus
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Load data asynchronously on startup
  useEffect(() => {
    const loadAllData = async () => {
      setTimeout(async () => {
        try {
          const [inds, cons, rests, logs] = await Promise.all([
            storageService.getIndustries(),
            storageService.getConsumption(),
            storageService.getRestrictions(),
            storageService.getSmsLogs()
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

          // Migration logic for Restrictions
          const migratedRestrictions = rests.map((r: any) => ({
              usageCode: mapLegacyCode(r.usageCode),
              periods: r.periods && Array.isArray(r.periods) 
                ? r.periods 
                : [{ startDate: START_DATE, percentage: r.percentage || 0 }]
          }));
          
          setIndustries(migratedIndustries);
          setConsumptionRecords(cons);
          setRestrictions(migratedRestrictions);
          setSmsLogs(logs || []);
          
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
  useEffect(() => { if (isLoaded) storageService.saveSmsLogs(smsLogs); }, [smsLogs, isLoaded]);

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': 
        return <Dashboard industries={industries} consumption={consumptionRecords} restrictions={restrictions} selectedIds={selectedIds} onSelectIds={setSelectedIds} />;
      case 'DATA_ENTRY': return <DataManagement industries={industries} setIndustries={setIndustries} consumption={consumptionRecords} setConsumption={setConsumptionRecords} />;
      case 'REPORTS': return <Reports industries={industries} consumption={consumptionRecords} restrictions={restrictions} />;
      case 'EXECUTION_REPORTS': return <ExecutionReports industries={industries} consumption={consumptionRecords} restrictions={restrictions} />;
      case 'HEADQUARTERS_REPORTS': return <HeadquartersReports industries={industries} consumption={consumptionRecords} restrictions={restrictions} />;
      case 'TARIFF_HISTORY': return <TariffHistory industries={industries} consumption={consumptionRecords} restrictions={restrictions} />;
      case 'SMS_PANEL': return <SmsPanel industries={industries} consumption={consumptionRecords} restrictions={restrictions} smsLogs={smsLogs} setSmsLogs={setSmsLogs} />;
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
    { id: 'SMS_PANEL', label: 'پیامک اخطار', icon: MessageSquare },
    { id: 'REPORTS', label: 'خروجی نهایی', icon: BarChart3 },
    { id: 'HELP', label: 'راهنمای سیستم', icon: HelpCircle },
  ];

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full bg-slate-50">
        <div className="w-80 bg-white border-l p-6 space-y-4 hidden md:block">
           <Skeleton className="h-16 w-full rounded-2xl" />
           <div className="space-y-3 mt-10">
             {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
           </div>
        </div>
        <div className="flex-1 p-8 space-y-6 overflow-hidden">
           <div className="flex justify-between items-center">
              <Skeleton className="h-12 w-64 rounded-xl" />
              <Skeleton className="h-12 w-32 rounded-xl" />
           </div>
           <div className="grid grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-3xl" />)}
           </div>
           <Skeleton className="h-[500px] w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-transparent font-sans text-slate-900">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative inset-y-0 right-0 w-72 md:w-80 bg-slate-900 text-slate-300 flex-shrink-0 no-print flex flex-col shadow-2xl z-50 transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Sidebar Header */}
        <div className="p-8 pb-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none"></div>
          <div className="flex flex-col items-center justify-center mb-6 relative z-10">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-500/20 mb-4 transform hover:scale-105 transition-transform duration-300">
               <Flame size={32} fill="currentColor" className="animate-pulse" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight text-center">سامانه پایش گاز</h1>
            <p className="text-xs text-blue-300 font-bold mt-1 tracking-widest">INDUSTRIAL MONITORING</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar pb-4">
          {menuItems.map((item) => {
             const isActive = currentView === item.id;
             // @ts-ignore
             const Icon = item.icon;
             return (
              <button
                key={item.id}
                onClick={() => { setCurrentView(item.id as any); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group relative overflow-hidden ${
                  isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30' 
                  : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'} strokeWidth={2} />
                <span className="relative z-10">{item.label}</span>
                {!isActive && <div className="absolute inset-0 bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity z-0" />}
              </button>
             );
          })}
        </nav>
        
        {/* Sidebar Footer */}
        <div className="p-6 text-xs text-slate-500 border-t border-slate-800/50 text-center leading-relaxed relative bg-slate-900/50 backdrop-blur-sm">
           <p className="font-bold text-slate-400">واحد کنترل و پایش بهره برداری</p>
           <p className="mt-1 opacity-70">شرکت گاز استان یزد</p>
           {!window.electronAPI && (
               <div className="mt-3 inline-flex items-center justify-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                   <Globe size={12} />
                   <span className="font-bold">نسخه وب (Vercel)</span>
               </div>
           )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 print:block print:h-auto print:overflow-visible relative h-screen overflow-hidden">
        
        {/* Mobile Header */}
        <div className="md:hidden bg-white/80 backdrop-blur-md border-b p-4 flex justify-between items-center sticky top-0 z-30">
             <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg text-white"><Flame size={20} fill="currentColor"/></div>
                <span className="font-bold text-slate-900">سامانه پایش</span>
             </div>
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                 <Menu size={24} />
             </button>
        </div>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar print:overflow-visible print:h-auto z-10">
          <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center no-print gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                {menuItems.find(m => m.id === currentView)?.label}
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 آخرین بروزرسانی: {new Date().toLocaleDateString('fa-IR')}
              </p>
            </div>
            <div className="flex gap-2">
                 <Button 
                    variant="outline"
                    onClick={handlePrint}
                    className="gap-2 shadow-sm bg-white/80 backdrop-blur text-sm h-11 px-5 rounded-xl border-slate-200 hover:border-blue-300"
                >
                    <Printer size={18} className="text-slate-500" />
                    <span>چاپ سریع</span>
                </Button>
            </div>
          </header>

          <div className="animate-in fade-in duration-500 pb-20">
            {renderView()}
          </div>

          <footer className="mt-12 py-6 border-t border-slate-200/60 text-center no-print opacity-60 hover:opacity-100 transition-opacity">
              <div className="flex flex-col items-center justify-center gap-2 text-sm text-slate-400 font-medium">
                 <div className="flex items-center gap-2">
                   <Copyright size={14} />
                   <span>۱۴۰۴ | سامانه جامع مدیریت مصرف گاز صنایع</span>
                 </div>
                 <div className="text-xs opacity-80 mt-1">طراحی و توسعه : حمیدرضا نعمت اللهی</div>
              </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;
