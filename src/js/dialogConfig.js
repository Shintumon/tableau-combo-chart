/**
 * Dialog Configuration Handler for Viz Extension
 * Manages the configuration dialog UI and settings
 */

(function() {
  'use strict';

  // Configuration object
  let config = {};
  let worksheet = null;
  let columns = { dimensions: [], measures: [] };

  /**
   * Show a custom modal message (replaces generic browser alerts)
   * @param {string} title - The modal title
   * @param {string} message - The message body (can contain HTML)
   * @param {string} type - 'error', 'warning', 'success', or 'info'
   */
  function showMessage(title, message, type = 'info') {
    // Remove any existing modal
    const existingModal = document.getElementById('extension-modal');
    if (existingModal) existingModal.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'extension-modal';
    modal.className = 'extension-modal';
    modal.innerHTML = `
      <div class="extension-modal-overlay"></div>
      <div class="extension-modal-content extension-modal-${type}">
        <div class="extension-modal-header">
          <span class="extension-modal-icon">${getModalIcon(type)}</span>
          <h3 class="extension-modal-title">${title}</h3>
        </div>
        <div class="extension-modal-body">${message}</div>
        <div class="extension-modal-footer">
          <button type="button" class="btn btn-primary extension-modal-close">OK</button>
        </div>
      </div>
    `;

    // Add modal styles if not already present
    if (!document.getElementById('extension-modal-styles')) {
      const styles = document.createElement('style');
      styles.id = 'extension-modal-styles';
      styles.textContent = `
        .extension-modal { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; }
        .extension-modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
        .extension-modal-content { position: relative; background: white; border-radius: 12px; width: 90%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: modalSlideIn 0.2s ease-out; }
        @keyframes modalSlideIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .extension-modal-header { display: flex; align-items: center; gap: 12px; padding: 20px 24px 16px; border-bottom: 1px solid #e5e7eb; }
        .extension-modal-icon { font-size: 24px; line-height: 1; }
        .extension-modal-title { margin: 0; font-size: 16px; font-weight: 600; color: #1f2937; }
        .extension-modal-body { padding: 20px 24px; font-size: 14px; color: #4b5563; line-height: 1.6; }
        .extension-modal-body ul { margin: 10px 0 0 0; padding-left: 20px; }
        .extension-modal-body li { margin: 6px 0; }
        .extension-modal-footer { padding: 16px 24px 20px; display: flex; justify-content: flex-end; }
        .extension-modal-error .extension-modal-header { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); }
        .extension-modal-error .extension-modal-title { color: #991b1b; }
        .extension-modal-warning .extension-modal-header { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }
        .extension-modal-warning .extension-modal-title { color: #92400e; }
        .extension-modal-success .extension-modal-header { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); }
        .extension-modal-success .extension-modal-title { color: #065f46; }
        .extension-modal-info .extension-modal-header { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); }
        .extension-modal-info .extension-modal-title { color: #1e40af; }
      `;
      document.head.appendChild(styles);
    }

    document.body.appendChild(modal);

    // Close handlers
    const closeBtn = modal.querySelector('.extension-modal-close');
    const overlay = modal.querySelector('.extension-modal-overlay');
    const closeModal = () => modal.remove();

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); }
    });

    closeBtn.focus();
  }

  /**
   * Get icon for modal type
   */
  function getModalIcon(type) {
    switch (type) {
      case 'error': return '⚠️';
      case 'warning': return '⚡';
      case 'success': return '✓';
      default: return 'ℹ️';
    }
  }

  // DOM Elements cache
  const elements = {};

  /**
   * Initialize dialog
   */
  async function init() {
    console.log('Dialog init starting...');
    try {
      // Initialize Tableau Extensions API
      console.log('Initializing Tableau dialog API...');
      await tableau.extensions.initializeDialogAsync();
      console.log('Tableau dialog API initialized');

      // Get the worksheet from viz extension context
      worksheet = tableau.extensions.worksheetContent.worksheet;
      console.log('Worksheet:', worksheet ? 'found' : 'not found');

      // Load existing configuration
      loadConfig();
      console.log('Config loaded');

      // Cache DOM elements
      cacheElements();
      console.log('Elements cached');

      // Load columns from the worksheet
      await loadColumns();
      console.log('Columns loaded');

      // Set up tab navigation FIRST (critical for UI)
      setupTabs();
      console.log('Tabs setup complete');

      // Populate form with current values
      populateForm();
      console.log('Form populated');

      // Set up event listeners (wrapped in try-catch to not block tabs)
      try {
        setupEventListeners();
        console.log('Event listeners setup complete');
      } catch (eventError) {
        console.error('Error setting up event listeners:', eventError);
      }

      // Check if we should open a specific tab (from context menu)
      navigateToRequestedTab();
      console.log('Dialog init complete');

    } catch (error) {
      console.error('Dialog initialization error:', error);
      // Show styled error to user
      document.body.innerHTML = `
        <div style="padding: 40px; font-family: system-ui, sans-serif; text-align: center; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="background: white; padding: 32px 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); max-width: 400px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h2 style="margin: 0 0 12px 0; color: #991b1b; font-size: 18px;">Combo Chart - Dialog Error</h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${error.message || error}</p>
            <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">Please try reopening the configuration dialog.</p>
          </div>
        </div>`;
    }
  }

  /**
   * Navigate to a specific tab if requested (e.g., from context menu)
   */
  function navigateToRequestedTab() {
    const settings = tableau.extensions.settings.getAll();
    const requestedTab = settings.dialogOpenTab;
    const requestedSection = settings.dialogOpenSection;

    // Clear the settings so they don't persist
    tableau.extensions.settings.erase('dialogOpenTab');
    tableau.extensions.settings.erase('dialogOpenSection');

    if (requestedTab) {
      // Find and click the appropriate tab button
      const tabBtn = document.querySelector(`.tab-btn[data-tab="${requestedTab}"]`);
      if (tabBtn) {
        tabBtn.click();

        // If a specific section was requested, scroll to it
        if (requestedSection) {
          setTimeout(() => {
            scrollToSection(requestedSection);
          }, 100);
        }
      }
    }
  }

  /**
   * Scroll to a specific section within the current tab
   */
  function scrollToSection(sectionId) {
    const sectionMap = {
      'bar1': '#tab-bars .config-section:nth-child(2)',
      'bar2': '#tab-bars .config-section:nth-child(3)',
      'line': '#tab-line .config-section:first-child',
      'xAxis': '#tab-axes .config-section:nth-child(2)',
      'yAxisLeft': '#tab-axes .config-section:nth-child(3)',
      'yAxisRight': '#tab-axes .config-section:nth-child(4)',
      'grid': '#tab-axes .config-section:nth-child(5)',
      'title': '#tab-labels .config-section:first-child',
      'legend': '#tab-labels .config-section:nth-child(4)'
    };

    const selector = sectionMap[sectionId];
    if (selector) {
      const section = document.querySelector(selector);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Add highlight effect
        section.classList.add('highlight-section');
        setTimeout(() => section.classList.remove('highlight-section'), 2000);
      }
    }
  }

  /**
   * Load configuration from settings
   */
  function loadConfig() {
    const settings = tableau.extensions.settings.getAll();
    const defaults = getDefaultConfig();

    if (settings.comboChartConfig) {
      const saved = JSON.parse(settings.comboChartConfig);
      // Deep merge saved config with defaults to ensure all properties exist
      config = deepMerge(defaults, saved);
    } else {
      // Use defaults
      config = defaults;
    }

    // Ensure xAxis has all required properties
    if (!config.xAxis) config.xAxis = {};
    if (config.xAxis.sort === undefined) config.xAxis.sort = 'default';
    if (config.xAxis.showTitle === undefined) config.xAxis.showTitle = true;
    if (config.xAxis.showLabels === undefined) config.xAxis.showLabels = true;
    if (config.xAxis.showTickMarks === undefined) config.xAxis.showTickMarks = true;
    if (config.xAxis.showAxisLine === undefined) config.xAxis.showAxisLine = true;
    if (config.xAxis.align === undefined) config.xAxis.align = 'center';
    if (config.xAxis.maxWidth === undefined) config.xAxis.maxWidth = 'none';
    if (config.xAxis.lineColor === undefined) config.xAxis.lineColor = '#999999';
    if (config.xAxis.tickColor === undefined) config.xAxis.tickColor = '#999999';

    console.log('DialogConfig: Loaded config with xAxis.sort =', config.xAxis.sort);
  }

  /**
   * Deep merge two objects
   */
  function deepMerge(defaults, overrides) {
    const result = JSON.parse(JSON.stringify(defaults));

    for (const key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        if (typeof overrides[key] === 'object' && overrides[key] !== null && !Array.isArray(overrides[key])) {
          result[key] = deepMerge(result[key] || {}, overrides[key]);
        } else {
          result[key] = overrides[key];
        }
      }
    }

    return result;
  }

  /**
   * Get default configuration
   * Uses workbook font if available, otherwise falls back to system default
   */
  function getDefaultConfig() {
    // Get the default font from workbook or system
    const detectedFont = getDetectedFontFamily();

    return {
      dimension: '',
      bar1Measure: '',
      bar2Measure: '',
      lineMeasure: '',
      colorPalette: 'tableau10',
      barStyle: 'grouped',
      barPadding: 0.2,
      bar1: { color: '#4e79a7', opacity: 1, borderColor: '#3a5f80', borderWidth: 1, cornerRadius: 2 },
      bar2: { color: '#f28e2c', opacity: 1, borderColor: '#c47223', borderWidth: 1, cornerRadius: 2 },
      line: { color: '#e15759', opacity: 1, width: 2, style: 'solid', curve: 'linear' },
      points: { show: true, size: 5, shape: 'circle', fill: '#e15759', stroke: '#ffffff' },
      animation: { enabled: true, duration: 500, easing: 'easeCubicOut' },
      font: { family: detectedFont, titleWeight: 600, labelWeight: 400 },
      axisMode: 'dual',
      xAxis: { show: true, title: '', fontSize: 12, rotation: 0, sort: 'default', showTitle: true, showLabels: true, showTickMarks: true, showAxisLine: true, align: 'center', maxWidth: 'none', lineColor: '#999999', tickColor: '#999999' },
      yAxisLeft: { show: true, title: '', min: null, max: null, format: 'auto' },
      yAxisRight: { show: true, title: '', min: null, max: null, format: 'auto' },
      grid: { horizontal: true, vertical: false, color: '#e0e0e0', opacity: 0.5 },
      title: { show: true, text: 'Combo Chart', fontSize: 18, color: '#333333' },
      barLabels: { show: false, position: 'top', fontSize: 10, color: '#333333' },
      lineLabels: { show: false, position: 'top', fontSize: 10, color: '#333333' },
      legend: { show: true, position: 'bottom', bar1Label: '', bar2Label: '', lineLabel: '' },
      tooltip: { show: true, showDimension: true, showMeasureName: true, showValue: true, bgColor: '#333333', textColor: '#ffffff', fontSize: 12 },
      headerControls: { showLegendToggle: true, showSettingsCog: true },
      titleFont: { family: detectedFont, size: 18, weight: 600, color: '#333333', italic: false },
      xAxisFont: { family: detectedFont, size: 12, weight: 400, color: '#666666', italic: false },
      yAxisFont: { family: detectedFont, size: 12, weight: 400, color: '#666666', italic: false },
      legendFont: { family: detectedFont, size: 12, weight: 400, color: '#333333', italic: false },
      barLabelFont: { family: detectedFont, size: 10, weight: 400, color: '#333333', italic: false },
      lineLabelFont: { family: detectedFont, size: 10, weight: 400, color: '#333333', italic: false },
      tooltipFont: { family: detectedFont, size: 12, weight: 400, color: '#ffffff', italic: false }
    };
  }

  /**
   * Get the detected font family (workbook or system)
   * This is a helper function that can be called before detectSystemFont is fully initialized
   */
  function getDetectedFontFamily() {
    // Try to get workbook font first
    try {
      if (typeof tableau !== 'undefined' && tableau.extensions && tableau.extensions.environment) {
        const workbookFont = getWorkbookFont();
        if (workbookFont) {
          return workbookFont.family;
        }
      }
    } catch (e) {
      // Tableau API might not be ready yet
    }

    // Fall back to system default
    return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }

  /**
   * Color palettes (Tableau-style)
   */
  const colorPalettes = {
    'tableau10': {
      name: 'Tableau 10',
      colors: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab']
    },
    'tableau20': {
      name: 'Tableau 20',
      colors: ['#4e79a7', '#a0cbe8', '#f28e2c', '#ffbe7d', '#59a14f', '#8cd17d', '#b6992d', '#f1ce63', '#499894', '#86bcb6']
    },
    'colorBlind': {
      name: 'Color Blind Safe',
      colors: ['#1170aa', '#fc7d0b', '#a3acb9', '#57606c', '#5fa2ce', '#c85200', '#7b848f', '#a3cce9', '#ffbc79', '#c8d0d9']
    },
    'seattle': {
      name: 'Seattle Grays',
      colors: ['#767f8b', '#b3b7b8', '#5c6068', '#9ea4ac', '#d7d8d9', '#3b3f45', '#8a8f96', '#c6c9cc', '#454a51', '#babdbf']
    },
    'trafficLight': {
      name: 'Traffic Light',
      colors: ['#b10318', '#dba13a', '#309343', '#d82526', '#ffc156', '#69b764', '#f26c64', '#ffdd71', '#a5d99f']
    },
    'purpleGray': {
      name: 'Purple-Gray',
      colors: ['#7b66d2', '#a699e8', '#dc5fbd', '#ffc0da', '#5f5a41', '#b4b19b', '#995688', '#d898ba', '#ab6ad5', '#d098ee']
    },
    'greenOrange': {
      name: 'Green-Orange',
      colors: ['#32a251', '#acd98d', '#ff7f0f', '#ffb977', '#3cb7cc', '#98d9e4', '#b85a0d', '#ffd94a', '#39737c', '#86b4a9']
    },
    'blueRed': {
      name: 'Blue-Red',
      colors: ['#2c69b0', '#b5c8e2', '#f02720', '#ffb6b0', '#ac613c', '#e9c39b', '#6ba3d6', '#b5dffd', '#ac8763', '#ddc9b4']
    },
    'cyclic': {
      name: 'Cyclic',
      colors: ['#1f83b4', '#12a2a8', '#2ca030', '#78a641', '#bcbd22', '#ffbf50', '#ffaa0e', '#ff7f0e', '#d63a3a', '#c7519c']
    },
    'classic': {
      name: 'Classic',
      colors: ['#7ab800', '#6ac7de', '#ff6f01', '#fbb034', '#68adef', '#6d6e70', '#a4dbcc', '#ffbf9a', '#b3d9ff', '#d0d0d0']
    }
  };

  /**
   * Cache DOM elements
   */
  function cacheElements() {
    // Data tab - no worksheet select needed for viz extensions
    elements.dimensionSelect = document.getElementById('dimension-select');
    elements.bar1Measure = document.getElementById('bar1-measure');
    elements.bar2Measure = document.getElementById('bar2-measure');
    elements.lineMeasure = document.getElementById('line-measure');

    // Bars tab
    elements.barPadding = document.getElementById('bar-padding');
    elements.barPaddingValue = document.getElementById('bar-padding-value');
    elements.bar1Color = document.getElementById('bar1-color');
    elements.bar1Opacity = document.getElementById('bar1-opacity');
    elements.bar1OpacityValue = document.getElementById('bar1-opacity-value');
    elements.bar1BorderColor = document.getElementById('bar1-border-color');
    elements.bar1BorderWidth = document.getElementById('bar1-border-width');
    elements.bar1CornerRadius = document.getElementById('bar1-corner-radius');
    elements.bar1CornerRadiusValue = document.getElementById('bar1-corner-radius-value');
    elements.bar1ShowBorder = document.getElementById('bar1-show-border');
    elements.bar1BorderOptions = document.getElementById('bar1-border-options');
    elements.bar2Color = document.getElementById('bar2-color');
    elements.bar2Opacity = document.getElementById('bar2-opacity');
    elements.bar2OpacityValue = document.getElementById('bar2-opacity-value');
    elements.bar2BorderColor = document.getElementById('bar2-border-color');
    elements.bar2BorderWidth = document.getElementById('bar2-border-width');
    elements.bar2CornerRadius = document.getElementById('bar2-corner-radius');
    elements.bar2CornerRadiusValue = document.getElementById('bar2-corner-radius-value');
    elements.bar2ShowBorder = document.getElementById('bar2-show-border');
    elements.bar2BorderOptions = document.getElementById('bar2-border-options');
    elements.swapBarsBtn = document.getElementById('swap-bars-btn');

    // Line tab
    elements.lineColor = document.getElementById('line-color');
    elements.lineOpacity = document.getElementById('line-opacity');
    elements.lineOpacityValue = document.getElementById('line-opacity-value');
    elements.lineWidth = document.getElementById('line-width');
    elements.lineStyle = document.getElementById('line-style');
    elements.lineCurve = document.getElementById('line-curve');
    elements.showPoints = document.getElementById('show-points');
    elements.pointSize = document.getElementById('point-size');
    elements.pointShape = document.getElementById('point-shape');
    elements.pointFill = document.getElementById('point-fill');
    elements.pointStroke = document.getElementById('point-stroke');

    // Axes tab
    elements.syncDualAxis = document.getElementById('sync-dual-axis');
    elements.syncAxisOption = document.getElementById('sync-axis-option');
    elements.xAxisShow = document.getElementById('x-axis-show');
    elements.xAxisTitle = document.getElementById('x-axis-title');
    elements.xAxisFontSize = document.getElementById('x-axis-font-size');
    elements.xAxisRotation = document.getElementById('x-axis-rotation');
    elements.yAxisLeftShow = document.getElementById('y-axis-left-show');
    elements.yAxisLeftTitle = document.getElementById('y-axis-left-title');
    elements.yAxisLeftMin = document.getElementById('y-axis-left-min');
    elements.yAxisLeftMax = document.getElementById('y-axis-left-max');
    elements.yAxisLeftFormat = document.getElementById('y-axis-left-format');
    elements.yAxisRightShow = document.getElementById('y-axis-right-show');
    elements.yAxisRightTitle = document.getElementById('y-axis-right-title');
    elements.yAxisRightMin = document.getElementById('y-axis-right-min');
    elements.yAxisRightMax = document.getElementById('y-axis-right-max');
    elements.yAxisRightFormat = document.getElementById('y-axis-right-format');
    elements.gridHorizontal = document.getElementById('grid-horizontal');
    elements.gridVertical = document.getElementById('grid-vertical');
    elements.gridColor = document.getElementById('grid-color');
    elements.gridOpacity = document.getElementById('grid-opacity');
    elements.gridOpacityValue = document.getElementById('grid-opacity-value');

    // Labels tab
    elements.showTitle = document.getElementById('show-title');
    elements.chartTitle = document.getElementById('chart-title');
    elements.titleFontSize = document.getElementById('title-font-size');
    elements.titleColor = document.getElementById('title-color');
    elements.showBarLabels = document.getElementById('show-bar-labels');
    elements.barLabelPosition = document.getElementById('bar-label-position');
    elements.barLabelFontSize = document.getElementById('bar-label-font-size');
    elements.barLabelColor = document.getElementById('bar-label-color');
    elements.showLineLabels = document.getElementById('show-line-labels');
    elements.lineLabelPosition = document.getElementById('line-label-position');
    elements.lineLabelFontSize = document.getElementById('line-label-font-size');
    elements.lineLabelColor = document.getElementById('line-label-color');
    elements.showLegend = document.getElementById('show-legend');
    elements.legendPosition = document.getElementById('legend-position');
    elements.legendBar1Label = document.getElementById('legend-bar1-label');
    elements.legendBar2Label = document.getElementById('legend-bar2-label');
    elements.legendLineLabel = document.getElementById('legend-line-label');

    // Tooltip tab
    elements.showTooltip = document.getElementById('show-tooltip');
    elements.tooltipShowDimension = document.getElementById('tooltip-show-dimension');
    elements.tooltipShowMeasureName = document.getElementById('tooltip-show-measure-name');
    elements.tooltipShowValue = document.getElementById('tooltip-show-value');
    elements.tooltipBgColor = document.getElementById('tooltip-bg-color');
    elements.tooltipTextColor = document.getElementById('tooltip-text-color');
    elements.tooltipFontSize = document.getElementById('tooltip-font-size');
    elements.tooltipFontFamily = document.getElementById('tooltip-font-family');
    elements.tooltipFontWeight = document.getElementById('tooltip-font-weight');

    // Dashboard controls
    elements.showLegendToggle = document.getElementById('show-legend-toggle');
    elements.showSettingsCog = document.getElementById('show-settings-cog');

    // Individual font settings
    elements.titleFontFamily = document.getElementById('title-font-family');
    elements.titleFontWeight = document.getElementById('title-font-weight');
    elements.titleItalic = document.getElementById('title-italic');
    elements.xAxisFontFamily = document.getElementById('x-axis-font-family');
    elements.xAxisFontWeight = document.getElementById('x-axis-font-weight');
    elements.xAxisFontColor = document.getElementById('x-axis-font-color');
    elements.yAxisFontFamily = document.getElementById('y-axis-font-family');
    elements.yAxisFontSize = document.getElementById('y-axis-font-size');
    elements.yAxisFontWeight = document.getElementById('y-axis-font-weight');
    elements.yAxisFontColor = document.getElementById('y-axis-font-color');
    elements.legendFontFamily = document.getElementById('legend-font-family');
    elements.legendFontSize = document.getElementById('legend-font-size');
    elements.legendFontWeight = document.getElementById('legend-font-weight');
    elements.legendFontColor = document.getElementById('legend-font-color');
    elements.legendItalic = document.getElementById('legend-italic');
    elements.legendBgColor = document.getElementById('legend-bg-color');
    elements.legendBgTransparent = document.getElementById('legend-bg-transparent');

    // Title background
    elements.titleBgColor = document.getElementById('title-bg-color');
    elements.titleBgTransparent = document.getElementById('title-bg-transparent');

    // X-Axis visibility toggles
    elements.xAxisShowTitle = document.getElementById('x-axis-show-title');
    elements.xAxisShowLabels = document.getElementById('x-axis-show-labels');
    elements.xAxisShowTicks = document.getElementById('x-axis-show-ticks');
    elements.xAxisShowLine = document.getElementById('x-axis-show-line');
    elements.xAxisLineColor = document.getElementById('x-axis-line-color');
    elements.xAxisAlign = document.getElementById('x-axis-align');
    elements.xAxisSort = document.getElementById('x-axis-sort');
    elements.xAxisMaxWidth = document.getElementById('x-axis-max-width');

    // Y-Axis Left visibility toggles
    elements.yAxisLeftShowTitle = document.getElementById('y-axis-left-show-title');
    elements.yAxisLeftShowLabels = document.getElementById('y-axis-left-show-labels');
    elements.yAxisLeftShowTicks = document.getElementById('y-axis-left-show-ticks');
    elements.yAxisLeftShowLine = document.getElementById('y-axis-left-show-line');
    elements.yAxisLineColor = document.getElementById('y-axis-line-color');

    // Y-Axis Right visibility toggles
    elements.yAxisRightShowTitle = document.getElementById('y-axis-right-show-title');
    elements.yAxisRightShowLabels = document.getElementById('y-axis-right-show-labels');
    elements.yAxisRightShowTicks = document.getElementById('y-axis-right-show-ticks');
    elements.yAxisRightShowLine = document.getElementById('y-axis-right-show-line');

    // Bar 1 label font
    elements.bar1LabelFontFamily = document.getElementById('bar1-label-font-family');
    elements.bar1LabelFontSize = document.getElementById('bar1-label-font-size');
    elements.bar1LabelFontWeight = document.getElementById('bar1-label-font-weight');
    elements.bar1LabelColor = document.getElementById('bar1-label-color');
    elements.bar1LabelItalic = document.getElementById('bar1-label-italic');

    // Bar 2 label font
    elements.bar2LabelFontFamily = document.getElementById('bar2-label-font-family');
    elements.bar2LabelFontSize = document.getElementById('bar2-label-font-size');
    elements.bar2LabelFontWeight = document.getElementById('bar2-label-font-weight');
    elements.bar2LabelColor = document.getElementById('bar2-label-color');
    elements.bar2LabelItalic = document.getElementById('bar2-label-italic');

    // Legacy bar label (kept for compatibility)
    elements.barLabelFontFamily = document.getElementById('bar-label-font-family');
    elements.barLabelFontWeight = document.getElementById('bar-label-font-weight');
    elements.barLabelItalic = document.getElementById('bar-label-italic');
    elements.barLabelOffsetX = document.getElementById('bar-label-offset-x');
    elements.barLabelOffsetY = document.getElementById('bar-label-offset-y');
    elements.lineLabelFontFamily = document.getElementById('line-label-font-family');
    elements.lineLabelFontWeight = document.getElementById('line-label-font-weight');
    elements.lineLabelItalic = document.getElementById('line-label-italic');
    elements.lineLabelOffsetX = document.getElementById('line-label-offset-x');
    elements.lineLabelOffsetY = document.getElementById('line-label-offset-y');

    // Theme tab - Animation
    elements.animationEnabled = document.getElementById('animation-enabled');
    elements.animationDuration = document.getElementById('animation-duration');
    elements.animationDurationValue = document.getElementById('animation-duration-value');
    elements.animationEasing = document.getElementById('animation-easing');
    elements.animationOptions = document.getElementById('animation-options');
    elements.previewAnimation = document.getElementById('preview-animation');

    // Dialog appearance
    elements.showSectionDividers = document.getElementById('show-section-dividers');
    elements.compactMode = document.getElementById('compact-mode');

    // Theme tab - Typography
    elements.fontFamily = document.getElementById('font-family');
    elements.titleWeight = document.getElementById('title-weight');
    elements.labelWeight = document.getElementById('label-weight');
    elements.fontPreview = document.getElementById('font-preview');

    // Buttons
    elements.cancelBtn = document.getElementById('cancel-btn');
    elements.applyBtn = document.getElementById('apply-btn');
    elements.saveBtn = document.getElementById('save-btn');
    elements.resetBtn = document.getElementById('reset-btn');

    // Hide worksheet selection section for viz extensions
    const worksheetSection = document.querySelector('#tab-data .config-section:first-child');
    if (worksheetSection) {
      worksheetSection.style.display = 'none';
    }

    // Initialize color palettes UI
    initColorPalettes();

    // Initialize font select dropdowns
    initFontSelects();
  }

  /**
   * Font families list with primary font name shown
   */
  const fontFamilies = [
    { value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", label: 'System UI', primary: 'system-ui' },
    { value: "'Segoe UI', Tahoma, Geneva, sans-serif", label: 'Segoe UI', primary: 'Segoe UI' },
    { value: 'Arial, Helvetica, sans-serif', label: 'Arial', primary: 'Arial' },
    { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: 'Helvetica Neue', primary: 'Helvetica Neue' },
    { value: "Roboto, 'Helvetica Neue', sans-serif", label: 'Roboto', primary: 'Roboto' },
    { value: "'Open Sans', sans-serif", label: 'Open Sans', primary: 'Open Sans' },
    { value: "'Source Sans Pro', sans-serif", label: 'Source Sans Pro', primary: 'Source Sans Pro' },
    { value: 'Lato, sans-serif', label: 'Lato', primary: 'Lato' },
    { value: "'Inter', sans-serif", label: 'Inter', primary: 'Inter' },
    { value: "'Tableau Book', 'Tableau Regular', Arial, sans-serif", label: 'Tableau Book', primary: 'Tableau Book' },
    { value: "Georgia, 'Times New Roman', serif", label: 'Georgia', primary: 'Georgia' },
    { value: "'Times New Roman', Times, serif", label: 'Times New Roman', primary: 'Times New Roman' },
    { value: "Verdana, Geneva, sans-serif", label: 'Verdana', primary: 'Verdana' },
    { value: "Tahoma, Geneva, sans-serif", label: 'Tahoma', primary: 'Tahoma' },
    { value: "Trebuchet MS, sans-serif", label: 'Trebuchet MS', primary: 'Trebuchet MS' },
    { value: "'Courier New', Courier, monospace", label: 'Courier New', primary: 'Courier New' },
    { value: "'SF Mono', 'Consolas', 'Monaco', monospace", label: 'SF Mono / Consolas', primary: 'SF Mono' }
  ];

  /**
   * Check if a font is available on the system
   */
  function isFontAvailable(fontName) {
    if (!document.fonts || !document.fonts.check) {
      return true; // Assume available if API not supported
    }
    try {
      return document.fonts.check(`12px "${fontName}"`);
    } catch (e) {
      return true; // Assume available on error
    }
  }

  /**
   * Workbook formatting cache
   */
  let workbookFormattingCache = null;

  /**
   * Get workbook formatting from Tableau API
   * Returns font and color information from the workbook settings
   */
  function getWorkbookFormatting() {
    if (workbookFormattingCache) {
      return workbookFormattingCache;
    }

    try {
      const env = tableau.extensions.environment;
      if (env && env.workbookFormatting && env.workbookFormatting.formattingSheets) {
        const sheets = env.workbookFormatting.formattingSheets;
        const formatting = {
          worksheet: null,
          worksheetTitle: null,
          tooltip: null,
          dashboardTitle: null
        };

        sheets.forEach(sheet => {
          const key = sheet.classNameKey;
          const css = sheet.cssProperties || {};

          // Extract font info from CSS properties
          const fontInfo = {
            fontName: css.fontName || css.fontFamily || css['font-family'] || null,
            fontSize: css.fontSize || css['font-size'] || null,
            fontWeight: css.isFontBold ? 'bold' : (css['font-weight'] || 'normal'),
            fontStyle: css.isFontItalic ? 'italic' : 'normal',
            color: css.color || null
          };

          // Map class name key to our formatting object
          if (key === 'tableau-worksheet' || key === 'Worksheet') {
            formatting.worksheet = fontInfo;
          } else if (key === 'tableau-worksheet-title' || key === 'WorksheetTitle') {
            formatting.worksheetTitle = fontInfo;
          } else if (key === 'tableau-tooltip' || key === 'Tooltip') {
            formatting.tooltip = fontInfo;
          } else if (key === 'tableau-dashboard-title' || key === 'DashboardTitle') {
            formatting.dashboardTitle = fontInfo;
          }
        });

        workbookFormattingCache = formatting;
        console.log('Workbook formatting detected:', formatting);
        return formatting;
      }
    } catch (e) {
      console.log('Could not get workbook formatting:', e.message);
    }

    return null;
  }

  /**
   * Get the primary workbook font (from worksheet body text)
   */
  function getWorkbookFont() {
    const formatting = getWorkbookFormatting();

    // Try worksheet body font first, then worksheet title, then dashboard title
    const sources = [
      formatting?.worksheet,
      formatting?.worksheetTitle,
      formatting?.dashboardTitle
    ];

    for (const source of sources) {
      if (source && source.fontName) {
        let fontName = source.fontName;
        // Clean up the font name (remove quotes if present)
        fontName = fontName.replace(/['"]/g, '').trim();

        // Build a proper font-family stack
        const fontStack = buildFontStack(fontName);

        return {
          family: fontStack,
          label: fontName,
          primary: fontName,
          isWorkbookFont: true
        };
      }
    }

    return null;
  }

  /**
   * Build a font-family stack with fallbacks
   */
  function buildFontStack(primaryFont) {
    const lowerFont = primaryFont.toLowerCase();

    // Tableau-specific fonts
    if (lowerFont.includes('tableau')) {
      return `'${primaryFont}', 'Tableau Regular', Arial, sans-serif`;
    }

    // Serif fonts
    if (['georgia', 'times new roman', 'times', 'palatino', 'garamond'].some(f => lowerFont.includes(f))) {
      return `'${primaryFont}', Georgia, 'Times New Roman', serif`;
    }

    // Monospace fonts
    if (['courier', 'consolas', 'monaco', 'menlo', 'monospace'].some(f => lowerFont.includes(f))) {
      return `'${primaryFont}', Consolas, Monaco, monospace`;
    }

    // Default to sans-serif stack
    return `'${primaryFont}', 'Segoe UI', Arial, sans-serif`;
  }

  /**
   * Detect system font preferences
   * First tries to get the workbook font from Tableau, then falls back to OS detection
   */
  function detectSystemFont() {
    // First, try to get the font from the Tableau workbook
    const workbookFont = getWorkbookFont();
    if (workbookFont) {
      return workbookFont;
    }

    // Fall back to platform-specific detection
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;

    if (isMac) {
      return {
        family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        label: 'SF Pro',
        primary: 'SF Pro',
        isWorkbookFont: false
      };
    } else if (isWindows) {
      return {
        family: "'Segoe UI', Tahoma, Geneva, sans-serif",
        label: 'Segoe UI',
        primary: 'Segoe UI',
        isWorkbookFont: false
      };
    }
    return {
      family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      label: 'System Default',
      primary: 'system-ui',
      isWorkbookFont: false
    };
  }

  /**
   * Initialize font select dropdowns with availability check
   */
  function initFontSelects() {
    const fontSelects = document.querySelectorAll('.font-select');
    const detectedFont = detectSystemFont();

    fontSelects.forEach(select => {
      select.innerHTML = '';

      // Add detected font as first option with appropriate label
      const detectedOption = document.createElement('option');
      detectedOption.value = detectedFont.family;

      // Show different label based on source
      if (detectedFont.isWorkbookFont) {
        detectedOption.textContent = `${detectedFont.label} (Workbook Default)`;
      } else {
        detectedOption.textContent = `${detectedFont.label} (System Default)`;
      }
      detectedOption.style.fontFamily = detectedFont.family;
      detectedOption.dataset.isDefault = 'true';
      select.appendChild(detectedOption);

      // Add separator
      const separator = document.createElement('option');
      separator.disabled = true;
      separator.textContent = '─────────────';
      select.appendChild(separator);

      // Add common Tableau fonts section if workbook font was detected
      if (detectedFont.isWorkbookFont) {
        const tableauLabel = document.createElement('option');
        tableauLabel.disabled = true;
        tableauLabel.textContent = 'Tableau Fonts';
        tableauLabel.style.fontWeight = 'bold';
        select.appendChild(tableauLabel);

        const tableauFonts = [
          { value: "'Tableau Book', 'Tableau Regular', Arial, sans-serif", label: 'Tableau Book', primary: 'Tableau Book' },
          { value: "'Tableau Light', 'Tableau Regular', Arial, sans-serif", label: 'Tableau Light', primary: 'Tableau Light' },
          { value: "'Tableau Medium', 'Tableau Regular', Arial, sans-serif", label: 'Tableau Medium', primary: 'Tableau Medium' },
          { value: "'Tableau Semibold', 'Tableau Regular', Arial, sans-serif", label: 'Tableau Semibold', primary: 'Tableau Semibold' }
        ];

        tableauFonts.forEach(font => {
          const option = document.createElement('option');
          option.value = font.value;
          option.style.fontFamily = font.value;
          const isAvailable = isFontAvailable(font.primary);
          option.textContent = font.label + (isAvailable ? '' : ' (fallback)');
          select.appendChild(option);
        });

        // Add separator before other fonts
        const separator2 = document.createElement('option');
        separator2.disabled = true;
        separator2.textContent = '─────────────';
        select.appendChild(separator2);
      }

      // Add other fonts section header
      const otherLabel = document.createElement('option');
      otherLabel.disabled = true;
      otherLabel.textContent = 'Other Fonts';
      otherLabel.style.fontWeight = 'bold';
      select.appendChild(otherLabel);

      fontFamilies.forEach(font => {
        // Skip if this is the same as the detected font
        if (font.primary === detectedFont.primary) {
          return;
        }

        const option = document.createElement('option');
        option.value = font.value;
        option.style.fontFamily = font.value;

        // Check if primary font is available
        const isAvailable = isFontAvailable(font.primary);
        option.textContent = font.label + (isAvailable ? '' : ' (fallback)');

        select.appendChild(option);
      });
    });

    console.log('Font selects initialized. Detected font:', detectedFont.label,
      detectedFont.isWorkbookFont ? '(from workbook)' : '(system default)');
  }

  /**
   * Initialize color palettes UI
   */
  function initColorPalettes() {
    const container = document.getElementById('color-palettes');
    if (!container) return;

    container.innerHTML = '';

    for (const [id, palette] of Object.entries(colorPalettes)) {
      const option = document.createElement('div');
      option.className = 'palette-option' + (config.colorPalette === id ? ' active' : '');
      option.dataset.palette = id;

      const name = document.createElement('div');
      name.className = 'palette-name';
      name.textContent = palette.name;

      const colors = document.createElement('div');
      colors.className = 'palette-colors';

      // Show first 6 colors as preview
      palette.colors.slice(0, 6).forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'palette-color';
        swatch.style.backgroundColor = color;
        colors.appendChild(swatch);
      });

      option.appendChild(name);
      option.appendChild(colors);

      option.addEventListener('click', () => selectPalette(id));
      container.appendChild(option);
    }
  }

  /**
   * Select a color palette
   */
  function selectPalette(paletteId) {
    const palette = colorPalettes[paletteId];
    if (!palette) return;

    config.colorPalette = paletteId;

    // Apply colors to config
    if (palette.colors.length >= 3) {
      config.bar1.color = palette.colors[0];
      config.bar2.color = palette.colors[1];
      config.line.color = palette.colors[2];
      config.points.fill = palette.colors[2];
      config.bar1.borderColor = darkenColor(palette.colors[0], 20);
      config.bar2.borderColor = darkenColor(palette.colors[1], 20);

      // Update color inputs
      elements.bar1Color.value = config.bar1.color;
      elements.bar1BorderColor.value = config.bar1.borderColor;
      elements.bar2Color.value = config.bar2.color;
      elements.bar2BorderColor.value = config.bar2.borderColor;
      elements.lineColor.value = config.line.color;
      elements.pointFill.value = config.points.fill;
    }

    // Update active state
    document.querySelectorAll('.palette-option').forEach(el => {
      el.classList.toggle('active', el.dataset.palette === paletteId);
    });
  }

  /**
   * Darken a hex color
   */
  function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  /**
   * Load columns from the worksheet
   */
  async function loadColumns() {
    if (!worksheet) {
      console.error('Worksheet not available');
      return;
    }

    try {
      const dataTable = await worksheet.getSummaryDataAsync();
      const cols = dataTable.columns;

      columns = { dimensions: [], measures: [] };

      cols.forEach(col => {
        if (col.dataType === 'string' || col.dataType === 'date' || col.dataType === 'date-time') {
          columns.dimensions.push({ fieldName: col.fieldName, dataType: col.dataType });
        } else {
          columns.measures.push({ fieldName: col.fieldName, dataType: col.dataType });
        }
      });

      populateFieldSelects();
    } catch (error) {
      console.error('Error loading columns:', error);
    }
  }

  /**
   * Populate field select dropdowns with filtering
   * Selected measures in one dropdown won't appear in others
   */
  function populateFieldSelects() {
    // Dimension select
    elements.dimensionSelect.innerHTML = '<option value="">Select Dimension</option>';
    columns.dimensions.forEach(dim => {
      const option = document.createElement('option');
      option.value = dim.fieldName;
      option.textContent = dim.fieldName;
      elements.dimensionSelect.appendChild(option);
    });

    // Set current dimension value first
    if (config.dimension) elements.dimensionSelect.value = config.dimension;

    // Update measure dropdowns with filtering
    updateMeasureDropdowns();

    // Update section headers with field names
    updateFieldLabels();
  }

  /**
   * Update measure dropdowns, filtering out already-selected values
   */
  function updateMeasureDropdowns() {
    const currentValues = {
      bar1: config.bar1Measure || '',
      bar2: config.bar2Measure || '',
      line: config.lineMeasure || ''
    };

    // Helper to populate a measure select with filtered options
    const populateMeasureSelect = (selectEl, currentValue, excludeValues) => {
      const previousValue = selectEl.value;
      selectEl.innerHTML = '<option value="">Select Measure</option>';

      columns.measures.forEach(measure => {
        // Include if it's the current value OR not in the exclude list
        if (measure.fieldName === currentValue || !excludeValues.includes(measure.fieldName)) {
          const option = document.createElement('option');
          option.value = measure.fieldName;
          option.textContent = measure.fieldName;
          selectEl.appendChild(option);
        }
      });

      // Restore the value
      selectEl.value = currentValue || previousValue || '';
    };

    // Populate each dropdown, excluding values selected in other dropdowns
    populateMeasureSelect(
      elements.bar1Measure,
      currentValues.bar1,
      [currentValues.bar2, currentValues.line].filter(v => v)
    );

    populateMeasureSelect(
      elements.bar2Measure,
      currentValues.bar2,
      [currentValues.bar1, currentValues.line].filter(v => v)
    );

    populateMeasureSelect(
      elements.lineMeasure,
      currentValues.line,
      [currentValues.bar1, currentValues.bar2].filter(v => v)
    );
  }

  /**
   * Update section headers and labels to show selected field names
   */
  function updateFieldLabels() {
    // Helper to clean measure names (remove AGG prefixes)
    const cleanName = (name) => {
      if (!name) return '';
      return name.replace(/^(SUM|AVG|MIN|MAX|COUNT|AGG|MEDIAN|STDEV|VAR)\((.+)\)$/i, '$2').trim();
    };

    const bar1Name = cleanName(config.bar1Measure);
    const bar2Name = cleanName(config.bar2Measure);
    const lineName = cleanName(config.lineMeasure);

    // Update Bar 1 section header (Bars tab)
    const bar1Header = document.querySelector('#tab-bars .config-section:nth-child(2) h3');
    if (bar1Header) {
      bar1Header.innerHTML = bar1Name ? `Bar 1 Style <span class="field-badge">${bar1Name}</span>` : 'Bar 1 Style';
    }

    // Update Bar 2 section header (Bars tab)
    const bar2Header = document.querySelector('#tab-bars .config-section:nth-child(3) h3');
    if (bar2Header) {
      bar2Header.innerHTML = bar2Name ? `Bar 2 Style <span class="field-badge">${bar2Name}</span>` : 'Bar 2 Style';
    }

    // Update Line section header (Line tab)
    const lineHeader = document.querySelector('#tab-line .config-section:first-child h3');
    if (lineHeader) {
      lineHeader.innerHTML = lineName ? `Line Style <span class="field-badge">${lineName}</span>` : 'Line Style';
    }

    // Update measure select labels (Data tab)
    const bar1Label = document.querySelector('label[for="bar1-measure"]');
    if (bar1Label) {
      bar1Label.innerHTML = bar1Name ? `Bar 1 Measure <span class="field-indicator">(${bar1Name})</span>` : 'Bar 1 Measure';
    }

    const bar2Label = document.querySelector('label[for="bar2-measure"]');
    if (bar2Label) {
      bar2Label.innerHTML = bar2Name ? `Bar 2 Measure <span class="field-indicator">(${bar2Name})</span>` : 'Bar 2 Measure';
    }

    const lineLabel = document.querySelector('label[for="line-measure"]');
    if (lineLabel) {
      lineLabel.innerHTML = lineName ? `Line Measure <span class="field-indicator">(${lineName})</span>` : 'Line Measure';
    }

    // Update Bar 1 Labels subsection header (Labels tab)
    const bar1LabelSubheader = document.querySelector('#bar-labels-options .subsection-header:first-of-type .subsection-title');
    if (bar1LabelSubheader) {
      bar1LabelSubheader.innerHTML = bar1Name ? `Bar 1 Labels <span class="field-badge-small">${bar1Name}</span>` : 'Bar 1 Labels';
    }

    // Update Bar 2 Labels subsection header (Labels tab)
    const bar2LabelSubheader = document.querySelector('#bar-labels-options .subsection-header:nth-of-type(2) .subsection-title');
    if (bar2LabelSubheader) {
      bar2LabelSubheader.innerHTML = bar2Name ? `Bar 2 Labels <span class="field-badge-small">${bar2Name}</span>` : 'Bar 2 Labels';
    }

    // Update Legend custom labels section
    const legendBar1Label = document.querySelector('label[for="legend-bar1-label"]');
    if (legendBar1Label) {
      legendBar1Label.innerHTML = bar1Name ? `Bar 1 Label <span class="field-indicator">(${bar1Name})</span>` : 'Bar 1 Label';
    }

    const legendBar2Label = document.querySelector('label[for="legend-bar2-label"]');
    if (legendBar2Label) {
      legendBar2Label.innerHTML = bar2Name ? `Bar 2 Label <span class="field-indicator">(${bar2Name})</span>` : 'Bar 2 Label';
    }

    const legendLineLabel = document.querySelector('label[for="legend-line-label"]');
    if (legendLineLabel) {
      legendLineLabel.innerHTML = lineName ? `Line Label <span class="field-indicator">(${lineName})</span>` : 'Line Label';
    }

    // Update Y-Axis Left title (shows bar field names)
    const yAxisLeftHeader = document.querySelector('#tab-axes .config-section:nth-child(3) h3');
    if (yAxisLeftHeader) {
      const barFields = [bar1Name, bar2Name].filter(Boolean).join(' / ');
      yAxisLeftHeader.innerHTML = barFields ? `Left Y-Axis (Bars) <span class="field-badge">${barFields}</span>` : 'Left Y-Axis (Bars)';
    }

    // Update Y-Axis Right title (shows line field name)
    const yAxisRightHeader = document.querySelector('#y-axis-right-section h3');
    if (yAxisRightHeader) {
      yAxisRightHeader.innerHTML = lineName ? `Right Y-Axis (Line) <span class="field-badge">${lineName}</span>` : 'Right Y-Axis (Line)';
    }
  }

  /**
   * Safely set value on an element (helper to prevent null errors)
   */
  function safeSetValue(element, value) {
    if (element && value !== undefined) {
      element.value = value;
    }
  }

  function safeSetText(element, text) {
    if (element && text !== undefined) {
      element.textContent = text;
    }
  }

  function safeSetChecked(element, checked) {
    if (element) {
      element.checked = !!checked;
    }
  }

  /**
   * Populate form with current configuration
   */
  function populateForm() {
    console.log('Populating form with config:', config);

    // Bar style radio
    const barStyleRadio = document.querySelector(`input[name="bar-style"][value="${config.barStyle}"]`);
    if (barStyleRadio) barStyleRadio.checked = true;

    // Bar padding
    safeSetValue(elements.barPadding, config.barPadding);
    safeSetText(elements.barPaddingValue, config.barPadding);

    // Bar 1 settings
    safeSetValue(elements.bar1Color, config.bar1.color);
    safeSetValue(elements.bar1Opacity, config.bar1.opacity);
    safeSetText(elements.bar1OpacityValue, config.bar1.opacity);
    safeSetChecked(elements.bar1ShowBorder, config.bar1.showBorder !== false);
    safeSetValue(elements.bar1BorderColor, config.bar1.borderColor);
    safeSetValue(elements.bar1BorderWidth, config.bar1.borderWidth);
    safeSetValue(elements.bar1CornerRadius, config.bar1.cornerRadius);
    safeSetText(elements.bar1CornerRadiusValue, config.bar1.cornerRadius);
    if (typeof updateBar1BorderVisibility === 'function') updateBar1BorderVisibility();

    // Bar 2 settings
    safeSetValue(elements.bar2Color, config.bar2.color);
    safeSetValue(elements.bar2Opacity, config.bar2.opacity);
    safeSetText(elements.bar2OpacityValue, config.bar2.opacity);
    safeSetChecked(elements.bar2ShowBorder, config.bar2.showBorder !== false);
    safeSetValue(elements.bar2BorderColor, config.bar2.borderColor);
    safeSetValue(elements.bar2BorderWidth, config.bar2.borderWidth);
    safeSetValue(elements.bar2CornerRadius, config.bar2.cornerRadius);
    safeSetText(elements.bar2CornerRadiusValue, config.bar2.cornerRadius);
    if (typeof updateBar2BorderVisibility === 'function') updateBar2BorderVisibility();

    // Line settings
    safeSetValue(elements.lineColor, config.line.color);
    safeSetValue(elements.lineOpacity, config.line.opacity);
    safeSetText(elements.lineOpacityValue, config.line.opacity);
    safeSetValue(elements.lineWidth, config.line.width);
    safeSetValue(elements.lineStyle, config.line.style);
    safeSetValue(elements.lineCurve, config.line.curve);

    // Points settings
    safeSetChecked(elements.showPoints, config.points.show);
    safeSetValue(elements.pointSize, config.points.size);
    safeSetValue(elements.pointShape, config.points.shape);
    safeSetValue(elements.pointFill, config.points.fill);
    safeSetValue(elements.pointStroke, config.points.stroke);

    // Axis mode radio
    const axisModeRadio = document.querySelector(`input[name="axis-mode"][value="${config.axisMode}"]`);
    if (axisModeRadio) axisModeRadio.checked = true;

    // Sync dual axis
    if (elements.syncDualAxis) {
      elements.syncDualAxis.checked = config.syncDualAxis === true;
    }
    updateSyncAxisVisibility();

    // X-axis settings
    safeSetChecked(elements.xAxisShow, config.xAxis.show);
    safeSetValue(elements.xAxisTitle, config.xAxis.title);
    safeSetValue(elements.xAxisFontSize, config.xAxis.fontSize);
    safeSetValue(elements.xAxisRotation, config.xAxis.rotation);
    safeSetChecked(elements.xAxisShowTitle, config.xAxis.showTitle !== false);
    safeSetChecked(elements.xAxisShowLabels, config.xAxis.showLabels !== false);
    safeSetChecked(elements.xAxisShowTicks, config.xAxis.showTickMarks !== false);
    safeSetChecked(elements.xAxisShowLine, config.xAxis.showAxisLine !== false);
    safeSetValue(elements.xAxisLineColor, config.xAxis.lineColor || '#999999');
    safeSetValue(elements.xAxisAlign, config.xAxis.align || 'center');
    safeSetValue(elements.xAxisSort, config.xAxis.sort || 'default');
    safeSetValue(elements.xAxisMaxWidth, config.xAxis.maxWidth || 'none');

    // Y-axis left settings
    safeSetChecked(elements.yAxisLeftShow, config.yAxisLeft.show);
    safeSetValue(elements.yAxisLeftTitle, config.yAxisLeft.title);
    safeSetValue(elements.yAxisLeftMin, config.yAxisLeft.min || '');
    safeSetValue(elements.yAxisLeftMax, config.yAxisLeft.max || '');
    safeSetValue(elements.yAxisLeftFormat, config.yAxisLeft.format);
    safeSetChecked(elements.yAxisLeftShowTitle, config.yAxisLeft.showTitle !== false);
    safeSetChecked(elements.yAxisLeftShowLabels, config.yAxisLeft.showLabels !== false);
    safeSetChecked(elements.yAxisLeftShowTicks, config.yAxisLeft.showTickMarks !== false);
    safeSetChecked(elements.yAxisLeftShowLine, config.yAxisLeft.showAxisLine !== false);
    safeSetValue(elements.yAxisLineColor, config.yAxisLeft.lineColor || '#999999');

    // Y-axis right settings
    safeSetChecked(elements.yAxisRightShow, config.yAxisRight.show);
    safeSetValue(elements.yAxisRightTitle, config.yAxisRight.title);
    safeSetValue(elements.yAxisRightMin, config.yAxisRight.min || '');
    safeSetValue(elements.yAxisRightMax, config.yAxisRight.max || '');
    safeSetValue(elements.yAxisRightFormat, config.yAxisRight.format);
    safeSetChecked(elements.yAxisRightShowTitle, config.yAxisRight.showTitle !== false);
    safeSetChecked(elements.yAxisRightShowLabels, config.yAxisRight.showLabels !== false);
    safeSetChecked(elements.yAxisRightShowTicks, config.yAxisRight.showTickMarks !== false);
    safeSetChecked(elements.yAxisRightShowLine, config.yAxisRight.showAxisLine !== false);

    // Grid settings
    safeSetChecked(elements.gridHorizontal, config.grid.horizontal);
    safeSetChecked(elements.gridVertical, config.grid.vertical);
    safeSetValue(elements.gridColor, config.grid.color);
    safeSetValue(elements.gridOpacity, config.grid.opacity);
    safeSetText(elements.gridOpacityValue, config.grid.opacity);

    // Title settings
    safeSetChecked(elements.showTitle, config.title.show);
    safeSetValue(elements.chartTitle, config.title.text);
    safeSetValue(elements.titleFontSize, config.title.fontSize);
    safeSetValue(elements.titleColor, config.title.color);
    safeSetValue(elements.titleBgColor, config.title.bgColor === 'transparent' ? '#ffffff' : (config.title.bgColor || '#ffffff'));
    safeSetChecked(elements.titleBgTransparent, config.title.bgColor === 'transparent' || !config.title.bgColor);

    // Bar labels
    safeSetChecked(elements.showBarLabels, config.barLabels.show);
    safeSetValue(elements.barLabelPosition, config.barLabels.position);
    safeSetValue(elements.barLabelFontSize, config.barLabels.fontSize);
    safeSetValue(elements.barLabelColor, config.barLabels.color);
    safeSetValue(elements.barLabelOffsetX, config.barLabels.offsetX || 0);
    safeSetValue(elements.barLabelOffsetY, config.barLabels.offsetY || 0);

    // Line labels
    safeSetChecked(elements.showLineLabels, config.lineLabels.show);
    safeSetValue(elements.lineLabelPosition, config.lineLabels.position);
    safeSetValue(elements.lineLabelFontSize, config.lineLabels.fontSize);
    safeSetValue(elements.lineLabelColor, config.lineLabels.color);
    safeSetValue(elements.lineLabelOffsetX, config.lineLabels.offsetX || 0);
    safeSetValue(elements.lineLabelOffsetY, config.lineLabels.offsetY || 0);

    // Legend
    safeSetChecked(elements.showLegend, config.legend.show);
    safeSetValue(elements.legendPosition, config.legend.position);
    safeSetValue(elements.legendBar1Label, config.legend.bar1Label || '');
    safeSetValue(elements.legendBar2Label, config.legend.bar2Label || '');
    safeSetValue(elements.legendLineLabel, config.legend.lineLabel || '');
    safeSetValue(elements.legendBgColor, config.legend.bgColor === 'transparent' ? '#f8fafc' : (config.legend.bgColor || '#f8fafc'));
    safeSetChecked(elements.legendBgTransparent, config.legend.bgColor === 'transparent' || !config.legend.bgColor);

    // Tooltip
    safeSetChecked(elements.showTooltip, config.tooltip.show);
    safeSetChecked(elements.tooltipShowDimension, config.tooltip.showDimension);
    safeSetChecked(elements.tooltipShowMeasureName, config.tooltip.showMeasureName);
    safeSetChecked(elements.tooltipShowValue, config.tooltip.showValue);
    safeSetValue(elements.tooltipBgColor, config.tooltip.bgColor);
    safeSetValue(elements.tooltipTextColor, config.tooltip.textColor);
    safeSetValue(elements.tooltipFontSize, config.tooltip.fontSize);

    // Animation settings
    if (config.animation) {
      safeSetChecked(elements.animationEnabled, config.animation.enabled);
      safeSetValue(elements.animationDuration, config.animation.duration);
      safeSetText(elements.animationDurationValue, config.animation.duration);
      safeSetValue(elements.animationEasing, config.animation.easing);
    }

    // Font settings
    if (config.font) {
      safeSetValue(elements.fontFamily, config.font.family);
      safeSetValue(elements.titleWeight, config.font.titleWeight);
      safeSetValue(elements.labelWeight, config.font.labelWeight);
    }

    // Header controls
    if (config.headerControls) {
      safeSetChecked(elements.showLegendToggle, config.headerControls.showLegendToggle !== false);
      safeSetChecked(elements.showSettingsCog, config.headerControls.showSettingsCog !== false);
    }

    // Individual font settings
    if (config.titleFont) {
      safeSetValue(elements.titleFontFamily, config.titleFont.family || '');
      safeSetValue(elements.titleFontWeight, config.titleFont.weight || 600);
      safeSetChecked(elements.titleItalic, config.titleFont.italic || false);
    }
    if (config.xAxisFont) {
      safeSetValue(elements.xAxisFontFamily, config.xAxisFont.family || '');
      safeSetValue(elements.xAxisFontWeight, config.xAxisFont.weight || 400);
      safeSetValue(elements.xAxisFontColor, config.xAxisFont.color || '#666666');
    }
    if (config.yAxisFont) {
      safeSetValue(elements.yAxisFontFamily, config.yAxisFont.family || '');
      safeSetValue(elements.yAxisFontSize, config.yAxisFont.size || 12);
      safeSetValue(elements.yAxisFontWeight, config.yAxisFont.weight || 400);
      safeSetValue(elements.yAxisFontColor, config.yAxisFont.color || '#666666');
    }
    if (config.legendFont) {
      safeSetValue(elements.legendFontFamily, config.legendFont.family || '');
      safeSetValue(elements.legendFontSize, config.legendFont.size || 12);
      safeSetValue(elements.legendFontWeight, config.legendFont.weight || 400);
      safeSetValue(elements.legendFontColor, config.legendFont.color || '#333333');
      safeSetChecked(elements.legendItalic, config.legendFont.italic || false);
    }
    if (config.barLabelFont) {
      safeSetValue(elements.barLabelFontFamily, config.barLabelFont.family || '');
      safeSetValue(elements.barLabelFontWeight, config.barLabelFont.weight || 400);
      safeSetChecked(elements.barLabelItalic, config.barLabelFont.italic || false);
    }
    // Bar 1 label font
    if (config.bar1LabelFont) {
      safeSetValue(elements.bar1LabelFontFamily, config.bar1LabelFont.family || '');
      safeSetValue(elements.bar1LabelFontSize, config.bar1LabelFont.size || 10);
      safeSetValue(elements.bar1LabelFontWeight, config.bar1LabelFont.weight || 400);
      safeSetValue(elements.bar1LabelColor, config.bar1LabelFont.color || '#333333');
      safeSetChecked(elements.bar1LabelItalic, config.bar1LabelFont.italic || false);
    }
    // Bar 2 label font
    if (config.bar2LabelFont) {
      safeSetValue(elements.bar2LabelFontFamily, config.bar2LabelFont.family || '');
      safeSetValue(elements.bar2LabelFontSize, config.bar2LabelFont.size || 10);
      safeSetValue(elements.bar2LabelFontWeight, config.bar2LabelFont.weight || 400);
      safeSetValue(elements.bar2LabelColor, config.bar2LabelFont.color || '#333333');
      safeSetChecked(elements.bar2LabelItalic, config.bar2LabelFont.italic || false);
    }
    if (config.lineLabelFont) {
      safeSetValue(elements.lineLabelFontFamily, config.lineLabelFont.family || '');
      safeSetValue(elements.lineLabelFontWeight, config.lineLabelFont.weight || 400);
      safeSetChecked(elements.lineLabelItalic, config.lineLabelFont.italic || false);
    }
    if (config.tooltipFont) {
      safeSetValue(elements.tooltipFontFamily, config.tooltipFont.family || '');
      safeSetValue(elements.tooltipFontWeight, config.tooltipFont.weight || 400);
    }

    // Update UI state - wrap in try/catch to prevent errors
    try { if (typeof updatePointsOptionsVisibility === 'function') updatePointsOptionsVisibility(); } catch(e) { console.warn('updatePointsOptionsVisibility error:', e); }
    try { if (typeof updateYAxisRightVisibility === 'function') updateYAxisRightVisibility(); } catch(e) { console.warn('updateYAxisRightVisibility error:', e); }
    try { if (typeof updateAnimationOptionsVisibility === 'function') updateAnimationOptionsVisibility(); } catch(e) { console.warn('updateAnimationOptionsVisibility error:', e); }
    try { if (typeof updateFontPreview === 'function') updateFontPreview(); } catch(e) { console.warn('updateFontPreview error:', e); }

    console.log('Form population complete');
  }

  /**
   * Set up event listeners
   */
  function setupEventListeners() {
    // Helper to safely add event listener
    const safeAddListener = (element, event, handler) => {
      if (element) element.addEventListener(event, handler);
    };

    // Field changes - update config and refresh dropdowns to filter selections
    safeAddListener(elements.dimensionSelect, 'change', (e) => {
      config.dimension = e.target.value;
      updateFieldLabels();
    });
    safeAddListener(elements.bar1Measure, 'change', (e) => {
      config.bar1Measure = e.target.value;
      updateMeasureDropdowns(); // Refresh other dropdowns to exclude this selection
      updateFieldLabels();
    });
    safeAddListener(elements.bar2Measure, 'change', (e) => {
      config.bar2Measure = e.target.value;
      updateMeasureDropdowns(); // Refresh other dropdowns to exclude this selection
      updateFieldLabels();
    });
    safeAddListener(elements.lineMeasure, 'change', (e) => {
      config.lineMeasure = e.target.value;
      updateMeasureDropdowns(); // Refresh other dropdowns to exclude this selection
      updateFieldLabels();
    });

    // Bar style radio
    document.querySelectorAll('input[name="bar-style"]').forEach(radio => {
      radio.addEventListener('change', (e) => config.barStyle = e.target.value);
    });

    // Swap bars button
    if (elements.swapBarsBtn) {
      elements.swapBarsBtn.addEventListener('click', swapBars);
    }

    // Sync dual axis checkbox
    if (elements.syncDualAxis) {
      elements.syncDualAxis.addEventListener('change', (e) => {
        config.syncDualAxis = e.target.checked;
      });
    }

    // Range inputs with value display
    setupRangeInput(elements.barPadding, elements.barPaddingValue, (v) => config.barPadding = parseFloat(v));
    setupRangeInput(elements.bar1Opacity, elements.bar1OpacityValue, (v) => config.bar1.opacity = parseFloat(v));
    setupRangeInput(elements.bar1CornerRadius, elements.bar1CornerRadiusValue, (v) => config.bar1.cornerRadius = parseInt(v));
    setupRangeInput(elements.bar2Opacity, elements.bar2OpacityValue, (v) => config.bar2.opacity = parseFloat(v));
    setupRangeInput(elements.bar2CornerRadius, elements.bar2CornerRadiusValue, (v) => config.bar2.cornerRadius = parseInt(v));
    setupRangeInput(elements.lineOpacity, elements.lineOpacityValue, (v) => config.line.opacity = parseFloat(v));
    setupRangeInput(elements.gridOpacity, elements.gridOpacityValue, (v) => config.grid.opacity = parseFloat(v));

    // Border visibility toggles
    if (elements.bar1ShowBorder) {
      elements.bar1ShowBorder.addEventListener('change', (e) => {
        config.bar1.showBorder = e.target.checked;
        updateBar1BorderVisibility();
      });
    }
    if (elements.bar2ShowBorder) {
      elements.bar2ShowBorder.addEventListener('change', (e) => {
        config.bar2.showBorder = e.target.checked;
        updateBar2BorderVisibility();
      });
    }

    // Color inputs
    safeAddListener(elements.bar1Color, 'change', (e) => config.bar1.color = e.target.value);
    safeAddListener(elements.bar1BorderColor, 'change', (e) => config.bar1.borderColor = e.target.value);
    safeAddListener(elements.bar2Color, 'change', (e) => config.bar2.color = e.target.value);
    safeAddListener(elements.bar2BorderColor, 'change', (e) => config.bar2.borderColor = e.target.value);
    safeAddListener(elements.lineColor, 'change', (e) => config.line.color = e.target.value);
    safeAddListener(elements.pointFill, 'change', (e) => config.points.fill = e.target.value);
    safeAddListener(elements.pointStroke, 'change', (e) => config.points.stroke = e.target.value);
    safeAddListener(elements.gridColor, 'change', (e) => config.grid.color = e.target.value);
    safeAddListener(elements.titleColor, 'change', (e) => config.title.color = e.target.value);
    safeAddListener(elements.barLabelColor, 'change', (e) => config.barLabels.color = e.target.value);
    safeAddListener(elements.lineLabelColor, 'change', (e) => config.lineLabels.color = e.target.value);
    safeAddListener(elements.tooltipBgColor, 'change', (e) => config.tooltip.bgColor = e.target.value);
    safeAddListener(elements.tooltipTextColor, 'change', (e) => config.tooltip.textColor = e.target.value);

    // Number inputs
    safeAddListener(elements.bar1BorderWidth, 'change', (e) => config.bar1.borderWidth = parseInt(e.target.value));
    safeAddListener(elements.bar2BorderWidth, 'change', (e) => config.bar2.borderWidth = parseInt(e.target.value));
    safeAddListener(elements.lineWidth, 'change', (e) => config.line.width = parseInt(e.target.value));
    safeAddListener(elements.pointSize, 'change', (e) => config.points.size = parseInt(e.target.value));
    safeAddListener(elements.xAxisFontSize, 'change', (e) => config.xAxis.fontSize = parseInt(e.target.value));
    safeAddListener(elements.titleFontSize, 'change', (e) => config.title.fontSize = parseInt(e.target.value));
    safeAddListener(elements.barLabelFontSize, 'change', (e) => config.barLabels.fontSize = parseInt(e.target.value));
    safeAddListener(elements.lineLabelFontSize, 'change', (e) => config.lineLabels.fontSize = parseInt(e.target.value));
    safeAddListener(elements.tooltipFontSize, 'change', (e) => config.tooltip.fontSize = parseInt(e.target.value));

    // Select inputs
    safeAddListener(elements.lineStyle, 'change', (e) => config.line.style = e.target.value);
    safeAddListener(elements.lineCurve, 'change', (e) => config.line.curve = e.target.value);
    safeAddListener(elements.pointShape, 'change', (e) => config.points.shape = e.target.value);
    safeAddListener(elements.xAxisRotation, 'change', (e) => config.xAxis.rotation = parseInt(e.target.value));
    safeAddListener(elements.yAxisLeftFormat, 'change', (e) => config.yAxisLeft.format = e.target.value);
    safeAddListener(elements.yAxisRightFormat, 'change', (e) => config.yAxisRight.format = e.target.value);
    safeAddListener(elements.barLabelPosition, 'change', (e) => config.barLabels.position = e.target.value);
    safeAddListener(elements.lineLabelPosition, 'change', (e) => config.lineLabels.position = e.target.value);
    safeAddListener(elements.legendPosition, 'change', (e) => config.legend.position = e.target.value);
    safeAddListener(elements.legendBar1Label, 'change', (e) => config.legend.bar1Label = e.target.value);
    safeAddListener(elements.legendBar2Label, 'change', (e) => config.legend.bar2Label = e.target.value);
    safeAddListener(elements.legendLineLabel, 'change', (e) => config.legend.lineLabel = e.target.value);

    // Text inputs
    safeAddListener(elements.xAxisTitle, 'change', (e) => config.xAxis.title = e.target.value);
    safeAddListener(elements.yAxisLeftTitle, 'change', (e) => config.yAxisLeft.title = e.target.value);
    safeAddListener(elements.yAxisRightTitle, 'change', (e) => config.yAxisRight.title = e.target.value);
    safeAddListener(elements.chartTitle, 'change', (e) => config.title.text = e.target.value);

    // Min/Max inputs
    safeAddListener(elements.yAxisLeftMin, 'change', (e) => config.yAxisLeft.min = e.target.value ? parseFloat(e.target.value) : null);
    safeAddListener(elements.yAxisLeftMax, 'change', (e) => config.yAxisLeft.max = e.target.value ? parseFloat(e.target.value) : null);
    safeAddListener(elements.yAxisRightMin, 'change', (e) => config.yAxisRight.min = e.target.value ? parseFloat(e.target.value) : null);
    safeAddListener(elements.yAxisRightMax, 'change', (e) => config.yAxisRight.max = e.target.value ? parseFloat(e.target.value) : null);

    // Checkbox inputs
    safeAddListener(elements.showPoints, 'change', (e) => {
      config.points.show = e.target.checked;
      updatePointsOptionsVisibility();
    });
    safeAddListener(elements.xAxisShow, 'change', (e) => config.xAxis.show = e.target.checked);
    safeAddListener(elements.yAxisLeftShow, 'change', (e) => config.yAxisLeft.show = e.target.checked);
    safeAddListener(elements.yAxisRightShow, 'change', (e) => config.yAxisRight.show = e.target.checked);
    safeAddListener(elements.gridHorizontal, 'change', (e) => config.grid.horizontal = e.target.checked);
    safeAddListener(elements.gridVertical, 'change', (e) => config.grid.vertical = e.target.checked);
    safeAddListener(elements.showTitle, 'change', (e) => config.title.show = e.target.checked);
    safeAddListener(elements.showBarLabels, 'change', (e) => config.barLabels.show = e.target.checked);
    safeAddListener(elements.showLineLabels, 'change', (e) => config.lineLabels.show = e.target.checked);
    safeAddListener(elements.showLegend, 'change', (e) => config.legend.show = e.target.checked);
    safeAddListener(elements.showTooltip, 'change', (e) => config.tooltip.show = e.target.checked);
    safeAddListener(elements.tooltipShowDimension, 'change', (e) => config.tooltip.showDimension = e.target.checked);
    safeAddListener(elements.tooltipShowMeasureName, 'change', (e) => config.tooltip.showMeasureName = e.target.checked);
    safeAddListener(elements.tooltipShowValue, 'change', (e) => config.tooltip.showValue = e.target.checked);

    // Axis mode radio
    document.querySelectorAll('input[name="axis-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        config.axisMode = e.target.value;
        updateYAxisRightVisibility();
      });
    });

    // Animation settings
    safeAddListener(elements.animationEnabled, 'change', (e) => {
      if (!config.animation) config.animation = {};
      config.animation.enabled = e.target.checked;
      updateAnimationOptionsVisibility();
    });
    if (elements.animationDuration && elements.animationDurationValue) {
      setupRangeInput(elements.animationDuration, elements.animationDurationValue, (v) => {
        if (!config.animation) config.animation = {};
        config.animation.duration = parseInt(v);
      });
    }
    safeAddListener(elements.animationEasing, 'change', (e) => {
      if (!config.animation) config.animation = {};
      config.animation.easing = e.target.value;
    });
    safeAddListener(elements.previewAnimation, 'click', previewAnimation);

    // Font settings
    safeAddListener(elements.fontFamily, 'change', (e) => {
      if (!config.font) config.font = {};
      config.font.family = e.target.value;
      updateFontPreview();
    });
    safeAddListener(elements.titleWeight, 'change', (e) => {
      if (!config.font) config.font = {};
      config.font.titleWeight = parseInt(e.target.value);
      updateFontPreview();
    });
    safeAddListener(elements.labelWeight, 'change', (e) => {
      if (!config.font) config.font = {};
      config.font.labelWeight = parseInt(e.target.value);
      updateFontPreview();
    });

    // Header controls
    if (elements.showLegendToggle) {
      elements.showLegendToggle.addEventListener('change', (e) => {
        if (!config.headerControls) config.headerControls = {};
        config.headerControls.showLegendToggle = e.target.checked;
      });
    }
    if (elements.showSettingsCog) {
      elements.showSettingsCog.addEventListener('change', (e) => {
        if (!config.headerControls) config.headerControls = {};
        config.headerControls.showSettingsCog = e.target.checked;
      });
    }

    // Title font settings
    if (elements.titleFontFamily) {
      elements.titleFontFamily.addEventListener('change', (e) => {
        if (!config.titleFont) config.titleFont = {};
        config.titleFont.family = e.target.value;
      });
    }
    if (elements.titleFontWeight) {
      elements.titleFontWeight.addEventListener('change', (e) => {
        if (!config.titleFont) config.titleFont = {};
        config.titleFont.weight = parseInt(e.target.value);
      });
    }
    if (elements.titleItalic) {
      elements.titleItalic.addEventListener('change', (e) => {
        if (!config.titleFont) config.titleFont = {};
        config.titleFont.italic = e.target.checked;
      });
    }
    // Sync title-color to titleFont.color
    safeAddListener(elements.titleColor, 'change', (e) => {
      config.title.color = e.target.value;
      if (!config.titleFont) config.titleFont = {};
      config.titleFont.color = e.target.value;
    });
    // Sync title-font-size to titleFont.size
    safeAddListener(elements.titleFontSize, 'change', (e) => {
      config.title.fontSize = parseInt(e.target.value);
      if (!config.titleFont) config.titleFont = {};
      config.titleFont.size = parseInt(e.target.value);
    });

    // X-Axis font settings
    if (elements.xAxisFontFamily) {
      elements.xAxisFontFamily.addEventListener('change', (e) => {
        if (!config.xAxisFont) config.xAxisFont = {};
        config.xAxisFont.family = e.target.value;
      });
    }
    if (elements.xAxisFontWeight) {
      elements.xAxisFontWeight.addEventListener('change', (e) => {
        if (!config.xAxisFont) config.xAxisFont = {};
        config.xAxisFont.weight = parseInt(e.target.value);
      });
    }
    if (elements.xAxisFontColor) {
      elements.xAxisFontColor.addEventListener('change', (e) => {
        if (!config.xAxisFont) config.xAxisFont = {};
        config.xAxisFont.color = e.target.value;
      });
    }
    // Sync x-axis-font-size to xAxisFont.size
    safeAddListener(elements.xAxisFontSize, 'change', (e) => {
      config.xAxis.fontSize = parseInt(e.target.value);
      if (!config.xAxisFont) config.xAxisFont = {};
      config.xAxisFont.size = parseInt(e.target.value);
    });

    // X-Axis visibility toggles
    if (elements.xAxisShowTitle) {
      elements.xAxisShowTitle.addEventListener('change', (e) => {
        config.xAxis.showTitle = e.target.checked;
      });
    }
    if (elements.xAxisShowLabels) {
      elements.xAxisShowLabels.addEventListener('change', (e) => {
        config.xAxis.showLabels = e.target.checked;
      });
    }
    if (elements.xAxisShowTicks) {
      elements.xAxisShowTicks.addEventListener('change', (e) => {
        config.xAxis.showTickMarks = e.target.checked;
      });
    }
    if (elements.xAxisShowLine) {
      elements.xAxisShowLine.addEventListener('change', (e) => {
        config.xAxis.showAxisLine = e.target.checked;
      });
    }
    if (elements.xAxisLineColor) {
      elements.xAxisLineColor.addEventListener('change', (e) => {
        config.xAxis.lineColor = e.target.value;
        config.xAxis.tickColor = e.target.value;
      });
    }
    if (elements.xAxisAlign) {
      elements.xAxisAlign.addEventListener('change', (e) => {
        config.xAxis.align = e.target.value;
      });
    }
    if (elements.xAxisSort) {
      elements.xAxisSort.addEventListener('change', (e) => {
        config.xAxis.sort = e.target.value;
        console.log('DialogConfig: X-Axis sort changed to:', e.target.value);
      });
    }
    if (elements.xAxisMaxWidth) {
      elements.xAxisMaxWidth.addEventListener('change', (e) => {
        config.xAxis.maxWidth = e.target.value;
      });
    }

    // Y-Axis font settings
    if (elements.yAxisFontFamily) {
      elements.yAxisFontFamily.addEventListener('change', (e) => {
        if (!config.yAxisFont) config.yAxisFont = {};
        config.yAxisFont.family = e.target.value;
      });
    }
    if (elements.yAxisFontSize) {
      elements.yAxisFontSize.addEventListener('change', (e) => {
        if (!config.yAxisFont) config.yAxisFont = {};
        config.yAxisFont.size = parseInt(e.target.value);
      });
    }
    if (elements.yAxisFontWeight) {
      elements.yAxisFontWeight.addEventListener('change', (e) => {
        if (!config.yAxisFont) config.yAxisFont = {};
        config.yAxisFont.weight = parseInt(e.target.value);
      });
    }
    if (elements.yAxisFontColor) {
      elements.yAxisFontColor.addEventListener('change', (e) => {
        if (!config.yAxisFont) config.yAxisFont = {};
        config.yAxisFont.color = e.target.value;
      });
    }

    // Y-Axis visibility toggles
    if (elements.yAxisLeftShowTitle) {
      elements.yAxisLeftShowTitle.addEventListener('change', (e) => {
        config.yAxisLeft.showTitle = e.target.checked;
      });
    }
    if (elements.yAxisLeftShowLabels) {
      elements.yAxisLeftShowLabels.addEventListener('change', (e) => {
        config.yAxisLeft.showLabels = e.target.checked;
      });
    }
    if (elements.yAxisLeftShowTicks) {
      elements.yAxisLeftShowTicks.addEventListener('change', (e) => {
        config.yAxisLeft.showTickMarks = e.target.checked;
      });
    }
    if (elements.yAxisLeftShowLine) {
      elements.yAxisLeftShowLine.addEventListener('change', (e) => {
        config.yAxisLeft.showAxisLine = e.target.checked;
      });
    }
    if (elements.yAxisLineColor) {
      elements.yAxisLineColor.addEventListener('change', (e) => {
        config.yAxisLeft.lineColor = e.target.value;
        config.yAxisLeft.tickColor = e.target.value;
        config.yAxisRight.lineColor = e.target.value;
        config.yAxisRight.tickColor = e.target.value;
      });
    }

    // Y-Axis Right visibility toggles
    if (elements.yAxisRightShowTitle) {
      elements.yAxisRightShowTitle.addEventListener('change', (e) => {
        config.yAxisRight.showTitle = e.target.checked;
      });
    }
    if (elements.yAxisRightShowLabels) {
      elements.yAxisRightShowLabels.addEventListener('change', (e) => {
        config.yAxisRight.showLabels = e.target.checked;
      });
    }
    if (elements.yAxisRightShowTicks) {
      elements.yAxisRightShowTicks.addEventListener('change', (e) => {
        config.yAxisRight.showTickMarks = e.target.checked;
      });
    }
    if (elements.yAxisRightShowLine) {
      elements.yAxisRightShowLine.addEventListener('change', (e) => {
        config.yAxisRight.showAxisLine = e.target.checked;
      });
    }

    // Legend font settings
    if (elements.legendFontFamily) {
      elements.legendFontFamily.addEventListener('change', (e) => {
        if (!config.legendFont) config.legendFont = {};
        config.legendFont.family = e.target.value;
      });
    }
    if (elements.legendFontSize) {
      elements.legendFontSize.addEventListener('change', (e) => {
        if (!config.legendFont) config.legendFont = {};
        config.legendFont.size = parseInt(e.target.value);
      });
    }
    if (elements.legendFontWeight) {
      elements.legendFontWeight.addEventListener('change', (e) => {
        if (!config.legendFont) config.legendFont = {};
        config.legendFont.weight = parseInt(e.target.value);
      });
    }
    if (elements.legendFontColor) {
      elements.legendFontColor.addEventListener('change', (e) => {
        if (!config.legendFont) config.legendFont = {};
        config.legendFont.color = e.target.value;
      });
    }
    if (elements.legendItalic) {
      elements.legendItalic.addEventListener('change', (e) => {
        if (!config.legendFont) config.legendFont = {};
        config.legendFont.italic = e.target.checked;
      });
    }

    // Legend background color
    if (elements.legendBgColor) {
      elements.legendBgColor.addEventListener('change', (e) => {
        if (!elements.legendBgTransparent.checked) {
          config.legend.bgColor = e.target.value;
        }
      });
    }
    if (elements.legendBgTransparent) {
      elements.legendBgTransparent.addEventListener('change', (e) => {
        config.legend.bgColor = e.target.checked ? 'transparent' : elements.legendBgColor.value;
      });
    }

    // Title background color
    if (elements.titleBgColor) {
      elements.titleBgColor.addEventListener('change', (e) => {
        if (!elements.titleBgTransparent.checked) {
          config.title.bgColor = e.target.value;
        }
      });
    }
    if (elements.titleBgTransparent) {
      elements.titleBgTransparent.addEventListener('change', (e) => {
        config.title.bgColor = e.target.checked ? 'transparent' : elements.titleBgColor.value;
      });
    }

    // Bar label font settings
    if (elements.barLabelFontFamily) {
      elements.barLabelFontFamily.addEventListener('change', (e) => {
        if (!config.barLabelFont) config.barLabelFont = {};
        config.barLabelFont.family = e.target.value;
      });
    }
    if (elements.barLabelFontWeight) {
      elements.barLabelFontWeight.addEventListener('change', (e) => {
        if (!config.barLabelFont) config.barLabelFont = {};
        config.barLabelFont.weight = parseInt(e.target.value);
      });
    }
    if (elements.barLabelItalic) {
      elements.barLabelItalic.addEventListener('change', (e) => {
        if (!config.barLabelFont) config.barLabelFont = {};
        config.barLabelFont.italic = e.target.checked;
      });
    }
    // Sync bar-label-font-size to barLabelFont.size
    safeAddListener(elements.barLabelFontSize, 'change', (e) => {
      config.barLabels.fontSize = parseInt(e.target.value);
      if (!config.barLabelFont) config.barLabelFont = {};
      config.barLabelFont.size = parseInt(e.target.value);
    });
    // Sync bar-label-color to barLabelFont.color
    safeAddListener(elements.barLabelColor, 'change', (e) => {
      config.barLabels.color = e.target.value;
      if (!config.barLabelFont) config.barLabelFont = {};
      config.barLabelFont.color = e.target.value;
    });
    // Bar label offset
    if (elements.barLabelOffsetX) {
      elements.barLabelOffsetX.addEventListener('change', (e) => {
        config.barLabels.offsetX = parseInt(e.target.value) || 0;
      });
    }
    if (elements.barLabelOffsetY) {
      elements.barLabelOffsetY.addEventListener('change', (e) => {
        config.barLabels.offsetY = parseInt(e.target.value) || 0;
      });
    }

    // Bar 1 label font settings
    if (elements.bar1LabelFontFamily) {
      elements.bar1LabelFontFamily.addEventListener('change', (e) => {
        if (!config.bar1LabelFont) config.bar1LabelFont = {};
        config.bar1LabelFont.family = e.target.value;
      });
    }
    if (elements.bar1LabelFontSize) {
      elements.bar1LabelFontSize.addEventListener('change', (e) => {
        if (!config.bar1LabelFont) config.bar1LabelFont = {};
        config.bar1LabelFont.size = parseInt(e.target.value);
      });
    }
    if (elements.bar1LabelFontWeight) {
      elements.bar1LabelFontWeight.addEventListener('change', (e) => {
        if (!config.bar1LabelFont) config.bar1LabelFont = {};
        config.bar1LabelFont.weight = parseInt(e.target.value);
      });
    }
    if (elements.bar1LabelColor) {
      elements.bar1LabelColor.addEventListener('change', (e) => {
        if (!config.bar1LabelFont) config.bar1LabelFont = {};
        config.bar1LabelFont.color = e.target.value;
      });
    }
    if (elements.bar1LabelItalic) {
      elements.bar1LabelItalic.addEventListener('change', (e) => {
        if (!config.bar1LabelFont) config.bar1LabelFont = {};
        config.bar1LabelFont.italic = e.target.checked;
      });
    }

    // Bar 2 label font settings
    if (elements.bar2LabelFontFamily) {
      elements.bar2LabelFontFamily.addEventListener('change', (e) => {
        if (!config.bar2LabelFont) config.bar2LabelFont = {};
        config.bar2LabelFont.family = e.target.value;
      });
    }
    if (elements.bar2LabelFontSize) {
      elements.bar2LabelFontSize.addEventListener('change', (e) => {
        if (!config.bar2LabelFont) config.bar2LabelFont = {};
        config.bar2LabelFont.size = parseInt(e.target.value);
      });
    }
    if (elements.bar2LabelFontWeight) {
      elements.bar2LabelFontWeight.addEventListener('change', (e) => {
        if (!config.bar2LabelFont) config.bar2LabelFont = {};
        config.bar2LabelFont.weight = parseInt(e.target.value);
      });
    }
    if (elements.bar2LabelColor) {
      elements.bar2LabelColor.addEventListener('change', (e) => {
        if (!config.bar2LabelFont) config.bar2LabelFont = {};
        config.bar2LabelFont.color = e.target.value;
      });
    }
    if (elements.bar2LabelItalic) {
      elements.bar2LabelItalic.addEventListener('change', (e) => {
        if (!config.bar2LabelFont) config.bar2LabelFont = {};
        config.bar2LabelFont.italic = e.target.checked;
      });
    }

    // Line label font settings
    if (elements.lineLabelFontFamily) {
      elements.lineLabelFontFamily.addEventListener('change', (e) => {
        if (!config.lineLabelFont) config.lineLabelFont = {};
        config.lineLabelFont.family = e.target.value;
      });
    }
    if (elements.lineLabelFontWeight) {
      elements.lineLabelFontWeight.addEventListener('change', (e) => {
        if (!config.lineLabelFont) config.lineLabelFont = {};
        config.lineLabelFont.weight = parseInt(e.target.value);
      });
    }
    if (elements.lineLabelItalic) {
      elements.lineLabelItalic.addEventListener('change', (e) => {
        if (!config.lineLabelFont) config.lineLabelFont = {};
        config.lineLabelFont.italic = e.target.checked;
      });
    }
    // Sync line-label-font-size to lineLabelFont.size
    safeAddListener(elements.lineLabelFontSize, 'change', (e) => {
      config.lineLabels.fontSize = parseInt(e.target.value);
      if (!config.lineLabelFont) config.lineLabelFont = {};
      config.lineLabelFont.size = parseInt(e.target.value);
    });
    // Sync line-label-color to lineLabelFont.color
    safeAddListener(elements.lineLabelColor, 'change', (e) => {
      config.lineLabels.color = e.target.value;
      if (!config.lineLabelFont) config.lineLabelFont = {};
      config.lineLabelFont.color = e.target.value;
    });
    // Line label offset
    if (elements.lineLabelOffsetX) {
      elements.lineLabelOffsetX.addEventListener('change', (e) => {
        config.lineLabels.offsetX = parseInt(e.target.value) || 0;
      });
    }
    if (elements.lineLabelOffsetY) {
      elements.lineLabelOffsetY.addEventListener('change', (e) => {
        config.lineLabels.offsetY = parseInt(e.target.value) || 0;
      });
    }

    // Tooltip font settings
    if (elements.tooltipFontFamily) {
      elements.tooltipFontFamily.addEventListener('change', (e) => {
        if (!config.tooltipFont) config.tooltipFont = {};
        config.tooltipFont.family = e.target.value;
      });
    }
    if (elements.tooltipFontWeight) {
      elements.tooltipFontWeight.addEventListener('change', (e) => {
        if (!config.tooltipFont) config.tooltipFont = {};
        config.tooltipFont.weight = parseInt(e.target.value);
      });
    }
    // Sync tooltip-font-size to tooltipFont.size
    safeAddListener(elements.tooltipFontSize, 'change', (e) => {
      config.tooltip.fontSize = parseInt(e.target.value);
      if (!config.tooltipFont) config.tooltipFont = {};
      config.tooltipFont.size = parseInt(e.target.value);
    });
    // Sync tooltip-text-color to tooltipFont.color
    safeAddListener(elements.tooltipTextColor, 'change', (e) => {
      config.tooltip.textColor = e.target.value;
      if (!config.tooltipFont) config.tooltipFont = {};
      config.tooltipFont.color = e.target.value;
    });

    // Dialog appearance options
    safeAddListener(elements.showSectionDividers, 'change', (e) => {
      document.body.classList.toggle('hide-section-dividers', !e.target.checked);
    });
    safeAddListener(elements.compactMode, 'change', (e) => {
      document.body.classList.toggle('compact-mode', e.target.checked);
    });

    // Buttons - use direct getElementById as fallback for reliability
    const cancelBtn = elements.cancelBtn || document.getElementById('cancel-btn');
    const applyBtn = elements.applyBtn || document.getElementById('apply-btn');
    const saveBtn = elements.saveBtn || document.getElementById('save-btn');
    const resetBtn = elements.resetBtn || document.getElementById('reset-btn');

    if (cancelBtn) {
      cancelBtn.onclick = closeDialog;
      console.log('Cancel button handler attached');
    }
    if (applyBtn) {
      applyBtn.onclick = applyChanges;
      console.log('Apply button handler attached');
    }
    if (saveBtn) {
      saveBtn.onclick = saveAndClose;
      console.log('Save button handler attached');
    }
    if (resetBtn) {
      resetBtn.onclick = resetToDefaults;
      console.log('Reset button handler attached');
    }
  }

  /**
   * Reset all settings to defaults
   */
  function resetToDefaults() {
    if (!confirm('Reset all settings to their default values? This cannot be undone.')) {
      return;
    }

    // Preserve current data field selections
    const preservedFields = {
      dimension: config.dimension,
      bar1Measure: config.bar1Measure,
      bar2Measure: config.bar2Measure,
      lineMeasure: config.lineMeasure
    };

    // Reset to defaults
    config = getDefaultConfig();

    // Restore data field selections
    config.dimension = preservedFields.dimension;
    config.bar1Measure = preservedFields.bar1Measure;
    config.bar2Measure = preservedFields.bar2Measure;
    config.lineMeasure = preservedFields.lineMeasure;

    // Repopulate form with reset values
    populateForm();

    // Update field labels
    updateFieldLabels();

    // Show feedback
    const btn = elements.resetBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Reset!';
    btn.style.color = 'var(--success)';

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.color = '';
    }, 1500);
  }

  /**
   * Apply changes without closing dialog (preview)
   */
  async function applyChanges() {
    const errors = validate();

    if (errors.length > 0) {
      showMessage(
        'Combo Chart - Validation Error',
        '<p>Please fix the following issues:</p><ul>' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>',
        'error'
      );
      return;
    }

    const btn = elements.applyBtn;
    const originalText = btn.textContent;
    btn.textContent = 'Applying...';
    btn.classList.add('btn-applying');

    try {
      console.log('DialogConfig: Saving config with xAxis.sort =', config.xAxis?.sort);
      tableau.extensions.settings.set('comboChartConfig', JSON.stringify(config));
      await tableau.extensions.settings.saveAsync();
      console.log('DialogConfig: Settings saved successfully');

      // Show success feedback
      btn.textContent = 'Applied!';
      btn.style.color = 'var(--success)';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('btn-applying');
        btn.style.color = '';
      }, 1500);
    } catch (error) {
      console.error('Error applying settings:', error);
      btn.textContent = 'Error!';
      btn.style.color = 'var(--error)';

      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('btn-applying');
        btn.style.color = '';
      }, 1500);
    }
  }

  /**
   * Helper to set up range input with value display
   */
  function setupRangeInput(rangeEl, valueEl, callback) {
    rangeEl.addEventListener('input', (e) => {
      valueEl.textContent = e.target.value;
      callback(e.target.value);
    });
  }

  /**
   * Set up tab navigation
   */
  function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    console.log('[DialogConfig] Setting up tabs. Found', tabBtns.length, 'tab buttons');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const tabId = btn.dataset.tab;
        console.log('[DialogConfig] Tab clicked:', tabId);

        // Update active states
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const tabContent = document.getElementById(`tab-${tabId}`);
        if (tabContent) {
          tabContent.classList.add('active');
        } else {
          console.error('[DialogConfig] Tab content not found:', `tab-${tabId}`);
        }
      });
    });
  }

  /**
   * Update points options visibility
   */
  function updatePointsOptionsVisibility() {
    const show = elements.showPoints.checked;
    document.getElementById('points-options').style.display = show ? 'flex' : 'none';
    document.getElementById('points-color-options').style.display = show ? 'flex' : 'none';
  }

  /**
   * Update Y-axis right section visibility
   */
  function updateYAxisRightVisibility() {
    const isDual = config.axisMode === 'dual';
    document.getElementById('y-axis-right-section').style.display = isDual ? 'block' : 'none';
    updateSyncAxisVisibility();
  }

  /**
   * Update sync axis option visibility (only show in dual mode)
   */
  function updateSyncAxisVisibility() {
    if (elements.syncAxisOption) {
      const isDual = config.axisMode === 'dual';
      elements.syncAxisOption.style.display = isDual ? 'block' : 'none';
    }
  }

  /**
   * Update animation options visibility
   */
  function updateAnimationOptionsVisibility() {
    const enabled = elements.animationEnabled.checked;
    if (elements.animationOptions) {
      elements.animationOptions.classList.toggle('disabled', !enabled);
    }
  }

  /**
   * Swap bar 1 and bar 2 data and styling
   */
  function swapBars() {
    // Swap data field selections
    const tempMeasure = config.bar1Measure;
    config.bar1Measure = config.bar2Measure;
    config.bar2Measure = tempMeasure;

    // Swap bar styling
    const tempBar1 = { ...config.bar1 };
    config.bar1 = { ...config.bar2 };
    config.bar2 = tempBar1;

    // Swap legend labels
    const tempLabel = config.legend.bar1Label;
    config.legend.bar1Label = config.legend.bar2Label;
    config.legend.bar2Label = tempLabel;

    // Repopulate form with swapped values
    populateForm();
    updateFieldLabels();

    // Show feedback
    const btn = elements.swapBarsBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Swapped!';
    btn.style.color = 'var(--success)';

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.color = '';
    }, 1500);
  }

  /**
   * Update bar 1 border options visibility
   */
  function updateBar1BorderVisibility() {
    if (elements.bar1BorderOptions && elements.bar1ShowBorder) {
      elements.bar1BorderOptions.style.display = elements.bar1ShowBorder.checked ? 'flex' : 'none';
    }
  }

  /**
   * Update bar 2 border options visibility
   */
  function updateBar2BorderVisibility() {
    if (elements.bar2BorderOptions && elements.bar2ShowBorder) {
      elements.bar2BorderOptions.style.display = elements.bar2ShowBorder.checked ? 'flex' : 'none';
    }
  }

  /**
   * Update font preview
   */
  function updateFontPreview() {
    const preview = elements.fontPreview;
    if (!preview) return;

    const font = config.font || {};
    preview.style.fontFamily = font.family || 'system-ui, sans-serif';

    const titleEl = preview.querySelector('.preview-title');
    const labelEl = preview.querySelector('.preview-label');

    if (titleEl) titleEl.style.fontWeight = font.titleWeight || 600;
    if (labelEl) labelEl.style.fontWeight = font.labelWeight || 400;
  }

  /**
   * Preview animation - triggers re-render of actual chart
   */
  async function previewAnimation() {
    const btn = elements.previewAnimation;
    const originalText = btn.innerHTML;

    // Update button state
    btn.style.transform = 'scale(0.95)';
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Previewing...';

    const duration = config.animation?.duration || 500;

    try {
      // Set flag to force full animation on next render
      config.forceAnimationPreview = true;

      // Save config to trigger chart update
      tableau.extensions.settings.set('comboChartConfig', JSON.stringify(config));
      await tableau.extensions.settings.saveAsync();

      // Clear the flag after a short delay
      setTimeout(async () => {
        config.forceAnimationPreview = false;
        tableau.extensions.settings.set('comboChartConfig', JSON.stringify(config));
        await tableau.extensions.settings.saveAsync();
      }, duration + 100);

      // Reset button after animation completes
      setTimeout(() => {
        btn.style.transform = 'scale(1)';
        btn.innerHTML = originalText;
      }, duration + 200);

    } catch (error) {
      console.error('Error previewing animation:', error);
      btn.style.transform = 'scale(1)';
      btn.innerHTML = originalText;
    }
  }

  /**
   * Get CSS easing equivalent
   */
  function getEasingCSS(easing) {
    const map = {
      'easeLinear': 'linear',
      'easeCubicOut': 'cubic-bezier(0.33, 1, 0.68, 1)',
      'easeCubicInOut': 'cubic-bezier(0.65, 0, 0.35, 1)',
      'easeQuad': 'cubic-bezier(0.5, 1, 0.89, 1)',
      'easeBack': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      'easeElastic': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
      'easeBounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)'
    };
    return map[easing] || 'ease-out';
  }

  /**
   * Validate configuration
   */
  function validate() {
    const errors = [];

    if (!config.dimension) errors.push('Please select a dimension');
    if (!config.bar1Measure) errors.push('Please select Bar 1 measure');
    if (!config.bar2Measure) errors.push('Please select Bar 2 measure');
    if (!config.lineMeasure) errors.push('Please select Line measure');

    return errors;
  }

  /**
   * Save configuration and close dialog
   */
  async function saveAndClose() {
    console.log('Save and close called');
    const errors = validate();

    if (errors.length > 0) {
      showMessage(
        'Combo Chart - Validation Error',
        '<p>Please fix the following issues:</p><ul>' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>',
        'error'
      );
      return;
    }

    try {
      tableau.extensions.settings.set('comboChartConfig', JSON.stringify(config));
      await tableau.extensions.settings.saveAsync();
      console.log('Settings saved, closing dialog');
      tableau.extensions.ui.closeDialog('saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage(
        'Combo Chart - Save Error',
        `<p>Failed to save settings:</p><p>${error.message || error}</p>`,
        'error'
      );
    }
  }

  /**
   * Close dialog without saving
   */
  function closeDialog() {
    console.log('Close dialog called');
    try {
      tableau.extensions.ui.closeDialog('cancelled');
    } catch (error) {
      console.error('Error closing dialog:', error);
      // Fallback: try to close the window
      window.close();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
