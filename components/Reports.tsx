
import React, { useState, useMemo, useEffect } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar, ArrowDownUp, Info, BarChart3, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsProps {
  industries: Industry[];
  consumption: ConsumptionRecord[];
  restrictions: Restriction[];
}

type SortField = 'name' | 'baseMonthAvg' | 'lastValue' | 'restriction' | 'violationAmt' | 'violationPct';
type SortDirection = 'asc' | 'desc';

const Reports: React.FC<ReportsProps> = ({ industries, consumption, restrictions }) => {
  const [selectedIndustryId, setSelectedIndustryId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Calculate the last day that has any data across all records
  const lastDayWithData = useMemo(() => {
    let max = 0;
    consumption.forEach(c => {
      c.dailyConsumptions.forEach((val, idx) => {
        if (val > 0) max = Math.max(max, idx + 1);
      });
    });
    return max > 0 ? max : 31; 
  }, [consumption]);

  const [startDay, setStartDay] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(31);
  
  // Sync endDay with the actual data availability when data loads
  useEffect(() => {
    if (lastDayWithData > 0 && lastDayWithData !== 31) {
      setEndDay(lastDayWithData);
    }
  }, [lastDayWithData]);
  
  const getRestriction = (code: string) => restrictions.find(r => r.usageCode === code)?.percentage || 0;
  
  const calculateData = (rec: ConsumptionRecord) => {
    const industry = industries.find(i => i.subscriptionId === rec.subscriptionId);
    if (!industry || !industry.baseMonthAvg) return null; // Use Industry baseMonthAvg
    
    const percentage = getRestriction(industry.usageCode);
    const limitFactor = (1 - percentage / 100);
    const allowed = industry.baseMonthAvg * limitFactor; // Use Industry baseMonthAvg
    
    const filteredConsumptions = rec.dailyConsumptions.slice(startDay - 1, endDay);
    
    const dailyData = filteredConsumptions.map((val, idx) => ({
      day: startDay + idx,
      value: val,
      allowed: allowed,
      violation: val > allowed ? val - allowed : 0,
      isViolation: val > allowed
    }));

    const violationDays = dailyData.filter(d => d.isViolation).length;
    const compliantDays = dailyData.length - violationDays;
    const totalViolation = dailyData.reduce((sum, d) => sum + d.violation, 0);
    const totalConsumption = dailyData.reduce((sum, d) => sum + d.value, 0);

    let lastValue = 0;
    if (rec.lastRecordDate) {
      const parts = rec.lastRecordDate.split('/');
      const day = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(day) && day >= 1 && day <= 31) {
        lastValue = rec.dailyConsumptions[day - 1];
      }
    } else {
      lastValue = dailyData.length > 0 ? dailyData[dailyData.length - 1].value : 0;
    }

    return {
      industry,
      rec,
      dailyData,
      allowed,
      violationDays,
      compliantDays,
      totalViolation,
      totalConsumption,
      lastValue
    };
  };

  const tableData = useMemo(() => {
    return consumption.map(c => {
      const data = calculateData(c);
      if (!data) return null;
      const violationAmt = data.lastValue > data.allowed ? data.lastValue - data.allowed : 0;
      const violationPct = (violationAmt / data.allowed) * 100;
      
      return {
        subscriptionId: c.subscriptionId,
        name: data.industry.name,
        baseMonthAvg: data.industry.baseMonthAvg, // Use Industry baseMonthAvg
        lastValue: data.lastValue,
        restriction: getRestriction(data.industry.usageCode),
        violationAmt: violationAmt,
        violationPct: isFinite(violationPct) ? violationPct : 0,
        allowed: data.allowed
      };
    }).filter(item => item !== null) as any[];
  }, [consumption, industries, restrictions, startDay, endDay]);

  const sortedTableData = useMemo(() => {
    const sorted = [...tableData].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB, 'fa') 
          : valB.localeCompare(valA, 'fa');
      }

      return sortDirection === 'asc' 
        ? (valA as number) - (valB as number) 
        : (valB as number) - (valA as number);
    });
    return sorted;
  }, [tableData, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportToExcel = () => {
    const exportData = sortedTableData.map(item => ({
      'نام واحد صنعتی': item.name,
      'شماره اشتراک': item.subscriptionId,
      'مصرف مبنا (آبان)': item.baseMonthAvg,
      'سقف مجاز': Math.floor(item.allowed),
      'آخرین مصرف': item.lastValue,
      'محدودیت (%)': item.restriction,
      'میزان تخطی': Math.floor(item.violationAmt),
      'درصد تخطی (%)': item.violationPct.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش پایش صنایع");
    
    // Set column widths for better visibility
    const wscols = [
      {wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `گزارش_پایش_صنایع_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
  };

  const selectedData = selectedIndustryId ? calculateData(consumption.find(c => c.subscriptionId === selectedIndustryId)!) : null;

  return (
    <div className="space-y-8">
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 no-print">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Info size={16} className="text-blue-600" /> انتخاب واحد برای گزارش رسمی:
            </label>
            <select 
              className="w-full p-3 border rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={e => setSelectedIndustryId(e.target.value)}
              value={selectedIndustryId || ''}
            >
              <option value="">جستجو و انتخاب واحد صنعتی...</option>
              {consumption.map(c => {
                const ind = industries.find(i => i.subscriptionId === c.subscriptionId);
                return <option key={c.subscriptionId} value={c.subscriptionId}>{ind?.name || c.subscriptionId}</option>;
              })}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-400" />
              <span className="text-sm font-bold">بازه روزانه گزارش:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">تا</span>
              <input type="number" value={startDay} min={1} max={endDay} onChange={e => setStartDay(Number(e.target.value))} className="w-16 p-2 border rounded-lg text-center font-bold" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">تا</span>
              <input type="number" value={endDay} min={startDay} max={31} onChange={e => setEndDay(Number(e.target.value))} className="w-16 p-2 border rounded-lg text-center font-bold" />
            </div>
          </div>
        </div>
      </div>

      {selectedData ? (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 border rounded-xl shadow-sm border-r-4 border-r-blue-600">
              <span className="text-xs text-slate-500 block mb-1">نام واحد صنعتی</span>
              <div className="font-bold text-lg text-slate-900">{selectedData.industry.name}</div>
            </div>
            <div className="bg-white p-5 border rounded-xl shadow-sm border-r-4 border-r-slate-400">
              <span className="text-xs text-slate-500 block mb-1">میانگین مبنا</span>
              <div className="font-bold text-lg">{selectedData.industry.baseMonthAvg.toLocaleString()}</div>
            </div>
            <div className="bg-white p-5 border rounded-xl shadow-sm border-r-4 border-r-green-500">
              <span className="text-xs text-green-600 block mb-1">سقف مجاز پایش</span>
              <div className="font-bold text-lg text-green-700">{Math.floor(selectedData.allowed).toLocaleString()}</div>
            </div>
            <div className="bg-white p-5 border rounded-xl shadow-sm border-r-4 border-r-red-500">
              <span className="text-xs text-red-600 block mb-1">آخرین مصرف گزارش شده</span>
              <div className="font-bold text-lg text-red-700">{selectedData.lastValue.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white p-6 border rounded-2xl shadow-sm">
            <h3 className="font-bold mb-6 text-center text-slate-700">نمودار تحلیلی روند مصرف در بازه گزارش</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                  <ReferenceLine y={selectedData.allowed} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'top', value: 'سقف مجاز', fill: '#ef4444', fontSize: 10 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {selectedData.dailyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > selectedData.allowed ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400">
           <BarChart3 size={48} className="mb-3 opacity-20" />
           <p className="font-medium italic">جهت استخراج گزارش رسمی، یک واحد صنعتی را انتخاب نمایید</p>
        </div>
      )}

      <div className="mt-12 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-r-4 border-slate-900 pr-4">
          <h3 className="text-xl font-black text-slate-800">لیست پایش کلی واحدها</h3>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-all shadow-md active:scale-95 no-print text-sm font-bold"
          >
            <FileDown size={18} />
            <span>خروجی اکسل (Excel)</span>
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-900 text-white select-none">
              <tr>
                <th className="p-5 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-2 font-black">نام واحد صنعتی <ArrowDownUp size={14} className="opacity-50" /></div>
                </th>
                <th className="p-5 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('baseMonthAvg')}>
                   مصرف مبنا <ArrowDownUp size={14} className="opacity-50" />
                </th>
                <th className="p-5 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('lastValue')}>
                  آخرین مصرف <ArrowDownUp size={14} className="opacity-50" />
                </th>
                <th className="p-5 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('restriction')}>
                   محدودیت <ArrowDownUp size={14} className="opacity-50" />
                </th>
                <th className="p-5 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('violationAmt')}>
                  میزان تخطی <ArrowDownUp size={14} className="opacity-50" />
                </th>
                <th className="p-5 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('violationPct')}>
                  درصد تخطی <ArrowDownUp size={14} className="opacity-50" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTableData.map(row => (
                <tr key={row.subscriptionId} className="border-b hover:bg-blue-50/60 transition-colors">
                  <td className="p-5 font-black text-slate-900">{row.name}</td>
                  <td className="p-5 font-mono">{row.baseMonthAvg.toLocaleString()}</td>
                  <td className="p-5 font-mono font-bold text-blue-700">{row.lastValue.toLocaleString()}</td>
                  <td className="p-5 font-bold text-slate-500">{row.restriction}%</td>
                  <td className={`p-5 font-mono font-black ${row.violationAmt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.violationAmt > 0 ? row.violationAmt.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '۰'}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                       <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${row.violationAmt > 0 ? 'bg-red-500' : 'bg-green-500'}`} 
                            style={{ width: `${Math.min(row.violationPct, 100)}%` }}
                          />
                       </div>
                       <span className={`text-xs font-black ${row.violationAmt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {row.violationPct.toFixed(1)}%
                       </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
