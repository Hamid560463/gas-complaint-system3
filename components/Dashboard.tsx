
import React, { useMemo, useState, useRef } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ReferenceLine, LineChart, Line, PieChart, Pie, ComposedChart
} from 'recharts';
import { Users, Gauge, Calendar, AlertTriangle, CheckCircle2, BarChart3, Search, Filter, X, Flame, Download, Camera, LayoutDashboard, LineChart as LineChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, SelectWrapper } from './ui/Base';
import { getDateFromIndex, getIndexFromDate } from '../services/dateUtils';
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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ANALYSIS'>('OVERVIEW');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterUsage, setFilterUsage] = useState('ALL');
  const chartsRef = useRef<HTMLDivElement>(null);

  const uniqueCities = useMemo(() => Array.from(new Set(industries.map(i => i.city ? i.city.trim() : ''))).filter(Boolean).sort(), [industries]);
  const uniqueUsages = useMemo(() => Array.from(new Set(industries.map(i => i.usageCode))).filter(Boolean).sort(), [industries]);

  const filteredIndustries = useMemo(() => {
    return industries.filter(ind => {
      const matchSearch = (ind.name || '').includes(searchTerm) || (ind.subscriptionId || '').includes(searchTerm);
      const matchCity = filterCity === 'ALL' || (ind.city && ind.city.trim() === filterCity);
      const matchUsage = filterUsage === 'ALL' || ind.usageCode === filterUsage;
      return matchSearch && matchCity && matchUsage;
    });
  }, [industries, searchTerm, filterCity, filterUsage]);

  const handleSelectAll = () => {
    const newSelected = new Set(selectedIds);
    filteredIndustries.forEach(i => newSelected.add(i.subscriptionId));
    onSelectIds(Array.from(newSelected));
  };

  const lastIndexWithData = useMemo(() => {
    let max = 0;
    consumption.forEach(c => {
      c.dailyConsumptions.forEach((val, idx) => {
        if (val >= 0) max = Math.max(max, idx);
      });
    });
    return max; 
  }, [consumption]);

  // View Range (Indexes)
  const startIndex = 0;
  const endIndex = lastIndexWithData;

  const getRestrictionPct = (usageCode: string, dateIndex: number) => {
     const r = restrictions.find(x => x.usageCode === usageCode);
     if (!r || !r.periods) return 0;
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

  const getLimit = (subscriptionId: string, dateIndex: number) => {
    const industry = industries.find(i => i.subscriptionId === subscriptionId);
    if (!industry || !industry.baseMonthAvg) return 0;
    const pct = getRestrictionPct(industry.usageCode, dateIndex);
    return industry.baseMonthAvg * (1 - pct / 100);
  };

  const usageAggregates = useMemo(() => {
    return uniqueUsages.map(code => {
      const groupIndustries = industries.filter(i => i.usageCode === code);
      let totalBase = 0;
      let totalLast = 0;
      let violationCount = 0;
      let hasDataCount = 0;
      
      groupIndustries.forEach(ind => {
        totalBase += ind.baseMonthAvg || 0;
        const rec = consumption.find(c => c.subscriptionId === ind.subscriptionId);
        
        let lastVal = 0;
        let lastIdx = -1;
        let hasData = false;

        if (rec) {
            // Logic: find last valid value (>=0)
            for(let i=rec.dailyConsumptions.length-1; i>=0; i--) {
                if(rec.dailyConsumptions[i] >= 0) {
                    lastVal = rec.dailyConsumptions[i];
                    lastIdx = i;
                    hasData = true;
                    break;
                }
            }
        }
        
        if (hasData) {
            hasDataCount++;
            totalLast += lastVal;
            // Limit at the specific time of this record
            const limit = getLimit(ind.subscriptionId, lastIdx);
            if (lastVal > limit) violationCount++;
        }
      });

      const totalCount = groupIndustries.length;
      const compliancePct = totalCount > 0 ? ((totalCount - violationCount) / totalCount) * 100 : 0;

      return { 
          code, 
          count: totalCount, 
          totalBase, 
          totalLast, 
          compliancePct, 
          hasDataCount, 
          violationCount 
      };
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
      
      let compliantDaysCount = 0;
      let violationDaysCount = 0;
      let totalCompliantVol = 0;
      let totalViolationExcessVol = 0;

      // Slice array up to end index
      const relevantData = record.dailyConsumptions.slice(startIndex, endIndex + 1);
      
      const daily = relevantData.map((val, idx) => {
        const dateStr = getDateFromIndex(startIndex + idx);
        const shortDate = dateStr.substring(5);
        
        // Dynamic limit calculation
        const limit = getLimit(id, startIndex + idx);
        
        const isViolation = val > limit;
        if (val >= 0) {
             if (isViolation) { violationDaysCount++; totalViolationExcessVol += (val - limit); } 
             else { compliantDaysCount++; totalCompliantVol += val; }
        }
        return { 
            name: shortDate, 
            fullDate: dateStr,
            usage: val >= 0 ? val : null, // For chart gaps
            limit: limit, 
            isViolation: isViolation 
        };
      });
      
      let lastUsage = 0;
      let lastLimit = 0;
      let lastDateLabel = '';
      
      // Find last valid usage
      const lastEntry = daily.filter(d => d.usage !== null).pop();
      if(lastEntry) {
          lastUsage = lastEntry.usage as number;
          lastLimit = lastEntry.limit;
          lastDateLabel = lastEntry.fullDate;
      } else {
          lastDateLabel = getDateFromIndex(endIndex);
          lastLimit = getLimit(id, endIndex);
      }
      
      return {
        ...industry,
        baseAvg: industry.baseMonthAvg,
        limit: lastLimit, // Current/Last effective limit
        lastUsage,
        lastDateLabel,
        daily,
        isViolator: lastUsage > lastLimit,
        metrics: { compliantDays: compliantDaysCount, violationDays: violationDaysCount, totalCompliantVol, totalViolationExcessVol }
      };
    }).filter((d): d is NonNullable<typeof d> => d !== null);
  }, [selectedIds, industries, consumption, restrictions, startIndex, endIndex]);

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
      
      {/* Tab Navigation */}
      <div className="flex justify-center no-print sticky top-0 z-10 pt-2 pb-4 bg-slate-50/95 backdrop-blur">
         <div className="flex bg-slate-200 p-1 rounded-xl shadow-inner">
             <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'OVERVIEW' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
             >
                <LayoutDashboard size={18} />
                داشبورد مدیریتی (کلان)
             </button>
             <button
                onClick={() => setActiveTab('ANALYSIS')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    activeTab === 'ANALYSIS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
             >
                <LineChartIcon size={18} />
                انتخاب و تحلیل واحدها
             </button>
         </div>
      </div>

      {activeTab === 'OVERVIEW' ? (
        /* 1. Aggregate Cards View */
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 no-print">
                {usageAggregates.map(agg => (
                    <Card key={agg.code} className="hover:shadow-lg transition-shadow duration-200 border-t-4 border-t-slate-600">
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
                            
                            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                                {/* Row 1 */}
                                <div className="flex flex-col">
                                    <span className="text-slate-500 mb-1">کل صنایع</span>
                                    <span className="font-bold text-slate-800 text-sm">{agg.count.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-slate-500 mb-1">دارای داده</span>
                                    <span className="font-bold text-slate-800 text-sm">{agg.hasDataCount.toLocaleString()}</span>
                                </div>

                                {/* Row 2 */}
                                <div className="flex flex-col">
                                    <span className="text-slate-500 mb-1">مجموع مبنا</span>
                                    <span className="font-bold text-slate-600 text-sm">{Math.round(agg.totalBase).toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-slate-500 mb-1">مصرف فعلی</span>
                                    <span className="font-bold text-blue-700 text-sm">{agg.totalLast.toLocaleString()}</span>
                                </div>
                                
                                {/* Row 3 - Violations */}
                                <div className="col-span-2 mt-1 bg-red-50 rounded-lg p-2 flex justify-between items-center border border-red-100">
                                    <span className="text-red-700 font-medium">تعداد تخطی:</span>
                                    <span className="font-black text-red-700 text-sm">{agg.violationCount.toLocaleString()} واحد</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {usageAggregates.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">هنوز اطلاعاتی برای نمایش وجود ندارد. لطفاً ابتدا صنایع و مصارف را وارد کنید.</p>
                </div>
            )}
        </div>
      ) : (
        /* 2. Analysis View */
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                <div ref={chartsRef} className="space-y-6">
                    
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
                                        <AlertTriangle size={18} /> <span className="text-sm font-bold uppercase">سقف مجاز (فعلی)</span>
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
                                        <ComposedChart data={single!.daily} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{fontSize: 12}} angle={-45} textAnchor="end" height={60} />
                                            <YAxis tick={{fontSize: 12}} />
                                            <Tooltip 
                                                formatter={(v: number | null) => v !== null ? v.toLocaleString() : 'بدون داده'} 
                                                contentStyle={{borderRadius: '8px', fontSize: '14px'}} 
                                            />
                                            <Line type="step" dataKey="limit" stroke="#ef4444" strokeWidth={2} name="سقف مجاز (متغیر)" dot={false} />
                                            <Line connectNulls type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} name="مصرف روزانه" />
                                        </ComposedChart>
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
                                                    labelLine={false}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-slate-50 p-3 rounded-lg border">
                                                <span className="block text-slate-500 mb-1">روزهای دارای تخطی</span>
                                                <span className="text-xl font-black text-red-600">{single!.metrics.violationDays}</span>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-lg border">
                                                <span className="block text-slate-500 mb-1">روزهای رعایت شده</span>
                                                <span className="text-xl font-black text-green-600">{single!.metrics.compliantDays}</span>
                                            </div>
                                            <div className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                <span className="block text-blue-600 mb-1">مجموع حجم تخطی (غیرمجاز)</span>
                                                <span className="text-xl font-black text-blue-800">{single!.metrics.totalViolationExcessVol.toLocaleString()}</span>
                                                <span className="text-xs text-blue-500 mr-1">متر مکعب</span>
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
      )}
    </div>
  );
};

export default Dashboard;
