
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar, ArrowDownUp, Info, BarChart3, FileDown, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button, Card, CardContent } from './ui/Base';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
  
  useEffect(() => {
    if (lastDayWithData > 0 && lastDayWithData !== 31) {
      setEndDay(lastDayWithData);
    }
  }, [lastDayWithData]);
  
  const getRestriction = (code: string) => restrictions.find(r => r.usageCode === code)?.percentage || 0;
  
  const calculateData = (rec: ConsumptionRecord) => {
    const industry = industries.find(i => i.subscriptionId === rec.subscriptionId);
    if (!industry || !industry.baseMonthAvg) return null; 
    
    const percentage = getRestriction(industry.usageCode);
    const limitFactor = (1 - percentage / 100);
    const allowed = industry.baseMonthAvg * limitFactor;
    
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
        baseMonthAvg: data.industry.baseMonthAvg,
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

  const toggleColumn = (col: keyof typeof visibleColumns) => {
      setVisibleColumns(prev => ({...prev, [col]: !prev[col]}));
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
    const wscols = [{wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}];
    worksheet['!cols'] = wscols;
    XLSX.writeFile(workbook, `گزارش_پایش_صنایع_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    
    try {
        const canvas = await html2canvas(reportRef.current, {
            scale: 2, // High resolution
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
        
        // Split pages if content is too long
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
    <div className="space-y-8">
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
              <span className="text-base font-bold">بازه روزانه:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">تا</span>
              <input type="number" value={startDay} min={1} max={endDay} onChange={e => setStartDay(Number(e.target.value))} className="w-16 p-3 border rounded-lg text-center font-bold text-base" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">تا</span>
              <input type="number" value={endDay} min={startDay} max={31} onChange={e => setEndDay(Number(e.target.value))} className="w-16 p-3 border rounded-lg text-center font-bold text-base" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
             <span className="font-bold self-center">نمایش ستون‌ها:</span>
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
                <span className="text-sm text-green-600 block mb-2 font-medium">سقف مجاز پایش</span>
                <div className="font-bold text-xl text-green-700">{Math.floor(selectedData.allowed).toLocaleString()}</div>
                </div>
                <div className="bg-white p-6 border rounded-2xl shadow-sm border-r-4 border-r-red-500">
                <span className="text-sm text-red-600 block mb-2 font-medium">آخرین مصرف گزارش شده</span>
                <div className="font-bold text-xl text-red-700">{selectedData.lastValue.toLocaleString()}</div>
                </div>
            </div>

            <div className="bg-white p-6 border rounded-2xl shadow-sm">
                <h3 className="font-bold mb-6 text-center text-slate-700 text-lg">نمودار تحلیلی روند مصرف در بازه گزارش</h3>
                <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedData.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <ReferenceLine y={selectedData.allowed} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'top', value: 'سقف مجاز', fill: '#ef4444', fontSize: 12 }} />
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
            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 mb-12">
                <p className="font-bold text-lg italic">واحدی برای گزارش تفصیلی انتخاب نشده است</p>
            </div>
        )}

        {/* Full Table */}
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-2.5 h-8 bg-slate-900 rounded-full"></div>
                <h3 className="text-2xl font-black text-slate-800">جدول جامع پایش</h3>
            </div>
            <table className="w-full text-base text-right border-collapse">
                <thead className="bg-slate-900 text-white select-none">
                <tr>
                    {visibleColumns.name && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('name')}>نام واحد</th>}
                    {visibleColumns.baseMonthAvg && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('baseMonthAvg')}>مصرف مبنا</th>}
                    {visibleColumns.lastValue && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('lastValue')}>آخرین مصرف</th>}
                    {visibleColumns.restriction && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('restriction')}>محدودیت</th>}
                    {visibleColumns.violationAmt && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('violationAmt')}>میزان تخطی</th>}
                    {visibleColumns.violationPct && <th className="p-4 border border-slate-700 cursor-pointer" onClick={() => toggleSort('violationPct')}>درصد تخطی</th>}
                    {visibleColumns.chart && <th className="p-4 border border-slate-700 text-center">وضعیت</th>}
                </tr>
                </thead>
                <tbody>
                {sortedTableData.map((row, idx) => (
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
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-300 flex justify-between text-sm text-slate-500 font-bold">
            <div>تهیه شده در سامانه هوشمند پایش گاز استان</div>
            <div>صفحه ۱</div>
        </div>
      </div>

      <div className="fixed bottom-8 left-8 flex gap-3 no-print">
         <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 shadow-xl gap-2 h-12 px-6 text-base">
             <FileDown size={20}/> اکسل
         </Button>
         <Button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700 shadow-xl gap-2 h-12 px-6 text-base" isLoading={isGeneratingPdf}>
             <FileDown size={20}/> دریافت PDF رسمی
         </Button>
      </div>
    </div>
  );
};

export default Reports;
