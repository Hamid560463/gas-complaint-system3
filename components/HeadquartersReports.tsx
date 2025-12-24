
import React, { useState, useMemo } from 'react';
import { Industry, ConsumptionRecord, Restriction } from '../types';
import { Building2, Download, Filter, Settings2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
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
      
      <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-lg flex items-center justify-between">
         <div>
            <h2 className="text-2xl font-black flex items-center gap-3">
               <Building2 className="text-indigo-300" />
               گزارشات ستاد (فرمت شرکت ملی گاز)
            </h2>
            <p className="text-indigo-200 mt-2 text-sm">
               تولید فایل اکسل استاندارد جهت ارسال به ستاد مرکزی با فرمت مشخص (نام استان، شهر، نام صنعت، اشتراک، تاریخ، میزان محدودیت)
            </p>
         </div>
         <FileSpreadsheet size={48} className="text-indigo-400 opacity-50" />
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
                  className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg ltr text-center"
                  value={minViolationPct}
                  onChange={e => setMinViolationPct(Number(e.target.value))}
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
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h4 className="font-bold flex items-center gap-2 text-slate-800 mb-4 pb-2 border-b text-xs">
               <Settings2 size={16} /> معیار تعیین "قطع کامل" یا "درصد"
            </h4>
             <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-xs font-bold mb-1 text-orange-700">
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
                  <p className="text-[10px] text-slate-500 mt-2 text-justify">
                    در گزارش اکسل، برای واحدهایی که درصد تخطی آن‌ها بیش از <strong>{pressureLimit}٪</strong> باشد، عبارت <strong>"قطع کامل"</strong> و برای کمتر از آن، عدد درصد درج می‌شود.
                  </p>
               </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-100 border-b font-bold text-slate-700 flex justify-between">
            <span>پیش‌نمایش لیست ارسالی</span>
            <span className="bg-white px-2 rounded text-xs flex items-center border">{reportData.length} مورد</span>
        </div>
        <div className="overflow-x-auto">
             <table className="w-full text-sm text-right">
              <thead className="bg-indigo-900 text-white">
                <tr>
                   <th className="p-3">نام استان</th>
                   <th className="p-3">شهر</th>
                   <th className="p-3">نام صنعت</th>
                   <th className="p-3">شماره اشتراک</th>
                   <th className="p-3">تاریخ اعمال</th>
                   <th className="p-3">میزان محدودیت (خروجی)</th>
                   <th className="p-3 opacity-50 text-xs">درصد واقعی</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-3">یزد</td>
                        <td className="p-3">{row!.city}</td>
                        <td className="p-3 font-bold">{row!.name}</td>
                        <td className="p-3 font-mono">{row!.subscriptionId}</td>
                        <td className="p-3">{new Date().toLocaleDateString('fa-IR')}</td>
                        <td className="p-3 font-bold text-indigo-700">
                            {row!.action === 'قطع گاز' ? 'قطع کامل' : `${row!.violationPct.toFixed(1)}٪`}
                        </td>
                         <td className="p-3 text-slate-400 font-mono text-xs">
                            {row!.violationPct.toFixed(1)}%
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

export default HeadquartersReports;
