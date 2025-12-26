
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Industry, ConsumptionRecord } from '../types';
import * as XLSX from 'xlsx';
import { FolderOpen, Edit, XCircle, CheckCircle, Trash2, UploadCloud, Database, FileText, Eye, AlertCircle, Search, Save, Grid, CalendarDays, Calculator, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableRow, TableHead, TableCell } from './ui/Base';
import { getIndexFromDate, getDateFromIndex, START_DATE, getMonthName } from '../services/dateUtils';

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
  
  // Master List State (Search & Pagination)
  const [masterSearchTerm, setMasterSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Consumption Editing State (Search & Pagination)
  const [consumptionSearchTerm, setConsumptionSearchTerm] = useState('');
  const [consumptionPage, setConsumptionPage] = useState(1);
  const [consumptionItemsPerPage, setConsumptionItemsPerPage] = useState(20);

  const [editingConsumption, setEditingConsumption] = useState<ConsumptionRecord | null>(null);
  const [tempDailyValues, setTempDailyValues] = useState<number[]>([]);
  const [editingMonthTab, setEditingMonthTab] = useState<string>('09'); // Default to Azar (start month)

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

  // --- Master Data Pagination Logic ---
  const filteredIndustries = useMemo(() => {
    return industries.filter(ind => 
      (ind.name || '').toLowerCase().includes(masterSearchTerm.toLowerCase()) ||
      (ind.subscriptionId || '').includes(masterSearchTerm)
    );
  }, [industries, masterSearchTerm]);

  const totalPages = Math.ceil(filteredIndustries.length / itemsPerPage);
  const paginatedIndustries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredIndustries.slice(start, start + itemsPerPage);
  }, [filteredIndustries, currentPage, itemsPerPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [masterSearchTerm, itemsPerPage]);


  // --- Consumption Editing Logic ---
  const handleEditConsumption = (record: ConsumptionRecord) => {
    setEditingConsumption(record);
    // Ensure array is large enough for the season (approx 100 days)
    const values = [...record.dailyConsumptions];
    if (values.length < 100) {
        for(let i=values.length; i<100; i++) values.push(0);
    }
    setTempDailyValues(values);
    
    // Auto-select the month with the latest data, or default to Azar if empty
    let lastDataIdx = -1;
    values.forEach((v, i) => { if (v > 0) lastDataIdx = i; });
    
    if (lastDataIdx > -1) {
        const date = getDateFromIndex(lastDataIdx);
        const parts = date.split('/');
        if (parts.length > 1) setEditingMonthTab(parts[1]);
        else setEditingMonthTab('09');
    } else {
        setEditingMonthTab('09');
    }
  };

  const handleDailyValueChange = (dayIndex: number, value: string) => {
    const numValue = Number(value);
    const newValues = [...tempDailyValues];
    newValues[dayIndex] = isNaN(numValue) ? 0 : numValue;
    setTempDailyValues(newValues);
  };

  const handleSaveConsumption = () => {
    if (!editingConsumption) return;

    // Recalculate last record date based on max index with data
    let maxIdx = -1;
    tempDailyValues.forEach((val, idx) => { if (val > 0) maxIdx = idx; });
    
    let newDateStr = editingConsumption.lastRecordDate;
    if (maxIdx >= 0) {
        newDateStr = getDateFromIndex(maxIdx);
    }

    const updatedRecord: ConsumptionRecord = {
        ...editingConsumption,
        dailyConsumptions: tempDailyValues,
        lastRecordDate: newDateStr
    };

    setConsumption(prev => prev.map(c => c.subscriptionId === editingConsumption.subscriptionId ? updatedRecord : c));
    setEditingConsumption(null);
  };

  // Helper to get indices for the current active tab
  const getIndicesForMonth = (month: string) => {
      const indices: number[] = [];
      tempDailyValues.forEach((_, idx) => {
          const date = getDateFromIndex(idx);
          if (date !== "Out of Range") {
              const m = date.split('/')[1];
              if (m === month) indices.push(idx);
          }
      });
      return indices;
  };

  // Calculate totals
  const totalSum = tempDailyValues.reduce((a, b) => a + b, 0);
  const currentMonthIndices = useMemo(() => getIndicesForMonth(editingMonthTab), [editingMonthTab, tempDailyValues]);
  const currentMonthSum = currentMonthIndices.reduce((acc, idx) => acc + (tempDailyValues[idx] || 0), 0);

  // --- File Upload Logic ---
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
            // Initialize with 120 days to cover end of year comfortably
            const dailyData: number[] = new Array(120).fill(0);
            let maxDate = '';
            
            Object.keys(row).forEach(key => {
              // Try to parse key as date
              let idx = -1;
              if (key.includes('/') || key.includes('-')) {
                  idx = getIndexFromDate(key);
              } else {
                  // Fallback for "1", "2" headers? 
                  const num = parseInt(key, 10);
                  if (!isNaN(num) && num > 0 && num < 100) {
                      idx = num - 1; 
                  }
              }

              if (idx >= 0 && idx < dailyData.length) {
                let rawVal = row[key];
                if (typeof rawVal === 'string') rawVal = rawVal.replace('/', '.').replace(/,/g, '');
                const numVal = Number(rawVal);
                if (!isNaN(numVal)) {
                    dailyData[idx] = numVal;
                    // Update max date
                    const currentDate = getDateFromIndex(idx);
                    if (!maxDate || currentDate.localeCompare(maxDate) > 0) maxDate = currentDate;
                }
              }
            });

            return {
                subscriptionId: subId,
                source: 'File',
                baseMonthAvg: 0,
                dailyConsumptions: dailyData,
                lastRecordDate: maxDate
            };
        }).filter(r => r.subscriptionId && r.dailyConsumptions.some(d => d > 0)); 
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
            if (index > -1) {
                const oldData = merged[index].dailyConsumptions;
                const newData = newItem.dailyConsumptions;
                const maxLength = Math.max(oldData.length, newData.length);
                const mergedDaily = new Array(maxLength).fill(0);
                for(let i=0; i<maxLength; i++) {
                    mergedDaily[i] = newData[i] > 0 ? newData[i] : (oldData[i] || 0);
                }
                merged[index] = { 
                    ...merged[index], 
                    dailyConsumptions: mergedDaily, 
                    source: 'File', 
                    lastRecordDate: newItem.lastRecordDate.localeCompare(merged[index].lastRecordDate || '') > 0 ? newItem.lastRecordDate : merged[index].lastRecordDate 
                };
            }
            else merged.push(newItem);
          });
          setConsumption(merged);
          alert(`${previewData.length} رکورد مصرف بروزرسانی شد.`);
      }
      setPreviewData(null);
      setPreviewType(null);
  };

  // --- Consumption Pagination Logic ---
  const filteredConsumption = useMemo(() => {
    return consumption.filter(cons => {
        const ind = industries.find(i => i.subscriptionId === cons.subscriptionId);
        const search = consumptionSearchTerm.toLowerCase();
        return (
            cons.subscriptionId.includes(search) || 
            (ind && ind.name.toLowerCase().includes(search))
        );
    });
  }, [consumption, industries, consumptionSearchTerm]);

  const totalConsumptionPages = Math.ceil(filteredConsumption.length / consumptionItemsPerPage);
  const paginatedConsumption = useMemo(() => {
      const start = (consumptionPage - 1) * consumptionItemsPerPage;
      return filteredConsumption.slice(start, start + consumptionItemsPerPage);
  }, [filteredConsumption, consumptionPage, consumptionItemsPerPage]);

  useEffect(() => {
      setConsumptionPage(1);
  }, [consumptionSearchTerm, consumptionItemsPerPage]);


  const monthTabs = [
      { id: '09', label: 'آذر' },
      { id: '10', label: 'دی' },
      { id: '11', label: 'بهمن' },
      { id: '12', label: 'اسفند' },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Edit Consumption Modal */}
      {editingConsumption && createPortal(
          <div 
             className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" 
             style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
             dir="rtl"
          >
              <Card 
                className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden bg-slate-50 border-0 ring-1 ring-white/20 relative"
                style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              >
                  <CardHeader 
                    className="bg-slate-900 text-white flex flex-row justify-between items-center py-3 shrink-0 px-5"
                    style={{ backgroundColor: '#0f172a', color: 'white', flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                      <div>
                          <CardTitle className="flex items-center gap-2 text-base" style={{ color: 'white' }}>
                              <Grid className="text-blue-400" size={18} />
                              ویرایش مصارف روزانه (شروع از {START_DATE})
                          </CardTitle>
                          <div className="text-xs text-slate-300 mt-1 opacity-90 flex gap-4">
                              <span className="font-mono">{editingConsumption.subscriptionId}</span>
                              <span className="opacity-50">|</span>
                              <span>{industries.find(i => i.subscriptionId === editingConsumption.subscriptionId)?.name || 'نامشخص'}</span>
                          </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setEditingConsumption(null)} className="text-white hover:bg-slate-800 rounded-full h-8 w-8 p-0 transition-colors">
                          <XCircle size={24} />
                      </Button>
                  </CardHeader>
                  
                  {/* Month Tabs */}
                  <div className="flex justify-center bg-white border-b shrink-0 py-2 shadow-sm z-10" style={{ flexShrink: 0 }}>
                      <div className="flex bg-slate-100 p-1.5 rounded-lg gap-2 overflow-x-auto max-w-full custom-scrollbar">
                        {monthTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setEditingMonthTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold transition-all text-xs whitespace-nowrap border ${
                                    editingMonthTab === tab.id 
                                    ? 'bg-white text-blue-700 border-blue-500 shadow-sm' 
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                            >
                                <CalendarDays size={14} className={editingMonthTab === tab.id ? 'text-blue-500' : 'opacity-50'} />
                                ماه {tab.label}
                            </button>
                        ))}
                      </div>
                  </div>
                  
                  <CardContent className="overflow-y-auto p-4 bg-slate-50/50 flex-1" style={{ flex: '1 1 0%', overflowY: 'auto' }}>
                      {currentMonthIndices.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[200px]">
                              <div className="bg-slate-100 p-3 rounded-full mb-2">
                                <CalendarDays size={32} className="opacity-30"/>
                              </div>
                              <p className="font-medium text-sm">روزهای این ماه هنوز فرا نرسیده‌اند یا خارج از محدوده کاری هستند.</p>
                          </div>
                      ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                              {currentMonthIndices.map((idx) => {
                                  const dateLabel = getDateFromIndex(idx);
                                  const val = tempDailyValues[idx];
                                  return (
                                      <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1 focus-within:ring-2 focus-within:ring-blue-500 transition-all hover:border-blue-300">
                                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5 bg-slate-100 px-1 py-0.5 rounded text-center">
                                              {dateLabel}
                                          </label>
                                          <input 
                                              type="number"
                                              className={`w-full text-center text-lg font-mono font-bold outline-none bg-transparent h-7 ${val > 0 ? 'text-blue-700' : 'text-slate-300'}`}
                                              value={val}
                                              onChange={(e) => handleDailyValueChange(idx, e.target.value)}
                                              onFocus={(e) => e.target.select()}
                                          />
                                      </div>
                                  );
                              })}
                          </div>
                      )}
                  </CardContent>

                  <div className="p-3 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20" style={{ flexShrink: 0 }}>
                      <div className="flex flex-wrap justify-center gap-3 text-xs w-full md:w-auto">
                          <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-lg border border-blue-100 flex items-center gap-2 shadow-sm">
                              <Calculator size={14} className="text-blue-600" />
                              <span className="opacity-75">جمع {monthTabs.find(t => t.id === editingMonthTab)?.label}:</span>
                              <span className="font-bold text-lg">{currentMonthSum.toLocaleString()}</span>
                          </div>
                          <div className="bg-slate-50 text-slate-600 px-3 py-2 rounded-lg border border-slate-200 flex items-center gap-2">
                              <span className="opacity-75">جمع کل دوره:</span>
                              <span className="font-bold text-lg">{totalSum.toLocaleString()}</span>
                          </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setEditingConsumption(null)} className="flex-1 md:flex-none h-10 px-4">انصراف</Button>
                        <Button onClick={handleSaveConsumption} className="bg-green-600 hover:bg-green-700 gap-2 flex-1 md:flex-none w-32 h-10 shadow-lg shadow-green-900/20 text-sm">
                            <Save size={16} /> ذخیره تغییرات
                        </Button>
                      </div>
                  </div>
              </Card>
          </div>,
          document.body
      )}

      {/* Preview Import Modal */}
      {previewData && createPortal(
          <div 
             className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
             style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000 }}
             dir="rtl"
          >
              <Card className="w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 bg-white relative">
                  <CardHeader className="border-b bg-slate-50 flex flex-row justify-between items-center py-4 px-6">
                      <CardTitle className="flex items-center gap-2">
                          <Eye className="text-blue-600"/>
                          پیش‌نمایش داده‌های وارد شده ({previewData.length} مورد)
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setPreviewData(null)}><XCircle size={24}/></Button>
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
          </div>,
          document.body
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
          
          {/* Master List Controls */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
             <div className="w-full md:w-auto flex-1 flex gap-4 items-end">
                <div className="flex-1 max-w-md relative">
                   <h3 className="font-bold text-lg mb-2">لیست صنایع ({filteredIndustries.length} مورد)</h3>
                   <div className="relative">
                      <Input 
                          placeholder="جستجو نام یا شماره اشتراک..." 
                          value={masterSearchTerm}
                          onChange={(e) => setMasterSearchTerm(e.target.value)}
                          className="pl-10 h-11"
                      />
                      <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2">نمایش در هر صفحه</label>
                   <select 
                      className="h-11 border rounded-lg px-2 bg-white outline-none focus:ring-2 focus:ring-slate-900"
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                   >
                      <option value={20}>20 مورد</option>
                      <option value={50}>50 مورد</option>
                      <option value={100}>100 مورد</option>
                   </select>
                </div>
             </div>
             
             <div className="relative">
               <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx, .xls" onChange={e => handleFileUpload('MASTER', e)} />
               <Button variant="secondary" className="gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 h-11"><UploadCloud size={16} /> بارگذاری اکسل</Button>
             </div>
          </div>

          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>ایستگاه</TableHead><TableHead>شماره اشتراک</TableHead><TableHead>کد مصرف</TableHead><TableHead>شهر</TableHead><TableHead>ظرفیت</TableHead><TableHead>موبایل</TableHead><TableHead className="bg-amber-50/50">متوسط آبان</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
              <tbody>
                {paginatedIndustries.map(ind => (
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
                {paginatedIndustries.length === 0 && (
                   <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">موردی یافت نشد.</TableCell></TableRow>
                )}
              </tbody>
            </Table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between bg-slate-50">
                    <div className="text-sm text-slate-500">
                        نمایش {((currentPage - 1) * itemsPerPage) + 1} تا {Math.min(currentPage * itemsPerPage, filteredIndustries.length)} از {filteredIndustries.length} مورد
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
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
             <div className="w-full md:w-auto flex-1 flex gap-4 items-end">
                 <div className="flex-1 max-w-md relative">
                    <h3 className="font-bold flex items-center gap-2 mb-2"><FileText size={20} className="text-blue-600" /> لیست و ویرایش مصارف ({filteredConsumption.length})</h3>
                    <div className="relative">
                        <Input 
                            placeholder="جستجو نام صنعت یا شماره اشتراک..." 
                            value={consumptionSearchTerm}
                            onChange={(e) => setConsumptionSearchTerm(e.target.value)}
                            className="pl-10 h-11"
                        />
                        <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                    </div>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2">نمایش در هر صفحه</label>
                   <select 
                      className="h-11 border rounded-lg px-2 bg-white outline-none focus:ring-2 focus:ring-slate-900"
                      value={consumptionItemsPerPage}
                      onChange={(e) => setConsumptionItemsPerPage(Number(e.target.value))}
                   >
                      <option value={20}>20 مورد</option>
                      <option value={50}>50 مورد</option>
                      <option value={100}>100 مورد</option>
                   </select>
                </div>
             </div>
            <div className="relative">
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx, .xls" onChange={e => handleFileUpload('CONSUMPTION', e)} />
              <Button variant="secondary" className="gap-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 h-11"><UploadCloud size={16} /> بارگذاری اکسل مصرف (کلی)</Button>
            </div>
          </div>
          <Card>
             <Table>
              <TableHeader><TableRow><TableHead>نام صنعت</TableHead><TableHead>اشتراک</TableHead><TableHead>مرجع</TableHead><TableHead>روزهای ثبت شده</TableHead><TableHead>آخرین تاریخ</TableHead><TableHead>آخرین مصرف</TableHead><TableHead>عملیات</TableHead></TableRow></TableHeader>
              <tbody>
                {paginatedConsumption.map(cons => {
                  const industryName = industries.find(i => i.subscriptionId === cons.subscriptionId)?.name || '-';
                  return (
                  <TableRow key={cons.subscriptionId}>
                    <TableCell className="font-bold text-slate-700">{industryName}</TableCell>
                    <TableCell className="font-mono">{cons.subscriptionId}</TableCell>
                    <TableCell>{cons.source}</TableCell>
                    <TableCell>{cons.dailyConsumptions.filter(v => v > 0).length} روز</TableCell>
                    <TableCell className="text-xs text-slate-500" dir="ltr">{cons.lastRecordDate || '-'}</TableCell>
                    <TableCell className="font-bold text-blue-600 font-mono">
                       {(() => {
                         if (cons.lastRecordDate) {
                           // Use last index logic instead of parsing date tail
                           // Find last non-zero index
                           let lastIdx = -1;
                           cons.dailyConsumptions.forEach((v, i) => { if(v > 0) lastIdx = i; });
                           if (lastIdx !== -1) return cons.dailyConsumptions[lastIdx].toLocaleString();
                         }
                         return 0;
                       })()}
                    </TableCell>
                    <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleEditConsumption(cons)} className="text-blue-600 hover:bg-blue-50 gap-1 px-2">
                             <Edit size={14} /> ویرایش مقادیر
                        </Button>
                    </TableCell>
                  </TableRow>
                )})}
                {paginatedConsumption.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                             موردی یافت نشد.
                        </TableCell>
                    </TableRow>
                )}
              </tbody>
            </Table>
            
            {/* Pagination Controls */}
            {totalConsumptionPages > 1 && (
                <div className="p-4 border-t flex items-center justify-between bg-slate-50">
                    <div className="text-sm text-slate-500">
                        نمایش {((consumptionPage - 1) * consumptionItemsPerPage) + 1} تا {Math.min(consumptionPage * consumptionItemsPerPage, filteredConsumption.length)} از {filteredConsumption.length} مورد
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={consumptionPage === 1}
                            onClick={() => setConsumptionPage(prev => prev - 1)}
                            className="w-9 h-9 p-0"
                        >
                            <ChevronRight size={16} />
                        </Button>
                        <div className="flex items-center justify-center font-bold text-sm min-w-[30px]">
                            {consumptionPage} / {totalConsumptionPages}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={consumptionPage === totalConsumptionPages}
                            onClick={() => setConsumptionPage(prev => prev + 1)}
                            className="w-9 h-9 p-0"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                    </div>
                </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
