/**
 * excel-viewer.js
 * عارض Excel/CSV باستخدام مكتبة SheetJS —
 * تحويل أوراق العمل إلى جداول HTML مع تبويبات وبحث.
 */
const ExcelViewer = (() => {
  let workbook = null;
  let currentSheetName = null;
  let currentRows = []; // مصفوفة مصفوفات (aoa) للورقة الحالية
  let searchTerm = '';

  const sheetTabsEl = document.getElementById('sheet-tabs');
  const theadEl = document.getElementById('excel-thead');
  const tbodyEl = document.getElementById('excel-tbody');
  const searchInput = document.getElementById('excel-search');
  const rowCountEl = document.getElementById('row-count');

  function load(arrayBuffer) {
    workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('لا توجد أوراق عمل في هذا الملف.');
    }
    searchTerm = '';
    searchInput.value = '';
    buildSheetTabs();
    selectSheet(workbook.SheetNames[0]);
    return { sheetNames: workbook.SheetNames };
  }

  function buildSheetTabs() {
    sheetTabsEl.innerHTML = '';
    workbook.SheetNames.forEach((name) => {
      const tab = document.createElement('button');
      tab.className = 'sheet-tab';
      tab.textContent = name;
      tab.dataset.sheet = name;
      tab.addEventListener('click', () => selectSheet(name));
      sheetTabsEl.appendChild(tab);
    });
  }

  function selectSheet(name) {
    currentSheetName = name;
    [...sheetTabsEl.children].forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.sheet === name);
    });
    const ws = workbook.Sheets[name];
    currentRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    renderTable();
    // تمرير التبويب النشط إلى مجال الرؤية
    const activeTab = sheetTabsEl.querySelector('.sheet-tab.active');
    if (activeTab) activeTab.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
  }

  function colLabel(idx) {
    // A, B, C ... AA, AB ...
    let s = '';
    let n = idx;
    do {
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
  }

  function highlight(text) {
    if (!searchTerm) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const term = escapeHtml(searchTerm);
    try {
      const re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      return escaped.replace(re, '<mark class="hl">$1</mark>');
    } catch (e) {
      return escaped;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderTable() {
    if (!currentRows || currentRows.length === 0) {
      theadEl.innerHTML = '';
      tbodyEl.innerHTML = '<tr><td class="p-4 text-center" style="color:var(--muted)">لا توجد بيانات في هذه الورقة</td></tr>';
      rowCountEl.textContent = '0 صف';
      return;
    }

    const maxCols = currentRows.reduce((m, r) => Math.max(m, r.length), 0);

    // رأس الجدول: صف رقم 1 من البيانات + رقم عمود (A, B, C..)
    let theadHtml = '<tr><th></th>';
    for (let c = 0; c < maxCols; c++) {
      theadHtml += `<th>${colLabel(c)}</th>`;
    }
    theadHtml += '</tr>';
    theadEl.innerHTML = theadHtml;

    // فلترة الصفوف حسب البحث
    const term = searchTerm.trim().toLowerCase();
    let visibleCount = 0;
    let bodyHtml = '';

    currentRows.forEach((row, rIdx) => {
      const rowText = row.join(' ').toLowerCase();
      if (term && !rowText.includes(term)) return;
      visibleCount++;
      bodyHtml += `<tr><td>${rIdx + 1}</td>`;
      for (let c = 0; c < maxCols; c++) {
        const cell = row[c] !== undefined && row[c] !== null ? row[c] : '';
        bodyHtml += `<td>${highlight(String(cell))}</td>`;
      }
      bodyHtml += '</tr>';
    });

    tbodyEl.innerHTML = bodyHtml || '<tr><td class="p-4 text-center" style="color:var(--muted)">لا توجد نتائج مطابقة للبحث</td></tr>';
    rowCountEl.textContent = `${visibleCount.toLocaleString('ar')} من ${currentRows.length.toLocaleString('ar')} صف`;
  }

  function setSearch(term) {
    searchTerm = term;
    renderTable();
  }

  function reset() {
    workbook = null;
    currentSheetName = null;
    currentRows = [];
    searchTerm = '';
    sheetTabsEl.innerHTML = '';
    theadEl.innerHTML = '';
    tbodyEl.innerHTML = '';
  }

  searchInput.addEventListener('input', (e) => setSearch(e.target.value));

  return { load, reset, getCurrentSheet: () => currentSheetName };
})();
