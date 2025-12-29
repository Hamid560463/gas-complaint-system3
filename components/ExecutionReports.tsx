
import React, { useState, useMemo } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { AlertTriangle, Gavel, Filter, Download, AlertOctagon, Ban, Settings2, ChevronLeft, ChevronRight, History, Calculator, CalendarClock, Search, Phone } from 'lucide-react';
import { Button, Input, SelectWrapper } from './ui/Base';
import * as XLSX from 'xlsx';
import { getIndexFromDate } from '../services/dateUtils';

interface ExecutionReportsProps {
  industries: Industry[];
  consumption: ConsumptionRecord[];
  restrictions: Restriction[];
}

type AssessmentMethod = 'LAST' | 'SCORING';

const ExecutionReports: React.FC<ExecutionReportsProps> = ({ industries, consumption, restrictions }) => {
  // Assessment Method State
  const [assessmentMethod, setAssessmentMethod] = useState<AssessmentMethod>('LAST');
  const [scoringDays, setScoringDays] = useState<number>(3); // Default 3 consecutive days

  // Filters
  const [minViolationPct, setMinViolationPct] = useState<number>(0);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  
  // New Filters
  const [searchText, setSearchText] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('ALL');
  const [filterUsage, setFilterUsage] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Threshold Configuration
  const [warningLimit, setWarningLimit] = useState<number>(20); 
  const [pressureLimit, setPressureLimit] = useState<number>(50); 

  // Unique values for dropdowns (Trimmed)
  const uniqueCities = useMemo(() => Array.from(new Set(industries.map(i => i.city ? i.city.trim() : ''))).filter(Boolean).sort(), [industries]);
  const uniqueUsages = useMemo(() => Array.from(new Set(industries.map(i => i.usageCode))).filter(Boolean).sort(), [industries]);

  // Helper to find percentage for a specific day index
  const getRestrictionPct = (usageCode: string, dateIndex: number) => {
     const r = restrictions.find(x => x.usageCode === usageCode);
     if (!r || !r.periods) return 0;
     
     // Find relevant period
     // Sort ascending
     const sorted = [...r.periods].sort((a,b) => a.startDate.localeCompare(b.startDate));
     let pct = 0;
     for(const p of sorted) {
         if(getIndexFromDate(p.startDate) <= dateIndex) {
             pct = p.percentage;
         } else {
             break;
         }
     }
     return pct;
  };

  const reportData = useMemo(() => {
    return consumption.map(rec => {
      const industry = industries.find(i => i.subscriptionId === rec.subscriptionId);
      if (!industry || !industry.baseMonthAvg) return null;

      // Filter valid days (val >= 0 means data exists) with their index
      const validHistory = rec.dailyConsumptions
          .map((val, idx) => ({ val, index: idx }))
          .filter(item => item.val >= 0)
          .reverse(); // Newest first

      let calculatedValue = 0;
      let violationAmount = 0;
      let violationPct = 0;
      let isViolating = false;
      let violationDetails = '';
      let effectiveLimit = 0;

      if (assessmentMethod === 'LAST') {
          // --- Method 1: Last Recorded Consumption ---
          if (validHistory.length > 0) {
              const lastEntry = validHistory[0];
              calculatedValue = lastEntry.val;
              
              // Calculate limit based on the date of this specific record
              const pct = getRestrictionPct(industry.usageCode, lastEntry.index);
              effectiveLimit = industry.baseMonthAvg * (1 - pct / 100);

              if (calculatedValue > effectiveLimit) {
                  isViolating = true;
                  violationAmount = calculatedValue - effectiveLimit;
                  violationPct = effectiveLimit > 0 ? (violationAmount / effectiveLimit) * 100 : 0;
              }
          }
      } else {
          // --- Method 2: Scoring (Consecutive Days) ---
          if (validHistory.length >= scoringDays) {
              // Check the last N days
              const checkWindow = validHistory.slice(0, scoringDays);
              
              // Condition: ALL days in the window must be violations compared to THEIR OWN daily limit
              const allOverLimit = checkWindow.every(item => {
                  const dayPct = getRestrictionPct(industry.usageCode, item.index);
                  const dayLimit = industry.baseMonthAvg * (1 - dayPct / 100);
                  return item.val > dayLimit;
              });

              if (allOverLimit) {
                  isViolating = true;
                  
                  // Calculate Average usage
                  const sumUsage = checkWindow.reduce((acc, curr) => acc + curr.val, 0);
                  calculatedValue = sumUsage / scoringDays;
                  
                  // Calculate Average Limit over these days for the final % metric
                  const sumLimit = checkWindow.reduce((acc, curr) => {
                       const dayPct = getRestrictionPct(industry.usageCode, curr.index);
                       return acc + (industry.baseMonthAvg * (1 - dayPct / 100));
                  }, 0);
                  effectiveLimit = sumLimit / scoringDays;

                  violationAmount = calculatedValue - effectiveLimit;
                  violationPct = effectiveLimit > 0 ? (violationAmount / effectiveLimit) * 100 : 0;
                  violationDetails = `میانگین ${scoringDays} روز متوالی`;
              }
          }
      }

      if (!isViolating) return null;

      // Determine Action
      let action = 'نرمال';
      let actionColor = 'text-green-600 bg-green-50';
      
      if (violationPct <= warningLimit) {
          action = 'اخطار کتبی';
          actionColor = 'text-yellow-700 bg-yellow-50';
        } else if (violationPct <= pressureLimit) {
          action = 'اعمال افت فشار';
          actionColor = 'text-orange-700 bg-orange-50';
        } else {
          action = 'قطع گاز';
          actionColor = 'text-red-700 bg-red-50';
      }

      return {
        subscriptionId: industry.subscriptionId,
        name: industry.name,
        city: industry.city,
        usageCode: industry.usageCode,
        phone: industry.phone,
        allowed: effectiveLimit,
        calculatedValue,
        violationAmount,
        violationPct,
        action,
        actionColor,
        violationDetails
      };
    })
    .filter(item => item !== null)
    // Apply Filters
    .filter(item => {
        const matchesSearch = (item!.name || '').includes(searchText) || (item!.subscriptionId || '').includes(searchText);
        const matchesCity = filterCity === 'ALL' || (item!.city && item!.city.trim() === filterCity);
        const matchesUsage = filterUsage === 'ALL' || item!.usageCode === filterUsage;
        const matchesAction = actionFilter === 'ALL' || item!.action === actionFilter;
        const matchesMinPct = item!.violationPct >= minViolationPct;

        return matchesSearch && matchesCity && matchesUsage && matchesAction && matchesMinPct;
    })
    .sort((a, b) => b!.violationPct - a!.violationPct);
  }, [consumption, industries, restrictions, minViolationPct, actionFilter, warningLimit, pressureLimit, assessmentMethod, scoringDays, searchText, filterCity, filterUsage]);

  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return reportData.slice(start, start + itemsPerPage);
  }, [reportData, currentPage, itemsPerPage]);

  const exportToExcel = () => {
    if (!reportData) return;
    const dataToExport = reportData.map(r => ({
      'نام واحد': r!.name,
      'شماره اشتراک': r!.subscriptionId,
      'شهر': r!.city,
      'کد تعرفه': r!.usageCode,
      'شماره تماس': r!.phone,
      'سقف مجاز (موثر)': Math.floor(r!.allowed),
      [assessmentMethod === 'LAST' ? 'آخرین مصرف' : `میانگین مصرف (${scoringDays} روز)`]: Math.floor(r!.calculatedValue),
      'میزان تخطی': Math.floor(r!.violationAmount),
      'درصد تخطی': r!.violationPct.toFixed(1) + '%',
      'روش پایش': assessmentMethod === 'LAST' ? 'آخرین مصرف' : `توالی ${scoringDays} روز`,
      'اقدام اجرایی': r!.action
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "لیست اجرای پایش");
    XLSX.writeFile(workbook, `لیست_اجرای_پایش_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Assessment Method Selector */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg no-print">
         <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-blue-200">
                   <Calculator size={24}/>
                   انتخاب روش پایش و محاسبه تخلفات
                </h3>
                <p className="text-slate-400 text-sm mt-2 max-w-xl">
                   نحوه شناسایی صنایع متخلف را مشخص کنید. می‌توانید بر اساس آخرین داده دریافتی تصمیم بگیرید یا سوابق چند روز اخیر را ملاک قرار دهید.
                </p>
            </div>
            
            <div className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700">
               <button
                  onClick={() => setAssessmentMethod('LAST')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                     assessmentMethod === 'LAST' 
                     ? 'bg-blue-600 text-white shadow-lg' 
                     : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
               >
                  <History size={18} />
                  پایش لحظه‌ای (آخرین مصرف)
               </button>
               <button
                  onClick={() => setAssessmentMethod('SCORING')}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all ${
                     assessmentMethod === 'SCORING' 
                     ? 'bg-amber-600 text-white shadow-lg' 
                     : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
               >
                  <CalendarClock size={18} />
                  پایش هوشمند (امتیاز توالی)
               </button>
            </div>
         </div>
         
         {/* Extended Config for Scoring Method */}
         {assessmentMethod === 'SCORING' && (
            <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-col md:flex-row items-center gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    در این روش، صنعت تنها در صورتی متخلف شناخته می‌شود که:
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm">به مدت</span>
                    <div className="relative">
                        <input 
                            type="number" 
                            min="2" max="10" 
                            value={scoringDays}
                            onChange={(e) => setScoringDays(Math.max(2, Number(e.target.value)))}
                            className="w-20 h-12 bg-white border-2 border-slate-200 rounded-xl text-center font-black text-2xl text-slate-900 focus:ring-4 focus:ring-amber-500/50 outline-none shadow-lg"
                        />
                    </div>
                    <span className="text-sm font-bold text-white">روز متوالی</span>
                    <span className="text-sm">بیش از سقف مجاز مصرف کرده باشد.</span>
                </div>
            </div>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 no-print space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative col-span-1 md:col-span-3">
                    <Input 
                        placeholder="جستجو نام واحد یا شماره اشتراک..." 
                        value={searchText}
                        onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                        className="pl-9 h-11"
                    />
                    <Search className="absolute left-3 top-3.5 text-slate-400" size={16}/>
              </div>

              {/* Min Violation */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">حداقل درصد تخطی</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full h-10 border rounded-lg px-3 bg-slate-50 focus:ring-2 focus:ring-red-500 outline-none font-bold text-base ltr text-center"
                      value={minViolationPct}
                      onChange={e => { setMinViolationPct(Number(e.target.value)); setCurrentPage(1); }}
                      placeholder="0"
                    />
                    <span className="absolute left-3 top-2 text-slate-400 font-bold">%</span>
                  </div>
              </div>
            
              {/* Action Filter */}
              <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">فیلتر نوع اقدام</label>
                  <SelectWrapper 
                      value={actionFilter}
                      onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
                  >
                      <option value="ALL">همه موارد</option>
                      <option value="اخطار کتبی">اخطار کتبی</option>
                      <option value="اعمال افت فشار">اعمال افت فشار</option>
                      <option value="قطع گاز">قطع گاز</option>
                  </SelectWrapper>
              </div>

               {/* City Filter */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">فیلتر شهر</label>
                  <SelectWrapper 
                      value={filterCity}
                      onChange={e => { setFilterCity(e.target.value); setCurrentPage(1); }}
                  >
                      <option value="ALL">همه شهرها</option>
                      {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </SelectWrapper>
              </div>
              
              {/* Usage Filter */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">فیلتر کد مصرف</label>
                  <SelectWrapper 
                      value={filterUsage}
                      onChange={e => { setFilterUsage(e.target.value); setCurrentPage(1); }}
                  >
                      <option value="ALL">همه تعرفه‌ها</option>
                      {uniqueUsages.map(u => <option key={u} value={u}>{u}</option>)}
                  </SelectWrapper>
              </div>

               {/* Export Button */}
              <div className="md:col-span-1 flex items-end">
                <button 
                  onClick={exportToExcel}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white h-10 rounded-lg hover:bg-green-700 transition-all shadow-sm active:scale-95 font-bold whitespace-nowrap"
                >
                  <Download size={18} />
                  <span>دانلود اکسل</span>
                </button>
              </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 no-print">
            <h4 className="font-bold flex items-center gap-2 text-slate-800 mb-4 pb-2 border-b">
               <Settings2 size={18} /> پیکربندی حدود اقدام
            </h4>
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-xs font-bold mb-1 text-yellow-700">
                     <span>اخطار کتبی</span>
                     <span>تا {warningLimit}%</span>
                  </div>
                  <input 
                    type="range" min="1" max="100" 
                    value={warningLimit} 
                    onChange={e => {
                        const val = Number(e.target.value);
                        setWarningLimit(val);
                        if(val >= pressureLimit) setPressureLimit(val + 5);
                    }}
                    className="w-full h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                  />
               </div>
               <div>
                  <div className="flex justify-between text-xs font-bold mb-1 text-orange-700">
                     <span>اعمال افت فشار</span>
                     <span>تا {pressureLimit}%</span>
                  </div>
                  <input 
                    type="range" min="1" max="100" 
                    value={pressureLimit} 
                    onChange={e => {
                         const val = Number(e.target.value);
                         setPressureLimit(val);
                         if(val <= warningLimit) setWarningLimit(val - 5);
                    }}
                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
               </div>
               <div className="text-xs bg-white p-3 rounded border text-slate-500 leading-6 shadow-sm">
                  <strong>قانون فعلی:</strong><br/>
                  • ۰ تا {warningLimit}٪ : اخطار کتبی<br/>
                  • {warningLimit}٪ تا {pressureLimit}٪ : افت فشار<br/>
                  • بالای {pressureLimit}٪ : قطع گاز
               </div>
            </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
           <div className="flex items-center gap-4">
              <h3 className="font-black text-slate-800 flex items-center gap-2 text-xl">
                <Gavel size={24} className="text-slate-900" />
                لیست مشمولین اعمال محدودیت
              </h3>
              <span className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${assessmentMethod === 'LAST' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                {assessmentMethod === 'LAST' ? <History size={14}/> : <CalendarClock size={14}/>}
                روش: {assessmentMethod === 'LAST' ? 'آخرین مصرف' : `میانگین ${scoringDays} روز توالی`}
              </span>
              <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-bold">
                {reportData.length} واحد
              </span>
           </div>
           
           <div className="flex items-center gap-2 no-print">
               <span className="text-xs font-bold text-slate-500">تعداد در صفحه:</span>
               <select 
                  className="h-9 border rounded-lg px-2 bg-white outline-none focus:ring-2 focus:ring-slate-900 text-sm"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
               >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
               </select>
            </div>
        </div>
        
        {paginatedData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-base text-right">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-5 font-bold">نام واحد صنعتی</th>
                  <th className="p-5 font-bold">شماره اشتراک</th>
                  <th className="p-5 font-bold">شهر</th>
                  <th className="p-5 font-bold">تعرفه</th>
                  <th className="p-5 font-bold">شماره تماس</th>
                  <th className="p-5 font-bold">سقف مجاز (موثر)</th>
                  <th className="p-5 font-bold">
                      {assessmentMethod === 'LAST' ? 'آخرین مصرف' : <span className="text-amber-300">میانگین دوره</span>}
                  </th>
                  <th className="p-5 font-bold text-red-300">میزان تخطی</th>
                  <th className="p-5 font-bold text-center">اقدام پیشنهادی</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="p-5 font-bold text-slate-800">{row!.name}</td>
                    <td className="p-5 font-mono text-slate-500">{row!.subscriptionId}</td>
                    <td className="p-5 text-slate-600">{row!.city}</td>
                    <td className="p-5 text-slate-600 text-sm">{row!.usageCode}</td>
                    <td className="p-5 font-mono text-slate-600 flex items-center gap-1">
                        {row!.phone && <Phone size={12} className="opacity-50"/>}
                        {row!.phone || '-'}
                    </td>
                    <td className="p-5 font-mono text-slate-600">{Math.floor(row!.allowed).toLocaleString()}</td>
                    <td className="p-5 font-mono text-blue-700 font-bold">
                        {Math.floor(row!.calculatedValue).toLocaleString()}
                        {assessmentMethod === 'SCORING' && (
                            <span className="block text-[10px] text-amber-600 font-normal mt-1 opacity-80">میانگین {scoringDays} روز</span>
                        )}
                    </td>
                    <td className="p-5 font-mono text-red-600 font-black text-xl">
                      {row!.violationPct.toFixed(1)}%
                      <span className="text-xs text-red-400 mr-1 block font-normal">({Math.floor(row!.violationAmount).toLocaleString()})</span>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black border ${row!.actionColor.replace('text-', 'border-').replace('bg-', 'border-opacity-20 ')} ${row!.actionColor}`}>
                        {row!.action === 'قطع گاز' && <Ban size={16} />}
                        {row!.action === 'اعمال افت فشار' && <AlertTriangle size={16} />}
                        {row!.action === 'اخطار کتبی' && <AlertOctagon size={16} />}
                        {row!.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between bg-slate-50 no-print">
                    <div className="text-sm text-slate-500">
                        نمایش {((currentPage - 1) * itemsPerPage) + 1} تا {Math.min(currentPage * itemsPerPage, reportData.length)} از {reportData.length} مورد
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="w-9 h-9 p-0"
                        >
                            <ChevronRight size={16} />
                        </Button>
                        <div className="flex items-center justify-center font-bold text-sm min-w-[30px]">
                            {currentPage} / {totalPages}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="w-9 h-9 p-0"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                    </div>
                </div>
            )}
          </div>
        ) : (
          <div className="p-16 text-center flex flex-col items-center text-slate-400">
            <AlertTriangle size={64} className="mb-4 opacity-20" />
            <p className="font-bold text-xl">با فیلترهای اعمال شده، هیچ واحدی یافت نشد.</p>
            {assessmentMethod === 'SCORING' && (
                <p className="text-amber-600 mt-2 bg-amber-50 px-3 py-1 rounded text-sm border border-amber-100">
                    نکته: در روش پایش هوشمند، صنعت باید حداقل {scoringDays} روز متوالی تخلف داشته باشد تا در لیست ظاهر شود.
                </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionReports;
