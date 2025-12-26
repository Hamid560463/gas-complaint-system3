
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Base';
import { HelpCircle, LayoutDashboard, FileSpreadsheet, Settings, Printer, Download } from 'lucide-react';

const Help: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-slate-900">راهنمای استفاده از سامانه</h1>
        <p className="text-slate-500 mt-2">آموزش گام به گام استفاده از قابلیت‌های نرم‌افزار پایش گاز</p>
      </div>

      <div className="grid gap-6">
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
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              فرمول محاسبه: <code>سقف مجاز = میانگین مصرف آبان × (100 - درصد محدودیت) ÷ 100</code>
            </div>
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
               <div className="border p-3 rounded-lg">
                 <h4 className="font-bold mb-1">گزارش خروجی نهایی</h4>
                 <p className="text-xs text-slate-500">جهت تولید فایل PDF رسمی با سربرگ، نمودار و جدول کامل برای بایگانی.</p>
               </div>
               <div className="border p-3 rounded-lg">
                 <h4 className="font-bold mb-1">گزارش تخلفات (اجرایی)</h4>
                 <p className="text-xs text-slate-500">لیست صنایعی که باید اخطار دریافت کنند یا گازشان قطع شود.</p>
               </div>
               <div className="border p-3 rounded-lg">
                 <h4 className="font-bold mb-1">گزارش ستاد</h4>
                 <p className="text-xs text-slate-500">فایل اکسل با فرمت استاندارد شرکت ملی گاز جهت ارسال به تهران.</p>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center mt-8">
        <a href="#" className="flex items-center gap-2 text-blue-600 hover:underline text-sm font-bold">
          <Download size={16} /> دانلود فایل نمونه اکسل ورودی
        </a>
      </div>
    </div>
  );
};

export default Help;
