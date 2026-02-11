/**
 * Main Entry Point for Combo Chart Viz Extension
 */

(function() {
  'use strict';

  // Version number for tracking deployments
  const VERSION = '1.1.0';

  // Debug helper
  function log(msg) {
    if (window.debugLog) {
      window.debugLog(msg);
    } else {
      console.log(msg);
    }
  }

  // DOM Elements
  const loadingEl = document.getElementById('loading');
  const configRequiredEl = document.getElementById('config-required');
  const chartContainerEl = document.getElementById('chart-container');
  const errorContainerEl = document.getElementById('error-container');
  const errorTextEl = document.getElementById('error-text');

  // Buttons
  const openConfigBtn = document.getElementById('open-config-btn');
  const openSettingsBtn = document.getElementById('open-settings');
  const toggleLegendBtn = document.getElementById('toggle-legend');
  const retryBtn = document.getElementById('retry-btn');

  // State
  let isInitialized = false;
  let dataChangeCallback = null;

  /**
   * Initialize the extension
   */
  async function init() {
    log('='.repeat(60));
    log('Combo Chart Extension v' + VERSION);
    log('='.repeat(60));
    log('Combo Chart: Initializing...');

    // Check if running inside Tableau
    if (typeof tableau === 'undefined' || !tableau.extensions) {
      log('Combo Chart: Not running inside Tableau');
      showStandaloneMessage();
      return;
    }

    try {
      // Initialize Tableau Extensions API for Viz Extensions
      await tableau.extensions.initializeAsync({ configure: openConfigDialog });
      log('Combo Chart: Tableau API initialized');

      // Re-init Config now that Tableau API is ready (picks up workbook font sizes)
      Config.init();
      log('Combo Chart: Config defaults updated with workbook formatting');

      // Initialize data handler with the worksheet
      DataHandler.init();
      log('Combo Chart: DataHandler initialized');

      // Load configuration for styling options
      Config.load();
      log('Combo Chart: Config loaded');

      // Initialize chart
      ComboChart.init('combo-chart', 'tooltip');
      log('Combo Chart: Chart initialized');

      // Try to load and render chart with data from Marks card encodings
      await loadAndRenderChart();
      registerDataListener();
      registerSettingsListener();

      isInitialized = true;
      log('Combo Chart: Initialization complete');
    } catch (error) {
      const errorMsg = error.message || error.toString() || 'Unknown error';
      log('ERROR: Initialization error: ' + errorMsg);

      // Check if this is the "not inside Tableau" error
      if (errorMsg.includes('not running inside') || errorMsg.includes('iframe')) {
        showStandaloneMessage();
      } else {
        showError(`Failed to initialize extension: ${errorMsg}`);
      }
    }
  }

  /**
   * Load data and render chart
   */
  async function loadAndRenderChart() {
    showLoading();

    try {
      // Get data directly from worksheet (uses Marks card encodings)
      const result = await DataHandler.getData();

      if (!result.data || result.data.length === 0) {
        log('Combo Chart: No data - showing fields required message');
        showConfigRequired();
        return;
      }

      if (!result.hasAllFields) {
        log('Combo Chart: Missing some fields, but rendering with available data');
      }

      log('Combo Chart: Rendering with ' + result.data.length + ' rows');
      ComboChart.detectedFormats = result.detectedFormats || {};
      ComboChart.dimensionType = result.dimensionType || 'string';
      ComboChart.render(result.data, result.fieldNames, Config.current);
      showChart();
    } catch (error) {
      log('ERROR loading data: ' + error.message);
      showError(`Failed to load data: ${error.message}`);
    }
  }

  /**
   * Register data change listener
   */
  function registerDataListener() {
    if (dataChangeCallback) {
      DataHandler.removeDataChangeListener(dataChangeCallback);
    }

    dataChangeCallback = debounce(async () => {
      log('Combo Chart: Data changed, reloading...');
      await loadAndRenderChart();
    }, 300);

    DataHandler.registerDataChangeListener(dataChangeCallback);
  }

  /**
   * Register settings change listener (for Apply button in dialog)
   */
  function registerSettingsListener() {
    tableau.extensions.settings.addEventListener(
      tableau.TableauEventType.SettingsChanged,
      debounce(async () => {
        log('Combo Chart: Settings changed, reloading...');
        Config.load();
        await loadAndRenderChart();
      }, 100)
    );
  }

  /**
   * Open configuration dialog for styling options
   * @param {string} tab - Optional tab to open (data, theme, bars, line, axes, labels, tooltip)
   * @param {string} section - Optional section to scroll to
   */
  function openConfigDialog(tab = null, section = null) {
    log('Combo Chart: Opening config dialog...');

    // Save the desired tab/section to settings so dialog can read it
    if (tab || section) {
      tableau.extensions.settings.set('dialogOpenTab', tab || '');
      tableau.extensions.settings.set('dialogOpenSection', section || '');
    } else {
      tableau.extensions.settings.erase('dialogOpenTab');
      tableau.extensions.settings.erase('dialogOpenSection');
    }

    // Use relative URL so it works both locally and hosted
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
    const dialogUrl = baseUrl + '/dialog.html';
    log('Combo Chart: Dialog URL: ' + dialogUrl);

    try {
      tableau.extensions.ui.displayDialogAsync(dialogUrl, '', { width: 620, height: 720 })
        .then(async (closePayload) => {
          log('Combo Chart: Dialog closed with payload: ' + closePayload);
          if (closePayload === 'saved') {
            Config.load();
            await loadAndRenderChart();
          }
        })
        .catch((error) => {
          if (error.errorCode === tableau.ErrorCodes.DialogClosedByUser) {
            log('Combo Chart: Dialog closed by user');
          } else {
            log('ERROR: Dialog error: ' + (error.message || JSON.stringify(error)));
          }
        });
    } catch (error) {
      log('ERROR: Failed to open dialog: ' + (error.message || error.toString()));
    }
  }

  /**
   * Show loading state
   */
  function showLoading() {
    loadingEl.classList.remove('hidden');
    configRequiredEl.classList.add('hidden');
    chartContainerEl.classList.add('hidden');
    errorContainerEl.classList.add('hidden');
  }

  /**
   * Show message when fields need to be added
   */
  function showConfigRequired() {
    loadingEl.classList.add('hidden');
    configRequiredEl.classList.remove('hidden');
    chartContainerEl.classList.add('hidden');
    errorContainerEl.classList.add('hidden');

    // Update message to reflect encoding-based approach
    const titleEl = configRequiredEl.querySelector('h2');
    const msgEl = configRequiredEl.querySelector('.config-message p');
    if (titleEl) {
      titleEl.textContent = 'Add Data Fields';
    }
    if (msgEl) {
      msgEl.textContent = 'Drag fields to the Category, Bar 1, Bar 2, and Line slots in the Marks card.';
    }
  }

  /**
   * Show chart
   */
  function showChart() {
    loadingEl.classList.add('hidden');
    configRequiredEl.classList.add('hidden');
    chartContainerEl.classList.remove('hidden');
    errorContainerEl.classList.add('hidden');

    // Apply header controls visibility based on config
    updateHeaderControlsVisibility();
  }

  /**
   * Update header controls visibility based on config
   */
  function updateHeaderControlsVisibility() {
    const headerControls = Config.current.headerControls || {};

    // Toggle legend button visibility
    if (toggleLegendBtn) {
      toggleLegendBtn.style.display = headerControls.showLegendToggle === false ? 'none' : '';
    }

    // Toggle settings cog visibility
    if (openSettingsBtn) {
      openSettingsBtn.style.display = headerControls.showSettingsCog === false ? 'none' : '';
    }

    // Hide entire controls div if both are hidden
    const chartControlsDiv = document.querySelector('.chart-controls');
    if (chartControlsDiv) {
      const bothHidden = headerControls.showLegendToggle === false && headerControls.showSettingsCog === false;
      chartControlsDiv.style.display = bothHidden ? 'none' : '';
    }

    // Hide entire chart-header if both title and controls are hidden
    const chartHeader = document.querySelector('.chart-header');
    const titleElement = document.getElementById('chart-title');
    if (chartHeader && titleElement) {
      const wasVisible = chartHeader.style.display !== 'none';
      const titleHidden = !Config.current.title || Config.current.title.show === false;
      const controlsHidden = headerControls.showLegendToggle === false && headerControls.showSettingsCog === false;
      const willBeVisible = !(titleHidden && controlsHidden);

      if (titleHidden && controlsHidden) {
        if (wasVisible) {
          log('Chart header hidden (title & controls hidden) - chart area should expand');
        }
        chartHeader.style.display = 'none';
      } else {
        if (!wasVisible) {
          log('Chart header shown - chart area should shrink');
        }
        chartHeader.style.display = '';
      }
    }
  }

  /**
   * Show error
   */
  function showError(message) {
    loadingEl.classList.add('hidden');
    configRequiredEl.classList.add('hidden');
    chartContainerEl.classList.add('hidden');
    errorContainerEl.classList.remove('hidden');
    errorTextEl.textContent = message || 'An unknown error occurred';
  }

  /**
   * Show message when viewed outside Tableau
   */
  function showStandaloneMessage() {
    loadingEl.classList.add('hidden');
    configRequiredEl.classList.add('hidden');
    chartContainerEl.classList.add('hidden');
    errorContainerEl.classList.remove('hidden');

    errorTextEl.innerHTML = `
      <strong>✓ Extension Loaded Successfully!</strong><br><br>
      This extension must be used inside Tableau.<br><br>
      <strong>To use:</strong><br>
      1. Open Tableau Desktop or Tableau Cloud<br>
      2. Create or open a worksheet<br>
      3. Go to Marks → Add Extension<br>
      4. Load the .trex file pointing to this URL
    `;

    // Hide retry button for standalone view
    if (retryBtn) {
      retryBtn.style.display = 'none';
    }
  }

  /**
   * Toggle legend visibility
   */
  function toggleLegend() {
    const legend = document.getElementById('legend');
    legend.classList.toggle('hidden');
  }

  /**
   * Debounce helper
   */
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

  // Event Listeners - attach after DOM is ready
  function attachEventListeners() {
    log('Combo Chart: Attaching event listeners...');

    if (openConfigBtn) {
      openConfigBtn.addEventListener('click', function(e) {
        e.preventDefault();
        log('Combo Chart: Configure button clicked');
        openConfigDialog();
      });
      log('Combo Chart: openConfigBtn listener attached');
    } else {
      log('WARN: openConfigBtn not found');
    }

    if (openSettingsBtn) {
      openSettingsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        log('Combo Chart: Settings button clicked');
        openConfigDialog();
      });
      log('Combo Chart: openSettingsBtn listener attached');
    }

    if (toggleLegendBtn) {
      toggleLegendBtn.addEventListener('click', toggleLegend);
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        loadAndRenderChart();
      });
    }

    // Listen for context menu events
    window.addEventListener('openComboChartSettings', (event) => {
      const detail = event.detail || {};
      openConfigDialog(detail.tab, detail.section);
    });

    window.addEventListener('comboChartConfigChanged', async () => {
      log('Combo Chart: Config changed via context menu, reloading...');
      Config.load();
      await loadAndRenderChart();
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachEventListeners();
      init();
    });
  } else {
    attachEventListeners();
    init();
  }
})();
