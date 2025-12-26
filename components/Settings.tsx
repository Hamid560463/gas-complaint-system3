
import React from 'react';
import { Restriction, Industry } from '../types';

interface SettingsProps {
  restrictions: Restriction[];
  setRestrictions: React.Dispatch<React.SetStateAction<Restriction[]>>;
  industries: Industry[];
}

const Settings: React.FC<SettingsProps> = ({ restrictions, setRestrictions, industries }) => {
  // Fix: Explicitly type usageCodes as string[] to ensure 'code' is not inferred as 'unknown' in the map function
  const usageCodes: string[] = Array.from(new Set(industries.map(i => i.usageCode)));

  const updatePercentage = (code: string, val: string) => {
    const num = parseInt(val) || 0;
    const exists = restrictions.find(r => r.usageCode === code);
    if (exists) {
      setRestrictions(restrictions.map(r => r.usageCode === code ? { ...r, percentage: num } : r));
    } else {
      setRestrictions([...restrictions, { usageCode: code, percentage: num }]);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h3 className="text-xl font-bold">تنظیمات محدودیت بر اساس تعرفه</h3>
        <p className="text-slate-500 mt-2">میزان محدودیت (درصد کاهش نسبت به مصرف پایه) را مشخص کنید</p>
      </div>

      <div className="space-y-4">
        {usageCodes.length === 0 && (
          <div className="p-8 text-center bg-slate-50 border border-dashed rounded text-slate-400">
            ابتدا لیست صنایع را در بخش مدیریت داده‌ها وارد کنید.
          </div>
        )}
        {usageCodes.map(code => {
          const rest = restrictions.find(r => r.usageCode === code);
          const currentVal = rest ? rest.percentage : 0;
          
          return (
            <div key={code} className="bg-white p-6 rounded-xl border flex items-center justify-between">
              <div className="flex flex-col">
                {/* Use the full name if it exists, otherwise prepend 'Tariff' */}
                <span className="font-bold text-lg">{code.startsWith('تعرفه') ? code : `تعرفه ${code}`}</span>
                <span className="text-sm text-slate-500">
                  {industries.filter(i => i.usageCode === code).length} صنعت در این گروه
                </span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range" min="0" max="100" step="5"
                  className="w-48 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  value={currentVal}
                  onChange={e => updatePercentage(code, e.target.value)}
                />
                <div className="w-16 h-10 border rounded flex items-center justify-center font-bold bg-slate-50">
                  {currentVal}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-blue-600">
          💡
        </div>
        <div>
          <h4 className="font-bold text-blue-800">توضیح محاسبات</h4>
          <p className="text-sm text-blue-700 leading-relaxed mt-1">
            محدودیت انتخابی شما به صورت زیر اعمال می‌شود:<br/>
            <code>سقف مصرف مجاز = میانگین آبان × (۱ - درصد محدودیت)</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
