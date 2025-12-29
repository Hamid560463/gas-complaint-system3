
import React, { useState, useMemo } from 'react';
import { Industry, ConsumptionRecord, Restriction, SmsLog } from '../types';
import { MessageSquare, Send, Copy, AlertTriangle, CheckCircle2, Search, Phone, Users, FileText, Save, Clock, XCircle, FileClock, History, LayoutList, ChevronDown, ChevronUp, Filter, ListFilter } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, SelectWrapper } from './ui/Base';
import { getIndexFromDate } from '../services/dateUtils';
import { createPortal } from 'react-dom';

interface SmsPanelProps {
  industries: Industry[];
  consumption: ConsumptionRecord[];
  restrictions: Restriction[];
  smsLogs: SmsLog[];
  setSmsLogs: React.Dispatch<React.SetStateAction<SmsLog[]>>;
}

const SmsPanel: React.FC<SmsPanelProps> = ({ industries, consumption, restrictions, smsLogs, setSmsLogs }) => {
  const [activeTab, setActiveTab] = useState<'SEND' | 'HISTORY'>('SEND');

  // --- SEND TAB STATE ---
  const [viewMode, setViewMode] = useState<'VIOLATORS' | 'ALL'>('VIOLATORS');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [template, setTemplate] = useState<string>(
    `مشترک گرامی {name} (اشتراک: {id})\nمصرف گاز شما در تاریخ {date} برابر {usage} مترمکعب بوده که {diff} مترمکعب بیش از سقف مجاز است.\nلطفا نسبت به رعایت الگوی مصرف اقدام نمایید.\nشرکت گاز استان یزد`
  );
  const [minViolationPct, setMinViolationPct] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('ALL');
  const [filterUsage, setFilterUsage] = useState<string>('ALL');
  
  // --- HISTORY TAB STATE ---
  const [histSearch, setHistSearch] = useState('');
  const [histCity, setHistCity] = useState('ALL');
  const [histUsage, setHistUsage] = useState('ALL');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Common Options (Trimmed to avoid duplicates)
  const uniqueCities = useMemo(() => Array.from(new Set(industries.map(i => i.city ? i.city.trim() : ''))).filter(Boolean).sort(), [industries]);
  const uniqueUsages = useMemo(() => Array.from(new Set(industries.map(i => i.usageCode))).filter(Boolean).sort(), [industries]);

  // -------------------------
  // 1. CALCULATE CANDIDATES (ALL INDUSTRIES WITH DATA)
  // -------------------------
  const candidates = useMemo(() => {
    return consumption.map(rec => {
      const industry = industries.find(i => i.subscriptionId === rec.subscriptionId);
      if (!industry || !industry.baseMonthAvg) return null;

      // Find last valid data
      let lastValue = 0;
      let lastIndex = -1;
      let lastDate = '';

      if (rec.lastRecordDate) {
         lastIndex = getIndexFromDate(rec.lastRecordDate);
         if(lastIndex >= 0 && lastIndex < rec.dailyConsumptions.length && rec.dailyConsumptions[lastIndex] >= 0) {
             lastValue = rec.dailyConsumptions[lastIndex];
             lastDate = rec.lastRecordDate;
         } else {
             for(let i=rec.dailyConsumptions.length-1; i>=0; i--) {
                 if(rec.dailyConsumptions[i] >= 0) {
                     lastValue = rec.dailyConsumptions[i];
                     lastIndex = i;
                     lastDate = rec.lastRecordDate || ''; 
                     break;
                 }
             }
         }
      }

      if (lastIndex === -1) return null;

      const r = restrictions.find(x => x.usageCode === industry.usageCode);
      let pct = 0;
      if (r && r.periods) {
          const sorted = [...r.periods].sort((a,b) => a.startDate.localeCompare(b.startDate));
          for(const p of sorted) {
              if(getIndexFromDate(p.startDate) <= lastIndex) pct = p.percentage;
              else break;
          }
      }
      
      const limit = industry.baseMonthAvg * (1 - pct / 100);
      const diff = lastValue - limit;
      const violationPct = limit > 0 ? (diff / limit) * 100 : 0;
      const isViolator = diff > 0;

      return {
        id: industry.subscriptionId,
        name: industry.name,
        city: industry.city ? industry.city.trim() : '',
        usageCode: industry.usageCode,
        phone: industry.phone,
        lastDate,
        usage: lastValue,
        limit,
        diff,
        violationPct,
        isViolator
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
  }, [consumption, industries, restrictions]);

  // Apply Filters for Send Tab (Search, City, Usage AND ViewMode logic)
  const filteredList = useMemo(() => {
      return candidates.filter(v => {
          const matchSearch = v.name.includes(searchTerm) || v.id.includes(searchTerm);
          const matchCity = filterCity === 'ALL' || v.city === filterCity;
          const matchUsage = filterUsage === 'ALL' || v.usageCode === filterUsage;
          
          if (!matchSearch || !matchCity || !matchUsage) return false;

          // View Mode Logic
          if (viewMode === 'VIOLATORS') {
             // Show only if violator AND above min pct
             return v.isViolator && v.violationPct >= minViolationPct;
          }

          // In ALL mode, show everyone. minViolationPct is ignored for listing, 
          // but we might want to highlight violations. 
          return true; 
      });
  }, [candidates, searchTerm, filterCity, filterUsage, viewMode, minViolationPct]);


  // -------------------------
  // 2. AGGREGATE HISTORY (FOR HISTORY TAB)
  // -------------------------
  const aggregatedHistory = useMemo(() => {
      // Group logs by Subscription ID
      const groups: Record<string, SmsLog[]> = {};
      smsLogs.forEach(log => {
          if(!groups[log.subscriptionId]) groups[log.subscriptionId] = [];
          groups[log.subscriptionId].push(log);
      });

      // Map to industry details
      const list = Object.keys(groups).map(id => {
          const industry = industries.find(i => i.subscriptionId === id);
          const logs = groups[id].sort((a, b) => {
             // Sort logs desc (newest first)
             const dateComp = b.date.localeCompare(a.date);
             if (dateComp !== 0) return dateComp;
             return b.time.localeCompare(a.time);
          });

          return {
              id,
              name: industry?.name || 'نامشخص (حذف شده)',
              city: industry?.city ? industry.city.trim() : '-',
              usageCode: industry?.usageCode || '-',
              phone: industry?.phone || '-',
              logs,
              totalCount: logs.length,
              lastSent: logs.length > 0 ? logs[0].date : '-'
          };
      });

      // Filter
      return list.filter(item => {
          const matchSearch = item.name.includes(histSearch) || item.id.includes(histSearch);
          const matchCity = histCity === 'ALL' || item.city === histCity;
          const matchUsage = histUsage === 'ALL' || item.usageCode === histUsage;
          return matchSearch && matchCity && matchUsage;
      }).sort((a, b) => b.lastSent.localeCompare(a.lastSent)); // Sort by recent activity
  }, [smsLogs, industries, histSearch, histCity, histUsage]);


  // -------------------------
  // ACTIONS
  // -------------------------

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    const visibleIds = filteredList.map(v => v.id);
    const allVisibleSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allVisibleSelected) {
        setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
        const newSelected = new Set([...selectedIds, ...visibleIds]);
        setSelectedIds(Array.from(newSelected));
    }
  };

  const generateMessage = (v: typeof candidates[0]) => {
    return template
      .replace(/{name}/g, v.name)
      .replace(/{id}/g, v.id)
      .replace(/{date}/g, v.lastDate)
      .replace(/{usage}/g, Math.floor(v.usage).toLocaleString())
      .replace(/{limit}/g, Math.floor(v.limit).toLocaleString())
      .replace(/{diff}/g, Math.floor(v.diff).toLocaleString());
  };

  const createLogs = (type: 'SENT' | 'REGISTERED') => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('fa-IR');
      const timeStr = now.toLocaleTimeString('fa-IR');

      const newLogs: SmsLog[] = [];
      selectedIds.forEach(id => {
          const violator = candidates.find(v => v.id === id);
          if (violator) {
              newLogs.push({
                  id: crypto.randomUUID(),
                  subscriptionId: id,
                  date: dateStr,
                  time: timeStr,
                  message: generateMessage(violator),
                  type: type
              });
          }
      });
      return newLogs;
  };

  const handleMockSend = () => {
    if (selectedIds.length === 0) return;
    const confirm = window.confirm(`آیا پیامک برای ${selectedIds.length} مشترک ارسال شود؟ (شبیه‌سازی)`);
    if (confirm) {
        const newLogs = createLogs('SENT');
        setSmsLogs(prev => [...prev, ...newLogs]);
        alert('پیامک‌ها در صف ارسال قرار گرفتند و در سوابق ذخیره شدند.');
        setSelectedIds([]);
    }
  };

  const handleRegisterRecords = () => {
    if (selectedIds.length === 0) return;
    const confirm = window.confirm(`آیا وضعیت ${selectedIds.length} مشترک به عنوان «اخطار داده شده» در سوابق ثبت شود؟`);
    if (confirm) {
        const newLogs = createLogs('REGISTERED');
        setSmsLogs(prev => [...prev, ...newLogs]);
        setSelectedIds([]);
    }
  };

  const copyToClipboard = () => {
      const textData = filteredList
        .filter(v => selectedIds.includes(v.id))
        .map(v => `${v.phone || 'NoPhone'}\t${generateMessage(v).replace(/\n/g, ' ')}`)
        .join('\n');
      navigator.clipboard.writeText(textData);
      alert('لیست شماره‌ها و متن‌ها در کلیپ‌بورد کپی شد.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 relative">
      
      {/* HEADER */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
         <div>
            <h2 className="text-3xl font-black flex items-center gap-4">
               <MessageSquare className="text-blue-400" size={32} />
               مدیریت پیامک‌های اخطار
            </h2>
            <p className="text-slate-300 mt-2 text-base">
               {activeTab === 'SEND' 
                  ? 'شناسایی و ارسال اخطار به صنایع دارای مصرف مازاد' 
                  : 'مشاهده و بررسی تاریخچه اخطارهای صادر شده'}
            </p>
         </div>
         
         {/* TAB SWITCHER */}
         <div className="bg-slate-800 p-1.5 rounded-xl flex">
             <button
                onClick={() => setActiveTab('SEND')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'SEND' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
             >
                <Send size={18} /> پنل ارسال
             </button>
             <button
                onClick={() => setActiveTab('HISTORY')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
             >
                <History size={18} /> سوابق و تاریخچه
             </button>
         </div>
      </div>

      {/* ==================================== */}
      {/* TAB 1: SEND PANEL */}
      {/* ==================================== */}
      {activeTab === 'SEND' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4">
            {/* Left Col: Template & Controls */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="border-t-4 border-t-blue-600">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileText size={18} className="text-slate-500"/> متن پیامک (الگو)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <textarea 
                            className="w-full h-40 border rounded-xl p-3 text-sm leading-6 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                            <span className="bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200" onClick={() => setTemplate(prev => prev + ' {name}')}>{'{name}'} نام</span>
                            <span className="bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200" onClick={() => setTemplate(prev => prev + ' {id}')}>{'{id}'} اشتراک</span>
                            <span className="bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200" onClick={() => setTemplate(prev => prev + ' {usage}')}>{'{usage}'} مصرف</span>
                            <span className="bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200" onClick={() => setTemplate(prev => prev + ' {limit}')}>{'{limit}'} سقف</span>
                            <span className="bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200" onClick={() => setTemplate(prev => prev + ' {diff}')}>{'{diff}'} مازاد</span>
                        </div>
                    </CardContent>
                </Card>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500"/> فیلتر گیرندگان
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-slate-500 font-bold mb-1 block">حداقل درصد تخطی برای ارسال:</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full p-2 border rounded-lg text-center font-bold"
                                    value={minViolationPct}
                                    onChange={e => setMinViolationPct(Number(e.target.value))}
                                />
                                <span className="absolute left-3 top-2 text-slate-400 font-bold">%</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">این فیلتر فقط روی «لیست متخلفین» اعمال می‌شود.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button 
                        onClick={handleMockSend} 
                        className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={selectedIds.length === 0}
                    >
                        <Send size={18} className="ml-2"/>
                        ارسال پیامک ({selectedIds.length})
                    </Button>

                    <Button 
                        onClick={handleRegisterRecords} 
                        className="w-full bg-slate-800 hover:bg-slate-900 h-12 text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700"
                        disabled={selectedIds.length === 0}
                    >
                        <Save size={18} className="ml-2 text-emerald-400"/>
                        ثبت در سوابق
                    </Button>
                    
                    <Button 
                        variant="outline"
                        onClick={copyToClipboard} 
                        className="w-full border-slate-300 text-slate-600 h-11"
                        disabled={selectedIds.length === 0}
                    >
                        <Copy size={18} className="ml-2"/>
                        کپی لیست (اکسل/تکست)
                    </Button>
                </div>
            </div>

            {/* Right Col: List */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                    <div className="p-4 border-b bg-slate-50 flex flex-col gap-4">
                        
                        {/* View Mode Toggle & Select All */}
                        <div className="flex flex-col gap-3">
                             <div className="flex items-center justify-between">
                                  <div className="flex bg-slate-200 p-1 rounded-lg">
                                      <button 
                                          onClick={() => setViewMode('VIOLATORS')}
                                          className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'VIOLATORS' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                      >
                                          لیست متخلفین ({candidates.filter(x => x.isViolator && x.violationPct >= minViolationPct).length})
                                      </button>
                                      <button 
                                          onClick={() => setViewMode('ALL')}
                                          className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                      >
                                          لیست کل صنایع ({candidates.length})
                                      </button>
                                  </div>
                                  
                                  <button onClick={handleSelectAll} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors">
                                      {(filteredList.length > 0 && filteredList.every(v => selectedIds.includes(v.id))) ? 'لغو انتخاب‌ها' : 'انتخاب همه (لیست)'}
                                  </button>
                             </div>
                        </div>

                        {/* Filters: Search, City, Usage */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="relative col-span-1 md:col-span-2">
                                <Input 
                                    placeholder="جستجو نام واحد یا شماره اشتراک..." 
                                    className="pl-9 bg-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                            </div>
                            <SelectWrapper value={filterCity} onChange={e => setFilterCity(e.target.value)} className="text-xs">
                                <option value="ALL">همه شهرها</option>
                                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </SelectWrapper>
                            <SelectWrapper value={filterUsage} onChange={e => setFilterUsage(e.target.value)} className="text-xs">
                                <option value="ALL">همه تعرفه‌ها</option>
                                {uniqueUsages.map(u => <option key={u} value={u}>{u}</option>)}
                            </SelectWrapper>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto max-h-[600px]">
                        {filteredList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10">
                                <CheckCircle2 size={48} className="mb-4 text-green-500 opacity-50"/>
                                <p className="font-bold">
                                    {candidates.length === 0 
                                        ? 'هیچ داده مصرفی برای نمایش وجود ندارد.' 
                                        : 'موردی با این مشخصات یافت نشد.'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredList.map(v => {
                                    const isSelected = selectedIds.includes(v.id);
                                    // Calculate history count for this user
                                    const logCount = smsLogs.filter(l => l.subscriptionId === v.id).length;

                                    return (
                                        <div 
                                            key={v.id} 
                                            className={`p-4 flex items-start gap-3 transition-colors hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-blue-50/40' : ''} ${!v.isViolator ? 'opacity-90' : ''}`}
                                            onClick={() => toggleSelect(v.id)}
                                        >
                                            <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                                {isSelected && <CheckCircle2 size={14} className="text-white"/>}
                                            </div>
                                            
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                        {v.name}
                                                        {logCount > 0 && (
                                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <Clock size={10}/> سابقه: {logCount}
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{v.id}</span>
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Phone size={12}/> {v.phone || <span className="text-red-400">بدون شماره</span>}
                                                    </div>
                                                    <div>
                                                        <span className="opacity-70">شهر:</span> {v.city}
                                                    </div>
                                                    <div className="mr-auto">
                                                        {v.isViolator ? (
                                                           <>
                                                              <span className="opacity-70">مازاد:</span> <span className="text-red-600 font-bold">{Math.floor(v.diff).toLocaleString()}</span>
                                                           </>
                                                        ) : (
                                                           <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={10}/> رعایت شده</span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Message Preview (Collapsed) */}
                                                {isSelected && (
                                                    <div className="mt-3 bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-600 leading-5 font-light">
                                                        {generateMessage(v)}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col items-end gap-1">
                                                {v.isViolator ? (
                                                    <>
                                                        <span className="text-red-600 font-black text-sm">{v.violationPct.toFixed(0)}%</span>
                                                        <span className="text-[10px] text-red-400">تخطی</span>
                                                    </>
                                                ) : (
                                                    <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">نرمال</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
      )}


      {/* ==================================== */}
      {/* TAB 2: HISTORY PANEL */}
      {/* ==================================== */}
      {activeTab === 'HISTORY' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              
              {/* History Filters */}
              <Card className="bg-slate-50 border-slate-200">
                 <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                         <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Search size={12}/> جستجو</label>
                         <Input 
                            placeholder="نام واحد، اشتراک..." 
                            className="bg-white"
                            value={histSearch}
                            onChange={(e) => setHistSearch(e.target.value)}
                         />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Filter size={12}/> شهر</label>
                         <SelectWrapper value={histCity} onChange={e => setHistCity(e.target.value)} className="bg-white">
                             <option value="ALL">همه شهرها</option>
                             {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                         </SelectWrapper>
                    </div>
                    <div>
                         <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Filter size={12}/> تعرفه</label>
                         <SelectWrapper value={histUsage} onChange={e => setHistUsage(e.target.value)} className="bg-white">
                             <option value="ALL">همه تعرفه‌ها</option>
                             {uniqueUsages.map(u => <option key={u} value={u}>{u}</option>)}
                         </SelectWrapper>
                    </div>
                 </CardContent>
              </Card>

              {/* Aggregated History List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                   <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
                       <h3 className="font-bold text-slate-700 flex items-center gap-2">
                           <LayoutList size={20}/>
                           لیست صنایعی که اخطار دریافت کرده‌اند
                       </h3>
                       <span className="text-xs bg-white px-2 py-1 rounded border text-slate-500">
                           {aggregatedHistory.length} مورد
                       </span>
                   </div>
                   
                   {aggregatedHistory.length === 0 ? (
                       <div className="flex flex-col items-center justify-center p-16 text-slate-400">
                           <FileClock size={48} className="mb-4 opacity-30"/>
                           <p>هیچ سابقه‌ای با فیلترهای فعلی یافت نشد.</p>
                       </div>
                   ) : (
                       <div className="divide-y divide-slate-100">
                           {aggregatedHistory.map(item => {
                               const isExpanded = expandedHistoryId === item.id;
                               return (
                                   <div key={item.id} className="group transition-colors">
                                       {/* Header Row */}
                                       <div 
                                           className={`p-4 flex flex-col md:flex-row items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
                                           onClick={() => setExpandedHistoryId(isExpanded ? null : item.id)}
                                       >
                                           <div className="flex items-center gap-3 flex-1">
                                               <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white'}`}>
                                                   {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                               </div>
                                               <div>
                                                   <h4 className="font-bold text-slate-800 text-base">{item.name}</h4>
                                                   <div className="flex gap-3 text-xs text-slate-500 mt-1">
                                                       <span className="font-mono bg-slate-100 px-1.5 rounded">{item.id}</span>
                                                       <span>|</span>
                                                       <span>{item.city}</span>
                                                       <span>|</span>
                                                       <span>تعرفه {item.usageCode}</span>
                                                   </div>
                                               </div>
                                           </div>

                                           <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                               <div className="text-center">
                                                   <div className="text-[10px] text-slate-400 mb-1">تعداد اخطار</div>
                                                   <div className="font-black text-xl text-slate-700">{item.totalCount}</div>
                                               </div>
                                               <div className="text-right pl-4 border-l border-slate-200 w-32">
                                                   <div className="text-[10px] text-slate-400 mb-1">آخرین ارسال</div>
                                                   <div className="font-bold text-sm text-blue-600">{item.lastSent}</div>
                                               </div>
                                           </div>
                                       </div>

                                       {/* Expanded Logs */}
                                       {isExpanded && (
                                           <div className="bg-slate-50/50 p-4 pl-12 border-t border-slate-100 animate-in slide-in-from-top-2">
                                               <div className="space-y-3">
                                                   {item.logs.map((log, idx) => (
                                                       <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative overflow-hidden">
                                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${log.type === 'SENT' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                                            <div className="flex justify-between items-start mb-2 pl-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-sm text-slate-700">{log.date}</span>
                                                                    <span className="text-xs text-slate-400">{log.time}</span>
                                                                </div>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded border ${log.type === 'SENT' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                                                    {log.type === 'SENT' ? 'ارسال سیستمی' : 'ثبت دستی'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 leading-6 bg-slate-50 p-2 rounded border border-slate-100 pl-3">
                                                                {log.message}
                                                            </p>
                                                       </div>
                                                   ))}
                                               </div>
                                           </div>
                                       )}
                                   </div>
                               );
                           })}
                       </div>
                   )}
              </div>
          </div>
      )}

    </div>
  );
};

export default SmsPanel;
