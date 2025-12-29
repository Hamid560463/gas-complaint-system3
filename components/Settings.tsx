
import React, { useState } from 'react';
import { Restriction, Industry, RestrictionPeriod } from '../types';
import { Calendar, Plus, Trash2, ChevronDown, ChevronUp, Save, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from './ui/Base';
import { START_DATE, getIndexFromDate } from '../services/dateUtils';

interface SettingsProps {
  restrictions: Restriction[];
  setRestrictions: React.Dispatch<React.SetStateAction<Restriction[]>>;
  industries: Industry[];
}

const Settings: React.FC<SettingsProps> = ({ restrictions, setRestrictions, industries }) => {
  const usageCodes: string[] = Array.from(new Set(industries.map(i => i.usageCode)));
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  // Temporary state for adding a new period
  const [newPeriodDate, setNewPeriodDate] = useState<string>('');
  const [newPeriodPct, setNewPeriodPct] = useState<string | number>('');

  const toggleExpand = (code: string) => {
      if (expandedCode === code) {
          setExpandedCode(null);
      } else {
          setExpandedCode(code);
          setNewPeriodDate('');
          setNewPeriodPct('');
      }
  };

  const addPeriod = (code: string) => {
      if (!newPeriodDate) {
          alert('لطفا تاریخ شروع را وارد کنید.');
          return;
      }

      // 1. Relaxed Date Parsing & Validation
      // Accept formats like 1404/9/1 or 1404/09/01
      const rawDate = newPeriodDate.trim();
      const parts = rawDate.split('/');
      
      let normalizedDate = rawDate;

      if (parts.length === 3) {
          // Normalize by padding single digits with 0
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          normalizedDate = `${y}/${m}/${d}`;
      }
      
      const datePattern = /^140[0-9]\/[0-1][0-9]\/[0-3][0-9]$/;
      if(!datePattern.test(normalizedDate)) {
          alert('فرمت تاریخ صحیح نیست. لطفاً تاریخ معتبر وارد کنید (مثال: 1404/10/01)');
          return;
      }
      
      const idx = getIndexFromDate(normalizedDate);
      if(idx < 0) {
          alert('تاریخ وارد شده معتبر نیست یا قبل از شروع دوره پایش (1404/09/28) است.');
          return;
      }

      // 2. Percentage Validation
      const pctVal = newPeriodPct === '' ? 0 : Number(newPeriodPct);
      if (pctVal < 0 || pctVal > 100) {
          alert('درصد محدودیت باید بین ۰ تا ۱۰۰ باشد.');
          return;
      }

      setRestrictions(prev => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(r => r.usageCode === code);
          
          if (existingIndex > -1) {
              const currentPeriods = [...updated[existingIndex].periods];
              // Remove if date exists to overwrite
              const filtered = currentPeriods.filter(p => p.startDate !== normalizedDate);
              filtered.push({ startDate: normalizedDate, percentage: pctVal });
              // Sort by date
              filtered.sort((a, b) => a.startDate.localeCompare(b.startDate));
              
              updated[existingIndex] = { ...updated[existingIndex], periods: filtered };
          } else {
              updated.push({
                  usageCode: code,
                  periods: [{ startDate: normalizedDate, percentage: pctVal }]
              });
          }
          return updated;
      });
      
      // Reset inputs
      setNewPeriodDate('');
      setNewPeriodPct('');
  };

  const removePeriod = (code: string, date: string) => {
      if(date === START_DATE) {
          alert('امکان حذف تاریخ شروع دوره (پیش‌فرض) وجود ندارد. می‌توانید درصد آن را ویرایش کنید.');
          return;
      }
      setRestrictions(prev => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(r => r.usageCode === code);
          if (existingIndex > -1) {
              const filtered = updated[existingIndex].periods.filter(p => p.startDate !== date);
              updated[existingIndex] = { ...updated[existingIndex], periods: filtered };
          }
          return updated;
      });
  };

  const updatePercentage = (code: string, date: string, val: string | number) => {
      let numVal = Number(val);
      if (isNaN(numVal)) numVal = 0;
      if (numVal > 100) numVal = 100;
      if (numVal < 0) numVal = 0;

      setRestrictions(prev => {
          const updated = [...prev];
          const existingIndex = updated.findIndex(r => r.usageCode === code);
          if (existingIndex > -1) {
              const periods = updated[existingIndex].periods.map(p => 
                  p.startDate === date ? { ...p, percentage: numVal } : p
              );
              updated[existingIndex] = { ...updated[existingIndex], periods };
          }
          return updated;
      });
  };

  const handleResetData = () => {
      const confirmText = "آیا مطمئن هستید؟ تمام داده‌های ذخیره شده (صنایع، مصارف، سوابق) پاک خواهند شد و قابل بازگشت نیستند.";
      if (window.confirm(confirmText)) {
          if (window.confirm("عملیات غیرقابل بازگشت است. ادامه می‌دهید؟")) {
              localStorage.clear();
              window.location.reload();
          }
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center">
        <h3 className="text-xl font-bold">مدیریت زمانی محدودیت‌ها</h3>
        <p className="text-slate-500 mt-2">تعیین درصد محدودیت هر تعرفه در بازه‌های زمانی مختلف</p>
      </div>

      <div className="space-y-4">
        {usageCodes.length === 0 && (
          <div className="p-8 text-center bg-slate-50 border border-dashed rounded text-slate-400">
            ابتدا لیست صنایع را در بخش مدیریت داده‌ها وارد کنید.
          </div>
        )}
        
        {usageCodes.map(code => {
          const rest = restrictions.find(r => r.usageCode === code);
          // Ensure at least one period exists (Default start date)
          const periods = rest ? rest.periods : [{ startDate: START_DATE, percentage: 0 }];
          const isExpanded = expandedCode === code;
          const industryCount = industries.filter(i => i.usageCode === code).length;

          return (
            <Card key={code} className={`transition-all duration-300 ${isExpanded ? 'ring-2 ring-blue-100 shadow-md' : ''}`}>
               <div 
                 className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                 onClick={() => toggleExpand(code)}
               >
                  <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                          {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{code.startsWith('تعرفه') ? code : `تعرفه ${code}`}</h4>
                        <span className="text-sm text-slate-500">{industryCount} صنعت فعال</span>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                      <div className="text-right hidden md:block">
                          <div className="text-xs text-slate-400">وضعیت فعلی</div>
                          <div className="font-bold text-blue-600">
                              {periods[periods.length - 1].percentage}% محدودیت
                          </div>
                      </div>
                  </div>
               </div>

               {isExpanded && (
                   <div className="p-6 pt-0 border-t bg-slate-50/50 animate-in slide-in-from-top-2">
                       <div className="text-sm text-slate-500 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-2">
                           <AlertCircle size={16} className="text-blue-600"/>
                           درصد محدودیت در بازه‌های زمانی مختلف. سیستم بر اساس تاریخ روز، درصد مربوطه را اعمال می‌کند.
                       </div>

                       {/* Periods List */}
                       <div className="space-y-3 mb-6">
                           {periods.map((period, idx) => (
                               <div key={period.startDate} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                   <div className="flex items-center gap-2 w-32 shrink-0">
                                       <Calendar size={16} className="text-slate-400"/>
                                       <span className="font-mono font-bold text-slate-700">{period.startDate}</span>
                                       {period.startDate === START_DATE && <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">شروع</span>}
                                   </div>
                                   
                                   <div className="flex-1 flex items-center gap-3">
                                       <span className="text-xs text-slate-500 whitespace-nowrap">میزان محدودیت:</span>
                                       {/* Range Slider */}
                                       <input 
                                          type="range" min="0" max="100" step="1"
                                          className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                          value={period.percentage}
                                          onChange={(e) => updatePercentage(code, period.startDate, e.target.value)}
                                       />
                                       {/* Manual Input for Percentage */}
                                       <div className="relative">
                                           <input 
                                                type="number" 
                                                min="0" max="100"
                                                className="w-16 text-center font-bold text-blue-700 bg-blue-50 rounded py-1 border border-blue-100 outline-none focus:ring-2 focus:ring-blue-500"
                                                value={period.percentage}
                                                onChange={(e) => updatePercentage(code, period.startDate, e.target.value)}
                                           />
                                           <span className="absolute left-1 top-1.5 text-xs text-blue-300 pointer-events-none">%</span>
                                       </div>
                                   </div>

                                   {period.startDate !== START_DATE && (
                                       <button 
                                          onClick={() => removePeriod(code, period.startDate)}
                                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
                                          title="حذف بازه"
                                       >
                                           <Trash2 size={16} />
                                       </button>
                                   )}
                               </div>
                           ))}
                       </div>

                       {/* Add New Period */}
                       <div className="flex flex-col md:flex-row gap-3 items-end md:items-center bg-white p-4 rounded-xl border border-dashed border-slate-300">
                           <div className="flex-1 w-full md:w-auto">
                               <label className="text-xs font-bold text-slate-500 mb-1 block">تاریخ تغییر محدودیت جدید</label>
                               <Input 
                                  placeholder="مثال: 1404/10/15" 
                                  className="text-center font-mono"
                                  value={newPeriodDate}
                                  onChange={e => setNewPeriodDate(e.target.value)}
                               />
                           </div>
                           <div className="flex-1 w-full md:w-auto">
                               <label className="text-xs font-bold text-slate-500 mb-1 block">درصد جدید</label>
                               <Input 
                                  type="number" min="0" max="100" 
                                  className="text-center font-bold"
                                  value={newPeriodPct}
                                  onChange={e => setNewPeriodPct(e.target.value === '' ? '' : Number(e.target.value))}
                                  placeholder="0"
                               />
                           </div>
                           <Button onClick={() => addPeriod(code)} className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 gap-2">
                               <Plus size={16} /> افزودن بازه
                           </Button>
                       </div>
                   </div>
               )}
            </Card>
          );
        })}
      </div>

      <div className="border-t pt-8 mt-12">
           <Card className="border-red-200 bg-red-50">
               <CardHeader className="pb-2">
                   <CardTitle className="text-red-800 flex items-center gap-2 text-lg">
                       <Database size={20} /> منطقه خطر (مدیریت داده‌ها)
                   </CardTitle>
               </CardHeader>
               <CardContent>
                   <p className="text-sm text-red-600 mb-4">
                       در صورتی که برنامه دچار مشکل شده یا می‌خواهید تمام اطلاعات را پاک کرده و از نو شروع کنید، از دکمه زیر استفاده کنید.
                       این عمل تمام داده‌های ذخیره شده در مرورگر را حذف می‌کند.
                   </p>
                   <Button 
                        variant="destructive" 
                        onClick={handleResetData}
                        className="gap-2"
                   >
                       <RefreshCw size={16} />
                       بازنشانی کامل سیستم (Factory Reset)
                   </Button>
               </CardContent>
           </Card>
      </div>
    </div>
  );
};

export default Settings;
