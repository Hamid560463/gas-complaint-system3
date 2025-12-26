
import React, { useState, useMemo } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { Building2, Download, Filter, Settings2, AlertTriangle, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/Base';
import * as XLSX from 'xlsx';

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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

      // Determine Action
      let action = 'نرمال';
      if (violationAmount > 0) {
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
        violationPct,
        action,
        violationAmount
      };
    })
    .filter(item => item !== null)
    .filter(item => item.violationAmount > 0) 
    .filter(item => item.violationPct >= minViolationPct)
    .sort((a, b) => b!.violationPct - a!.violationPct);
  }, [consumption, industries, restrictions, minViolationPct, warningLimit, pressureLimit]);

  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return reportData.slice(start, start + itemsPerPage);
  }, [reportData, currentPage, itemsPerPage]);

  const exportToGasCompanyFormat = () => {
    if (!reportData.length) return;
    
    const todayDate = new Date().toLocaleDateString('fa-IR');

    const dataToExport = reportData.map(r => {
      // Logic for "Restriction Amount" column based on National Gas Company request
      let restrictionValue = '';
      if (r!.action === 'قطع گاز') {
        restrictionValue = 'قطع کامل';
      } else {
        restrictionValue = `${r!.violationPct.toFixed(1)}٪`;
      }

      return {
        'نام استان': 'یزد',
        'شهر': r!.city,
        'نام صنعت': r!.name,
        'شماره اشتراک': r!.subscriptionId,
        'تاریخ اعمال محدودیت': todayDate,
        'میزان محدودیت': restrictionValue
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "لیست اعمال محدودیت");
    
    // Adjust column widths
    const wscols = [
      {wch: 15}, // Province
      {wch: 15}, // City
      {wch: 30}, // Name
      {wch: 20}, // SubId
      {wch: 20}, // Date
      {wch: 20}  // Amount
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `گزارش_ستاد_گاز_${todayDate.replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-lg flex items-center justify-between">
         <div>
            <h2 className="text-3xl font-black flex items-center gap-4">
               <Building2 className="text-indigo-300" size={32} />
               گزارشات ستاد (فرمت شرکت ملی گاز)
            </h2>
            <p className="text-indigo-200 mt-3 text-base">
               تولید فایل اکسل استاندارد جهت ارسال به ستاد مرکزی با فرمت مشخص (نام استان، شهر، نام صنعت، اشتراک، تاریخ، میزان محدودیت)
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

            <button 
              onClick={exportToGasCompanyFormat}
              className="flex-1 bg-green-600 text-white px-6 py-3.5 rounded-xl hover:bg-green-700 transition-all shadow-lg active:scale-95 font-bold flex justify-center items-center gap-2 h-[52px]"
            >
              <Download size={20} />
              <span>دانلود فایل اکسل (فرمت ستاد)</span>
            </button>
          </div>
        </div>

        {/* Configuration for Action Logic */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h4 className="font-bold flex items-center gap-2 text-slate-800 mb-4 pb-2 border-b text-sm">
               <Settings2 size={18} /> معیار تعیین "قطع کامل" یا "درصد"
            </h4>
             <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-sm font-bold mb-1 text-orange-700">
                     <span>حد قطع گاز (بالای این مقدار = قطع کامل)</span>
                     <span>{pressureLimit}%</span>
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
                  <p className="text-xs text-slate-500 mt-2 text-justify leading-5">
                    در گزارش اکسل، برای واحدهایی که درصد تخطی آن‌ها بیش از <strong>{pressureLimit}٪</strong> باشد، عبارت <strong>"قطع کامل"</strong> و برای کمتر از آن، عدد درصد درج می‌شود.
                  </p>
               </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-5 bg-slate-100 border-b font-bold text-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <span className="text-lg">پیش‌نمایش لیست ارسالی</span>
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
                   <th className="p-4">نام استان</th>
                   <th className="p-4">شهر</th>
                   <th className="p-4">نام صنعت</th>
                   <th className="p-4">شماره اشتراک</th>
                   <th className="p-4">تاریخ اعمال</th>
                   <th className="p-4">میزان محدودیت (خروجی)</th>
                   <th className="p-4 opacity-70 text-sm">درصد واقعی</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-4">یزد</td>
                        <td className="p-4">{row!.city}</td>
                        <td className="p-4 font-bold text-slate-800">{row!.name}</td>
                        <td className="p-4 font-mono text-slate-600">{row!.subscriptionId}</td>
                        <td className="p-4">{new Date().toLocaleDateString('fa-IR')}</td>
                        <td className="p-4 font-bold text-indigo-700">
                            {row!.action === 'قطع گاز' ? 'قطع کامل' : `${row!.violationPct.toFixed(1)}٪`}
                        </td>
                         <td className="p-4 text-slate-400 font-mono text-sm">
                            {row!.violationPct.toFixed(1)}%
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
