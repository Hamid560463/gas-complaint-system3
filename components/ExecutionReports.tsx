
import React, { useState, useMemo } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { AlertTriangle, Gavel, Filter, Download, AlertOctagon, Ban, Settings2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/Base';
import * as XLSX from 'xlsx';

interface ExecutionReportsProps {
  industries: Industry[];
  consumption: ConsumptionRecord[];
  restrictions: Restriction[];
}

const ExecutionReports: React.FC<ExecutionReportsProps> = ({ industries, consumption, restrictions }) => {
  // Filters
  const [minViolationPct, setMinViolationPct] = useState<number>(0);
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Threshold Configuration
  const [warningLimit, setWarningLimit] = useState<number>(20); // Up to 20% -> Warning
  const [pressureLimit, setPressureLimit] = useState<number>(50); // 20% to 50% -> Pressure Reduction, > 50% -> Cutoff

  const reportData = useMemo(() => {
    return consumption.map(rec => {
      const industry = industries.find(i => i.subscriptionId === rec.subscriptionId);
      if (!industry || !industry.baseMonthAvg) return null;

      const rest = restrictions.find(r => r.usageCode === industry.usageCode);
      const percentage = rest ? rest.percentage : 0;
      const limit = industry.baseMonthAvg * (1 - percentage / 100);

      // Determine last value logic
      let lastValue = 0;
      if (rec.lastRecordDate) {
        const parts = rec.lastRecordDate.split('/');
        const day = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(day) && day >= 1 && day <= 31) {
          lastValue = rec.dailyConsumptions[day - 1];
        }
      } else {
        let maxDay = 0;
        rec.dailyConsumptions.forEach((val, idx) => { if (val > 0) maxDay = idx + 1; });
        if (maxDay > 0) lastValue = rec.dailyConsumptions[maxDay - 1];
      }

      const violationAmount = lastValue > limit ? lastValue - limit : 0;
      const violationPct = limit > 0 ? (violationAmount / limit) * 100 : 0;

      // Determine Action based on dynamic thresholds
      let action = 'نرمال';
      let actionColor = 'text-green-600 bg-green-50';
      
      if (violationAmount > 0) {
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
      }

      return {
        subscriptionId: industry.subscriptionId,
        name: industry.name,
        city: industry.city,
        usageCode: industry.usageCode,
        allowed: limit,
        lastUsage: lastValue,
        violationAmount,
        violationPct,
        action,
        actionColor
      };
    })
    .filter(item => item !== null)
    .filter(item => item.violationAmount > 0) // Only show violators
    .filter(item => item.violationPct >= minViolationPct)
    .filter(item => {
        if (actionFilter === 'ALL') return true;
        return item.action === actionFilter;
    })
    .sort((a, b) => b!.violationPct - a!.violationPct); // Sort by Percentage desc
  }, [consumption, industries, restrictions, minViolationPct, actionFilter, warningLimit, pressureLimit]);

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
      'سقف مجاز': Math.floor(r!.allowed),
      'آخرین مصرف': r!.lastUsage,
      'میزان تخطی': Math.floor(r!.violationAmount),
      'درصد تخطی': r!.violationPct.toFixed(1) + '%',
      'اقدام اجرایی': r!.action
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "لیست اجرای پایش");
    XLSX.writeFile(workbook, `لیست_اجرای_پایش_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 no-print space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <AlertOctagon size={18} className="text-red-600" />
                فیلتر حداقل درصد تخطی:
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  className="w-full p-3.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-red-500 outline-none font-bold text-lg ltr text-center"
                  value={minViolationPct}
                  onChange={e => { setMinViolationPct(Number(e.target.value)); setCurrentPage(1); }}
                  placeholder="0"
                />
                <span className="absolute left-4 top-3.5 text-slate-400 font-bold">%</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">نمایش صنایعی که بیش از این درصد تخطی داشته‌اند.</p>
            </div>
            
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Filter size={18} className="text-blue-600" />
                فیلتر نوع اقدام:
              </label>
              <select 
                  className="w-full p-3.5 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-base"
                  value={actionFilter}
                  onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
              >
                  <option value="ALL">نمایش همه موارد</option>
                  <option value="اخطار کتبی">اخطار کتبی</option>
                  <option value="اعمال افت فشار">اعمال افت فشار</option>
                  <option value="قطع گاز">قطع گاز</option>
              </select>
              <p className="text-xs text-slate-400 mt-2">فیلتر لیست بر اساس اقدام پیشنهادی.</p>
            </div>

            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3.5 rounded-xl hover:bg-green-700 transition-all shadow-lg active:scale-95 font-bold whitespace-nowrap"
            >
              <Download size={20} />
              <span>دانلود اکسل داخلی</span>
            </button>
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
                لیست مشمولین اعمال محدودیت (نمای داخلی)
              </h3>
              <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-bold">
                {reportData.length} واحد شناسایی شد
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
                  <th className="p-5 font-bold">سقف مجاز</th>
                  <th className="p-5 font-bold">آخرین مصرف</th>
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
                    <td className="p-5 font-mono text-slate-600">{Math.floor(row!.allowed).toLocaleString()}</td>
                    <td className="p-5 font-mono text-blue-700 font-bold">{row!.lastUsage.toLocaleString()}</td>
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
            <p className="text-base mt-2">مقدار "حداقل درصد تخطی" را کاهش دهید یا فیلتر اقدام را تغییر دهید.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionReports;
