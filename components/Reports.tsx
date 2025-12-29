
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { Calendar, ArrowDownUp, Info, BarChart3, FileDown, CheckSquare, Square, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button, Card, CardContent } from './ui/Base';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getDateFromIndex, getIndexFromDate } from '../services/dateUtils';

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
      name: true,
      baseMonthAvg: true,
      lastValue: true,
      restriction: true,
      violationAmt: true,
      violationPct: true,
      chart: true
  });

  const lastIndexWithData = useMemo(() => {
    let max = 0;
    consumption.forEach(c => {
      c.dailyConsumptions.forEach((val, idx) => {
        if (val >= 0) max = Math.max(max, idx);
      });
    });
    return max; 
  }, [consumption]);

  const [startIndex, setStartIndex] = useState<number>(0);
  const [endIndex, setEndIndex] = useState<number>(30);
  
  useEffect(() => {
    if (lastIndexWithData > 0) {
      setEndIndex(lastIndexWithData);
    }
  }, [lastIndexWithData]);
  
  // Helper to get restriction for a specific date index
  const getRestrictionPctForDate = (usageCode: string, dateIndex: number): number => {
    const r = restrictions.find(x => x.usageCode === usageCode);
    if (!r || !r.periods || r.periods.length === 0) return 0;

    // Find the active period. Periods should be sorted by date.
    const sortedPeriods = [...r.periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    let activePct = 0;
    
    for (const p of sortedPeriods) {
        const pIdx = getIndexFromDate(p.startDate);
        if (pIdx <= dateIndex) {
            activePct = p.percentage;
        } else {
            break; // Period starts in future relative to this dateIndex
        }
    }
    return activePct;
  };

  const calculateData = (rec: ConsumptionRecord) => {
    const industry = industries.find(i => i.subscriptionId === rec.subscriptionId);
    if (!industry || !industry.baseMonthAvg) return null; 
    
    // Slice data based on indices
    const filteredConsumptions = rec.dailyConsumptions.slice(startIndex, endIndex + 1);
    
    const dailyData = filteredConsumptions.map((val, idx) => {
      const actualIndex = startIndex + idx;
      const dateStr = getDateFromIndex(actualIndex);
      
      const pct = getRestrictionPctForDate(industry.usageCode, actualIndex);
      const allowed = industry.baseMonthAvg * (1 - pct / 100);

      const hasData = val >= 0;
      const isViolation = hasData && val > allowed;

      return {
        index: actualIndex,
        date: dateStr,
        displayDate: dateStr.substring(5), // 09/28
        value: hasData ? val : 0,
        hasData: hasData,
        allowed: allowed,
        violation: isViolation ? val - allowed : 0,
        isViolation: isViolation
      };
    }); // We keep -1 as 0 for sum but flag it as no data? Better to filter for stats.

    // Filter for actual stats
    const validDays = dailyData.filter(d => d.hasData);

    const violationDays = validDays.filter(d => d.isViolation).length;
    const compliantDays = validDays.length - violationDays;
    const totalViolation = validDays.reduce((sum, d) => sum + d.violation, 0);
    const totalConsumption = validDays.reduce((sum, d) => sum + d.value, 0);

    let lastValue = 0;
    let lastAllowed = 0;
    let lastPct = 0;

    // Find last valid value
    const lastValidDay = validDays[validDays.length - 1];
    
    if (lastValidDay) {
        lastValue = lastValidDay.value;
        lastAllowed = lastValidDay.allowed;
        lastPct = getRestrictionPctForDate(industry.usageCode, lastValidDay.index);
    } else if (dailyData.length > 0) {
        // Fallback if no valid data in range
        const lastDay = dailyData[dailyData.length-1];
        lastAllowed = lastDay.allowed;
        lastPct = getRestrictionPctForDate(industry.usageCode, lastDay.index);
    }

    return {
      industry,
      rec,
      dailyData: dailyData.map(d => ({ ...d, value: d.hasData ? d.value : null })), // Null for charts
      lastAllowed,
      lastPct,
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
      const violationAmt = data.lastValue > data.lastAllowed ? data.lastValue - data.lastAllowed : 0;
      const violationPct = data.lastAllowed > 0 ? (violationAmt / data.lastAllowed) * 100 : 0;
      
      return {
        subscriptionId: c.subscriptionId,
        name: data.industry.name,
        baseMonthAvg: data.industry.baseMonthAvg,
        lastValue: data.lastValue,
        restriction: data.lastPct, // This is the restriction at the moment of last value
        violationAmt: violationAmt,
        violationPct: isFinite(violationPct) ? violationPct : 0,
        allowed: data.lastAllowed
      };
    }).filter(item => item !== null) as any[];
  }, [consumption, industries, restrictions, startIndex, endIndex]);

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

  const totalPages = Math.ceil(sortedTableData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTableData.slice(start, start + itemsPerPage);
  }, [sortedTableData, currentPage, itemsPerPage]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleColumn = (col: keyof typeof visibleColumns) => {
      setVisibleColumns(prev => ({...prev, [col]: !prev[col]}));
  };

  const exportToExcel = () => {
    const exportData = sortedTableData.map(item => ({
      'نام واحد صنعتی': item.name,
      'شماره اشتراک': item.subscriptionId,
      'مصرف مبنا (آبان)': item.baseMonthAvg,
      'سقف مجاز (روز آخر)': Math.floor(item.allowed),
      'آخرین مصرف': item.lastValue,
      'محدودیت روز آخر (%)': item.restriction,
      'میزان تخطی': Math.floor(item.violationAmt),
      'درصد تخطی (%)': item.violationPct.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش پایش صنایع");
    const wscols = [{wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, `گزارش_پایش_صنایع_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    
    try {
        const canvas = await html2canvas(reportRef.current, {
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`Gozaresh_Payesh_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.pdf`);
    } catch (err) {
        console.error(err);
        alert('خطا در تولید فایل PDF');
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const selectedData = selectedIndustryId ? calculateData(consumption.find(c => c.subscriptionId === selectedIndustryId)!) : null;

  return (
    <div className="space-y-8 pb-10">
      {/* Control Panel (No Print) */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 no-print">
        <div className="flex flex-wrap gap-6 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-base font-bold text-slate-700 mb-2 flex items-center gap-2">
              <Info size={20} className="text-blue-600" /> انتخاب واحد برای گزارش رسمی:
            </label>
            <select 
              className="w-full p-3.5 border rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-base"
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
              <Calendar size={20} className="text-slate-400" />
              <span className="text-base font-bold">بازه تاریخی:</span>
            </div>
            {/* Start Date Control */}
            <div className="flex items-center gap-2 bg-white border rounded-lg p-1 px-3">
              <span className="text-xs text-slate-400">از</span>
              <span className="font-bold text-blue-700 font-mono text-sm">{getDateFromIndex(startIndex)}</span>
              <div className="flex flex-col ml-2">
                  <button onClick={() => setStartIndex(Math.max(0, startIndex-1))} className="text-[10px] hover:text-blue-600">▲</button>
                  <button onClick={() => setStartIndex(Math.min(endIndex, startIndex+1))} className="text-[10px] hover:text-blue-600">▼</button>
              </div>
            </div>
            
             {/* End Date Control */}
            <div className="flex items-center gap-2 bg-white border rounded-lg p-1 px-3">
              <span className="text-xs text-slate-400">تا</span>
              <span className="font-bold text-blue-700 font-mono text-sm">{getDateFromIndex(endIndex)}</span>
              <div className="flex flex-col ml-2">
                  <button onClick={() => setEndIndex(Math.min(120, endIndex+1))} className="text-[10px] hover:text-blue-600">▲</button>
                  <button onClick={() => setEndIndex(Math.max(startIndex, endIndex-1))} className="text-[10px] hover:text-blue-600">▼</button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row justify-between gap-4">
            <div className="flex flex-wrap gap-4 text-sm items-center">
                <span className="font-bold">نمایش ستون‌ها:</span>
                {Object.keys(visibleColumns).map(key => (
                    <button 
                        key={key} 
                        onClick={() => toggleColumn(key as any)}
                        className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
                    >
                        {/* @ts-ignore */}
                        {visibleColumns[key] ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} />}
                        <span>
                            {key === 'name' && 'نام واحد'}
                            {key === 'baseMonthAvg' && 'مصرف مبنا'}
                            {key === 'lastValue' && 'آخرین مصرف'}
                            {key === 'restriction' && 'درصد محدودیت'}
                            {key === 'violationAmt' && 'میزان تخطی'}
                            {key === 'violationPct' && 'درصد تخطی'}
                            {key === 'chart' && 'نمودار'}
                        </span>
                    </button>
                ))}
            </div>
            
            <div className="flex gap-2">
                <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 shadow-sm gap-2 h-10 px-6 text-sm">
                    <FileDown size={18}/> خروجی اکسل
                </Button>
                <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700 shadow-sm gap-2 h-10 px-6 text-sm" isLoading={isGeneratingPdf}>
                    <Printer size={18}/> دریافت PDF رسمی
                </Button>
            </div>
        </div>
      </div>

      {/* Printable Area */}
      <div ref={reportRef} className="bg-white p-10 print:p-0 print:shadow-none shadow-xl rounded-2xl">
          {/* Header */}
          <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-center">
              <div className="flex flex-col">
                  <h1 className="text-3xl font-black text-slate-900">گزارش جامع پایش مصرف گاز</h1>
                  <span className="text-lg text-slate-500 mt-2 font-medium">سامانه مدیریت مصرف صنایع استان یزد</span>
              </div>
              <div className="text-left text-sm font-mono text-slate-400 leading-6">
                  <div>تاریخ گزارش: {new Date().toLocaleDateString('fa-IR')}</div>
                  <div>شماره: {Math.floor(Math.random() * 10000)}/پ</div>
              </div>
          </div>

          {selectedData ? (
            <div className="space-y-8 mb-12">
            <h2 className="text-xl font-bold bg-slate-100 p-3 rounded-xl border-r-8 border-blue-600 text-slate-800">جزئیات واحد منتخب</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 border rounded-2xl shadow-sm border-r-4 border-r-blue-600">
                <span className="text-sm text-slate-500 block mb-2 font-medium">نام واحد صنعتی</span>
                <div className="font-bold text-xl text-slate-900">{selectedData.industry.name}</div>
                </div>
                <div className="bg-white p-6 border rounded-2xl shadow-sm border-r-4 border-r-slate-400">
                <span className="text-sm text-slate-500 block mb-2 font-medium">میانگین مبنا</span>
                <div className="font-bold text-xl">{selectedData.industry.baseMonthAvg.toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 border rounded-2xl shadow-sm border-r-4 border-r-green-500">
                <span className="text-sm text-green-600 block mb-2 font-medium">سقف مجاز (روز آخر)</span>
                <div className="font-bold text-xl text-green-700">{Math.floor(selectedData.lastAllowed).toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 border rounded-2xl shadow-sm border-r-4 border-r-red-500">
                <span className="text-sm text-red-600 block mb-2 font-medium">آخرین مصرف گزارش شده</span>
                <div className="font-bold text-xl text-red-700">{selectedData.lastValue.toLocaleString()}</div>
                </div>
            </div>

            <div className="bg-white p-6 border rounded-2xl shadow-sm">
                <h3 className="font-bold mb-6 text-center text-slate-700 text-lg">نمودار تحلیلی روند مصرف و تغییرات سقف مجاز</h3>
                <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={selectedData.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="displayDate" />
                    <YAxis />
                    <Tooltip 
                        formatter={(v: any) => v !== null ? v.toLocaleString() : 'بدون داده'} 
                        contentStyle={{fontFamily: 'Vazirmatn'}} 
                    />
                    <Line type="step" dataKey="allowed" stroke="#10b981" strokeWidth={3} name="سقف مجاز (متغیر)" dot={false} />
                    <Bar dataKey="value" name="مصرف روزانه" radius={[4, 4, 0, 0]}>
                        {selectedData.dailyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value !== null && entry.value > entry.allowed ? '#ef4444' : '#3b82f6'} />
                        ))}
                    </Bar>
                    </ComposedChart>
                </ResponsiveContainer>
                </div>
            </div>
            </div>
        ) : (
            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 mb-12">
                <p className="font-bold text-lg italic">واحدی برای گزارش تفصیلی انتخاب نشده است</p>
            </div>
        )}

        {/* Full Table */}
        <div>
            <div className="flex items-center gap-3 mb-6 justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-2.5 h-8 bg-slate-900 rounded-full"></div>
                   <h3 className="text-2xl font-black text-slate-800">جدول جامع پایش (آخرین وضعیت بازه)</h3>
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
            <table className="w-full text-base text-right border-collapse">
                <thead className="bg-slate-900 text-white select-none">
                <tr>
                    {visibleColumns.name && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('name')}>نام واحد</th>}
                    {visibleColumns.baseMonthAvg && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('baseMonthAvg')}>مصرف مبنا</th>}
                    {visibleColumns.lastValue && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('lastValue')}>آخرین مصرف</th>}
                    {visibleColumns.restriction && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('restriction')}>محدودیت (فعلی)</th>}
                    {visibleColumns.violationAmt && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('violationAmt')}>میزان تخطی</th>}
                    {visibleColumns.violationPct && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('violationPct')}>درصد تخطی</th>}
                    {visibleColumns.chart && <th className="p-4 border border-slate-700 text-center">وضعیت</th>}
                </tr>
                </thead>
                <tbody>
                {paginatedData.map((row, idx) => (
                    <tr key={row.subscriptionId} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    {visibleColumns.name && <td className="p-4 border border-slate-200 font-bold text-slate-800">{row.name}</td>}
                    {visibleColumns.baseMonthAvg && <td className="p-4 border border-slate-200 font-mono text-slate-600">{row.baseMonthAvg.toLocaleString()}</td>}
                    {visibleColumns.lastValue && <td className="p-4 border border-slate-200 font-mono font-bold text-blue-700">{row.lastValue.toLocaleString()}</td>}
                    {visibleColumns.restriction && <td className="p-4 border border-slate-200 font-bold text-slate-500">{row.restriction}%</td>}
                    {visibleColumns.violationAmt && <td className={`p-4 border border-slate-200 font-mono font-black text-lg ${row.violationAmt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {row.violationAmt > 0 ? row.violationAmt.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '۰'}
                    </td>}
                    {visibleColumns.violationPct && <td className={`p-4 border border-slate-200 font-mono font-bold ${row.violationAmt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                         {row.violationPct.toFixed(1)}%
                    </td>}
                    {visibleColumns.chart && <td className="p-4 border border-slate-200 w-40">
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${row.violationAmt > 0 ? 'bg-red-500' : 'bg-green-500'}`} 
                                style={{ width: `${Math.min(row.violationPct, 100)}%` }}
                            />
                        </div>
                    </td>}
                    </tr>
                ))}
                </tbody>
            </table>
            
             {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between bg-slate-50 no-print">
                    <div className="text-sm text-slate-500">
                        نمایش {((currentPage - 1) * itemsPerPage) + 1} تا {Math.min(currentPage * itemsPerPage, sortedTableData.length)} از {sortedTableData.length} مورد
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

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-300 flex justify-between text-sm text-slate-500 font-bold">
            <div>تهیه شده در سامانه هوشمند پایش گاز استان</div>
            <div>صفحه ۱</div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
