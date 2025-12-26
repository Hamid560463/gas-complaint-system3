
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Base';
import { HelpCircle, LayoutDashboard, FileSpreadsheet, Settings, Printer, Download, Calculator, Sigma, Activity, AlertOctagon, Info, CheckCircle2, Zap, ShieldAlert, BarChart3, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

const Help: React.FC = () => {

  const handleDownloadSample = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Base Info
    const wsDataMaster = [
        ["نام ایستگاه", "شماره اشتراک", "کد مصرف", "شهر", "ظرفیت ایستگاه", "موبایل", "متوسط مصرف روزانه آبان"],
        ["کارخانه کاشی نمونه", "100001", "7", "یزد", 2500, "09131234567", 5000],
        ["فولاد نمونه", "100002", "8", "اردکان", 5000, "09139876543", 12000]
    ];
    const wsMaster = XLSX.utils.aoa_to_sheet(wsDataMaster);
    // Auto-width for master sheet
    wsMaster['!cols'] = [{wch:20}, {wch:15}, {wch:10}, {wch:10}, {wch:15}, {wch:15}, {wch:25}];
    XLSX.utils.book_append_sheet(wb, wsMaster, "اطلاعات پایه");

    // Sheet 2: Consumption
    const wsDataCons = [
        ["شماره اشتراک", "1404/09/28", "1404/09/29", "1404/09/30", "1404/10/01"],
        ["100001", 4800, 5100, 4950, 5000],
        ["100002", 11000, 11500, 11200, 11800]
    ];
    const wsCons = XLSX.utils.aoa_to_sheet(wsDataCons);
    XLSX.utils.book_append_sheet(wb, wsCons, "مصرف روزانه");

    XLSX.writeFile(wb, "Sample_Template_GasMonitoring.xlsx");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-slate-900">راهنمای جامع سامانه پایش گاز</h1>
        <p className="text-slate-500 mt-2 font-medium">مستندات فنی، معرفی قابلیت‌ها و آموزش گام‌به‌گام</p>
      </div>

      {/* 1. Software Introduction & Capabilities */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="bg-blue-600 text-white p-4 px-6 flex items-center gap-3">
            <Info className="text-white" />
            <h2 className="font-bold text-lg">معرفی نرم‌افزار و قابلیت‌ها</h2>
        </div>
        <div className="p-6 space-y-6">
            <p className="text-slate-700 leading-8 text-justify">
                <strong>سامانه پایش مصرف گاز صنایع</strong> یک راهکار نرم‌افزاری جامع جهت مدیریت هوشمند و نظارت بر مصرف گاز در بخش صنعتی استان یزد است. 
                هدف اصلی این سامانه، مدیریت ناترازی گاز در فصول سرد سال، اعمال عادلانه محدودیت‌ها بر اساس مصوبات و شناسایی خودکار تخلفات است. 
                این سیستم با جایگزینی فرآیندهای دستی و محاسبات پیچیده اکسل، سرعت و دقت تصمیم‌گیری مدیران را به طرز چشمگیری افزایش می‌دهد.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Zap size={18} className="text-amber-500"/> قابلیت‌های کلیدی
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-green-600 mt-1 shrink-0"/>
                            <span><strong>داشبورد مدیریتی هوشمند:</strong> نمایش وضعیت لحظه‌ای مصرف، درصد رعایت محدودیت‌ها و شناسایی سریع صنایع پرمصرف.</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-green-600 mt-1 shrink-0"/>
                            <span><strong>محاسبه خودکار تخلفات:</strong> اعمال فرمول‌های پیچیده محدودیت (بر اساس میانگین آبان) به صورت آنی برای هزاران رکورد.</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-green-600 mt-1 shrink-0"/>
                            <span><strong>گزارش‌گیری چندگانه:</strong> تولید گزارشات استاندارد جهت ارسال به ستاد ملی گاز، گزارشات اجرایی برای تیم‌های بازرسی و نمودارهای تحلیلی.</span>
                        </li>
                    </ul>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Database size={18} className="text-blue-500"/> مدیریت داده‌ها
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-green-600 mt-1 shrink-0"/>
                            <span><strong>ورود منعطف اطلاعات:</strong> قابلیت بارگذاری فایل‌های اکسل حجیم یا ویرایش دستی اطلاعات هر صنعت.</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-green-600 mt-1 shrink-0"/>
                            <span><strong>تاریخچه و سوابق:</strong> نگهداری سوابق مصرف روزانه در تمام طول دوره و امکان مقایسه روند مصرف.</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-green-600 mt-1 shrink-0"/>
                            <span><strong>پیکربندی پویا:</strong> امکان تغییر درصد محدودیت‌ها برای هر صنف به صورت جداگانه و بروزرسانی آنی نتایج.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
      </div>

      {/* 2. Technical Formulas & Logic (Refactored to List view) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center gap-3">
            <Calculator className="text-blue-400" />
            <h2 className="font-bold text-lg">فرمول‌ها و مستندات فنی محاسبات</h2>
        </div>
        <div className="p-6 flex flex-col gap-6">
            
            {/* Allowed Limit */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2">
                     <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <Sigma size={20} className="text-blue-600" /> ۱. فرمول محاسبه سقف مجاز
                    </h3>
                    <p className="text-sm text-slate-600 leading-7 text-justify">
                        سقف مجاز روزانه برای هر واحد صنعتی، بر اساس میانگین مصرف آن واحد در ماه مبنا (آبان) و درصد محدودیت تعیین شده برای آن تعرفه محاسبه می‌شود.
                        <span className="block mt-1 text-slate-400 text-xs">مثال: اگر میانگین ۱۰۰۰ باشد و محدودیت ۲۰٪، سقف مجاز ۸۰۰ خواهد بود.</span>
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-center font-mono text-sm text-slate-800 w-full md:w-auto min-w-[300px]" dir="ltr">
                    Allowed Limit = Base Month Avg × (1 - Restriction% / 100)
                </div>
            </div>

            {/* Violation Calculation */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <Activity size={20} className="text-red-600" /> ۲. محاسبه میزان و درصد تخطی
                    </h3>
                    <p className="text-sm text-slate-600 leading-7 text-justify">
                        اگر آخرین مصرف ثبت شده بیشتر از سقف مجاز باشد، تخطی رخ داده است. 
                        درصد تخطی نسبت مقدار مازاد به سقف مجاز است که معیاری برای تعیین شدت تخلف می‌باشد.
                    </p>
                </div>
                <div className="space-y-2 w-full md:w-auto min-w-[300px]">
                    <div className="bg-red-50 p-3 px-4 rounded border border-red-100 flex justify-between items-center text-xs shadow-sm">
                        <span className="font-bold text-red-800">میزان تخطی (m³):</span>
                        <code className="font-mono text-red-900 font-bold" dir="ltr">Last Usage - Allowed Limit</code>
                    </div>
                    <div className="bg-red-50 p-3 px-4 rounded border border-red-100 flex justify-between items-center text-xs shadow-sm">
                        <span className="font-bold text-red-800">درصد تخطی:</span>
                        <code className="font-mono text-red-900 font-bold" dir="ltr">(Violation Amt ÷ Allowed Limit) × 100</code>
                    </div>
                </div>
            </div>

            {/* Action Logic */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-3">
                    <AlertOctagon size={20} className="text-orange-600" /> ۳. منطق تعیین اقدام اجرایی
                </h3>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <p className="text-sm text-slate-600 leading-7 text-justify flex-1">
                        در بخش "پایش و تخلفات"، نوع برخورد با مشترک بر اساس "درصد تخطی" تعیین می‌شود. بازه‌های روبرو به صورت پیش‌فرض فعال هستند (این بازه‌ها در همان صفحه قابل تنظیم و تغییر می‌باشند).
                    </p>
                    <ul className="text-sm space-y-2 bg-white p-4 rounded-lg border border-slate-200 w-full md:w-auto min-w-[300px] shadow-sm">
                        <li className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                            <span><strong>اخطار کتبی:</strong> تخطی بین ۱٪ تا ۲۰٪</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                            <span><strong>اعمال افت فشار:</strong> تخطی بین ۲۰٪ تا ۵۰٪</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                            <span><strong>قطع گاز:</strong> تخطی بیش از ۵۰٪</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Dashboard Metrics */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <LayoutDashboard size={20} className="text-green-600" /> ۴. شاخص رعایت سقف (داشبورد)
                    </h3>
                    <p className="text-sm text-slate-600 leading-7 text-justify">
                        درصدی که در کارت‌های بالای داشبورد نمایش داده می‌شود، نشان‌دهنده نسبت تعداد واحدهای "رعایت‌کننده" به "کل واحدها" است.
                        <span className="block mt-2 text-xs text-slate-500 bg-white p-2 rounded border border-slate-200 inline-block">
                            <strong>نکته:</strong> صنایعی که هنوز داده مصرف روزانه برای آن‌ها بارگذاری نشده، به صورت پیش‌فرض در دسته "رعایت‌کننده" شمارش می‌شوند.
                        </span>
                    </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm text-center font-mono text-xs text-green-900 font-bold w-full md:w-auto min-w-[350px]" dir="ltr">
                    ((Total Count - Violation Count) ÷ Total Count) × 100
                </div>
            </div>

        </div>
      </div>

      {/* 3. User Guide Steps */}
      <div className="grid gap-6">
        <h2 className="text-2xl font-black text-slate-800 mr-2 flex items-center gap-2">
            <HelpCircle className="text-slate-600"/>
            راهنمای کار با نرم‌افزار
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileSpreadsheet /></div>
                گام اول: ورود اطلاعات پایه و مصرف
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-700">
                <p>به بخش <strong>مدیریت داده‌ها</strong> بروید.</p>
                <ul className="list-disc list-inside space-y-1 pr-2 text-slate-600">
                <li>ابتدا اطلاعات پایه صنایع (نام، اشتراک، کد تعرفه و متوسط آبان) را وارد کنید (دستی یا اکسل).</li>
                <li>سپس فایل اکسل کارکرد روزانه (مصارف) را بارگذاری کنید.</li>
                <li>سامانه به صورت هوشمند نام ستون‌ها و تاریخ‌ها را تشخیص می‌دهد.</li>
                </ul>
            </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Settings /></div>
                گام دوم: تنظیم محدودیت‌ها
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-700">
                <p>به بخش <strong>تنظیمات محدودیت</strong> بروید.</p>
                <ul className="list-disc list-inside space-y-1 pr-2 text-slate-600">
                <li>برای هر کد تعرفه (مثلاً سیمان، فولاد، کاشی) درصد محدودیت ابلاغی را وارد کنید.</li>
                <li>با تغییر اسلایدر، تاثیر آن بلافاصله روی تمام محاسبات سیستم اعمال می‌شود.</li>
                </ul>
            </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><LayoutDashboard /></div>
                گام سوم: تحلیل و پایش
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-700">
                <p>به <strong>داشبورد مدیریتی</strong> مراجعه کنید.</p>
                <ul className="list-disc list-inside space-y-1 pr-2 text-slate-600">
                <li>وضعیت کلی صنایع و درصد رعایت سقف را ببینید.</li>
                <li>در تب "تحلیل واحدها"، یک صنعت خاص را انتخاب کنید تا نمودار مصرف و تخلفات آن را با جزئیات ببینید.</li>
                </ul>
            </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                <div className="bg-green-100 p-2 rounded-lg text-green-600"><Printer /></div>
                گام چهارم: گزارش‌گیری
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-700">
                <p>از منوی سمت راست، گزارش مورد نظر را انتخاب کنید:</p>
                <ul className="list-disc list-inside space-y-1 pr-2 text-slate-600">
                <li><strong>خروجی نهایی:</strong> تولید PDF رسمی با سربرگ برای بایگانی.</li>
                <li><strong>پایش و تخلفات:</strong> لیست صنایع متخلف برای اعزام نیرو (قطع گاز/اخطار).</li>
                <li><strong>گزارشات ستاد:</strong> اکسل استاندارد برای ارسال به شرکت ملی گاز.</li>
                </ul>
            </CardContent>
            </Card>
        </div>
      </div>

      <div className="flex justify-center mt-12 no-print">
        <button 
            onClick={handleDownloadSample}
            className="flex items-center gap-2 text-blue-700 hover:text-white hover:bg-blue-600 text-sm font-bold bg-blue-50 px-8 py-4 rounded-xl border border-blue-200 transition-all shadow-sm cursor-pointer"
        >
          <Download size={18} /> دانلود فایل نمونه اکسل ورودی (شامل دو شیت استاندارد)
        </button>
      </div>
    </div>
  );
};

export default Help;
