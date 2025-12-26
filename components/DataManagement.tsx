
import React, { useState } from 'react';
import { Industry, ConsumptionRecord } from '../types';
import * as XLSX from 'xlsx';
import { FolderOpen, Edit, XCircle, CheckCircle, Trash2, UploadCloud, Database, FileText, Eye, AlertCircle } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableRow, TableHead, TableCell } from './ui/Base';

interface DataManagementProps {
  industries: Industry[];
  setIndustries: React.Dispatch<React.SetStateAction<Industry[]>>;
  consumption: ConsumptionRecord[];
  setConsumption: React.Dispatch<React.SetStateAction<ConsumptionRecord[]>>;
}

const DataManagement: React.FC<DataManagementProps> = ({ industries, setIndustries, consumption, setConsumption }) => {
  const [activeTab, setActiveTab] = useState<'MASTER' | 'CONSUMPTION'>('MASTER');
  const [manualIndustry, setManualIndustry] = useState<Partial<Industry>>({});
  const [isEditing, setIsEditing] = useState(false);
  
  // Preview State
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewType, setPreviewType] = useState<'MASTER' | 'CONSUMPTION' | null>(null);

  const mapUsageCode = (rawCode: string) => {
    const c = rawCode.trim();
    switch(c) {
      case '7': return 'تعرفه 7 (کاشی و سرامیک)';
      case '10': return 'تعرفه 10 (گچ و آهک)';
      case '6': return 'تعرفه 6 (شیشه)';
      case '5': return 'تعرفه 5 (قند و شکر)';
      case '8': return 'تعرفه 8 (صنایع فلزی)';
      case '4': return 'تعرفه 4 (آجر)';
      default: return c;
    }
  };

  const handleSaveIndustry = () => {
    if (!manualIndustry.subscriptionId || !manualIndustry.name) {
      alert('لطفاً نام و شماره اشتراک را وارد کنید.');
      return;
    }
    if (isEditing) {
      setIndustries(prev => prev.map(item => item.subscriptionId === manualIndustry.subscriptionId ? manualIndustry as Industry : item));
      setIsEditing(false);
    } else {
      if (industries.some(i => i.subscriptionId === manualIndustry.subscriptionId)) {
        alert('این شماره اشتراک قبلاً ثبت شده است.');
        return;
      }
      setIndustries([...industries, manualIndustry as Industry]);
    }
    setManualIndustry({});
  };

  const handleEdit = (industry: Industry) => {
    setManualIndustry(industry);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => { setManualIndustry({}); setIsEditing(false); };
  
  const handleOpenDataFolder = () => {
    if (window.electronAPI && window.electronAPI.openDataFolder) window.electronAPI.openDataFolder();
    else alert('این قابلیت فقط در نسخه دسکتاپ (EXE) فعال است.');
  };

  const compareDates = (date1: string, date2: string) => {
    const p1 = date1.split('/').map(Number);
    const p2 = date2.split('/').map(Number);
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
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (type === 'MASTER') {
        const newIndustries = jsonData.map((row: any) => ({
          subscriptionId: String(row['شماره اشتراک'] || row['subscriptionId'] || ''),
          name: row['ایستگاه'] || row['name'] || '',
          city: row['شهر'] || row['city'] || '',
          usageCode: mapUsageCode(String(row['کد مصرف'] || row['usageCode'] || '')),
          stationCapacity: Number(row['ظرفیت ایستگاه'] || row['stationCapacity'] || 0),
          address: row['آدرس'] || row['address'] || (row['شهر'] || ''),
          phone: String(row['موبایل'] || row['phone'] || ''),
          baseMonthAvg: Number(row['متوسط مصرف روزانه آبان'] || row['baseMonthAvg'] || 0)
        })).filter(i => i.subscriptionId && i.name);
        setPreviewData(newIndustries);
        setPreviewType('MASTER');
      } else {
        const newRecords = jsonData.map((row: any) => {
            const subId = String(row['شماره اشتراک'] || row['subscriptionId'] || '');
            const dailyData: number[] = new Array(31).fill(0);
            let maxDate = '';
            Object.keys(row).forEach(key => {
              let dayIndex = -1;
              if (!isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 31) dayIndex = Number(key);
              else if (key.includes('/')) {
                const parts = key.split('/');
                const parsedDay = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
                  dayIndex = parsedDay;
                  if (!maxDate || compareDates(key, maxDate) > 0) maxDate = key;
                }
              }
              if (dayIndex !== -1) {
                let rawVal = row[key];
                if (typeof rawVal === 'string') rawVal = rawVal.replace('/', '.').replace(/,/g, '');
                const numVal = Number(rawVal);
                if (!isNaN(numVal)) dailyData[dayIndex - 1] = numVal;
              }
            });
            return {
                subscriptionId: subId,
                source: 'File',
                baseMonthAvg: 0,
                dailyConsumptions: dailyData,
                lastRecordDate: maxDate
            };
        }).filter(r => r.subscriptionId && r.dailyConsumptions.some(d => d > 0 || d === 0)); 
        setPreviewData(newRecords);
        setPreviewType('CONSUMPTION');
      }
      e.target.value = ''; // Reset input
    };
    reader.readAsArrayBuffer(file);
  };

  const commitPreview = () => {
      if (!previewData || !previewType) return;
      
      if (previewType === 'MASTER') {
          const merged = [...industries];
          previewData.forEach((newItem: Industry) => {
            const index = merged.findIndex(i => i.subscriptionId === newItem.subscriptionId);
            if (index > -1) merged[index] = newItem; else merged.push(newItem);
          });
          setIndustries(merged);
          alert(`${previewData.length} ردیف اضافه شد.`);
      } else {
          const merged = [...consumption];
          previewData.forEach((newItem: ConsumptionRecord) => {
            const index = merged.findIndex(c => c.subscriptionId === newItem.subscriptionId);
            if (index > -1) merged[index] = { ...merged[index], dailyConsumptions: newItem.dailyConsumptions, source: 'File', lastRecordDate: newItem.lastRecordDate };
            else merged.push(newItem);
          });
          setConsumption(merged);
          alert(`${previewData.length} رکورد مصرف بروزرسانی شد.`);
      }
      setPreviewData(null);
      setPreviewType(null);
  };

  return (
    <div className="space-y-6 relative">
      {/* Preview Modal */}
      {previewData && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                  <CardHeader className="border-b bg-slate-50 flex flex-row justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                          <Eye className="text-blue-600"/>
                          پیش‌نمایش داده‌های وارد شده ({previewData.length} مورد)
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setPreviewData(null)}><XCircle size={20}/></Button>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto p-0">
                      <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex items-center gap-2 text-yellow-800 text-sm">
                          <AlertCircle size={16}/>
                          لطفاً داده‌ها را بررسی کنید. در صورت تایید، دکمه "ثبت نهایی" را بزنید.
                      </div>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>اشتراک</TableHead>
                                  {previewType === 'MASTER' ? (
                                      <>
                                          <TableHead>نام</TableHead>
                                          <TableHead>تعرفه</TableHead>
                                          <TableHead>ظرفیت</TableHead>
                                      </>
                                  ) : (
                                      <>
                                          <TableHead>آخرین تاریخ</TableHead>
                                          <TableHead>تعداد روز</TableHead>
                                      </>
                                  )}
                              </TableRow>
                          </TableHeader>
                          <tbody>
                              {previewData.slice(0, 50).map((row, idx) => (
                                  <TableRow key={idx}>
                                      <TableCell>{row.subscriptionId}</TableCell>
                                      {previewType === 'MASTER' ? (
                                          <>
                                              <TableCell>{row.name}</TableCell>
                                              <TableCell>{row.usageCode}</TableCell>
                                              <TableCell>{row.stationCapacity}</TableCell>
                                          </>
                                      ) : (
                                          <>
                                              <TableCell>{row.lastRecordDate || '-'}</TableCell>
                                              <TableCell>{row.dailyConsumptions.filter((v: number) => v > 0).length}</TableCell>
                                          </>
                                      )}
                                  </TableRow>
                              ))}
                              {previewData.length > 50 && <TableRow><TableCell colSpan={4} className="text-center text-slate-400">... و {previewData.length - 50} مورد دیگر</TableCell></TableRow>}
                          </tbody>
                      </Table>
                  </CardContent>
                  <div className="p-4 border-t flex justify-end gap-3 bg-slate-50">
                      <Button variant="outline" onClick={() => setPreviewData(null)}>لغو</Button>
                      <Button onClick={commitPreview} className="bg-green-600 hover:bg-green-700">ثبت نهایی و ذخیره</Button>
                  </div>
              </Card>
          </div>
      )}

      <div className="flex justify-between items-center pb-4 border-b">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button onClick={() => setActiveTab('MASTER')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'MASTER' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>اطلاعات پایه صنایع</button>
          <button onClick={() => setActiveTab('CONSUMPTION')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'CONSUMPTION' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>داده‌های مصرف روزانه</button>
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenDataFolder} className="gap-2"><FolderOpen size={14} /> باز کردن پوشه دیتا</Button>
      </div>

      {activeTab === 'MASTER' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <Card className={`${isEditing ? 'border-amber-200 bg-amber-50/30' : ''}`}>
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-base">
                 {isEditing ? <Edit size={18} className="text-amber-600"/> : <Database size={18} className="text-blue-600"/>}
                 {isEditing ? 'ویرایش اطلاعات صنعت' : 'ورود دستی اطلاعات جدید'}
               </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input placeholder="نام ایستگاه / شرکت" value={manualIndustry.name || ''} onChange={e => setManualIndustry({...manualIndustry, name: e.target.value})} />
                <Input placeholder="شماره اشتراک" disabled={isEditing} value={manualIndustry.subscriptionId || ''} onChange={e => setManualIndustry({...manualIndustry, subscriptionId: e.target.value})} />
                <Input placeholder="کد مصرف (مثال: 7)" value={manualIndustry.usageCode || ''} onChange={e => setManualIndustry({...manualIndustry, usageCode: e.target.value})} />
                <Input placeholder="شهر" value={manualIndustry.city || ''} onChange={e => setManualIndustry({...manualIndustry, city: e.target.value})} />
                <Input type="number" placeholder="ظرفیت ایستگاه" value={manualIndustry.stationCapacity || ''} onChange={e => setManualIndustry({...manualIndustry, stationCapacity: Number(e.target.value)})} />
                <Input placeholder="موبایل" value={manualIndustry.phone || ''} onChange={e => setManualIndustry({...manualIndustry, phone: e.target.value})} />
                <Input type="number" placeholder="متوسط مصرف روزانه آبان" className="col-span-2 border-blue-200 bg-blue-50/50" value={manualIndustry.baseMonthAvg || ''} onChange={e => setManualIndustry({...manualIndustry, baseMonthAvg: Number(e.target.value)})} />
                {isEditing ? (
                  <div className="col-span-4 flex gap-2">
                    <Button onClick={handleSaveIndustry} className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700"><CheckCircle size={16} /> ثبت تغییرات</Button>
                    <Button variant="outline" onClick={handleCancelEdit} className="flex-1 gap-2"><XCircle size={16} /> انصراف</Button>
                  </div>
                ) : <Button onClick={handleSaveIndustry} className="col-span-4 mt-2">افزودن به لیست</Button>}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">لیست صنایع ({industries.length})</h3>
            <div className="relative">
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx, .xls" onChange={e => handleFileUpload('MASTER', e)} />
              <Button variant="secondary" className="gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"><UploadCloud size={16} /> بارگذاری اکسل</Button>
            </div>
          </div>
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>ایستگاه</TableHead><TableHead>شماره اشتراک</TableHead><TableHead>کد مصرف</TableHead><TableHead>شهر</TableHead><TableHead>ظرفیت</TableHead><TableHead>موبایل</TableHead><TableHead className="bg-amber-50/50">متوسط آبان</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
              <tbody>
                {industries.map(ind => (
                  <TableRow key={ind.subscriptionId} className={isEditing && manualIndustry.subscriptionId === ind.subscriptionId ? 'bg-amber-50' : ''}>
                    <TableCell className="font-medium">{ind.name}</TableCell>
                    <TableCell>{ind.subscriptionId}</TableCell>
                    <TableCell>{ind.usageCode}</TableCell>
                    <TableCell>{ind.city}</TableCell>
                    <TableCell>{ind.stationCapacity.toLocaleString()}</TableCell>
                    <TableCell>{ind.phone}</TableCell>
                    <TableCell className="bg-amber-50/30 font-bold">{ind.baseMonthAvg ? ind.baseMonthAvg.toLocaleString() : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(ind)} className="h-8 w-8 p-0 text-blue-600"><Edit size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { if (window.confirm('حذف شود؟')) { setIndustries(industries.filter(i => i.subscriptionId !== ind.subscriptionId)); if (isEditing && manualIndustry.subscriptionId === ind.subscriptionId) handleCancelEdit(); } }} className="h-8 w-8 p-0 text-red-500"><Trash2 size={14} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><FileText size={20} className="text-blue-600" /> لیست مصارف ثبت شده</h3>
            <div className="relative">
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx, .xls" onChange={e => handleFileUpload('CONSUMPTION', e)} />
              <Button variant="secondary" className="gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"><UploadCloud size={16} /> بارگذاری اکسل مصرف</Button>
            </div>
          </div>
          <Card>
             <Table>
              <TableHeader><TableRow><TableHead>اشتراک</TableHead><TableHead>مرجع</TableHead><TableHead>روزهای ثبت شده</TableHead><TableHead>آخرین تاریخ</TableHead><TableHead>آخرین مصرف</TableHead></TableRow></TableHeader>
              <tbody>
                {consumption.map(cons => (
                  <TableRow key={cons.subscriptionId}>
                    <TableCell className="font-mono">{cons.subscriptionId}</TableCell>
                    <TableCell>{cons.source}</TableCell>
                    <TableCell>{cons.dailyConsumptions.filter(v => v > 0).length} روز</TableCell>
                    <TableCell className="text-xs text-slate-500" dir="ltr">{cons.lastRecordDate || '-'}</TableCell>
                    <TableCell className="font-bold text-blue-600 font-mono">
                       {(() => {
                         if (cons.lastRecordDate) {
                           const parts = cons.lastRecordDate.split('/');
                           const day = parseInt(parts[parts.length-1], 10);
                           if (!isNaN(day)) return cons.dailyConsumptions[day-1]?.toLocaleString() || 0;
                         }
                         return cons.dailyConsumptions.reduce((last, curr) => curr > 0 ? curr : last, 0).toLocaleString();
                       })()}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
