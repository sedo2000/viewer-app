# قارئ الملفات — PDF & Excel Viewer (PWA)

تطبيق ويب متجاوب (Mobile-First) لعرض ملفات **PDF** و **Excel/CSV** بالكامل داخل المتصفح،
دون رفع أي ملف إلى خادم. مبني كـ **Progressive Web App** جاهز للتثبيت، والعمل بدون إنترنت،
وقابل للتحويل لاحقاً إلى تطبيق موبايل عبر WebView.

## 📁 هيكل الملفات

```
docviewer/
├── index.html          # الهيكل الرئيسي للصفحة (الهيدر + 3 شاشات)
├── manifest.json        # ملف الـ PWA (اسم، أيقونات، file_handlers)
├── sw.js                 # Service Worker — تخزين مؤقت للعمل أوفلاين
├── css/
│   └── style.css        # نظام التصميم (Design tokens) + مكونات الواجهة
├── js/
│   ├── app.js            # المتحكم الرئيسي: الشاشات، الرفع، الثيم، PWA
│   ├── pdf-viewer.js      # عارض PDF (يعتمد على PDF.js)
│   └── excel-viewer.js    # عارض Excel/CSV (يعتمد على SheetJS)
└── icons/
    ├── icon-192.png, icon-512.png                # أيقونات التطبيق
    └── icon-192-maskable.png, icon-512-maskable.png
```

كل ملف له مسؤولية واحدة واضحة، بدون أي إطار عمل (framework) أو خطوة بناء (build step) —
HTML + CSS + JavaScript خام (Vanilla JS)، تسهيلاً للفهم والتعديل والتحويل لاحقاً.

## ⚙️ المكتبات المستخدمة (عبر CDN)

| المكتبة | الاستخدام |
|---|---|
| [Tailwind CSS (Play CDN)](https://tailwindcss.com) | فئات مساعدة سريعة، فوق نظام تصميم مخصص في `style.css` |
| [PDF.js v4](https://mozilla.github.io/pdf.js/) | فك ترميز ورسم صفحات PDF على `<canvas>` |
| [SheetJS (xlsx.full.min.js)](https://sheetjs.com) | قراءة `.xlsx` / `.xls` / `.csv` وتحويلها لجدول HTML |
| IBM Plex Sans Arabic / IBM Plex Mono | خطوط الواجهة والبيانات (Google Fonts) |

> **لماذا CDN وليس تثبيت محلي؟** لتفادي الحاجة لأي خطوة بناء (npm/webpack). يقوم
> الـ Service Worker بتخزين هذه الملفات في أول تحميل، فتعمل لاحقاً بدون إنترنت.
> إذا أردت حزمها محلياً (بدون أي اعتماد على الإنترنت حتى في أول تشغيل)، حمّل
> الملفات الثلاث (`pdf.min.js`, `pdf.worker.min.js`, `xlsx.full.min.js`) ضعها
> في مجلد `js/vendor/` وعدّل روابط `<script>` في `index.html` و `sw.js`.

## ▶️ التشغيل محلياً

المتصفحات تمنع تسجيل Service Worker على بروتوكول `file://‎`، لذا شغّل الموقع
عبر خادم محلي بسيط (أي أداة تفي بالغرض):

```bash
# باستخدام Python (مثبت غالباً على أي جهاز)
cd docviewer
python3 -m http.server 8080

# أو باستخدام Node.js
npx serve docviewer -p 8080

# أو باستخدام VS Code
# ثبّت إضافة "Live Server" ثم اضغط Go Live
```

ثم افتح: `http://localhost:8080`

## 🚀 النشر (Deployment)

الموقع ملفات ثابتة بالكامل (Static Files) — انشرها على أي من:
- **Netlify / Vercel / Cloudflare Pages**: اسحب مجلد `docviewer` وأفلته، أو اربطه بمستودع Git.
- **GitHub Pages**: ادفع المجلد إلى فرع `gh-pages` أو فعّل Pages من إعدادات المستودع.
- **أي استضافة تدعم HTTPS**: يجب أن يكون الموقع على **HTTPS** (أو `localhost` للتطوير)
  حتى يعمل الـ Service Worker وتثبيت الـ PWA — هذا شرط أساسي من المتصفحات.

## 📲 التثبيت كـ PWA

بعد النشر على HTTPS:
- **أندرويد (Chrome)**: ستظهر رسالة "إضافة إلى الشاشة الرئيسية" تلقائياً، أو من قائمة ⋮.
- **iOS (Safari)**: زر المشاركة ← "إضافة إلى الشاشة الرئيسية".
- **سطح المكتب (Chrome/Edge)**: أيقونة التثبيت ⊕ في شريط العنوان.

بعد التثبيت، وإذا سجّل النظام الملف كمعالج افتراضي (`file_handlers` في
`manifest.json`)، يمكن فتح ملفات PDF/Excel مباشرة من مدير الملفات فيُفتح
التطبيق تلقائياً (مدعوم حالياً في Chrome/Edge على سطح المكتب وChromeOS
وبعض أجهزة أندرويد؛ الدعم يتوسّع تدريجياً).

## 📱 التحويل إلى تطبيق موبايل عبر WebView

التطبيق جاهز للتغليف داخل WebView أصلي (Native WebView) بأقل تعديل:

1. **Android (Kotlin/Java)**: استخدم `WebView` مع تفعيل:
   ```kotlin
   webView.settings.javaScriptEnabled = true
   webView.settings.domStorageEnabled = true       // لازم لـ localStorage (حفظ الثيم)
   webView.settings.allowFileAccess = true
   // لدعم اختيار الملفات من الجهاز داخل WebView:
   webView.webChromeClient = object : WebChromeClient() {
       override fun onShowFileChooser(...): Boolean { /* افتح منتقي الملفات */ }
   }
   ```
   يمكن أيضاً استخدام أدوات جاهزة مثل **Capacitor** أو **Bubblewrap (TWA — Trusted Web
   Activity)** التي تحوّل الـ PWA مباشرة إلى APK قابل للنشر على Google Play، مع
   الاستفادة من `manifest.json` الموجود مسبقاً.

2. **iOS (Swift)**: استخدم `WKWebView` مع تفعيل:
   ```swift
   webView.configuration.preferences.javaScriptEnabled = true
   // لدعم <input type="file">:
   // نفّذ WKUIDelegate الخاص باختيار الملفات (runOpenPanel أو
   // fileUploadPanel لإصدارات iOS الحديثة)
   ```

3. **بديل جاهز**: أدوات مثل **Capacitor** (Ionic) أو **Median.co** / **GoNative**
   تُنتج تطبيق Android/iOS جاهز من أي PWA خلال دقائق، مع دعم كامل لاختيار الملفات
   والإشعارات ونقاط دخول (Intents) لفتح ملفات PDF/Excel من خارج التطبيق.

> **ملاحظة مهمة**: لأن كل المعالجة تتم محلياً بجافاسكريبت (لا استدعاءات شبكة
> لمعالجة الملفات)، لا حاجة لأي تعديل في منطق التطبيق عند التغليف — فقط تأكد
> أن WebView يسمح بـ JavaScript وقراءة الملفات المحلية (File API).

## ✏️ التخصيص السريع

- **الألوان والخطوط**: كلها متغيرات CSS في أعلى `css/style.css` (`:root` و
  `html[data-theme="dark"]`) — غيّرها من مكان واحد.
- **اسم التطبيق وأيقونته**: عدّل `manifest.json` واستبدل ملفات `icons/*.png`
  (يوجد سكربت `icons/make_icons.py` لتوليدها برمجياً عبر Pillow إن رغبت
  بتصميم مختلف).
- **الحد الأقصى لحجم الملف**: لم يُفرض حالياً أي حد؛ لملفات PDF كبيرة جداً
  (مئات الميجابايت) قد يستحسن إضافة تحقق من `file.size` في `handleFile()`
  داخل `js/app.js` وعرض تنبيه مناسب.

## ✅ ما تم تنفيذه من المتطلبات

- [x] تصميم متجاوب Mobile-First بالكامل (Tailwind + CSS مخصص)
- [x] عرض PDF عبر PDF.js: تنقل بين الصفحات، تكبير/تصغير، شريط تقدّم
- [x] عرض Excel/CSV عبر SheetJS: تبويبات بين الأوراق، بحث/فلترة، تمييز النتائج
- [x] رفع بالسحب والإفلات + زر اختيار ملف، معالجة محلية 100% (بدون سيرفر)
- [x] وضع داكن/فاتح مع حفظ التفضيل
- [x] هيدر يعرض اسم الملف وأزرار التحكم (إغلاق/تكبير/تصغير/ملف جديد)
- [x] وضعية ملء الشاشة
- [x] manifest.json + Service Worker (Offline-first, Stale-While-Revalidate)
- [x] جاهزية File Handling API لفتح الملفات مباشرة بعد التثبيت
- [x] أيقونات PWA (عادية + Maskable) بمقاسي 192/512
