
import React, { useState, useMemo } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { Building2, Download, Filter, Settings2, AlertTriangle, FileSpreadsheet, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { Button } from './ui/Base';
import * as XLSX from 'xlsx';
import { getIndexFromDate } from '../services/dateUtils';

interface HeadquartersReportsProps {
  industries: Industry[];
  consumption: ConsumptionRecord[];
  restrictions: Restriction[];
}

const HeadquartersReports: React.FC<HeadquartersReportsProps> = ({ industries, consumption, restrictions }) => {
  // Threshold Configuration (Synced with Logic but independent state for this view)
  const [warningLimit, setWarningLimit] = useState<number>(20); 
  const [pressureLimit, setPressureLimit] = useState<number>(50); 
  
  // Basic Filter
  const [minViolationPct, setMinViolationPct] = useState<number>(0);
  const [showCompliant, setShowCompliant] = useState<boolean>(true); 

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  const reportData = useMemo(() => {
    return consumption.map(rec => {
      const industry = industries.find(i => i.subscriptionId === rec.subscriptionId);
      if (!industry || !industry.baseMonthAvg) return null;

      // Determine last value logic AND index
      let lastValue = 0;
      let lastIndex = 0;
      let hasData = false;

      if (rec.lastRecordDate) {
         // Prefer calculated index from date string if possible
         lastIndex = getIndexFromDate(rec.lastRecordDate);
         if(lastIndex >= 0 && lastIndex < rec.dailyConsumptions.length && rec.dailyConsumptions[lastIndex] >= 0) {
             lastValue = rec.dailyConsumptions[lastIndex];
             hasData = true;
         } else {
            // Fallback scan
            rec.dailyConsumptions.forEach((val, idx) => { if (val >= 0) { lastValue = val; lastIndex = idx; hasData = true; } });
         }
      } else {
        rec.dailyConsumptions.forEach((val, idx) => { if (val >= 0) { lastValue = val; lastIndex = idx; hasData = true; } });
      }

      if (!hasData) return null; // Skip if no valid data

      // Dynamic Restriction based on Date
      const percentage = getRestrictionPct(industry.usageCode, lastIndex);
      const limit = industry.baseMonthAvg * (1 - percentage / 100);

      const violationAmount = lastValue > limit ? lastValue - limit : 0;
      const violationPct = limit > 0 ? (violationAmount / limit) * 100 : 0;
      const isCompliant = violationAmount <= 0;

      const realizedReductionPct = industry.baseMonthAvg > 0 
          ? ((industry.baseMonthAvg - lastValue) / industry.baseMonthAvg) * 100 
          : 0;

      // Determine Action
      let action = 'رعایت شده';
      if (!isCompliant) {
        if (violationPct <= warningLimit) {
          action = 'اخطار کتبی';
        } else if (violationPct <= pressureLimit) {
          action = 'اعمال افت فشار';
        } else {
          action = 'قطع گاز';
        }
      }

      return {
        subscriptionId: industry.subscriptionId,
        name: industry.name,
        city: industry.city,
        usageCode: industry.usageCode,
        restrictionPercentage: percentage, // Approved restriction % (at that date)
        realizedReductionPct, // Actual compliance/reduction %
        violationPct,
        action,
        violationAmount,
        isCompliant
      };
    })
    .filter(item => item !== null)
    .filter(item => showCompliant ? true : !item.isCompliant)
    .filter(item => item.violationPct >= minViolationPct)
    .sort((a, b) => {
        if (a!.isCompliant === b!.isCompliant) {
            return b!.violationPct - a!.violationPct;
        }
        return a!.isCompliant ? 1 : -1;
    });
  }, [consumption, industries, restrictions, minViolationPct, warningLimit, pressureLimit, showCompliant]);

  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return reportData.slice(start, start + itemsPerPage);
  }, [reportData, currentPage, itemsPerPage]);

  const exportToGasCompanyFormat = () => {
    if (!reportData.length) return;
    
    const todayDate = new Date().toLocaleDateString('fa-IR');

    const dataToExport = reportData.map(r => {
      let finalStatus = 'نرمال';
      if (!r!.isCompliant) {
          if (r!.action === 'قطع گاز') finalStatus = 'قطع کامل';
          else finalStatus = `محدودیت ${r!.violationPct.toFixed(1)}٪`;
      }

      return {
        'نام استان': 'یزد',
        'شهر': r!.city,
        'نام صنعت': r!.name,
        'شماره اشتراک': r!.subscriptionId,
        'کد مصرف': r!.usageCode,
        'درصد محدودیت مصوب': `${r!.restrictionPercentage}٪`,
        'درصد رعایت (کاهش)': `${r!.realizedReductionPct.toFixed(1)}٪`,
        'درصد خطا/تخطی': r!.isCompliant ? '0' : `${r!.violationPct.toFixed(1)}٪`,
        'وضعیت رعایت': r!.isCompliant ? 'رعایت شده' : 'عدم رعایت',
        'تاریخ گزارش': todayDate,
        'اقدام/وضعیت': finalStatus
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "گزارش جامع ستاد");
    
    const wscols = [
      {wch: 10}, {wch: 15}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 20}
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `گزارش_جامع_ستاد_${todayDate.replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-lg flex items-center justify-between">
         <div>
            <h2 className="text-3xl font-black flex items-center gap-4">
               <Building2 className="text-indigo-300" size={32} />
               گزارشات ستاد (جامع)
            </h2>
            <p className="text-indigo-200 mt-3 text-base">
               نمایش وضعیت کلیه صنایع شامل کد مصرف، درصد محدودیت مصوب، درصد تخطی و وضعیت رعایت جهت ارائه به مراجع ذیصلاح.
            </p>
         </div>
         <FileSpreadsheet size={64} className="text-indigo-400 opacity-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row gap-6 items-end">
             <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Filter size={18} className="text-indigo-600" />
                فیلتر حداقل درصد تخطی:
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full p-3.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg ltr text-center"
                  value={minViolationPct}
                  onChange={e => { setMinViolationPct(Number(e.target.value)); setCurrentPage(1); }}
                  placeholder="0"
                />
                <span className="absolute left-4 top-3.5 text-slate-400 font-bold">%</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pb-3">
                 <input 
                    type="checkbox" 
                    id="showCompliant" 
                    checked={showCompliant} 
                    onChange={e => { setShowCompliant(e.target.checked); setCurrentPage(1); }}
                    className="w-5 h-5 accent-indigo-600 cursor-pointer"
                 />
                 <label htmlFor="showCompliant" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                    نمایش واحدهای رعایت کننده
                 </label>
            </div>

            <button 
              onClick={exportToGasCompanyFormat}
              className="flex-1 bg-green-600 text-white px-6 py-3.5 rounded-xl hover:bg-green-700 transition-all shadow-lg active:scale-95 font-bold flex justify-center items-center gap-2 h-[52px]"
            >
              <Download size={20} />
              <span>دانلود فایل اکسل (جامع)</span>
            </button>
          </div>
        </div>

        {/* Configuration for Action Logic */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h4 className="font-bold flex items-center gap-2 text-slate-800 mb-4 pb-2 border-b text-sm">
               <Settings2 size={18} /> راهنمای ستون‌ها
            </h4>
             <div className="space-y-4 text-sm text-slate-600 leading-6">
                <p>
                    <span className="font-bold text-indigo-700">۱. درصد محدودیت مصوب:</span> مقدار محدودیتی که بر اساس تاریخ آخرین رکورد محاسبه شده است.
                </p>
                <p>
                    <span className="font-bold text-emerald-600">۲. درصد رعایت (کاهش):</span> میزان کاهش مصرف واقعی نسبت به مصرف مبنای آبان ماه.
                </p>
                <p>
                    <span className="font-bold text-red-600">۳. درصد خطا (تخطی):</span> میزان انحراف مصرف واقعی از سقف مجاز.
                </p>
             </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-5 bg-slate-100 border-b font-bold text-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <span className="text-lg">لیست وضعیت صنایع</span>
               <span className="bg-white px-3 py-1 rounded text-sm flex items-center border border-slate-300">{reportData.length} مورد</span>
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
        <div className="overflow-x-auto">
             <table className="w-full text-base text-right">
              <thead className="bg-indigo-900 text-white">
                <tr>
                   <th className="p-4">نام صنعت</th>
                   <th className="p-4">شماره اشتراک</th>
                   <th className="p-4">شهر</th>
                   <th className="p-4">کد مصرف (تعرفه)</th>
                   <th className="p-4 text-center">محدودیت مصوب</th>
                   <th className="p-4 text-center text-emerald-200">درصد رعایت (کاهش)</th>
                   <th className="p-4 text-center text-red-200">درصد خطا (تخطی)</th>
                   <th className="p-4 text-center">وضعیت رعایت</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                    <tr key={idx} className={`border-b hover:bg-slate-50 ${row!.isCompliant ? '' : 'bg-red-50/30'}`}>
                        <td className="p-4 font-bold text-slate-800">{row!.name}</td>
                        <td className="p-4 font-mono text-slate-600">{row!.subscriptionId}</td>
                        <td className="p-4">{row!.city}</td>
                        <td className="p-4">
                            <span className="flex items-center gap-1 text-sm bg-slate-100 px-2 py-1 rounded-md w-fit">
                                <Layers size={14} className="opacity-50"/>
                                {row!.usageCode}
                            </span>
                        </td>
                        <td className="p-4 text-center font-bold text-indigo-700">
                             {row!.restrictionPercentage}٪
                        </td>
                         <td className="p-4 text-center font-mono font-bold text-emerald-600" dir="ltr">
                             {row!.realizedReductionPct.toFixed(1)}%
                        </td>
                        <td className="p-4 text-center font-mono font-bold text-red-600">
                            {row!.isCompliant ? '-' : `${row!.violationPct.toFixed(1)}٪`}
                        </td>
                         <td className="p-4 text-center">
                            {row!.isCompliant ? (
                                <div className="flex items-center justify-center gap-2 text-green-700 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                    <CheckCircle2 size={16} /> رعایت شده
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2 text-red-700 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-200">
                                    <XCircle size={16} /> عدم رعایت
                                </div>
                            )}
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
      </div>

    </div>
  );
};

export default HeadquartersReports;
