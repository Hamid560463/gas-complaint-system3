
import React, { useState } from 'react';
import { Industry, ConsumptionRecord } from '../types';
import * as XLSX from 'xlsx';
import { FolderOpen } from 'lucide-react';

interface DataManagementProps {
  industries: Industry[];
  setIndustries: React.Dispatch<React.SetStateAction<Industry[]>>;
  consumption: ConsumptionRecord[];
  setConsumption: React.Dispatch<React.SetStateAction<ConsumptionRecord[]>>;
}

const DataManagement: React.FC<DataManagementProps> = ({ industries, setIndustries, consumption, setConsumption }) => {
  const [activeTab, setActiveTab] = useState<'MASTER' | 'CONSUMPTION'>('MASTER');
  const [manualIndustry, setManualIndustry] = useState<Partial<Industry>>({});

  const handleAddIndustry = () => {
    if (!manualIndustry.subscriptionId || !manualIndustry.name) return;
    setIndustries([...industries, manualIndustry as Industry]);
    setManualIndustry({});
  };

  const handleOpenDataFolder = () => {
    if (window.electronAPI && window.electronAPI.openDataFolder) {
      window.electronAPI.openDataFolder();
    } else {
      alert('این قابلیت فقط در نسخه دسکتاپ (EXE) فعال است.');
    }
  };

  const compareDates = (date1: string, date2: string) => {
    const p1 = date1.split('/').map(Number);
    const p2 = date2.split('/').map(Number);
    // Fallback for non-standard formats
    if (p1.length !== 3 || p2.length !== 3) return date1.localeCompare(date2);
    
    if (p1[0] !== p2[0]) return p1[0] - p2[0];
    if (p1[1] !== p2[1]) return p1[1] - p2[1];
    return p1[2] - p2[2];
  };

  const handleFileUpload = (type: 'MASTER' | 'CONSUMPTION', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target?.result;
      if (!arrayBuffer) return;

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (type === 'MASTER') {
        const newIndustries: Industry[] = jsonData.map((row: any) => ({
          subscriptionId: String(row['شماره اشتراک'] || row['subscriptionId'] || ''),
          name: row['ایستگاه'] || row['name'] || '',
          city: row['شهر'] || row['city'] || '',
          usageCode: String(row['کد مصرف'] || row['usageCode'] || ''),
          stationCapacity: Number(row['ظرفیت ایستگاه'] || row['stationCapacity'] || 0),
          address: row['آدرس'] || row['address'] || (row['شهر'] || ''),
          phone: String(row['موبایل'] || row['phone'] || ''),
          baseMonthAvg: Number(row['متوسط مصرف روزانه آبان'] || row['baseMonthAvg'] || 0)
        })).filter(i => i.subscriptionId && i.name);

        if (newIndustries.length > 0) {
          const merged = [...industries];
          newIndustries.forEach(newItem => {
            const index = merged.findIndex(i => i.subscriptionId === newItem.subscriptionId);
            if (index > -1) {
              merged[index] = newItem;
            } else {
              merged.push(newItem);
            }
          });
          setIndustries(merged);
          alert(`${newIndustries.length} ردیف با موفقیت پردازش و به لیست افزوده شد.`);
        } else {
          alert('هیچ داده معتبری یافت نشد. لطفاً از صحت نام ستون‌ها اطمینان حاصل کنید.');
        }
      } else if (type === 'CONSUMPTION') {
        const newRecords: ConsumptionRecord[] = jsonData.map((row: any) => {
            const subId = String(row['شماره اشتراک'] || row['subscriptionId'] || '');
            
            // Initialize array with zeros for 31 days
            const dailyData: number[] = new Array(31).fill(0);
            let maxDate = '';

            // Iterate over all keys in the row to find date-like columns
            Object.keys(row).forEach(key => {
              let dayIndex = -1;

              // Try parsing key as pure number
              if (!isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 31) {
                dayIndex = Number(key);
              } 
              // Try parsing date string (look for /)
              else if (key.includes('/')) {
                const parts = key.split('/');
                const lastPart = parts[parts.length - 1];
                const parsedDay = parseInt(lastPart, 10);
                if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
                  dayIndex = parsedDay;
                  
                  // Check if this is the latest date
                  if (!maxDate || compareDates(key, maxDate) > 0) {
                    maxDate = key;
                  }
                }
              }

              if (dayIndex !== -1) {
                let rawVal = row[key];
                // Clean value: replace / with . for decimals if string (e.g. 17592/4 -> 17592.4)
                if (typeof rawVal === 'string') {
                  rawVal = rawVal.replace('/', '.').replace(/,/g, '');
                }
                const numVal = Number(rawVal);
                if (!isNaN(numVal)) {
                  dailyData[dayIndex - 1] = numVal;
                }
              }
            });
            
            return {
                subscriptionId: subId,
                source: 'File',
                baseMonthAvg: 0,
                dailyConsumptions: dailyData,
                lastRecordDate: maxDate
            } as ConsumptionRecord;
        }).filter(r => r.subscriptionId && r.dailyConsumptions.some(d => d > 0 || d === 0)); // Keep records even if all 0 if needed, but usually we filter empty. Kept existing filter logic roughly.

        if (newRecords.length > 0) {
             // Merge with existing records
             const merged = [...consumption];
             newRecords.forEach(newItem => {
               const index = merged.findIndex(c => c.subscriptionId === newItem.subscriptionId);
               if (index > -1) {
                 // Update existing
                 merged[index] = { 
                   ...merged[index], 
                   dailyConsumptions: newItem.dailyConsumptions, 
                   source: 'File',
                   lastRecordDate: newItem.lastRecordDate 
                 };
               } else {
                 merged.push(newItem);
               }
             });
             setConsumption(merged);
             alert(`${newRecords.length} رکورد مصرف با موفقیت بارگذاری شد.`);
        } else {
          alert('داده‌ای یافت نشد. لطفا مطمئن شوید ستون "شماره اشتراک" و ستون‌های تاریخ (مثل 1404/09/01) وجود دارند.');
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end border-b pb-1 gap-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab('MASTER')}
            className={`px-6 py-2 ${activeTab === 'MASTER' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-slate-500'}`}
          >
            بانک اطلاعات پایه (صنایع)
          </button>
          <button
            onClick={() => setActiveTab('CONSUMPTION')}
            className={`px-6 py-2 ${activeTab === 'CONSUMPTION' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-slate-500'}`}
          >
            داده‌های مصرف روزانه
          </button>
        </div>
        
        {/* New Button for Local Data Folder */}
        <button 
          onClick={handleOpenDataFolder}
          className="flex items-center gap-2 text-xs bg-slate-100 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-200 transition-colors mb-2"
          title="مشاهده محل ذخیره فایل‌های دیتابیس روی کامپیوتر"
        >
          <FolderOpen size={16} />
          <span>باز کردن پوشه ذخیره فایل‌ها</span>
        </button>
      </div>

      {activeTab === 'MASTER' ? (
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <h3 className="font-bold mb-4">ورود دستی اطلاعات پایه صنعت</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input 
                type="text" placeholder="نام ایستگاه / شرکت" 
                className="p-2 border rounded"
                value={manualIndustry.name || ''}
                onChange={e => setManualIndustry({...manualIndustry, name: e.target.value})}
              />
              <input 
                type="text" placeholder="شماره اشتراک" 
                className="p-2 border rounded"
                value={manualIndustry.subscriptionId || ''}
                onChange={e => setManualIndustry({...manualIndustry, subscriptionId: e.target.value})}
              />
               <input 
                type="text" placeholder="کد مصرف (مثال: 7)" 
                className="p-2 border rounded"
                value={manualIndustry.usageCode || ''}
                onChange={e => setManualIndustry({...manualIndustry, usageCode: e.target.value})}
              />
              <input 
                type="text" placeholder="شهر" 
                className="p-2 border rounded"
                value={manualIndustry.city || ''}
                onChange={e => setManualIndustry({...manualIndustry, city: e.target.value})}
              />
              <input 
                type="number" placeholder="ظرفیت ایستگاه" 
                className="p-2 border rounded"
                value={manualIndustry.stationCapacity || ''}
                onChange={e => setManualIndustry({...manualIndustry, stationCapacity: Number(e.target.value)})}
              />
              <input 
                type="text" placeholder="موبایل" 
                className="p-2 border rounded"
                value={manualIndustry.phone || ''}
                onChange={e => setManualIndustry({...manualIndustry, phone: e.target.value})}
              />
              <input 
                type="number" placeholder="متوسط مصرف روزانه آبان" 
                className="p-2 border rounded col-span-2 bg-yellow-50 border-yellow-200"
                value={manualIndustry.baseMonthAvg || ''}
                onChange={e => setManualIndustry({...manualIndustry, baseMonthAvg: Number(e.target.value)})}
              />
              <button 
                onClick={handleAddIndustry}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 col-span-4 mt-2"
              >
                افزودن به لیست
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="font-bold">لیست صنایع ({industries.length})</h3>
            <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              بارگذاری اکسل پایه
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={e => handleFileUpload('MASTER', e)} />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right bg-white rounded-lg border">
              <thead className="bg-slate-100 border-b font-bold text-slate-700">
                <tr>
                  <th className="p-3">ایستگاه</th>
                  <th className="p-3">شماره اشتراک</th>
                  <th className="p-3">کد مصرف</th>
                  <th className="p-3">شهر</th>
                  <th className="p-3">ظرفیت ایستگاه</th>
                  <th className="p-3">موبایل</th>
                  <th className="p-3 bg-yellow-100">متوسط مصرف آبان</th>
                  <th className="p-3">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {industries.map(ind => (
                  <tr key={ind.subscriptionId} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-bold">{ind.name}</td>
                    <td className="p-3">{ind.subscriptionId}</td>
                    <td className="p-3">{ind.usageCode}</td>
                    <td className="p-3">{ind.city}</td>
                    <td className="p-3">{ind.stationCapacity.toLocaleString()}</td>
                    <td className="p-3">{ind.phone}</td>
                    <td className="p-3 bg-yellow-50 font-bold">{ind.baseMonthAvg ? ind.baseMonthAvg.toLocaleString() : '-'}</td>
                    <td className="p-3">
                      <button 
                        onClick={() => setIndustries(industries.filter(i => i.subscriptionId !== ind.subscriptionId))}
                        className="text-red-500 hover:underline"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">پایش مصرف روزانه</h3>
            <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              بارگذاری فایل اکسل مصرف
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={e => handleFileUpload('CONSUMPTION', e)} />
            </label>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-sm text-right">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="p-3">اشتراک</th>
                  <th className="p-3">مرجع</th>
                  <th className="p-3">روزهای ثبت شده</th>
                  <th className="p-3">آخرین تاریخ</th>
                  <th className="p-3">آخرین مصرف</th>
                </tr>
              </thead>
              <tbody>
                {consumption.map(cons => (
                  <tr key={cons.subscriptionId} className="border-b">
                    <td className="p-3">{cons.subscriptionId}</td>
                    <td className="p-3">{cons.source}</td>
                    <td className="p-3">{cons.dailyConsumptions.filter(v => v > 0).length} روز</td>
                    <td className="p-3 text-slate-500 text-xs" dir="ltr">{cons.lastRecordDate || '-'}</td>
                    <td className="p-3 text-blue-600 font-bold">
                       {(() => {
                         if (cons.lastRecordDate) {
                           const parts = cons.lastRecordDate.split('/');
                           const day = parseInt(parts[parts.length-1], 10);
                           if (!isNaN(day)) return cons.dailyConsumptions[day-1]?.toLocaleString() || 0;
                         }
                         return cons.dailyConsumptions.reduce((last, curr) => curr > 0 ? curr : last, 0).toLocaleString();
                       })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded text-orange-800 text-sm leading-7">
            <strong>نکات فایل اکسل مصرف:</strong><br/>
            ۱. ستون اول باید <code>شماره اشتراک</code> باشد.<br/>
            ۲. سرستون‌های تاریخ باید شامل روز باشند (مثال: <code>1404/09/25</code> یا <code>25</code>).<br/>
            ۳. ممیز اعداد می‌تواند <code>/</code> یا <code>.</code> باشد (مثال: <code>17592/4</code>).
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
