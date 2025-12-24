
import React, { useMemo, useState } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ReferenceLine 
} from 'recharts';
import { Users, Gauge, Calendar, AlertTriangle, CheckCircle2, BarChart3, Search, Filter, X, Zap, Droplets, Flame } from 'lucide-react';

interface DashboardProps {
  industries: Industry[];
  consumption: ConsumptionRecord[];
  restrictions: Restriction[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ industries, consumption, restrictions, selectedIds, onSelectIds }) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterUsage, setFilterUsage] = useState('ALL');

  // Derived Filters
  const uniqueCities = useMemo(() => Array.from(new Set(industries.map(i => i.city))).filter(Boolean).sort(), [industries]);
  const uniqueUsages = useMemo(() => Array.from(new Set(industries.map(i => i.usageCode))).filter(Boolean).sort(), [industries]);

  const filteredIndustries = useMemo(() => {
    return industries.filter(ind => {
      const matchSearch = ind.name.includes(searchTerm) || ind.subscriptionId.includes(searchTerm);
      const matchCity = filterCity === 'ALL' || ind.city === filterCity;
      const matchUsage = filterUsage === 'ALL' || ind.usageCode === filterUsage;
      return matchSearch && matchCity && matchUsage;
    });
  }, [industries, searchTerm, filterCity, filterUsage]);

  // Bulk Actions
  const handleSelectAll = () => {
    const newSelected = new Set(selectedIds);
    filteredIndustries.forEach(i => newSelected.add(i.subscriptionId));
    onSelectIds(Array.from(newSelected));
  };

  const handleDeselectAll = () => {
    const toRemove = new Set(filteredIndustries.map(i => i.subscriptionId));
    onSelectIds(selectedIds.filter(id => !toRemove.has(id)));
  };

  // Calculate dynamic date range based on available data
  const lastDayWithData = useMemo(() => {
    let max = 0;
    consumption.forEach(c => {
      c.dailyConsumptions.forEach((val, idx) => {
        if (val > 0) max = Math.max(max, idx + 1);
      });
    });
    // Default to 1 if no data is present
    return max > 0 ? max : 1; 
  }, [consumption]);

  // Constants for Data
  const startDay = 1;
  const endDay = lastDayWithData;

  const getLimit = (subscriptionId: string) => {
    const industry = industries.find(i => i.subscriptionId === subscriptionId);
    if (!industry || !industry.baseMonthAvg) return 0;
    
    const rest = restrictions.find(r => r.usageCode === industry.usageCode);
    const pct = rest ? rest.percentage : 0;
    return industry.baseMonthAvg * (1 - pct / 100);
  };

  // --- Aggregate Data Calculation (For Top Cards) ---
  const usageAggregates = useMemo(() => {
    return uniqueUsages.map(code => {
      const groupIndustries = industries.filter(i => i.usageCode === code);
      let totalBase = 0;
      let totalLast = 0;
      let compliantCount = 0;
      
      groupIndustries.forEach(ind => {
        totalBase += ind.baseMonthAvg || 0;
        
        // Find consumption
        const rec = consumption.find(c => c.subscriptionId === ind.subscriptionId);
        if (rec) {
          // Determine Last Usage
          let lastVal = 0;
          if (rec.lastRecordDate) {
             const parts = rec.lastRecordDate.split('/');
             const day = parseInt(parts[parts.length - 1], 10);
             if (!isNaN(day) && day >= 1 && day <= 31) {
                lastVal = rec.dailyConsumptions[day - 1];
             }
          } else {
             // Fallback
             let maxDay = 0;
             rec.dailyConsumptions.forEach((val, idx) => { if (val > 0) maxDay = idx + 1; });
             if (maxDay > 0) lastVal = rec.dailyConsumptions[maxDay - 1];
          }
          
          totalLast += lastVal;

          // Check Compliance
          const rest = restrictions.find(r => r.usageCode === code);
          const limit = (ind.baseMonthAvg || 0) * (1 - (rest?.percentage || 0) / 100);
          
          if (lastVal <= limit) compliantCount++;
        } else {
           // If no record, assume compliant (or handle as distinct state)
           compliantCount++;
        }
      });

      const totalCount = groupIndustries.length;
      const compliancePct = totalCount > 0 ? (compliantCount / totalCount) * 100 : 0;

      return {
        code,
        count: totalCount,
        totalBase,
        totalLast,
        compliancePct
      };
    });
  }, [industries, consumption, restrictions, uniqueUsages]);


  // --- Selected Data Calculation ---
  const selectedData = useMemo(() => {
    return selectedIds.map(id => {
      const industry = industries.find(i => i.subscriptionId === id);
      const record = consumption.find(c => c.subscriptionId === id);
      if (!industry || !record) return null;
      
      const limit = getLimit(id);
      
      // Detailed Metrics Calculation
      let compliantDaysCount = 0;
      let violationDaysCount = 0;
      let totalCompliantVol = 0;
      let totalViolationExcessVol = 0;

      const daily = record.dailyConsumptions.slice(startDay - 1, endDay).map((val, idx) => {
        const isViolation = val > limit;
        if (val > 0) { // Only count days with data
             if (isViolation) {
                 violationDaysCount++;
                 totalViolationExcessVol += (val - limit);
             } else {
                 compliantDaysCount++;
                 totalCompliantVol += val;
             }
        }

        return {
          day: startDay + idx,
          usage: val,
          limit: limit,
          isViolation: isViolation
        };
      });
      
      let lastUsage = 0;
      let lastDateLabel = '';

      if (record.lastRecordDate) {
         // Determine day index from the date string
         const parts = record.lastRecordDate.split('/');
         const day = parseInt(parts[parts.length - 1], 10);
         if (!isNaN(day) && day >= 1 && day <= 31) {
            lastUsage = record.dailyConsumptions[day - 1];
         }
         lastDateLabel = record.lastRecordDate;
      } else {
         lastUsage = daily.length > 0 ? daily[daily.length - 1].usage : 0;
         lastDateLabel = `1404/09/${endDay.toLocaleString('fa-IR')}`;
      }
      
      return {
        ...industry,
        baseAvg: industry.baseMonthAvg,
        limit,
        lastUsage,
        lastDateLabel,
        daily,
        isViolator: lastUsage > limit,
        metrics: {
            compliantDays: compliantDaysCount,
            violationDays: violationDaysCount,
            totalCompliantVol,
            totalViolationExcessVol
        }
      };
    }).filter((d): d is NonNullable<typeof d> => d !== null);
  }, [selectedIds, industries, consumption, restrictions, startDay, endDay]);

  // View Helpers
  const hasData = selectedData.length > 0;
  const isMulti = selectedData.length > 1;
  const single = selectedData.length === 1 ? selectedData[0] : null;

  const comparisonData = selectedData.map(d => ({
    name: d.name,
    مصرف: d.lastUsage,
    سقف: Math.floor(d.limit)
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Aggregate Cards (General View by Usage Code) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 no-print">
        {usageAggregates.map(agg => (
            <div key={agg.code} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <Flame size={20} className="text-slate-600" />
                    </div>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                        کد تعرفه {agg.code}
                    </span>
                </div>
                
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">تعداد صنایع:</span>
                        <span className="font-bold text-slate-800">{agg.count} واحد</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">درصد رعایت کل:</span>
                        <span className={`font-bold ${agg.compliancePct >= 80 ? 'text-green-600' : agg.compliancePct >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                            {agg.compliancePct.toFixed(1)}%
                        </span>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                             <span className="text-slate-400">مجموع مصرف پایه:</span>
                             <span className="font-mono font-bold text-slate-600">{agg.totalBase.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                             <span className="text-slate-400">مجموع آخرین مصرف:</span>
                             <span className="font-mono font-bold text-blue-600">{agg.totalLast.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* Advanced Unit Selector */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 no-print space-y-5">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
             <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
               <Filter size={20} />
             </div>
             <div>
               <h3 className="font-black text-slate-800 text-lg">انتخاب واحدها</h3>
               <p className="text-xs text-slate-500 mt-1">از فیلترهای زیر برای یافتن صنایع استفاده کنید</p>
             </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
             {/* Search */}
             <div className="relative flex-grow xl:flex-grow-0">
                <input 
                  type="text" 
                  placeholder="جستجو نام یا اشتراک..." 
                  className="w-full xl:w-56 pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
             </div>

             {/* Filters */}
             <select 
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:border-blue-500 cursor-pointer"
                value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
             >
               <option value="ALL">همه شهرها</option>
               {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
             </select>

             <select 
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 outline-none focus:border-blue-500 cursor-pointer"
                value={filterUsage}
                onChange={e => setFilterUsage(e.target.value)}
             >
               <option value="ALL">همه تعرفه‌ها</option>
               {uniqueUsages.map(c => <option key={c} value={c}>تعرفه {c}</option>)}
             </select>

             {/* Actions */}
             <div className="flex gap-2 mr-auto xl:mr-0">
               <button 
                  onClick={handleSelectAll} 
                  className="px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                >
                  انتخاب همه ({filteredIndustries.length})
               </button>
               {selectedIds.length > 0 && (
                 <button 
                    onClick={() => onSelectIds([])} 
                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1"
                  >
                    <X size={14} /> پاکسازی
                 </button>
               )}
             </div>
          </div>
        </div>

        {/* Chips Area */}
        <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
           {filteredIndustries.length === 0 ? (
             <div className="w-full py-8 text-center text-slate-400 flex flex-col items-center">
               <Search size={32} className="mb-2 opacity-50" />
               <span>هیچ واحدی با این مشخصات یافت نشد</span>
             </div>
           ) : (
             filteredIndustries.map(ind => {
               const isSelected = selectedIds.includes(ind.subscriptionId);
               return (
                 <button
                   key={ind.subscriptionId}
                   onClick={() => {
                     if (isSelected) {
                       onSelectIds(selectedIds.filter(id => id !== ind.subscriptionId));
                     } else {
                       onSelectIds([...selectedIds, ind.subscriptionId]);
                     }
                   }}
                   className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border select-none ${
                     isSelected
                     ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105'
                     : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm'
                   }`}
                 >
                   {ind.name}
                 </button>
               );
             })
           )}
        </div>
        
        {/* Footer info */}
        <div className="flex justify-between items-center text-[11px] text-slate-400 px-1 pt-2 border-t border-slate-100">
           <span>{selectedIds.length} واحد انتخاب شده</span>
           <span>نمایش {filteredIndustries.length} از {industries.length} کل واحدها</span>
        </div>
      </div>

      {!hasData ? (
        <div className="h-96 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Users size={64} className="text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold text-lg">
             {selectedIds.length > 0 
              ? 'اطلاعات مصرف برای واحدهای انتخاب شده یافت نشد' 
              : 'لطفاً جهت مشاهده تحلیل، حداقل یک واحد را از لیست بالا انتخاب کنید'}
          </p>
          {selectedIds.length > 0 && (
             <span className="text-xs text-red-400 mt-2">نکته: از بارگذاری فایل اکسل مصرف در بخش مدیریت داده‌ها اطمینان حاصل کنید</span>
          )}
        </div>
      ) : isMulti ? (
        /* Multi Comparison View */
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="font-bold mb-6 flex items-center gap-2 text-slate-800">
                <BarChart3 className="text-blue-600" /> مقایسه مصرف لحظه‌ای واحدها
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{fontSize: 11}} />
                    <Tooltip 
                      formatter={(v) => v.toLocaleString()}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                    <Bar name="سقف مجاز" dataKey="سقف" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar name="مصرف فعلی" dataKey="مصرف" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.مصرف > entry.سقف ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-900/20 flex flex-col">
              <h3 className="font-bold border-b border-slate-700 pb-4 mb-4 flex justify-between items-center">
                <span>خلاصه وضعیت</span>
                <span className="bg-slate-800 text-xs px-2 py-1 rounded text-slate-300">{selectedData.length} واحد</span>
              </h3>
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                {selectedData.map(d => (
                  <div key={d.subscriptionId} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-slate-200">{d.name}</span>
                       <span className="text-[10px] text-slate-500 mt-1">{d.subscriptionId}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${d.isViolator ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                      {d.isViolator ? 'تخطی' : 'نرمال'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-700">
                <div className="grid grid-cols-2 gap-4 text-center">
                   <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                      <div className="text-2xl font-black text-red-500">{selectedData.filter(d => d.isViolator).length}</div>
                      <div className="text-[10px] text-red-300 mt-1">تعداد متخطی</div>
                   </div>
                   <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                      <div className="text-2xl font-black text-green-500">{selectedData.filter(d => !d.isViolator).length}</div>
                      <div className="text-[10px] text-green-300 mt-1">تعداد نرمال</div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Single View - KPI & Chart */
        <div className="space-y-6 animate-in slide-in-from-left duration-500">
          
          {/* Top Row Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-r-4 border-r-indigo-500">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Gauge size={18} className="text-indigo-500" /> <span className="text-xs font-bold uppercase">میانگین مبنا</span>
              </div>
              <div className="text-2xl font-black text-slate-800">{single!.baseAvg.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-2 font-medium bg-slate-50 inline-block px-2 py-1 rounded">بر اساس مصرف ماه آبان</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-r-4 border-r-orange-500">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <AlertTriangle size={18} className="text-orange-500" /> <span className="text-xs font-bold uppercase">سقف مجاز</span>
              </div>
              <div className="text-2xl font-black text-orange-600">{Math.floor(single!.limit).toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-2 font-medium bg-slate-50 inline-block px-2 py-1 rounded">با اعمال محدودیت تعرفه</div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-r-4 border-r-blue-500">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Calendar size={18} className="text-blue-500" /> <span className="text-xs font-bold uppercase">آخرین مصرف</span>
              </div>
              <div className="text-2xl font-black text-blue-700">{single!.lastUsage.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-2 font-medium bg-slate-50 inline-block px-2 py-1 rounded">
                ثبت شده در {single!.lastDateLabel}
              </div>
            </div>
            <div className={`p-6 rounded-2xl border shadow-sm border-r-4 ${single!.isViolator ? 'bg-red-50 border-red-100 border-r-red-500' : 'bg-green-50 border-green-100 border-r-green-500'}`}>
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <CheckCircle2 size={18} className={single!.isViolator ? 'text-red-500' : 'text-green-500'} /> 
                <span className="text-xs font-bold uppercase">وضعیت نهایی</span>
              </div>
              <div className={`text-xl font-black ${single!.isViolator ? 'text-red-700' : 'text-green-700'}`}>
                {single!.isViolator ? 'دارای تخطی' : 'رعایت سقف'}
              </div>
              <div className="text-[10px] mt-2 opacity-70">وضعیت لحظه‌ای پایش</div>
            </div>
          </div>

          {/* Detailed Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                 <div className="text-xs font-bold text-slate-400 mb-1">روزهای رعایت</div>
                 <div className="text-2xl font-black text-green-600">{single!.metrics.compliantDays}</div>
                 <div className="text-[10px] text-slate-400 mt-1">روز</div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                 <div className="text-xs font-bold text-slate-400 mb-1">روزهای تخطی</div>
                 <div className="text-2xl font-black text-red-600">{single!.metrics.violationDays}</div>
                 <div className="text-[10px] text-slate-400 mt-1">روز</div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                 <div className="text-xs font-bold text-slate-400 mb-1">مجموع رعایت مصرف</div>
                 <div className="text-lg font-black text-green-700">{single!.metrics.totalCompliantVol.toLocaleString()}</div>
                 <div className="text-[10px] text-slate-400 mt-1">متر مکعب (مصرف مجاز)</div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center bg-red-50/50">
                 <div className="text-xs font-bold text-slate-400 mb-1">مجموع مصرف تخطی</div>
                 <div className="text-lg font-black text-red-700">{single!.metrics.totalViolationExcessVol.toLocaleString()}</div>
                 <div className="text-[10px] text-slate-400 mt-1">متر مکعب (حجم مازاد)</div>
             </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-lg mb-8 text-center text-slate-800 flex items-center justify-center gap-2">
              <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
              تحلیل روند مصرف روزانه {single!.name}
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={single!.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" label={{ value: 'روزهای ماه', position: 'insideBottom', offset: -10, fontSize: 12 }} tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(v) => v.toLocaleString()}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <ReferenceLine y={single!.limit} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'top', value: 'سقف مجاز', fill: '#ef4444', fontSize: 12, fontWeight: 'bold' }} />
                  <Bar dataKey="usage" radius={[8, 8, 0, 0]}>
                    {single!.daily.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.usage > single!.limit ? '#ef4444' : '#6366f1'} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
