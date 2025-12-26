
import React, { useState, useMemo } from 'react';
import { Industry, ConsumptionRecord } from '../types';
import { FileDown, Layers, Calendar, Database } from 'lucide-react';
import { Button, Card, CardContent } from './ui/Base';
import * as XLSX from 'xlsx';
import { getDateFromIndex } from '../services/dateUtils';

interface TariffHistoryProps {
  industries: Industry[];
  consumption: ConsumptionRecord[];
}

const TariffHistory: React.FC<TariffHistoryProps> = ({ industries, consumption }) => {
  const [activeTab, setActiveTab] = useState<string>('');

  // 1. Extract Unique Tariffs (Usage Codes)
  const uniqueTariffs = useMemo(() => {
    const codes = Array.from(new Set(industries.map(i => i.usageCode))).filter(Boolean).sort();
    // Set default active tab if empty
    if (!activeTab && codes.length > 0) setActiveTab(codes[0]);
    return codes;
  }, [industries, activeTab]);

  // 2. Determine Data Columns (Dynamic Dates based on data indices)
  const dateColumns = useMemo(() => {
    // Find max index used across all data
    let maxIdx = 0;
    consumption.forEach(c => {
        c.dailyConsumptions.forEach((val, idx) => {
            if (val > 0) maxIdx = Math.max(maxIdx, idx);
        });
    });

    const cols = [];
    for (let i = 0; i <= maxIdx; i++) {
        const dateStr = getDateFromIndex(i);
        cols.push({
            index: i,
            label: dateStr // e.g. 1404/09/28
        });
    }
    return cols;
  }, [consumption]);

  // 3. Prepare Data for Active Tab
  const activeData = useMemo(() => {
    if (!activeTab) return [];
    
    // Filter industries by tariff
    const filteredInds = industries.filter(i => i.usageCode === activeTab);
    
    return filteredInds.map(ind => {
        const rec = consumption.find(c => c.subscriptionId === ind.subscriptionId);
        return {
            industry: ind,
            record: rec
        };
    });
  }, [activeTab, industries, consumption]);

  // 4. Excel Export Function
  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    uniqueTariffs.forEach(tariff => {
        const inds = industries.filter(i => i.usageCode === tariff);
        
        const sheetData = inds.map(ind => {
            const rec = consumption.find(c => c.subscriptionId === ind.subscriptionId);
            
            // Base Object
            const row: any = {
                'ایستگاه': ind.name,
                'شماره اشتراک': ind.subscriptionId,
                'شهر': ind.city,
                'ظرفیت ایستگاه': ind.stationCapacity,
                'متوسط مصرف آبان': ind.baseMonthAvg
            };

            // Dynamic Columns
            dateColumns.forEach(col => {
                const val = rec?.dailyConsumptions[col.index] || 0;
                row[col.label] = val === 0 ? '' : val; // Empty string for cleaner look or 0
            });

            return row;
        });

        // Use a safe sheet name (remove illegal chars)
        const sheetName = tariff.replace(/[\\/?*[\]]/g, ' ').substring(0, 30) || 'Tariff';
        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        
        // Adjust column widths
        const wscols = [
            {wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}
        ];
        worksheet['!cols'] = wscols;

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `سوابق_مصارف_تجمیعی_${new Date().toLocaleDateString('fa-IR').replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Database className="text-blue-600" />
                سوابق مصارف در تمام تعرفه‌ها
            </h2>
            <p className="text-slate-500 mt-1 text-sm">
                مشاهده و بررسی تاریخچه مصرف روزانه تفکیک شده بر اساس نوع تعرفه
            </p>
        </div>
        <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 shadow-lg gap-2 px-6 h-12 text-base">
            <FileDown size={20} />
            دریافت فایل اکسل (همه شیت‌ها)
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 gap-2 custom-scrollbar">
        {uniqueTariffs.map(tariff => (
            <button
                key={tariff}
                onClick={() => setActiveTab(tariff)}
                className={`
                    flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold whitespace-nowrap transition-all border-b-2
                    ${activeTab === tariff 
                        ? 'bg-white text-blue-700 border-blue-600 shadow-sm z-10' 
                        : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700'
                    }
                `}
            >
                <Layers size={16} />
                {tariff}
                <span className={`mr-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tariff ? 'bg-blue-100' : 'bg-slate-200'}`}>
                    {industries.filter(i => i.usageCode === tariff).length}
                </span>
            </button>
        ))}
      </div>

      {/* Table Card */}
      <Card className="rounded-tl-none border-t-0 shadow-xl overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-right border-collapse">
                <thead className="bg-slate-900 text-white sticky top-0 z-20">
                    <tr>
                        <th className="p-4 border-b border-slate-700 sticky right-0 bg-slate-900 min-w-[180px]">ایستگاه</th>
                        <th className="p-4 border-b border-slate-700 min-w-[120px]">شماره اشتراک</th>
                        <th className="p-4 border-b border-slate-700 min-w-[100px]">شهر</th>
                        <th className="p-4 border-b border-slate-700 min-w-[100px]">ظرفیت</th>
                        <th className="p-4 border-b border-slate-700 min-w-[120px] bg-slate-800 text-yellow-300">متوسط آبان</th>
                        {/* Dynamic Date Columns */}
                        {dateColumns.map(col => (
                            <th key={col.label} className="p-3 border-b border-slate-700 min-w-[90px] text-center font-mono text-xs whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1">
                                    <Calendar size={12} className="opacity-50" />
                                    {col.label.substring(5)} {/* Show just month/day to save space? or full */}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {activeData.map((row, idx) => (
                        <tr key={row.industry.subscriptionId} className="hover:bg-blue-50/50 transition-colors group">
                            <td className="p-4 font-bold text-slate-800 sticky right-0 bg-white group-hover:bg-blue-50/50 border-l border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                {row.industry.name}
                            </td>
                            <td className="p-4 font-mono text-slate-500">{row.industry.subscriptionId}</td>
                            <td className="p-4 text-slate-600">{row.industry.city}</td>
                            <td className="p-4 font-mono">{row.industry.stationCapacity.toLocaleString()}</td>
                            <td className="p-4 font-mono font-bold text-yellow-700 bg-yellow-50/30">
                                {row.industry.baseMonthAvg.toLocaleString()}
                            </td>
                            {dateColumns.map(col => {
                                const val = row.record?.dailyConsumptions[col.index] || 0;
                                return (
                                    <td key={col.label} className="p-3 text-center border-l border-slate-100 font-mono">
                                        {val > 0 ? (
                                            <span className="font-bold text-slate-700">{val.toLocaleString()}</span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    {activeData.length === 0 && (
                        <tr>
                            <td colSpan={5 + dateColumns.length} className="p-12 text-center text-slate-400">
                                داده‌ای برای این تعرفه یافت نشد.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
};

export default TariffHistory;
