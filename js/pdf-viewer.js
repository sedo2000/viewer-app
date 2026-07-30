/**
 * pdf-viewer.js
 * عارض PDF باستخدام مكتبة PDF.js — رسم الصفحات على <canvas>،
 * التنقل بين الصفحات، والتكبير/التصغير.
 */
const PDFViewer = (() => {
  let pdfDoc = null;
  let currentPage = 1;
  let scale = 1.1;
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3.0;
  let renderTask = null;

  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d');
  const canvasArea = document.getElementById('pdf-canvas-area');
  const pageIndicator = document.getElementById('page-indicator');
  const progressBar = document.getElementById('pdf-progress');

  // إعداد الـ worker الخاص بـ PDF.js عبر CDN
  if (window['pdfjsLib']) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
  }

  async function load(arrayBuffer) {
    reset();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdfDoc = await loadingTask.promise;
    currentPage = 1;
    scale = 1.1;
    await renderPage(currentPage);
    return { numPages: pdfDoc.numPages };
  }

  function reset() {
    pdfDoc = null;
    currentPage = 1;
    scale = 1.1;
    if (renderTask) {
      try { renderTask.cancel(); } catch (e) {}
      renderTask = null;
    }
  }

  async function renderPage(num) {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale });

    // دعم شاشات الريتينا (devicePixelRatio) لعرض أوضح
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (renderTask) {
      try { renderTask.cancel(); } catch (e) {}
    }
    renderTask = page.render({ canvasContext: ctx, viewport });
    try {
      await renderTask.promise;
    } catch (err) {
      if (err && err.name === 'RenderingCancelledException') return;
      throw err;
    }

    pageIndicator.textContent = `${num} / ${pdfDoc.numPages}`;
    updateProgress();
  }

  function updateProgress() {
    if (!pdfDoc) return;
    const ratio = currentPage / pdfDoc.numPages;
    progressBar.style.transform = `scaleX(${ratio})`;
  }

  async function nextPage() {
    if (!pdfDoc || currentPage >= pdfDoc.numPages) return;
    currentPage++;
    await renderPage(currentPage);
    canvasArea.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function prevPage() {
    if (!pdfDoc || currentPage <= 1) return;
    currentPage--;
    await renderPage(currentPage);
    canvasArea.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function zoomIn() {
    if (scale >= MAX_SCALE) return;
    scale = Math.min(MAX_SCALE, +(scale + 0.2).toFixed(2));
    await renderPage(currentPage);
  }

  async function zoomOut() {
    if (scale <= MIN_SCALE) return;
    scale = Math.max(MIN_SCALE, +(scale - 0.2).toFixed(2));
    await renderPage(currentPage);
  }

  function getInfo() {
    return pdfDoc ? { currentPage, numPages: pdfDoc.numPages, scale } : null;
  }

  return { load, nextPage, prevPage, zoomIn, zoomOut, getInfo, reset };
})();
