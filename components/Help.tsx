
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Base';
import { HelpCircle, LayoutDashboard, FileSpreadsheet, Settings, Printer, Download, Calculator, Sigma, Activity, AlertOctagon, Info, CheckCircle2, Zap, ShieldAlert, BarChart3, Database, History, CalendarClock, AlertTriangle, MessageSquare } from 'lucide-react';
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
        ["100001", 4800, 5100, 0, 5000],
        ["100002", 11000, 11500, "", 11800]
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
                            <span><strong>محدودیت‌های متغیر در زمان:</strong> امکان تعریف درصد محدودیت متفاوت برای بازه‌های زمانی مختلف (مثلاً تغییر محدودیت از ۱۵ دی ماه).</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-green-600 mt-1 shrink-0"/>
                            <span><strong>محاسبه خودکار تخلفات:</strong> اعمال فرمول‌های پیچیده محدودیت به صورت آنی برای هزاران رکورد با توجه به تاریخ دقیق مصرف.</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-green-600 mt-1 shrink-0"/>
                            <span><strong>سوابق شفاف:</strong> مشاهده روند تغییرات محدودیت در طول زمان در جدول سوابق مصارف.</span>
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
                            <span><strong>مدیریت اخطارها:</strong> شناسایی هوشمند متخلفین و ثبت سوابق ارسال پیامک اخطار برای هر مشترک.</span>
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
                        <Sigma size={20} className="text-blue-600" /> ۱. فرمول محاسبه سقف مجاز (پویا)
                    </h3>
                    <p className="text-sm text-slate-600 leading-7 text-justify">
                        سقف مجاز روزانه بر اساس میانگین مصرف ماه مبنا (آبان) و <strong>درصد محدودیت مصوب در تاریخ همان روز</strong> محاسبه می‌شود.
                        <span className="block mt-2 text-slate-500 bg-white p-2 rounded border border-slate-200 text-xs">
                            <strong>مثال تغییر در زمان:</strong> اگر محدودیتی از ۲۸ آذر ۳۰٪ باشد و از ۱۵ دی به ۵۰٪ تغییر کند، سیستم برای مصارف قبل از ۱۵ دی، سقف را با ۳۰٪ و برای بعد از آن با ۵۰٪ محاسبه می‌کند.
                        </span>
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-center font-mono text-sm text-slate-800 w-full md:w-auto min-w-[300px]" dir="ltr">
                    Limit(Date) = Base Avg × (1 - Restriction%(Date) / 100)
                </div>
            </div>

            {/* Violation Calculation Methods */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg mb-4">
                        <Activity size={20} className="text-red-600" /> ۲. روش‌های پایش و محاسبه تخلفات
                    </h3>
                    <p className="text-sm text-slate-600 leading-7 text-justify mb-4">
                        در بخش «پایش و تخلفات»، شما می‌توانید بین دو روش برای شناسایی صنایع متخلف انتخاب کنید:
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Method 1 */}
                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <h4 className="font-bold text-blue-800 mb-2 text-sm">روش ۱: پایش لحظه‌ای (کلاسیک)</h4>
                        <p className="text-xs text-slate-600 leading-5 text-justify">
                            در این روش، ملاک تصمیم‌گیری <strong>آخرین رکورد مصرف ثبت شده</strong> است. درصد محدودیت مربوط به تاریخ همان رکورد ملاک عمل قرار می‌گیرد.
                        </p>
                        <div className="mt-3 bg-blue-50 p-2 rounded text-[10px] font-mono text-blue-900 dir-ltr text-center border border-blue-100">
                             Violation = Last Value - Limit(Last Date)
                        </div>
                    </div>

                    {/* Method 2 */}
                    <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <h4 className="font-bold text-amber-800 mb-2 text-sm">روش ۲: پایش هوشمند (امتیاز توالی)</h4>
                        <p className="text-xs text-slate-600 leading-5 text-justify">
                            صنعت زمانی متخلف است که برای <strong>N روز متوالی</strong> مصرف بیش از حد مجاز داشته باشد. سقف مجاز هر روز با توجه به تاریخ آن روز محاسبه شده و میانگین گرفته می‌شود.
                        </p>
                        <div className="mt-3 bg-amber-50 p-2 rounded text-[10px] font-mono text-amber-900 dir-ltr text-center border border-amber-100">
                             Violation = Avg(Consumption) - Avg(Dynamic Limits)
                        </div>
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
                        نوع برخورد با مشترک بر اساس "درصد تخطی" تعیین می‌شود. بازه‌های روبرو پیش‌فرض هستند و در صفحه پایش قابل تغییرند.
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
                گام اول: ورود اطلاعات
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-700">
                <p>به بخش <strong>مدیریت داده‌ها</strong> بروید.</p>
                <ul className="list-disc list-inside space-y-1 pr-2 text-slate-600">
                <li>اطلاعات پایه و فایل اکسل کارکرد روزانه را بارگذاری کنید.</li>
                <li>برای ویرایش دستی مقادیر روزانه، می‌توانید از تب "داده‌های مصرف روزانه" و دکمه ویرایش استفاده کنید.</li>
                </ul>
            </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><CalendarClock /></div>
                گام دوم: تنظیم محدودیت‌های زمانی
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-700">
                <p>به بخش <strong>تنظیمات محدودیت</strong> بروید.</p>
                <ul className="list-disc list-inside space-y-1 pr-2 text-slate-600">
                <li>تعرفه مورد نظر را باز کنید.</li>
                <li>می‌توانید با دکمه <strong>«افزودن بازه»</strong>، برای یک تاریخ خاص (مثلاً 1404/10/15) درصد محدودیت جدید تعریف کنید.</li>
                <li>سیستم به طور خودکار تاریخ‌ها را مرتب کرده و در محاسبات اعمال می‌کند.</li>
                </ul>
            </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><MessageSquare /></div>
                گام سوم: مدیریت اخطارها (پیامک)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-700">
                <p>به بخش <strong>پیامک اخطار</strong> مراجعه کنید.</p>
                <ul className="list-disc list-inside space-y-1 pr-2 text-slate-600">
                <li>با استفاده از فیلترهای جستجو، شهر و کد مصرف، لیست متخلفین را محدود کنید.</li>
                <li>متن پیامک را ویرایش کرده و گزینه <strong>«ارسال پیامک»</strong> (برای کپی در سامانه) یا <strong>«ثبت در سوابق»</strong> (برای بایگانی دستی) را بزنید.</li>
                <li>با کلیک روی آیکون ساعت در لیست، می‌توانید تاریخچه اخطارهای قبلی هر مشترک را ببینید.</li>
                </ul>
            </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                <div className="bg-green-100 p-2 rounded-lg text-green-600"><Printer /></div>
                گام چهارم: گزارش‌گیری نهایی
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-700">
                <p>از منوهای گزارش (پایش و تخلفات / گزارشات ستاد) استفاده کنید:</p>
                <ul className="list-disc list-inside space-y-1 pr-2 text-slate-600">
                <li>گزارشات اجرایی لیست صنایع متخلف را بر اساس روش انتخابی (لحظه‌ای یا هوشمند) نمایش می‌دهد.</li>
                <li>گزارشات ستاد شامل درصد تحقق کاهش مصرف و وضعیت کلی صنایع است.</li>
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
