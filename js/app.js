/**
 * app.js
 * المتحكم الرئيسي: التبديل بين الشاشات، استقبال الملفات (اختيار/سحب وإفلات/
 * File Handling API)، تبديل المظهر الداكن/الفاتح، ملء الشاشة، وتسجيل الـ Service Worker.
 */
(() => {
  'use strict';

  // ---------- عناصر DOM ----------
  const screens = {
    upload: document.getElementById('screen-upload'),
    pdf: document.getElementById('screen-pdf'),
    excel: document.getElementById('screen-excel'),
  };

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnBrowse = document.getElementById('btn-browse');
  const errorBanner = document.getElementById('error-banner');
  const errorText = document.getElementById('error-text');

  const btnClose = document.getElementById('btn-close');
  const btnNewFile = document.getElementById('btn-new-file');
  const btnTheme = document.getElementById('btn-theme');
  const iconTheme = document.getElementById('icon-theme');
  const brand = document.getElementById('brand');
  const headerTitleWrap = document.getElementById('header-title-wrap');
  const headerFilename = document.getElementById('header-filename');
  const headerSub = document.getElementById('header-sub');
  const zoomControls = document.getElementById('zoom-controls');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnPrevPage = document.getElementById('btn-prev-page');
  const btnNextPage = document.getElementById('btn-next-page');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');

  const ICON_SUN = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>';
  const ICON_MOON = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';

  let currentFileType = null; // 'pdf' | 'excel'

  // ---------- شاشات ----------
  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle('active', key === name);
    });

    const isFileOpen = name !== 'upload';
    btnClose.hidden = !isFileOpen;
    btnNewFile.hidden = !isFileOpen;
    brand.hidden = isFileOpen;
    headerTitleWrap.hidden = !isFileOpen;
    zoomControls.hidden = name !== 'pdf';
  }

  function showLoading(text) {
    loadingText.textContent = text || 'جارٍ فتح الملف...';
    loadingOverlay.classList.add('show');
  }
  function hideLoading() {
    loadingOverlay.classList.remove('show');
  }

  function showError(msg) {
    errorText.textContent = msg;
    errorBanner.classList.add('show');
    setTimeout(() => errorBanner.classList.remove('show'), 5000);
  }

  // ---------- معالجة الملفات ----------
  const EXT_PDF = ['pdf'];
  const EXT_EXCEL = ['xlsx', 'xls', 'csv'];

  function getExt(filename) {
    return (filename.split('.').pop() || '').toLowerCase();
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleFile(file) {
    if (!file) return;
    const ext = getExt(file.name);
    errorBanner.classList.remove('show');

    if (![...EXT_PDF, ...EXT_EXCEL].includes(ext)) {
      showError('صيغة الملف غير مدعومة. الرجاء اختيار ملف PDF أو Excel أو CSV.');
      return;
    }

    showLoading(EXT_PDF.includes(ext) ? 'جارٍ فتح ملف PDF...' : 'جارٍ فتح جدول البيانات...');

    try {
      const buffer = await file.arrayBuffer();

      if (EXT_PDF.includes(ext)) {
        const info = await PDFViewer.load(buffer);
        currentFileType = 'pdf';
        headerFilename.textContent = file.name;
        headerSub.textContent = `${info.numPages.toLocaleString('ar')} صفحة · ${formatSize(file.size)}`;
        showScreen('pdf');
      } else {
        const info = ExcelViewer.load(buffer);
        currentFileType = 'excel';
        headerFilename.textContent = file.name;
        headerSub.textContent = `${info.sheetNames.length.toLocaleString('ar')} ${info.sheetNames.length === 1 ? 'ورقة' : 'أوراق'} · ${formatSize(file.size)}`;
        showScreen('excel');
      }
    } catch (err) {
      console.error(err);
      showError('تعذّرت قراءة الملف. تأكد أنه غير تالف وحاول مجدداً.');
    } finally {
      hideLoading();
    }
  }

  function closeFile() {
    PDFViewer.reset();
    ExcelViewer.reset();
    currentFileType = null;
    fileInput.value = '';
    showScreen('upload');
  }

  // ---------- أحداث الرفع ----------
  btnBrowse.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('click', (e) => {
    if (e.target === btnBrowse) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // السماح بالسحب والإفلات في أي مكان بالصفحة أيضاً (تجربة أكثر مرونة)
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    if (e.target.closest('#dropzone')) return;
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && screens.upload.classList.contains('active')) handleFile(file);
  });

  // ---------- أزرار الهيدر ----------
  btnClose.addEventListener('click', closeFile);
  btnNewFile.addEventListener('click', closeFile);

  btnZoomIn.addEventListener('click', () => PDFViewer.zoomIn());
  btnZoomOut.addEventListener('click', () => PDFViewer.zoomOut());
  btnPrevPage.addEventListener('click', () => PDFViewer.prevPage());
  btnNextPage.addEventListener('click', () => PDFViewer.nextPage());

  btnFullscreen.addEventListener('click', () => {
    const el = document.getElementById('app');
    if (!document.fullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
    }
  });

  // تنقل بلوحة المفاتيح لعارض PDF (سهم يمين/يسار لأن الاتجاه RTL)
  window.addEventListener('keydown', (e) => {
    if (!screens.pdf.classList.contains('active')) return;
    if (e.key === 'ArrowLeft') PDFViewer.nextPage();
    if (e.key === 'ArrowRight') PDFViewer.prevPage();
    if (e.key === '+' || e.key === '=') PDFViewer.zoomIn();
    if (e.key === '-') PDFViewer.zoomOut();
    if (e.key === 'Escape' && document.fullscreenElement) document.exitFullscreen();
  });

  // ---------- الوضع الداكن/الفاتح ----------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    iconTheme.innerHTML = theme === 'dark' ? ICON_MOON : ICON_SUN;
    const meta = document.querySelector(
      theme === 'dark' ? 'meta[name="theme-color"][media*="dark"]' : 'meta[name="theme-color"][media*="light"]'
    );
    localStorage.setItem('docviewer-theme', theme);
  }

  function initTheme() {
    const saved = localStorage.getItem('docviewer-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  }

  btnTheme.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  initTheme();

  // ---------- تسجيل الـ Service Worker (PWA / عمل بدون إنترنت) ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('تعذّر تسجيل Service Worker:', err);
      });
    });
  }

  // ---------- File Handling API (فتح الملفات مباشرة من نظام التشغيل) ----------
  // يعمل في المتصفحات/الأنظمة الداعمة عند تثبيت التطبيق كـ PWA وربط الامتدادات
  // عبر manifest.json (file_handlers). راجع ملف manifest.json وتعليمات README.
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
      if (!launchParams.files || launchParams.files.length === 0) return;
      try {
        const handle = launchParams.files[0];
        const file = await handle.getFile();
        handleFile(file);
      } catch (err) {
        console.warn('تعذّر فتح الملف عبر File Handling API:', err);
      }
    });
  }

  // ---------- استقبال ملف عبر رابط مشاركة (Share Target) مستقبلاً ----------
  // ملاحظة: مشاركة الملفات (وليس فقط النصوص/الروابط) تتطلب إعداد share_target
  // من نوع POST مع enctype: multipart/form-data وسيرفر بسيط لاستقبال الطلب،
  // وهو أمر يخرج عن نطاق "معالجة محلية بالكامل". الجاهزية الحالية تغطي
  // فتح الملفات من نظام الملفات مباشرة (File Handling API) وهي الأنسب لهذا التطبيق.

  showScreen('upload');
})();
