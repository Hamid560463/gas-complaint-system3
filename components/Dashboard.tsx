
import React, { useMemo, useState, useRef } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ReferenceLine, LineChart, Line, PieChart, Pie
} from 'recharts';
import { Users, Gauge, Calendar, AlertTriangle, CheckCircle2, BarChart3, Search, Filter, X, Flame, Download, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, SelectWrapper } from './ui/Base';
import html2canvas from 'html2canvas';

interface DashboardProps {
  industries: Industry[];
  consumption: ConsumptionRecord[];
  restrictions: Restriction[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ industries, consumption, restrictions, selectedIds, onSelectIds }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterUsage, setFilterUsage] = useState('ALL');
  const chartsRef = useRef<HTMLDivElement>(null);

  const uniqueCities = useMemo(() => Array.from(new Set(industries.map(i => i.city))).filter(Boolean).sort(), [industries]);
  const uniqueUsages = useMemo(() => Array.from(new Set(industries.map(i => i.usageCode))).filter(Boolean).sort(), [industries]);

  const filteredIndustries = useMemo(() => {
    return industries.filter(ind => {
      const matchSearch = (ind.name || '').includes(searchTerm) || (ind.subscriptionId || '').includes(searchTerm);
      const matchCity = filterCity === 'ALL' || ind.city === filterCity;
      const matchUsage = filterUsage === 'ALL' || ind.usageCode === filterUsage;
      return matchSearch && matchCity && matchUsage;
    });
  }, [industries, searchTerm, filterCity, filterUsage]);

  const handleSelectAll = () => {
    const newSelected = new Set(selectedIds);
    filteredIndustries.forEach(i => newSelected.add(i.subscriptionId));
    onSelectIds(Array.from(newSelected));
  };

  const lastDayWithData = useMemo(() => {
    let max = 0;
    consumption.forEach(c => {
      c.dailyConsumptions.forEach((val, idx) => {
        if (val > 0) max = Math.max(max, idx + 1);
      });
    });
    return max > 0 ? max : 1; 
  }, [consumption]);

  const startDay = 1;
  const endDay = lastDayWithData;

  const getLimit = (subscriptionId: string) => {
    const industry = industries.find(i => i.subscriptionId === subscriptionId);
    if (!industry || !industry.baseMonthAvg) return 0;
    const rest = restrictions.find(r => r.usageCode === industry.usageCode);
    const pct = rest ? rest.percentage : 0;
    return industry.baseMonthAvg * (1 - pct / 100);
  };

  const usageAggregates = useMemo(() => {
    return uniqueUsages.map(code => {
      const groupIndustries = industries.filter(i => i.usageCode === code);
      let totalBase = 0;
      let totalLast = 0;
      let compliantCount = 0;
      
      groupIndustries.forEach(ind => {
        totalBase += ind.baseMonthAvg || 0;
        const rec = consumption.find(c => c.subscriptionId === ind.subscriptionId);
        if (rec) {
          let lastVal = 0;
          if (rec.lastRecordDate) {
             const parts = rec.lastRecordDate.split('/');
             const day = parseInt(parts[parts.length - 1], 10);
             if (!isNaN(day) && day >= 1 && day <= 31) lastVal = rec.dailyConsumptions[day - 1];
          } else {
             let maxDay = 0;
             rec.dailyConsumptions.forEach((val, idx) => { if (val > 0) maxDay = idx + 1; });
             if (maxDay > 0) lastVal = rec.dailyConsumptions[maxDay - 1];
          }
          totalLast += lastVal;
          const rest = restrictions.find(r => r.usageCode === code);
          const limit = (ind.baseMonthAvg || 0) * (1 - (rest?.percentage || 0) / 100);
          if (lastVal <= limit) compliantCount++;
        } else {
           compliantCount++;
        }
      });

      const totalCount = groupIndustries.length;
      const compliancePct = totalCount > 0 ? (compliantCount / totalCount) * 100 : 0;

      return { code, count: totalCount, totalBase, totalLast, compliancePct };
    });
  }, [industries, consumption, restrictions, uniqueUsages]);

  // Pie Chart Data
  const pieData = useMemo(() => {
     const source = selectedIds.length > 0 ? industries.filter(i => selectedIds.includes(i.subscriptionId)) : filteredIndustries;
     const counts: Record<string, number> = {};
     source.forEach(i => {
         const key = i.usageCode.replace('تعرفه ', '');
         counts[key] = (counts[key] || 0) + 1;
     });
     return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredIndustries, selectedIds, industries]);

  const selectedData = useMemo(() => {
    return selectedIds.map(id => {
      const industry = industries.find(i => i.subscriptionId === id);
      const record = consumption.find(c => c.subscriptionId === id);
      if (!industry || !record) return null;
      
      const limit = getLimit(id);
      let compliantDaysCount = 0;
      let violationDaysCount = 0;
      let totalCompliantVol = 0;
      let totalViolationExcessVol = 0;

      const daily = record.dailyConsumptions.slice(startDay - 1, endDay).map((val, idx) => {
        const isViolation = val > limit;
        if (val > 0) {
             if (isViolation) { violationDaysCount++; totalViolationExcessVol += (val - limit); } 
             else { compliantDaysCount++; totalCompliantVol += val; }
        }
        return { day: startDay + idx, usage: val, limit: limit, isViolation: isViolation };
      });
      
      let lastUsage = 0;
      let lastDateLabel = '';
      if (record.lastRecordDate) {
         const parts = record.lastRecordDate.split('/');
         const day = parseInt(parts[parts.length - 1], 10);
         if (!isNaN(day) && day >= 1 && day <= 31) lastUsage = record.dailyConsumptions[day - 1];
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
        metrics: { compliantDays: compliantDaysCount, violationDays: violationDaysCount, totalCompliantVol, totalViolationExcessVol }
      };
    }).filter((d): d is NonNullable<typeof d> => d !== null);
  }, [selectedIds, industries, consumption, restrictions, startDay, endDay]);

  const hasData = selectedData.length > 0;
  const isMulti = selectedData.length > 1;
  const single = selectedData.length === 1 ? selectedData[0] : null;

  const comparisonData = selectedData.map(d => ({ name: d.name, مصرف: d.lastUsage, سقف: Math.floor(d.limit) }));

  const exportCharts = async () => {
    if (chartsRef.current) {
        const canvas = await html2canvas(chartsRef.current, { scale: 2 });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = "charts-export.png";
        link.click();
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-print">
        {usageAggregates.map(agg => (
            <Card key={agg.code} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                            <Flame size={24} />
                        </div>
                        <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded text-xs font-bold">
                            {agg.code.startsWith('تعرفه') ? agg.code : `کد تعرفه ${agg.code}`}
                        </span>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="text-3xl font-bold">{agg.compliancePct.toFixed(1)}%</div>
                        <p className="text-sm text-slate-500">رعایت سقف مصرف توسط صنایع</p>
                    </div>
                    
                    <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
                        <div>
                             <span className="text-slate-500 block mb-1">واحدها</span>
                             <span className="font-bold text-slate-800">{agg.count}</span>
                        </div>
                        <div className="text-left">
                             <span className="text-slate-500 block mb-1">مصرف کل</span>
                             <span className="font-bold text-blue-700">{agg.totalLast.toLocaleString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      {/* Selector Card */}
      <Card className="no-print">
        <CardHeader className="border-b bg-slate-50/50 pb-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-white border p-2.5 rounded-lg text-slate-700 shadow-sm">
                 <Filter size={20} />
               </div>
               <div>
                 <CardTitle className="text-lg">انتخاب واحدها برای تحلیل</CardTitle>
                 <p className="text-sm text-slate-500 mt-1">از فیلترهای زیر برای انتخاب صنایع استفاده کنید</p>
               </div>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
               <div className="relative flex-grow md:flex-grow-0">
                  <Input 
                    type="text" 
                    placeholder="جستجو..." 
                    className="pl-9 w-full md:w-56 h-11"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
               </div>

               <SelectWrapper 
                  className="w-full md:w-44 h-11"
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
               >
                  <option value="ALL">همه شهرها</option>
                  {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
               </SelectWrapper>

               <SelectWrapper 
                  className="w-full md:w-44 h-11"
                  value={filterUsage}
                  onChange={(e) => setFilterUsage(e.target.value)}
               >
                  <option value="ALL">همه تعرفه‌ها</option>
                  {uniqueUsages.map(c => (
                     <option key={c} value={c}>{c.startsWith('تعرفه') ? c : `تعرفه ${c}`}</option>
                  ))}
               </SelectWrapper>

               <div className="flex gap-2 mr-auto md:mr-0">
                  <Button variant="secondary" size="md" onClick={handleSelectAll} className="h-11">
                    انتخاب همه ({filteredIndustries.length})
                  </Button>
                  {selectedIds.length > 0 && (
                    <Button variant="ghost" size="md" onClick={() => onSelectIds([])} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-11">
                       <X size={16} className="mr-1" /> پاکسازی
                    </Button>
                  )}
               </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
            <div className="flex flex-wrap gap-2.5 max-h-[200px] overflow-y-auto custom-scrollbar">
            {filteredIndustries.length === 0 ? (
                <div className="w-full py-8 text-center text-slate-400 text-base">موردی با این مشخصات یافت نشد</div>
            ) : (
                filteredIndustries.map(ind => {
                const isSelected = selectedIds.includes(ind.subscriptionId);
                return (
                    <button
                    key={ind.subscriptionId}
                    onClick={() => onSelectIds(isSelected ? selectedIds.filter(id => id !== ind.subscriptionId) : [...selectedIds, ind.subscriptionId])}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border select-none ${
                        isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                    }`}
                    >
                    {ind.name}
                    </button>
                );
                })
            )}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between text-xs text-slate-400 font-bold">
                <span>{selectedIds.length} واحد انتخاب شده</span>
                <span>{filteredIndustries.length} واحد در لیست</span>
            </div>
        </CardContent>
      </Card>

      {!hasData ? (
        <div className="h-96 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
          <div className="bg-white p-5 rounded-full shadow-sm mb-4">
             <Users size={40} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-bold text-lg">لطفاً حداقل یک واحد صنعتی را انتخاب کنید</p>
        </div>
      ) : (
          <div ref={chartsRef} className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
             
             {/* Action Bar for Charts */}
             <div className="flex justify-end no-print">
                <Button variant="outline" size="sm" onClick={exportCharts} className="gap-2 h-10 px-4">
                    <Camera size={18} /> ذخیره نمودارها به صورت تصویر
                </Button>
             </div>

             {/* Single View Details or Multi View Summary */}
             {single && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-r-4 border-r-indigo-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <Gauge size={18} /> <span className="text-sm font-bold uppercase">مصرف مبنا</span>
                            </div>
                            <div className="text-3xl font-black text-slate-900">{single!.baseAvg.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-r-4 border-r-orange-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <AlertTriangle size={18} /> <span className="text-sm font-bold uppercase">سقف مجاز</span>
                            </div>
                            <div className="text-3xl font-black text-orange-600">{Math.floor(single!.limit).toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-r-4 border-r-blue-500">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-slate-500 mb-2">
                                <Calendar size={18} /> <span className="text-sm font-bold uppercase">آخرین مصرف</span>
                            </div>
                            <div className="text-3xl font-black text-blue-700">{single!.lastUsage.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className={`border-r-4 ${single!.isViolator ? 'border-r-red-500 bg-red-50' : 'border-r-emerald-500 bg-emerald-50'}`}>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 text-slate-600 mb-2">
                                <CheckCircle2 size={18} /> <span className="text-sm font-bold uppercase">وضعیت</span>
                            </div>
                            <div className={`text-2xl font-black ${single!.isViolator ? 'text-red-700' : 'text-emerald-700'}`}>
                                {single!.isViolator ? 'دارای تخطی' : 'رعایت سقف'}
                            </div>
                        </CardContent>
                    </Card>
                </div>
             )}

             {/* Main Chart Section */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Comparison / Trend Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 size={20} className="text-blue-600" /> 
                            {isMulti ? 'مقایسه مصرف لحظه‌ای' : `روند مصرف روزانه ${single?.name}`}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            {isMulti ? (
                                <BarChart data={comparisonData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} interval={0} angle={-45} textAnchor="end" height={80} />
                                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                                    <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{borderRadius: '8px', fontSize: '14px'}} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                                    <Bar name="سقف مجاز" dataKey="سقف" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar name="مصرف فعلی" dataKey="مصرف" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20}>
                                        {comparisonData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.مصرف > entry.سقف ? '#ef4444' : '#0f172a'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <LineChart data={single!.daily} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                     <XAxis dataKey="day" tick={{fontSize: 12}} />
                                     <YAxis tick={{fontSize: 12}} />
                                     <Tooltip formatter={(v) => v.toLocaleString()} contentStyle={{borderRadius: '8px', fontSize: '14px'}} />
                                     <ReferenceLine y={single!.limit} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'top', value: 'سقف مجاز', fill: '#ef4444', fontSize: 12 }} />
                                     <Line type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} name="مصرف روزانه" />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Pie Chart / Summary */}
                <Card className="flex flex-col">
                   <CardHeader className="border-b pb-4">
                       <CardTitle>{isMulti ? 'توزیع تعرفه‌ها' : 'خلاصه عملکرد'}</CardTitle>
                   </CardHeader>
                   <div className="flex-1 p-4 flex items-center justify-center">
                        {isMulti ? (
                             <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{fontSize: '14px'}} />
                                        <Legend wrapperStyle={{fontSize: '12px'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                             </div>
                        ) : (
                             <div className="grid grid-cols-2 gap-4 w-full">
                                  <div className="bg-green-50 p-4 rounded-xl text-center border border-green-100">
                                      <div className="text-3xl font-bold text-green-600">{single!.metrics.compliantDays}</div>
                                      <div className="text-sm text-green-700 mt-1">روزهای رعایت</div>
                                  </div>
                                  <div className="bg-red-50 p-4 rounded-xl text-center border border-red-100">
                                      <div className="text-3xl font-bold text-red-600">{single!.metrics.violationDays}</div>
                                      <div className="text-sm text-red-700 mt-1">روزهای تخطی</div>
                                  </div>
                                  <div className="col-span-2 mt-2">
                                     <h4 className="font-bold mb-3 text-base text-slate-700">وضعیت روزانه (Heatmap):</h4>
                                     <div className="grid grid-cols-10 gap-2">
                                         {single!.daily.map(d => (
                                             <div 
                                                key={d.day} 
                                                title={`روز ${d.day}: ${d.usage.toLocaleString()}`}
                                                className={`h-6 rounded-md shadow-sm border border-slate-200/50 ${d.usage === 0 ? 'bg-slate-100' : d.isViolation ? 'bg-red-500' : 'bg-green-500'}`}
                                             />
                                         ))}
                                     </div>
                                  </div>
                             </div>
                        )}
                   </div>
                </Card>
             </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;
