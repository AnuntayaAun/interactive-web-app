/**
 * Sales Interactive Dashboard Application
 * Category Comparison & Discount Percentage Analytics
 */

// Global State
let rawData = [];
let activeData = [];
let charts = {};

let state = {
  currentTab: 'tab-overview',
  theme: localStorage.getItem('theme') || 'light',
  globalCategory: 'ALL',
  globalMinDiscount: 0,
  globalRating: 0,
  globalPreset: 'all',
  
  // Category Compare State
  compareCatA: 'Computers&Accessories',
  compareCatB: 'Electronics',
  compareCatC: 'NONE',
  subcatSearch: '',
  
  // Scatter chart filter
  scatterCategory: 'ALL',
  
  // Explorer State
  searchKeyword: '',
  sortBy: 'disc_desc',
  currentPage: 1,
  pageSize: 15
};

// Color palettes for categories and comparisons
const CATEGORY_COLORS = {
  'Computers&Accessories': { bg: 'rgba(99, 102, 241, 0.75)', border: '#6366f1', solid: '#6366f1' },
  'Electronics': { bg: 'rgba(236, 72, 153, 0.75)', border: '#ec4899', solid: '#ec4899' },
  'Home&Kitchen': { bg: 'rgba(16, 185, 129, 0.75)', border: '#10b981', solid: '#10b981' },
  'OfficeProducts': { bg: 'rgba(245, 158, 11, 0.75)', border: '#f59e0b', solid: '#f59e0b' },
  'MusicalInstruments': { bg: 'rgba(139, 92, 246, 0.75)', border: '#8b5f9e', solid: '#8b5cf6' },
  'HomeImprovement': { bg: 'rgba(14, 165, 233, 0.75)', border: '#0ea5e9', solid: '#0ea5e9' },
  'Toys&Games': { bg: 'rgba(249, 115, 22, 0.75)', border: '#f97316', solid: '#f97316' },
  'Car&Motorbike': { bg: 'rgba(100, 116, 139, 0.75)', border: '#64748b', solid: '#64748b' },
  'Health&PersonalCare': { bg: 'rgba(20, 184, 166, 0.75)', border: '#14b8a6', solid: '#14b8a6' },
  'Other': { bg: 'rgba(148, 163, 184, 0.75)', border: '#94a3b8', solid: '#94a3b8' }
};

const COMPARE_COLORS = {
  catA: { bg: 'rgba(99, 102, 241, 0.55)', border: '#6366f1', solid: '#4f46e5' },
  catB: { bg: 'rgba(236, 72, 153, 0.55)', border: '#ec4899', solid: '#db2777' },
  catC: { bg: 'rgba(16, 185, 129, 0.55)', border: '#10b981', solid: '#059669' }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadInitialDataset();
  bindEvents();
});

// Theme Management
function initTheme() {
  const isDark = state.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    document.getElementById('themeIconSun').classList.remove('hidden');
    document.getElementById('themeIconMoon').classList.add('hidden');
    state.theme = 'dark';
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    document.getElementById('themeIconSun').classList.add('hidden');
    document.getElementById('themeIconMoon').classList.remove('hidden');
    state.theme = 'light';
  }
}

function toggleTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  state.theme = newTheme;
  localStorage.setItem('theme', newTheme);
  initTheme();
  updateAllChartsTheme();
}

function getChartThemeColors() {
  const isDark = state.theme === 'dark';
  return {
    textColor: isDark ? '#cbd5e1' : '#475569',
    gridColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)',
    tooltipBg: isDark ? '#1e293b' : '#ffffff',
    tooltipText: isDark ? '#f8fafc' : '#0f172a'
  };
}

function updateAllChartsTheme() {
  const themeColors = getChartThemeColors();
  Object.values(charts).forEach(chart => {
    if (!chart) return;
    if (chart.options.scales) {
      Object.values(chart.options.scales).forEach(scale => {
        if (scale.ticks) scale.ticks.color = themeColors.textColor;
        if (scale.grid) scale.grid.color = themeColors.gridColor;
        if (scale.pointLabels) scale.pointLabels.color = themeColors.textColor;
      });
    }
    if (chart.options.plugins && chart.options.plugins.legend) {
      chart.options.plugins.legend.labels = chart.options.plugins.legend.labels || {};
      chart.options.plugins.legend.labels.color = themeColors.textColor;
    }
    chart.update();
  });
}

// Data Loading
function loadInitialDataset() {
  if (window.AMAZON_PRODUCTS_DATA && Array.isArray(window.AMAZON_PRODUCTS_DATA)) {
    rawData = window.AMAZON_PRODUCTS_DATA;
    onDataLoaded('amazon.csv', rawData.length);
  } else {
    // Attempt fetch products_data.json
    fetch('./products_data.json')
      .then(r => r.json())
      .then(data => {
        rawData = data;
        onDataLoaded('amazon.csv', rawData.length);
      })
      .catch(err => {
        console.error('Cannot load default JSON:', err);
        document.getElementById('headerDataSource').textContent = 'กรุณาอัปโหลดไฟล์ CSV';
        document.getElementById('headerTotalItems').textContent = '0 รายการ';
      });
  }
}

function onDataLoaded(sourceName, totalCount) {
  document.getElementById('headerDataSource').textContent = `ไฟล์: ${sourceName}`;
  document.getElementById('headerTotalItems').textContent = `${totalCount.toLocaleString()} รายการ`;
  
  // Populate category filter dropdowns
  populateCategoryDropdowns();
  
  // Apply initial filters
  applyFilters();
}

function populateCategoryDropdowns() {
  const mainCategories = [...new Set(rawData.map(p => p.main_cat))].filter(Boolean).sort();
  
  // Global filter dropdown
  const globalCatSelect = document.getElementById('globalCategoryFilter');
  globalCatSelect.innerHTML = '<option value="ALL">ทุกหมวดหมู่หลัก (All Categories)</option>' +
    mainCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  
  // Compare dropdowns
  const compareA = document.getElementById('compareCatA');
  const compareB = document.getElementById('compareCatB');
  const compareC = document.getElementById('compareCatC');
  
  const optionsHtml = mainCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  compareA.innerHTML = optionsHtml;
  compareB.innerHTML = optionsHtml;
  compareC.innerHTML = '<option value="NONE">-- ไม่เลือก (เปรียบเทียบแค่ 2 หมวด) --</option>' + optionsHtml;
  
  // Set default selections
  if (mainCategories.includes('Computers&Accessories')) compareA.value = 'Computers&Accessories';
  else if (mainCategories[0]) compareA.value = mainCategories[0];
  
  if (mainCategories.includes('Electronics')) compareB.value = 'Electronics';
  else if (mainCategories[1]) compareB.value = mainCategories[1];
  
  compareC.value = 'NONE';
  state.compareCatA = compareA.value;
  state.compareCatB = compareB.value;
  state.compareCatC = compareC.value;
  
  // Scatter category filter dropdown
  const scatterSelect = document.getElementById('scatterCategoryFilter');
  scatterSelect.innerHTML = '<option value="ALL">ทุกหมวดหมู่ (All Categories)</option>' +
    mainCategories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

// Global Filtering
function applyFilters() {
  activeData = rawData.filter(item => {
    // Category filter
    if (state.globalCategory !== 'ALL' && item.main_cat !== state.globalCategory) return false;
    // Discount filter
    if (item.disc_pct < state.globalMinDiscount) return false;
    // Rating filter
    if (state.globalRating > 0 && item.rating < state.globalRating) return false;
    
    // Quick presets
    if (state.globalPreset === 'super-discount' && item.disc_pct <= 70) return false;
    if (state.globalPreset === 'best-value' && (item.disc_pct < 50 || item.rating < 4.2)) return false;
    if (state.globalPreset === 'budget' && item.disc_price > 500) return false;
    
    return true;
  });

  // Re-render currently active view
  renderCurrentTab();
}

function renderCurrentTab() {
  switch (state.currentTab) {
    case 'tab-overview':
      renderOverviewTab();
      break;
    case 'tab-category-compare':
      renderCategoryCompareTab();
      break;
    case 'tab-discount-analysis':
      renderDiscountAnalysisTab();
      break;
    case 'tab-explorer':
      renderExplorerTab();
      break;
  }
}

// Tab Switching
function bindEvents() {
  // Tabs navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'text-indigo-600', 'dark:text-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-900/40');
        b.classList.add('text-slate-600', 'dark:text-slate-300');
      });
      btn.classList.add('active', 'text-indigo-600', 'dark:text-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-900/40');
      btn.classList.remove('text-slate-600', 'dark:text-slate-300');
      
      const targetId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
      });
      document.getElementById(targetId).classList.remove('hidden');
      state.currentTab = targetId;
      renderCurrentTab();
    });
  });

  // Quick link button in Overview to switch to compare tab
  const btnGoToCompare = document.getElementById('btnGoToCompare');
  if (btnGoToCompare) {
    btnGoToCompare.addEventListener('click', () => {
      const compareTabBtn = document.querySelector('[data-tab="tab-category-compare"]');
      if (compareTabBtn) compareTabBtn.click();
    });
  }

  // Theme toggle
  document.getElementById('btnThemeToggle').addEventListener('click', toggleTheme);

  // Global filters
  document.getElementById('globalCategoryFilter').addEventListener('change', (e) => {
    state.globalCategory = e.target.value;
    state.currentPage = 1;
    applyFilters();
  });

  const discRange = document.getElementById('globalMinDiscountRange');
  const discLabel = document.getElementById('globalMinDiscountLabel');
  discRange.addEventListener('input', (e) => {
    state.globalMinDiscount = parseInt(e.target.value, 10);
    discLabel.textContent = `${state.globalMinDiscount}%`;
    state.currentPage = 1;
    applyFilters();
  });

  document.getElementById('globalRatingFilter').addEventListener('change', (e) => {
    state.globalRating = parseFloat(e.target.value);
    state.currentPage = 1;
    applyFilters();
  });

  // Presets
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => {
        b.classList.remove('active', 'bg-indigo-100', 'dark:bg-indigo-900/60', 'text-indigo-700', 'dark:text-indigo-300');
        b.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-600', 'dark:text-slate-300');
      });
      btn.classList.add('active', 'bg-indigo-100', 'dark:bg-indigo-900/60', 'text-indigo-700', 'dark:text-indigo-300');
      btn.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-600', 'dark:text-slate-300');
      
      state.globalPreset = btn.getAttribute('data-preset');
      state.currentPage = 1;
      applyFilters();
    });
  });

  // Reset Filters
  document.getElementById('btnResetFilters').addEventListener('click', () => {
    state.globalCategory = 'ALL';
    state.globalMinDiscount = 0;
    state.globalRating = 0;
    state.globalPreset = 'all';
    
    document.getElementById('globalCategoryFilter').value = 'ALL';
    discRange.value = '0';
    discLabel.textContent = '0%';
    document.getElementById('globalRatingFilter').value = '0';
    
    document.querySelectorAll('.preset-btn').forEach(b => {
      if (b.getAttribute('data-preset') === 'all') {
        b.classList.add('active', 'bg-indigo-100', 'dark:bg-indigo-900/60', 'text-indigo-700', 'dark:text-indigo-300');
      } else {
        b.classList.remove('active', 'bg-indigo-100', 'dark:bg-indigo-900/60', 'text-indigo-700', 'dark:text-indigo-300');
      }
    });

    state.currentPage = 1;
    applyFilters();
  });

  // Category Comparison Selectors
  document.getElementById('compareCatA').addEventListener('change', (e) => {
    state.compareCatA = e.target.value;
    renderCategoryCompareTab();
  });
  document.getElementById('compareCatB').addEventListener('change', (e) => {
    state.compareCatB = e.target.value;
    renderCategoryCompareTab();
  });
  document.getElementById('compareCatC').addEventListener('change', (e) => {
    state.compareCatC = e.target.value;
    renderCategoryCompareTab();
  });

  // Compare presets
  document.querySelectorAll('.compare-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catA = btn.getAttribute('data-cat-a');
      const catB = btn.getAttribute('data-cat-b');
      document.getElementById('compareCatA').value = catA;
      document.getElementById('compareCatB').value = catB;
      document.getElementById('compareCatC').value = 'NONE';
      state.compareCatA = catA;
      state.compareCatB = catB;
      state.compareCatC = 'NONE';
      renderCategoryCompareTab();
    });
  });

  // Subcategory search in Compare tab
  document.getElementById('subcatSearchInput').addEventListener('input', (e) => {
    state.subcatSearch = e.target.value.toLowerCase().trim();
    renderSubcategoryMatrix();
  });

  // Scatter chart category filter
  document.getElementById('scatterCategoryFilter').addEventListener('change', (e) => {
    state.scatterCategory = e.target.value;
    renderDiscountRatingScatter();
  });

  // Explorer search & sorting
  document.getElementById('productSearchInput').addEventListener('input', debounce((e) => {
    state.searchKeyword = e.target.value.toLowerCase().trim();
    state.currentPage = 1;
    renderExplorerTable();
  }, 250));

  document.getElementById('productSortBy').addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    state.currentPage = 1;
    renderExplorerTable();
  });

  document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10);
    state.currentPage = 1;
    renderExplorerTable();
  });

  // Pagination buttons
  document.getElementById('btnPrevPage').addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderExplorerTable();
    }
  });

  document.getElementById('btnNextPage').addEventListener('click', () => {
    state.currentPage++;
    renderExplorerTable();
  });

  // Export CSV
  document.getElementById('btnExportCSV').addEventListener('click', exportFilteredCSV);

  // Detail Modal close
  document.getElementById('btnCloseDetailModal').addEventListener('click', closeProductModal);
  document.getElementById('productDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'productDetailModal') closeProductModal();
  });

  // Upload Modal
  const uploadModal = document.getElementById('uploadModal');
  document.getElementById('btnOpenUpload').addEventListener('click', () => {
    uploadModal.classList.remove('hidden');
  });
  document.getElementById('btnCloseUploadModal').addEventListener('click', () => {
    uploadModal.classList.add('hidden');
  });
  document.getElementById('btnDismissUpload').addEventListener('click', () => {
    uploadModal.classList.add('hidden');
  });

  // CSV Drag and Drop
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('csvFileInput');
  
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-600', 'bg-indigo-50/50');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-indigo-600', 'bg-indigo-50/50');
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-600', 'bg-indigo-50/50');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleCSVFile(e.target.files[0]);
    }
  });

  document.getElementById('btnRestoreDefaultCSV').addEventListener('click', () => {
    if (window.AMAZON_PRODUCTS_DATA) {
      rawData = window.AMAZON_PRODUCTS_DATA;
      onDataLoaded('amazon.csv (ต้นฉบับ)', rawData.length);
      uploadModal.classList.add('hidden');
      document.getElementById('uploadStatusText').textContent = 'โหลดข้อมูลเริ่มต้นเรียบร้อย';
    }
  });
}

// Utility: Calculate Statistics for a group of products
function calculateCategoryStats(products) {
  if (!products || products.length === 0) {
    return {
      count: 0,
      avgDiscount: 0,
      medianDiscount: 0,
      minDiscount: 0,
      maxDiscount: 0,
      avgActualPrice: 0,
      avgDiscountedPrice: 0,
      avgSavings: 0,
      avgRating: 0,
      totalReviews: 0,
      tiers: [0, 0, 0, 0, 0],
      champion: null
    };
  }

  const count = products.length;
  let totalDisc = 0;
  let totalActPrice = 0;
  let totalDiscPrice = 0;
  let totalRating = 0;
  let ratedCount = 0;
  let totalReviews = 0;

  const discounts = [];
  const tiers = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, >80
  let champion = products[0];

  products.forEach(p => {
    const d = p.disc_pct || 0;
    discounts.push(d);
    totalDisc += d;
    totalActPrice += p.act_price || 0;
    totalDiscPrice += p.disc_price || 0;
    totalReviews += p.rating_count || 0;

    if (p.rating > 0) {
      totalRating += p.rating;
      ratedCount++;
    }

    // Tiers
    if (d <= 20) tiers[0]++;
    else if (d <= 40) tiers[1]++;
    else if (d <= 60) tiers[2]++;
    else if (d <= 80) tiers[3]++;
    else tiers[4]++;

    // Champion: highest discount, tie break on rating
    if (d > (champion.disc_pct || 0) || (d === champion.disc_pct && p.rating > champion.rating)) {
      champion = p;
    }
  });

  discounts.sort((a, b) => a - b);
  const medianDiscount = discounts[Math.floor(discounts.length / 2)] || 0;

  return {
    count,
    avgDiscount: (totalDisc / count),
    medianDiscount,
    minDiscount: discounts[0] || 0,
    maxDiscount: discounts[discounts.length - 1] || 0,
    avgActualPrice: (totalActPrice / count),
    avgDiscountedPrice: (totalDiscPrice / count),
    avgSavings: ((totalActPrice - totalDiscPrice) / count),
    avgRating: (ratedCount > 0 ? totalRating / ratedCount : 0),
    totalReviews,
    tiers,
    champion
  };
}

// ==========================================
// RENDER TAB 1: OVERVIEW
// ==========================================
function renderOverviewTab() {
  const data = activeData;
  const totalCount = data.length;

  if (totalCount === 0) {
    document.getElementById('kpiTotalProducts').textContent = '0';
    document.getElementById('kpiAvgDiscount').textContent = '0%';
    document.getElementById('kpiAvgRating').textContent = '0.0 ★';
    document.getElementById('kpiAvgSavings').textContent = '₹0';
    return;
  }

  // Calculate overall KPIs
  const overallStats = calculateCategoryStats(data);
  document.getElementById('kpiTotalProducts').textContent = totalCount.toLocaleString();
  document.getElementById('kpiAvgDiscount').textContent = `${overallStats.avgDiscount.toFixed(1)}%`;
  document.getElementById('kpiMaxDiscount').textContent = `${overallStats.maxDiscount}%`;
  document.getElementById('kpiMedianDiscount').textContent = `${overallStats.medianDiscount}%`;
  document.getElementById('kpiAvgRating').textContent = `${overallStats.avgRating.toFixed(2)} ★`;
  document.getElementById('kpiAvgSavings').textContent = `₹${Math.round(overallStats.avgSavings).toLocaleString()}`;
  
  if (overallStats.totalReviews > 1000000) {
    document.getElementById('kpiTotalReviews').textContent = `${(overallStats.totalReviews / 1000000).toFixed(1)}M+`;
  } else {
    document.getElementById('kpiTotalReviews').textContent = overallStats.totalReviews.toLocaleString();
  }

  // Main Categories Aggregation
  const categoryMap = new Map();
  data.forEach(p => {
    if (!categoryMap.has(p.main_cat)) categoryMap.set(p.main_cat, []);
    categoryMap.get(p.main_cat).push(p);
  });

  document.getElementById('kpiCategoryCountBadge').textContent = `${categoryMap.size} หมวดหลัก`;

  const categoryStatsList = [];
  categoryMap.forEach((items, cat) => {
    categoryStatsList.push({
      category: cat,
      stats: calculateCategoryStats(items)
    });
  });

  // Sort by average discount descending
  categoryStatsList.sort((a, b) => b.stats.avgDiscount - a.stats.avgDiscount);

  // Chart 1: Average Discount % by Category
  renderOverviewCategoryDiscountChart(categoryStatsList);

  // Chart 2: Discount Tiers
  renderDiscountTiersDonut(overallStats.tiers, totalCount);

  // Overview Table
  renderOverviewCategoryTable(categoryStatsList);
}

function renderOverviewCategoryDiscountChart(catStats) {
  const ctx = document.getElementById('chartOverviewCategoryDiscount');
  if (!ctx) return;
  if (charts.overviewCategory) charts.overviewCategory.destroy();

  const themeColors = getChartThemeColors();
  const labels = catStats.map(c => c.category);
  const data = catStats.map(c => parseFloat(c.stats.avgDiscount.toFixed(1)));
  const bgColors = catStats.map(c => CATEGORY_COLORS[c.category]?.bg || 'rgba(99, 102, 241, 0.7)');
  const borderColors = catStats.map(c => CATEGORY_COLORS[c.category]?.border || '#6366f1');

  charts.overviewCategory = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'ส่วนลดเฉลี่ย (% Avg Discount)',
        data,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: themeColors.tooltipBg,
          titleColor: themeColors.tooltipText,
          bodyColor: themeColors.tooltipText,
          borderColor: 'rgba(99, 102, 241, 0.2)',
          borderWidth: 1,
          callbacks: {
            label: (ctx) => ` ส่วนลดเฉลี่ย: ${ctx.raw}% (จำนวน: ${catStats[ctx.dataIndex].stats.count} ชิ้น)`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: themeColors.textColor, font: { size: 11 } },
          grid: { display: false }
        },
        y: {
          max: 100,
          ticks: {
            color: themeColors.textColor,
            callback: (v) => `${v}%`
          },
          grid: { color: themeColors.gridColor }
        }
      }
    }
  });
}

function renderDiscountTiersDonut(tiers, total) {
  const ctx = document.getElementById('chartDiscountTiers');
  if (!ctx) return;
  if (charts.discountTiers) charts.discountTiers.destroy();

  const themeColors = getChartThemeColors();
  const labels = ['0% - 20% (ลดน้อย)', '21% - 40% (ปานกลาง)', '41% - 60% (ลดเยอะ)', '61% - 80% (ลดกระหน่ำ)', '> 80% (ลดล้างสต็อก)'];
  const colors = ['#94a3b8', '#38bdf8', '#818cf8', '#f59e0b', '#ef4444'];

  charts.discountTiers = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: tiers,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: state.theme === 'dark' ? '#1e293b' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: themeColors.textColor,
            boxWidth: 12,
            font: { size: 10 }
          }
        },
        tooltip: {
          backgroundColor: themeColors.tooltipBg,
          titleColor: themeColors.tooltipText,
          bodyColor: themeColors.tooltipText,
          callbacks: {
            label: (ctx) => {
              const count = ctx.raw;
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${count.toLocaleString()} ชิ้น (${pct}%)`;
            }
          }
        }
      },
      cutout: '62%'
    }
  });
}

function renderOverviewCategoryTable(catStats) {
  const tbody = document.getElementById('overviewCategoryTableBody');
  if (!tbody) return;

  tbody.innerHTML = catStats.map(({ category, stats }) => {
    const badgeColor = stats.avgDiscount >= 50 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                       stats.avgDiscount >= 30 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                       'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
    return `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
        <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100 flex items-center">
          <span class="w-2.5 h-2.5 rounded-full mr-2" style="background-color: ${CATEGORY_COLORS[category]?.solid || '#6366f1'}"></span>
          ${escapeHtml(category)}
        </td>
        <td class="py-3 px-3 text-center font-mono">${stats.count.toLocaleString()}</td>
        <td class="py-3 px-3 text-right">
          <span class="inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${badgeColor}">
            ${stats.avgDiscount.toFixed(1)}%
          </span>
        </td>
        <td class="py-3 px-3 text-right font-mono">${stats.medianDiscount}%</td>
        <td class="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">${stats.maxDiscount}%</td>
        <td class="py-3 px-3 text-right font-mono text-slate-500">₹${Math.round(stats.avgActualPrice).toLocaleString()}</td>
        <td class="py-3 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">₹${Math.round(stats.avgDiscountedPrice).toLocaleString()}</td>
        <td class="py-3 px-3 text-center">
          <span class="text-amber-500 font-bold">${stats.avgRating.toFixed(2)} ★</span>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// RENDER TAB 2: CATEGORY COMPARISON STUDIO
// ==========================================
function renderCategoryCompareTab() {
  const catA = state.compareCatA;
  const catB = state.compareCatB;
  const catC = state.compareCatC;
  const hasCatC = catC && catC !== 'NONE' && catC !== catA && catC !== catB;

  const dataA = rawData.filter(p => p.main_cat === catA);
  const dataB = rawData.filter(p => p.main_cat === catB);
  const dataC = hasCatC ? rawData.filter(p => p.main_cat === catC) : [];

  const statsA = calculateCategoryStats(dataA);
  const statsB = calculateCategoryStats(dataB);
  const statsC = hasCatC ? calculateCategoryStats(dataC) : null;

  // Update table headers
  document.getElementById('colHeaderCatA').textContent = `Category A: ${catA}`;
  document.getElementById('colHeaderCatB').textContent = `Category B: ${catB}`;
  const headerC = document.getElementById('colHeaderCatC');
  if (hasCatC) {
    headerC.textContent = `Category C: ${catC}`;
    headerC.classList.remove('hidden');
  } else {
    headerC.textContent = '-';
    headerC.classList.add('hidden');
  }

  // Verdict calculation
  const discDiff = statsA.avgDiscount - statsB.avgDiscount;
  const verdictEl = document.getElementById('compareHighlightVerdict');
  if (Math.abs(discDiff) < 0.5) {
    verdictEl.textContent = `⚡ ทั้ง 2 หมวดหมู่มีระดับส่วนลดเฉลี่ยใกล้เคียงกัน (${statsA.avgDiscount.toFixed(1)}% vs ${statsB.avgDiscount.toFixed(1)}%)`;
  } else if (discDiff > 0) {
    verdictEl.textContent = `🏆 ${catA} ให้ส่วนลดเฉลี่ยสูงกว่า ${catB} อยู่ +${discDiff.toFixed(1)}%`;
  } else {
    verdictEl.textContent = `🏆 ${catB} ให้ส่วนลดเฉลี่ยสูงกว่า ${catA} อยู่ +${Math.abs(discDiff).toFixed(1)}%`;
  }

  // Populate Side-by-Side Table Rows
  renderSideBySideMetricsTable(catA, statsA, catB, statsB, catC, statsC, hasCatC);

  // Render Comparative Radar Chart
  renderCompareRadarChart(catA, statsA, catB, statsB, catC, statsC, hasCatC);

  // Render Discount Tiers Comparison Bar
  renderCompareTierBarChart(catA, statsA, catB, statsB, catC, statsC, hasCatC);

  // Render Champion Product Cards
  renderChampionCards(catA, statsA, catB, statsB, catC, statsC, hasCatC);

  // Render Subcategory Level 2 Matrix
  renderSubcategoryMatrix();
}

function renderSideBySideMetricsTable(catA, sA, catB, sB, catC, sC, hasCatC) {
  const tbody = document.getElementById('sideBySideTableBody');
  if (!tbody) return;

  const rows = [
    {
      metric: '📦 จำนวนสินค้า (Product Count)',
      valA: `${sA.count.toLocaleString()} รายการ`,
      valB: `${sB.count.toLocaleString()} รายการ`,
      valC: hasCatC ? `${sC.count.toLocaleString()} รายการ` : null,
      summary: sA.count > sB.count ? `${catA} มีสินค้ามากกว่า (${(sA.count - sB.count).toLocaleString()})` : `${catB} มีสินค้ามากกว่า (${(sB.count - sA.count).toLocaleString()})`
    },
    {
      metric: '🏷️ ส่วนลดเฉลี่ย (Average Discount %)',
      valA: `<span class="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">${sA.avgDiscount.toFixed(1)}%</span>`,
      valB: `<span class="font-extrabold text-pink-600 dark:text-pink-400 text-sm">${sB.avgDiscount.toFixed(1)}%</span>`,
      valC: hasCatC ? `<span class="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">${sC.avgDiscount.toFixed(1)}%</span>` : null,
      summary: sA.avgDiscount > sB.avgDiscount 
        ? `<span class="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold">${catA} ชนะ (+${(sA.avgDiscount - sB.avgDiscount).toFixed(1)}%)</span>`
        : `<span class="px-2 py-0.5 rounded bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 font-bold">${catB} ชนะ (+${(sB.avgDiscount - sA.avgDiscount).toFixed(1)}%)</span>`
    },
    {
      metric: '📊 ส่วนลดมัธยฐาน (Median Discount %)',
      valA: `${sA.medianDiscount}%`,
      valB: `${sB.medianDiscount}%`,
      valC: hasCatC ? `${sC.medianDiscount}%` : null,
      summary: sA.medianDiscount > sB.medianDiscount ? `${catA} สูงกว่า` : sB.medianDiscount > sA.medianDiscount ? `${catB} สูงกว่า` : 'เท่ากัน'
    },
    {
      metric: '🔥 ส่วนลดสูงสุด (Max Discount %)',
      valA: `<span class="font-bold text-rose-600">${sA.maxDiscount}%</span>`,
      valB: `<span class="font-bold text-rose-600">${sB.maxDiscount}%</span>`,
      valC: hasCatC ? `<span class="font-bold text-rose-600">${sC.maxDiscount}%</span>` : null,
      summary: sA.maxDiscount === sB.maxDiscount ? 'ลดสูงสุดเท่ากัน' : (sA.maxDiscount > sB.maxDiscount ? `${catA} สูงกว่า` : `${catB} สูงกว่า`)
    },
    {
      metric: '💰 ราคาเต็มเฉลี่ย (Avg Actual Price)',
      valA: `₹${Math.round(sA.avgActualPrice).toLocaleString()}`,
      valB: `₹${Math.round(sB.avgActualPrice).toLocaleString()}`,
      valC: hasCatC ? `₹${Math.round(sC.avgActualPrice).toLocaleString()}` : null,
      summary: `ส่วนต่าง ₹${Math.abs(Math.round(sA.avgActualPrice - sB.avgActualPrice)).toLocaleString()}`
    },
    {
      metric: '🏷️ ราคาขายเฉลี่ย (Avg Discounted Price)',
      valA: `<span class="font-bold">₹${Math.round(sA.avgDiscountedPrice).toLocaleString()}</span>`,
      valB: `<span class="font-bold">₹${Math.round(sB.avgDiscountedPrice).toLocaleString()}</span>`,
      valC: hasCatC ? `<span class="font-bold">₹${Math.round(sC.avgDiscountedPrice).toLocaleString()}</span>` : null,
      summary: sA.avgDiscountedPrice < sB.avgDiscountedPrice ? `${catA} ราคาเฉลี่ยย่อมเยากว่า` : `${catB} ราคาเฉลี่ยย่อมเยากว่า`
    },
    {
      metric: '💵 มูลค่าประหยัดเฉลี่ยต่อชิ้น (Avg Savings)',
      valA: `<span class="text-emerald-600 dark:text-emerald-400 font-bold">₹${Math.round(sA.avgSavings).toLocaleString()}</span>`,
      valB: `<span class="text-emerald-600 dark:text-emerald-400 font-bold">₹${Math.round(sB.avgSavings).toLocaleString()}</span>`,
      valC: hasCatC ? `<span class="text-emerald-600 dark:text-emerald-400 font-bold">₹${Math.round(sC.avgSavings).toLocaleString()}</span>` : null,
      summary: sA.avgSavings > sB.avgSavings ? `${catA} ประหยัดได้มากกว่า` : `${catB} ประหยัดได้มากกว่า`
    },
    {
      metric: '⭐ คะแนนรีวิวเฉลี่ย (Customer Rating)',
      valA: `<span class="text-amber-500 font-extrabold">${sA.avgRating.toFixed(2)} ★</span>`,
      valB: `<span class="text-amber-500 font-extrabold">${sB.avgRating.toFixed(2)} ★</span>`,
      valC: hasCatC ? `<span class="text-amber-500 font-extrabold">${sC.avgRating.toFixed(2)} ★</span>` : null,
      summary: sA.avgRating > sB.avgRating ? `${catA} รีวิวดีกว่า (+${(sA.avgRating - sB.avgRating).toFixed(2)})` : `${catB} รีวิวดีกว่า (+${(sB.avgRating - sA.avgRating).toFixed(2)})`
    },
    {
      metric: '👥 จำนวนรีวิวรวม (Review Volume)',
      valA: `${sA.totalReviews.toLocaleString()}`,
      valB: `${sB.totalReviews.toLocaleString()}`,
      valC: hasCatC ? `${sC.totalReviews.toLocaleString()}` : null,
      summary: sA.totalReviews > sB.totalReviews ? `${catA} ยอดรีวิวหนาแน่นกว่า` : `${catB} ยอดรีวิวหนาแน่นกว่า`
    }
  ];

  tbody.innerHTML = rows.map(r => `
    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
      <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">${r.metric}</td>
      <td class="py-3 px-4 text-center font-mono">${r.valA}</td>
      <td class="py-3 px-4 text-center font-mono">${r.valB}</td>
      ${hasCatC ? `<td class="py-3 px-4 text-center font-mono">${r.valC}</td>` : ''}
      <td class="py-3 px-4 text-center text-xs">${r.summary}</td>
    </tr>
  `).join('');
}

function renderCompareRadarChart(catA, sA, catB, sB, catC, sC, hasCatC) {
  const ctx = document.getElementById('chartCompareRadar');
  if (!ctx) return;
  if (charts.compareRadar) charts.compareRadar.destroy();

  const themeColors = getChartThemeColors();
  
  // Calculate relative normalized values (0 to 100 scale for radar comparison)
  const maxPrice = Math.max(sA.avgDiscountedPrice, sB.avgDiscountedPrice, hasCatC ? sC.avgDiscountedPrice : 1, 1);
  const maxReviews = Math.max(sA.totalReviews, sB.totalReviews, hasCatC ? sC.totalReviews : 1, 1);

  const normalizeA = [
    sA.avgDiscount,
    sA.maxDiscount,
    (sA.avgRating / 5) * 100,
    (sA.avgDiscountedPrice / maxPrice) * 100,
    (Math.log10(sA.totalReviews + 1) / Math.log10(maxReviews + 1)) * 100
  ];

  const normalizeB = [
    sB.avgDiscount,
    sB.maxDiscount,
    (sB.avgRating / 5) * 100,
    (sB.avgDiscountedPrice / maxPrice) * 100,
    (Math.log10(sB.totalReviews + 1) / Math.log10(maxReviews + 1)) * 100
  ];

  const datasets = [
    {
      label: catA,
      data: normalizeA,
      backgroundColor: COMPARE_COLORS.catA.bg,
      borderColor: COMPARE_COLORS.catA.border,
      borderWidth: 2,
      pointBackgroundColor: COMPARE_COLORS.catA.solid,
      pointRadius: 4
    },
    {
      label: catB,
      data: normalizeB,
      backgroundColor: COMPARE_COLORS.catB.bg,
      borderColor: COMPARE_COLORS.catB.border,
      borderWidth: 2,
      pointBackgroundColor: COMPARE_COLORS.catB.solid,
      pointRadius: 4
    }
  ];

  if (hasCatC) {
    const normalizeC = [
      sC.avgDiscount,
      sC.maxDiscount,
      (sC.avgRating / 5) * 100,
      (sC.avgDiscountedPrice / maxPrice) * 100,
      (Math.log10(sC.totalReviews + 1) / Math.log10(maxReviews + 1)) * 100
    ];
    datasets.push({
      label: catC,
      data: normalizeC,
      backgroundColor: COMPARE_COLORS.catC.bg,
      borderColor: COMPARE_COLORS.catC.border,
      borderWidth: 2,
      pointBackgroundColor: COMPARE_COLORS.catC.solid,
      pointRadius: 4
    });
  }

  charts.compareRadar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['ส่วนลดเฉลี่ย (% Avg)', 'ส่วนลดสูงสุด (% Max)', 'ความพึงพอใจ (Rating)', 'ระดับราคาขาย (Price)', 'ความนิยม (Reviews)'],
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { display: false },
          grid: { color: themeColors.gridColor },
          angleLines: { color: themeColors.gridColor },
          pointLabels: {
            color: themeColors.textColor,
            font: { size: 11, weight: 'bold' }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: themeColors.textColor, font: { size: 11 } }
        }
      }
    }
  });
}

function renderCompareTierBarChart(catA, sA, catB, sB, catC, sC, hasCatC) {
  const ctx = document.getElementById('chartCompareTierBars');
  if (!ctx) return;
  if (charts.compareTierBars) charts.compareTierBars.destroy();

  const themeColors = getChartThemeColors();
  const labels = ['0-20%', '21-40%', '41-60%', '61-80%', '>80%'];

  // Convert raw tier counts to percentages
  const pctA = sA.tiers.map(c => sA.count > 0 ? parseFloat(((c / sA.count) * 100).toFixed(1)) : 0);
  const pctB = sB.tiers.map(c => sB.count > 0 ? parseFloat(((c / sB.count) * 100).toFixed(1)) : 0);

  const datasets = [
    {
      label: `${catA} (%)`,
      data: pctA,
      backgroundColor: COMPARE_COLORS.catA.solid,
      borderRadius: 4
    },
    {
      label: `${catB} (%)`,
      data: pctB,
      backgroundColor: COMPARE_COLORS.catB.solid,
      borderRadius: 4
    }
  ];

  if (hasCatC) {
    const pctC = sC.tiers.map(c => sC.count > 0 ? parseFloat(((c / sC.count) * 100).toFixed(1)) : 0);
    datasets.push({
      label: `${catC} (%)`,
      data: pctC,
      backgroundColor: COMPARE_COLORS.catC.solid,
      borderRadius: 4
    });
  }

  charts.compareTierBars = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: themeColors.textColor }
        },
        tooltip: {
          backgroundColor: themeColors.tooltipBg,
          titleColor: themeColors.tooltipText,
          bodyColor: themeColors.tooltipText,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}% ของหมวดหมู่นี้`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: themeColors.textColor },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: themeColors.textColor,
            callback: (v) => `${v}%`
          },
          grid: { color: themeColors.gridColor }
        }
      }
    }
  });
}

function renderChampionCards(catA, sA, catB, sB, catC, sC, hasCatC) {
  const container = document.getElementById('compareChampionCards');
  if (!container) return;

  const champions = [
    { category: catA, prod: sA.champion, tag: 'Cat A Champion', color: 'indigo' },
    { category: catB, prod: sB.champion, tag: 'Cat B Champion', color: 'pink' }
  ];
  if (hasCatC && sC.champion) {
    champions.push({ category: catC, prod: sC.champion, tag: 'Cat C Champion', color: 'emerald' });
  }

  container.innerHTML = champions.map(item => {
    const p = item.prod;
    if (!p) return '';
    return `
      <div class="dash-card p-4 bg-slate-50/60 dark:bg-slate-900/60 border border-${item.color}-200 dark:border-${item.color}-800/40 relative flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-${item.color}-100 dark:bg-${item.color}-900/60 text-${item.color}-700 dark:text-${item.color}-300">
              ${item.tag}
            </span>
            <span class="text-xs font-bold text-rose-600 dark:text-rose-400">
              ลดสูงสุด ${p.disc_pct}%
            </span>
          </div>

          <div class="flex items-center space-x-3 my-2">
            <div class="w-16 h-16 rounded-lg bg-white dark:bg-slate-800 p-1 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden">
              <img src="${p.img || ''}" alt="" class="max-h-full max-w-full object-contain" onerror="this.src='https://via.placeholder.com/64?text=Item'">
            </div>
            <div>
              <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2" title="${escapeHtml(p.name)}">
                ${escapeHtml(p.name)}
              </h4>
              <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(p.sub_cat)}</p>
            </div>
          </div>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span class="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">₹${p.disc_price.toLocaleString()}</span>
            <span class="text-[11px] line-through text-slate-400 ml-1">₹${p.act_price.toLocaleString()}</span>
          </div>
          <button onclick="openProductDetail('${p.id}')" class="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            ดูรายละเอียด ➔
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderSubcategoryMatrix() {
  const tbody = document.getElementById('subcatMatrixTableBody');
  if (!tbody) return;

  const compareCats = [state.compareCatA, state.compareCatB];
  if (state.compareCatC && state.compareCatC !== 'NONE') compareCats.push(state.compareCatC);

  // Group items by subcategory within these categories
  const subcatMap = new Map();
  rawData.filter(p => compareCats.includes(p.main_cat)).forEach(p => {
    const key = `${p.main_cat}:::${p.sub_cat}`;
    if (!subcatMap.has(key)) subcatMap.set(key, []);
    subcatMap.get(key).push(p);
  });

  let rows = [];
  subcatMap.forEach((items, key) => {
    const [mainCat, subCat] = key.split(':::');
    const stats = calculateCategoryStats(items);
    rows.push({ mainCat, subCat, stats });
  });

  // Filter by subcatSearch keyword
  if (state.subcatSearch) {
    rows = rows.filter(r => r.subCat.toLowerCase().includes(state.subcatSearch) || r.mainCat.toLowerCase().includes(state.subcatSearch));
  }

  // Sort by average discount descending
  rows.sort((a, b) => b.stats.avgDiscount - a.stats.avgDiscount);

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400">ไม่พบหมวดย่อยที่ตรงกับคำค้นหา</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(({ mainCat, subCat, stats }) => `
    <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
      <td class="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold" style="background-color: ${CATEGORY_COLORS[mainCat]?.bg || '#eef2ff'}; color: ${CATEGORY_COLORS[mainCat]?.solid || '#4f46e5'}">
          ${escapeHtml(mainCat)}
        </span>
      </td>
      <td class="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">${escapeHtml(subCat)}</td>
      <td class="py-2.5 px-3 text-center font-mono">${stats.count}</td>
      <td class="py-2.5 px-3 text-right">
        <span class="inline-flex px-1.5 py-0.5 rounded font-bold text-[11px] ${stats.avgDiscount >= 50 ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' : 'text-slate-700 dark:text-slate-200'}">
          ${stats.avgDiscount.toFixed(1)}%
        </span>
      </td>
      <td class="py-2.5 px-3 text-right font-mono">${stats.medianDiscount}%</td>
      <td class="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">${stats.maxDiscount}%</td>
      <td class="py-2.5 px-3 text-center text-amber-500 font-bold">${stats.avgRating.toFixed(2)} ★</td>
    </tr>
  `).join('');
}

// ==========================================
// RENDER TAB 3: DISCOUNT PERCENTAGE DEEP DIVE
// ==========================================
function renderDiscountAnalysisTab() {
  renderDiscountRatingScatter();
  renderPriceComparisonChart();
  renderStackedTiersChart();
  renderGoldDealsGrid();
}

function renderDiscountRatingScatter() {
  const ctx = document.getElementById('chartDiscountRatingScatter');
  if (!ctx) return;
  if (charts.scatterPlot) charts.scatterPlot.destroy();

  const themeColors = getChartThemeColors();
  const filterCat = state.scatterCategory;

  let datasetItems = activeData.filter(p => p.rating > 0 && p.disc_pct >= 0);
  if (filterCat !== 'ALL') {
    datasetItems = datasetItems.filter(p => p.main_cat === filterCat);
  }

  // Sample or cluster if too many items for crisp rendering
  const scatterPoints = datasetItems.map(p => ({
    x: p.disc_pct,
    y: p.rating,
    r: Math.max(3, Math.min(10, Math.round(Math.log10(p.rating_count + 1) * 1.8))),
    product: p
  }));

  charts.scatterPlot = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: [{
        label: filterCat === 'ALL' ? 'สินค้าทั้งหมด' : filterCat,
        data: scatterPoints,
        backgroundColor: filterCat === 'ALL' ? 'rgba(99, 102, 241, 0.45)' : (CATEGORY_COLORS[filterCat]?.bg || 'rgba(99, 102, 241, 0.5)'),
        borderColor: filterCat === 'ALL' ? '#6366f1' : (CATEGORY_COLORS[filterCat]?.border || '#6366f1'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: themeColors.tooltipBg,
          titleColor: themeColors.tooltipText,
          bodyColor: themeColors.tooltipText,
          borderColor: 'rgba(99, 102, 241, 0.2)',
          borderWidth: 1,
          callbacks: {
            title: (items) => {
              const p = items[0].raw.product;
              return p.name.length > 60 ? p.name.substring(0, 60) + '...' : p.name;
            },
            label: (ctx) => {
              const p = ctx.raw.product;
              return [
                ` หมวดหมู่: ${p.main_cat}`,
                ` ส่วนลด: ${p.disc_pct}% (ราคา: ₹${p.disc_price.toLocaleString()})`,
                ` คะแนนรีวิว: ${p.rating} ★ (${(p.rating_count || 0).toLocaleString()} รีวิว)`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'สัดส่วนส่วนลด (Discount Percentage %)',
            color: themeColors.textColor,
            font: { weight: 'bold', size: 11 }
          },
          ticks: {
            color: themeColors.textColor,
            callback: (v) => `${v}%`
          },
          grid: { color: themeColors.gridColor }
        },
        y: {
          min: 2,
          max: 5,
          title: {
            display: true,
            text: 'คะแนนความพึงพอใจ (Rating: 1 - 5 ดาว)',
            color: themeColors.textColor,
            font: { weight: 'bold', size: 11 }
          },
          ticks: {
            stepSize: 0.5,
            color: themeColors.textColor,
            callback: (v) => `${v} ★`
          },
          grid: { color: themeColors.gridColor }
        }
      }
    }
  });
}

function renderPriceComparisonChart() {
  const ctx = document.getElementById('chartPriceComparison');
  if (!ctx) return;
  if (charts.priceCompare) charts.priceCompare.destroy();

  const themeColors = getChartThemeColors();
  
  // Aggregate main categories
  const catMap = new Map();
  rawData.forEach(p => {
    if (!catMap.has(p.main_cat)) catMap.set(p.main_cat, { totalAct: 0, totalDisc: 0, count: 0 });
    const c = catMap.get(p.main_cat);
    c.totalAct += p.act_price;
    c.totalDisc += p.disc_price;
    c.count++;
  });

  const categories = [...catMap.keys()].filter(k => catMap.get(k).count >= 5);
  const avgActPrices = categories.map(k => Math.round(catMap.get(k).totalAct / catMap.get(k).count));
  const avgDiscPrices = categories.map(k => Math.round(catMap.get(k).totalDisc / catMap.get(k).count));

  charts.priceCompare = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [
        {
          label: 'ราคาเต็ม (Actual Price ₹)',
          data: avgActPrices,
          backgroundColor: '#94a3b8',
          borderRadius: 4
        },
        {
          label: 'ราคาหลังลด (Discounted Price ₹)',
          data: avgDiscPrices,
          backgroundColor: '#4f46e5',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: themeColors.textColor }
        },
        tooltip: {
          backgroundColor: themeColors.tooltipBg,
          titleColor: themeColors.tooltipText,
          bodyColor: themeColors.tooltipText,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ₹${ctx.raw.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: themeColors.textColor, font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: themeColors.textColor,
            callback: (v) => `₹${v.toLocaleString()}`
          },
          grid: { color: themeColors.gridColor }
        }
      }
    }
  });
}

function renderStackedTiersChart() {
  const ctx = document.getElementById('chartStackedTiers');
  if (!ctx) return;
  if (charts.stackedTiers) charts.stackedTiers.destroy();

  const themeColors = getChartThemeColors();
  
  const catMap = new Map();
  rawData.forEach(p => {
    if (!catMap.has(p.main_cat)) catMap.set(p.main_cat, []);
    catMap.get(p.main_cat).push(p);
  });

  const validCats = [...catMap.entries()].filter(([_, items]) => items.length >= 10).map(([k]) => k);
  
  const tierLabels = ['0-20%', '21-40%', '41-60%', '61-80%', '>80%'];
  const colors = ['#cbd5e1', '#60a5fa', '#818cf8', '#f59e0b', '#ef4444'];

  const datasets = tierLabels.map((label, tIdx) => ({
    label,
    backgroundColor: colors[tIdx],
    data: validCats.map(cat => {
      const stats = calculateCategoryStats(catMap.get(cat));
      return stats.count > 0 ? parseFloat(((stats.tiers[tIdx] / stats.count) * 100).toFixed(1)) : 0;
    })
  }));

  charts.stackedTiers = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: validCats,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: themeColors.textColor, font: { size: 10 } }
        },
        tooltip: {
          backgroundColor: themeColors.tooltipBg,
          titleColor: themeColors.tooltipText,
          bodyColor: themeColors.tooltipText,
          callbacks: {
            label: (ctx) => ` ช่วง ${ctx.dataset.label}: ${ctx.raw}% ของหมวดนี้`
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: themeColors.textColor, font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          stacked: true,
          max: 100,
          ticks: {
            color: themeColors.textColor,
            callback: (v) => `${v}%`
          },
          grid: { color: themeColors.gridColor }
        }
      }
    }
  });
}

function renderGoldDealsGrid() {
  const container = document.getElementById('goldDealsGrid');
  const countBadge = document.getElementById('goldDealsCountBadge');
  if (!container) return;

  // Filter top deals: discount >= 70% and rating >= 4.0
  const goldDeals = rawData
    .filter(p => p.disc_pct >= 70 && p.rating >= 4.0)
    .sort((a, b) => b.disc_pct - a.disc_pct || b.rating - a.rating)
    .slice(0, 8);

  countBadge.textContent = `${goldDeals.length} ดีลยอดเยี่ยม`;

  container.innerHTML = goldDeals.map(p => `
    <div class="dash-card p-3.5 bg-slate-50/60 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-800/40 relative flex flex-col justify-between hover:border-amber-400 transition">
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
            -${p.disc_pct}%
          </span>
          <span class="text-xs font-bold text-amber-500">
            ${p.rating} ★
          </span>
        </div>

        <div class="w-full h-28 bg-white dark:bg-slate-800 rounded-lg p-2 mb-2 flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
          <img src="${p.img || ''}" alt="" class="max-h-full max-w-full object-contain" onerror="this.src='https://via.placeholder.com/120?text=Item'">
        </div>

        <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2" title="${escapeHtml(p.name)}">
          ${escapeHtml(p.name)}
        </h4>
        <p class="text-[10px] text-slate-400 mt-0.5 truncate">${escapeHtml(p.main_cat)}</p>
      </div>

      <div class="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <span class="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">₹${p.disc_price.toLocaleString()}</span>
          <span class="text-[10px] line-through text-slate-400 ml-1">₹${p.act_price.toLocaleString()}</span>
        </div>
        <button onclick="openProductDetail('${p.id}')" class="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline">
          ดูดีล ➔
        </button>
      </div>
    </div>
  `).join('');
}

// ==========================================
// RENDER TAB 4: PRODUCT EXPLORER & TABLE
// ==========================================
function renderExplorerTab() {
  renderExplorerTable();
}

function renderExplorerTable() {
  const tbody = document.getElementById('productTableBody');
  if (!tbody) return;

  // Filter based on active filters + search keyword
  let items = activeData;
  if (state.searchKeyword) {
    items = items.filter(p => 
      p.name.toLowerCase().includes(state.searchKeyword) ||
      p.id.toLowerCase().includes(state.searchKeyword) ||
      p.sub_cat.toLowerCase().includes(state.searchKeyword)
    );
  }

  // Sorting
  items.sort((a, b) => {
    switch (state.sortBy) {
      case 'disc_desc': return b.disc_pct - a.disc_pct;
      case 'disc_asc': return a.disc_pct - b.disc_pct;
      case 'price_asc': return a.disc_price - b.disc_price;
      case 'price_desc': return b.disc_price - a.disc_price;
      case 'rating_desc': return b.rating - a.rating;
      case 'reviews_desc': return (b.rating_count || 0) - (a.rating_count || 0);
      default: return b.disc_pct - a.disc_pct;
    }
  });

  const totalFiltered = items.length;
  const totalPages = Math.ceil(totalFiltered / state.pageSize) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  // Update counts
  document.getElementById('tableResultsCount').textContent = `แสดงผล ${totalFiltered.toLocaleString()} รายการ (จากทั้งหมด ${rawData.length.toLocaleString()})`;
  document.getElementById('tablePageIndicator').textContent = `หน้า ${state.currentPage} / ${totalPages}`;

  // Enable/disable pagination buttons
  document.getElementById('btnPrevPage').disabled = state.currentPage <= 1;
  document.getElementById('btnNextPage').disabled = state.currentPage >= totalPages;

  // Page Numbers
  renderPaginationNumbers(totalPages);

  // Slice items for current page
  const startIndex = (state.currentPage - 1) * state.pageSize;
  const pageItems = items.slice(startIndex, startIndex + state.pageSize);

  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="py-12 text-center text-slate-400">
          ไม่พบข้อมูลสินค้าที่ตรงกับเงื่อนไขการค้นหา
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pageItems.map(p => {
    const badgeClass = p.disc_pct >= 70 ? 'badge-discount' :
                       p.disc_pct >= 40 ? 'badge-discount-mid' :
                       'badge-discount-low';
    return `
      <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
        <td class="py-2.5 px-3 text-center">
          <div class="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden mx-auto">
            <img src="${p.img || ''}" alt="" class="max-h-full max-w-full object-contain" onerror="this.src='https://via.placeholder.com/40?text=IMG'">
          </div>
        </td>
        <td class="py-2.5 px-3 max-w-xs">
          <div class="font-bold text-slate-800 dark:text-slate-100 truncate cursor-pointer hover:text-indigo-600" onclick="openProductDetail('${p.id}')" title="${escapeHtml(p.name)}">
            ${escapeHtml(p.name)}
          </div>
          <div class="flex items-center space-x-1.5 mt-0.5 text-[10px] text-slate-400">
            <span class="px-1.5 py-0.2 rounded font-semibold" style="background-color: ${CATEGORY_COLORS[p.main_cat]?.bg || '#eef2ff'}; color: ${CATEGORY_COLORS[p.main_cat]?.solid || '#4f46e5'}">
              ${escapeHtml(p.main_cat)}
            </span>
            <span>•</span>
            <span class="truncate">${escapeHtml(p.sub_cat)}</span>
          </div>
        </td>
        <td class="py-2.5 px-3 text-center">
          <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${badgeClass}">
            -${p.disc_pct}%
          </span>
        </td>
        <td class="py-2.5 px-3 text-right font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
          ₹${p.disc_price.toLocaleString()}
        </td>
        <td class="py-2.5 px-3 text-right font-mono line-through text-slate-400">
          ₹${p.act_price.toLocaleString()}
        </td>
        <td class="py-2.5 px-3 text-center font-bold text-amber-500">
          ${p.rating > 0 ? `${p.rating} ★` : '-'}
        </td>
        <td class="py-2.5 px-3 text-right font-mono text-slate-500">
          ${(p.rating_count || 0).toLocaleString()}
        </td>
        <td class="py-2.5 px-3 text-center space-x-1">
          <button onclick="openProductDetail('${p.id}')" class="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-[11px] transition">
            ดูรายละเอียด
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPaginationNumbers(totalPages) {
  const container = document.getElementById('paginationNumbers');
  if (!container) return;

  let pages = [];
  const cur = state.currentPage;

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cur > 3) pages.push('...');
    const start = Math.max(2, cur - 1);
    const end = Math.min(totalPages - 1, cur + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (cur < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  container.innerHTML = pages.map(p => {
    if (p === '...') {
      return `<span class="px-2 py-1 text-slate-400 text-xs">...</span>`;
    }
    const isActive = p === cur;
    return `
      <button onclick="goToPage(${p})" class="w-7 h-7 text-xs font-semibold rounded-lg flex items-center justify-center transition ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}">
        ${p}
      </button>
    `;
  }).join('');
}

window.goToPage = function(page) {
  state.currentPage = page;
  renderExplorerTable();
};

// Product Modal
window.openProductDetail = function(productId) {
  const p = rawData.find(item => item.id === productId);
  if (!p) return;

  document.getElementById('modalImg').src = p.img || '';
  document.getElementById('modalId').textContent = p.id;
  document.getElementById('modalCategory').textContent = `${p.main_cat} > ${p.sub_cat}`;
  document.getElementById('modalName').textContent = p.name;
  document.getElementById('modalDiscPrice').textContent = `₹${p.disc_price.toLocaleString()}`;
  document.getElementById('modalActPrice').textContent = `₹${p.act_price.toLocaleString()}`;
  
  const savings = p.act_price - p.disc_price;
  document.getElementById('modalSavings').textContent = `ประหยัด ₹${savings.toLocaleString()} (${p.disc_pct}%)`;
  document.getElementById('modalDiscountBadge').textContent = `-${p.disc_pct}% OFF`;

  document.getElementById('modalRating').textContent = p.rating > 0 ? p.rating : '-';
  document.getElementById('modalReviews').textContent = `${(p.rating_count || 0).toLocaleString()} ผู้รีวิว`;
  document.getElementById('modalAbout').textContent = p.about || 'ไม่มีข้อมูลรายละเอียดเพิ่มเติม';

  const linkBtn = document.getElementById('modalProductLink');
  if (p.url) {
    linkBtn.href = p.url;
    linkBtn.classList.remove('hidden');
  } else {
    linkBtn.classList.add('hidden');
  }

  document.getElementById('productDetailModal').classList.remove('hidden');
};

function closeProductModal() {
  document.getElementById('productDetailModal').classList.add('hidden');
}

// CSV Export
function exportFilteredCSV() {
  let items = activeData;
  if (state.searchKeyword) {
    items = items.filter(p => 
      p.name.toLowerCase().includes(state.searchKeyword) ||
      p.id.toLowerCase().includes(state.searchKeyword) ||
      p.sub_cat.toLowerCase().includes(state.searchKeyword)
    );
  }

  const csvRows = [
    ['Product ID', 'Product Name', 'Category', 'Subcategory', 'Discounted Price (INR)', 'Actual Price (INR)', 'Discount %', 'Rating', 'Rating Count']
  ];

  items.forEach(p => {
    csvRows.push([
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.main_cat}"`,
      `"${p.sub_cat}"`,
      p.disc_price,
      p.act_price,
      p.disc_pct,
      p.rating,
      p.rating_count
    ]);
  });

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `filtered_sales_data_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// CSV File Upload Handler
function handleCSVFile(file) {
  const statusEl = document.getElementById('uploadStatusText');
  statusEl.textContent = `กำลังอ่านไฟล์ ${file.name}...`;

  if (typeof Papa === 'undefined') {
    statusEl.textContent = 'ข้อผิดพลาด: ไม่พบตัวประมวลผล PapaParse';
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const parsedProducts = [];
      const cleanNum = (val) => {
        if (!val) return 0;
        const c = String(val).replace(/[^0-9.]/g, '');
        const n = parseFloat(c);
        return isNaN(n) ? 0 : n;
      };

      results.data.forEach((row, idx) => {
        const id = row.product_id || row.id || `PROD_${idx+1}`;
        const name = row.product_name || row.name || 'Unnamed Product';
        const rawCat = row.category || 'Other';
        const catParts = rawCat.split('|');
        const mainCat = catParts[0] ? catParts[0].trim() : 'Other';
        const subCat = catParts[1] ? catParts[1].trim() : mainCat;

        const discPrice = cleanNum(row.discounted_price || row.price);
        const actPrice = cleanNum(row.actual_price || row.original_price);
        let discPct = cleanNum(row.discount_percentage || row.discount);
        if (!discPct && actPrice > 0) {
          discPct = Math.round(((actPrice - discPrice) / actPrice) * 100);
        }

        let rating = parseFloat(row.rating);
        if (isNaN(rating)) rating = 0;

        parsedProducts.push({
          id,
          name,
          main_cat: mainCat,
          sub_cat: subCat,
          full_cat: rawCat,
          disc_price: discPrice,
          act_price: actPrice,
          disc_pct: discPct,
          rating,
          rating_count: cleanNum(row.rating_count || row.reviews_count),
          about: (row.about_product || row.description || '').substring(0, 300),
          img: row.img_link || row.image || '',
          url: row.product_link || row.url || ''
        });
      });

      if (parsedProducts.length > 0) {
        rawData = parsedProducts;
        onDataLoaded(file.name, rawData.length);
        document.getElementById('uploadModal').classList.add('hidden');
        statusEl.textContent = `ประมวลผลสำเร็จ ${parsedProducts.length} รายการ`;
      } else {
        statusEl.textContent = 'ไม่พบข้อมูลแถวสินค้าที่ถูกต้องในไฟล์ CSV นี้';
      }
    },
    error: (err) => {
      statusEl.textContent = `เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}`;
    }
  });
}

// Helper Utilities
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
