
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Base';
import { HelpCircle, LayoutDashboard, FileSpreadsheet, Settings, Printer, Download, Calculator, Sigma, Activity, AlertOctagon } from 'lucide-react';

const Help: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-slate-900">راهنمای سیستم و مستندات فنی</h1>
        <p className="text-slate-500 mt-2">آموزش استفاده از سامانه و تشریح کامل فرمول‌های محاسباتی</p>
      </div>

      {/* Formulas Section - Added based on request */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden mb-8">
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center gap-3">
            <Calculator className="text-blue-400" />
            <h2 className="font-bold text-lg">فرمول‌ها و منطق محاسبات سیستم</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* 1. Allowed Limit */}
            <div className="space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                    <Sigma size={18} className="text-blue-600" /> ۱. محاسبه سقف مجاز مصرف
                </h3>
                <p className="text-sm text-slate-600 leading-6 text-justify">
                    سقف مجاز روزانه برای هر واحد صنعتی، بر اساس میانگین مصرف آن واحد در ماه مبنا (آبان) و درصد محدودیت تعیین شده برای آن تعرفه محاسبه می‌شود.
                </p>
                <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 text-center font-mono text-sm text-slate-800" dir="ltr">
                    Allowed Limit = Base Month Avg × (1 - Restriction% / 100)
                </div>
                <p className="text-xs text-slate-400">مثال: اگر میانگین ۱۰۰۰ باشد و محدودیت ۲۰٪، سقف مجاز ۸۰۰ خواهد بود.</p>
            </div>

            {/* 2. Violation Calculation */}
            <div className="space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                    <Activity size={18} className="text-red-600" /> ۲. محاسبه میزان و درصد تخطی
                </h3>
                <p className="text-sm text-slate-600 leading-6 text-justify">
                    اگر آخرین مصرف ثبت شده بیشتر از سقف مجاز باشد، تخطی رخ داده است. درصد تخطی نسبت مقدار مازاد به سقف مجاز است.
                </p>
                <div className="space-y-2">
                    <div className="bg-red-50 p-2 px-4 rounded border border-red-100 flex justify-between items-center text-xs">
                        <span className="font-bold text-red-800">میزان تخطی (مترمکعب):</span>
                        <code className="font-mono text-red-900 font-bold" dir="ltr">Last Usage - Allowed Limit</code>
                    </div>
                    <div className="bg-red-50 p-2 px-4 rounded border border-red-100 flex justify-between items-center text-xs">
                        <span className="font-bold text-red-800">درصد تخطی:</span>
                        <code className="font-mono text-red-900 font-bold" dir="ltr">(Violation Amt ÷ Allowed Limit) × 100</code>
                    </div>
                </div>
            </div>

            {/* 3. Action Logic */}
            <div className="space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                    <AlertOctagon size={18} className="text-orange-600" /> ۳. منطق تعیین اقدام اجرایی
                </h3>
                <p className="text-sm text-slate-600 leading-6 text-justify">
                    در بخش پایش و تخلفات، نوع برخورد بر اساس "درصد تخطی" تعیین می‌شود. بازه‌های زیر به صورت پیش‌فرض فعال هستند (قابل تغییر در صفحه):
                </p>
                <ul className="text-sm space-y-2 bg-slate-50 p-3 rounded border border-slate-100">
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        <span><strong>اخطار کتبی:</strong> تخطی بین ۱٪ تا ۲۰٪</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span><strong>اعمال افت فشار:</strong> تخطی بین ۲۰٪ تا ۵۰٪</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-600"></span>
                        <span><strong>قطع گاز:</strong> تخطی بیش از ۵۰٪</span>
                    </li>
                </ul>
            </div>

            {/* 4. Dashboard Metrics */}
            <div className="space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b pb-2">
                    <LayoutDashboard size={18} className="text-green-600" /> ۴. شاخص رعایت سقف (داشبورد)
                </h3>
                <p className="text-sm text-slate-600 leading-6 text-justify">
                    درصدی که در کارت‌های بالای داشبورد نمایش داده می‌شود، نشان‌دهنده نسبت تعداد واحدهای "رعایت‌کننده" به "کل واحدها" است.
                </p>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center font-mono text-xs text-green-900 font-bold" dir="ltr">
                    ((Total Count - Violation Count) ÷ Total Count) × 100
                </div>
                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded mt-1 border border-slate-100">
                    <strong>نکته مهم:</strong> صنایعی که هنوز داده مصرف روزانه برای آن‌ها در سامانه بارگذاری نشده است، به صورت پیش‌فرض در دسته "رعایت‌کننده" (غیر متخلف) شمارش می‌شوند.
                </p>
            </div>

        </div>
      </div>

      <div className="grid gap-6">
        <h2 className="text-xl font-bold text-slate-800 mr-2">مراحل استفاده از سامانه</h2>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileSpreadsheet className="text-blue-600" /> گام اول: ورود اطلاعات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-700">
            <p>
              به بخش <strong>مدیریت داده‌ها</strong> بروید. ابتدا باید اطلاعات پایه صنایع را وارد کنید.
            </p>
            <ul className="list-disc list-inside space-y-2 pr-4">
              <li>می‌توانید اطلاعات را به صورت دستی وارد کنید یا فایل اکسل بارگذاری کنید.</li>
              <li>فایل اکسل صنایع باید شامل ستون‌های: <strong>شماره اشتراک</strong>، <strong>نام</strong>، <strong>کد مصرف</strong> و <strong>متوسط مصرف آبان</strong> باشد.</li>
              <li>پس از ثبت صنایع، در تب "داده‌های مصرف روزانه"، فایل اکسل کارکرد روزانه را بارگذاری کنید.</li>
              <li>سیستم قبل از ذخیره نهایی، یک پیش‌نمایش از داده‌ها به شما نشان می‌دهد تا صحت آن‌ها را تایید کنید.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Settings className="text-orange-600" /> گام دوم: تنظیم محدودیت‌ها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-700">
            <p>
              در بخش <strong>تنظیمات محدودیت</strong>، می‌توانید برای هر کد تعرفه (مثلاً سیمان، فولاد، کاشی) درصد محدودیت مشخص کنید.
            </p>
            <p className="text-slate-500 text-xs">
                با تغییر درصد محدودیت در این بخش، تمام گزارشات و نمودارهای داشبورد به صورت خودکار با مقادیر جدید بازنشانی می‌شوند.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <LayoutDashboard className="text-indigo-600" /> گام سوم: تحلیل و پایش
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-700">
            <p>
              در <strong>داشبورد مدیریتی</strong>، می‌توانید وضعیت لحظه‌ای صنایع را رصد کنید.
            </p>
            <ul className="list-disc list-inside space-y-2 pr-4">
              <li>با استفاده از فیلترهای بالا، یک یا چند صنعت را انتخاب کنید.</li>
              <li>نمودارهای روند مصرف، مقایسه با سقف مجاز و توزیع تخلفات نمایش داده می‌شود.</li>
              <li>می‌توانید با دکمه "ذخیره نمودارها"، تصویری از تحلیل‌ها دانلود کنید.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Printer className="text-green-600" /> گام چهارم: گزارش‌گیری
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-700">
            <p>
              سامانه دارای سه نوع گزارش‌گیری است:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
               <div className="border p-3 rounded-lg bg-slate-50">
                 <h4 className="font-bold mb-1 text-slate-800">گزارش خروجی نهایی</h4>
                 <p className="text-xs text-slate-500">جهت تولید فایل PDF رسمی با سربرگ، نمودار و جدول کامل برای بایگانی.</p>
               </div>
               <div className="border p-3 rounded-lg bg-slate-50">
                 <h4 className="font-bold mb-1 text-slate-800">گزارش تخلفات (اجرایی)</h4>
                 <p className="text-xs text-slate-500">لیست صنایعی که باید اخطار دریافت کنند یا گازشان قطع شود (با قابلیت فیلتر).</p>
               </div>
               <div className="border p-3 rounded-lg bg-slate-50">
                 <h4 className="font-bold mb-1 text-slate-800">گزارش ستاد</h4>
                 <p className="text-xs text-slate-500">فایل اکسل با فرمت استاندارد شرکت ملی گاز جهت ارسال به تهران.</p>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center mt-8">
        <a href="#" className="flex items-center gap-2 text-blue-600 hover:underline text-sm font-bold bg-blue-50 px-6 py-3 rounded-full border border-blue-100 transition-colors hover:bg-blue-100">
          <Download size={16} /> دانلود فایل نمونه اکسل ورودی (قالب استاندارد)
        </a>
      </div>
    </div>
  );
};

export default Help;
