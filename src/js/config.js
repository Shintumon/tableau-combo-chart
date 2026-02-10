/**
 * Configuration Management for Combo Chart Extension
 */

const Config = {
  // Color palettes (Tableau-style)
  colorPalettes: {
    'tableau10': {
      name: 'Tableau 10',
      colors: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab']
    },
    'tableau20': {
      name: 'Tableau 20',
      colors: ['#4e79a7', '#a0cbe8', '#f28e2c', '#ffbe7d', '#59a14f', '#8cd17d', '#b6992d', '#f1ce63', '#499894', '#86bcb6', '#e15759', '#ff9d9a', '#79706e', '#bab0ac', '#d37295', '#fabfd2', '#b07aa1', '#d4a6c8', '#9d7660', '#d7b5a6']
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
      colors: ['#1f83b4', '#12a2a8', '#2ca030', '#78a641', '#bcbd22', '#ffbf50', '#ffaa0e', '#ff7f0e', '#d63a3a', '#c7519c', '#ba43b4', '#8a60b0', '#6f63bb']
    },
    'classic': {
      name: 'Classic',
      colors: ['#7ab800', '#6ac7de', '#ff6f01', '#fbb034', '#68adef', '#6d6e70', '#a4dbcc', '#ffbf9a', '#b3d9ff', '#d0d0d0']
    }
  },

  // Font families available
  fontFamilies: [
    { value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', label: 'System Default' },
    { value: '"Tableau Book", "Tableau Regular", Arial, sans-serif', label: 'Tableau' },
    { value: '"Segoe UI", Tahoma, Geneva, sans-serif', label: 'Segoe UI' },
    { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
    { value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica' },
    { value: 'Roboto, "Helvetica Neue", sans-serif', label: 'Roboto' },
    { value: '"Open Sans", sans-serif', label: 'Open Sans' },
    { value: '"Source Sans Pro", sans-serif', label: 'Source Sans Pro' },
    { value: 'Lato, sans-serif', label: 'Lato' },
    { value: '"Inter", sans-serif', label: 'Inter' },
    { value: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
    { value: '"Courier New", Courier, monospace', label: 'Courier New' }
  ],

  // Default configuration
  defaults: {
    // Data mapping (no worksheet needed for viz extensions)
    dimension: '',
    bar1Measure: '',
    bar2Measure: '',
    lineMeasure: '',

    // Color palette
    colorPalette: 'tableau10',

    // Bar settings
    barStyle: 'grouped', // 'grouped' or 'stacked'
    barPadding: 0.2,

    bar1: {
      color: '#4e79a7',
      opacity: 1,
      showBorder: true,
      borderColor: '#3a5f80',
      borderWidth: 1,
      cornerRadius: 2
    },

    bar2: {
      color: '#f28e2c',
      opacity: 1,
      showBorder: true,
      borderColor: '#c47223',
      borderWidth: 1,
      cornerRadius: 2
    },

    // Line settings
    line: {
      color: '#e15759',
      opacity: 1,
      width: 2,
      style: 'solid', // 'solid', 'dashed', 'dotted'
      curve: 'linear' // 'linear', 'monotone', 'cardinal', 'step'
    },

    points: {
      show: true,
      size: 5,
      shape: 'circle', // 'circle', 'square', 'diamond', 'triangle'
      fill: '#e15759',
      stroke: '#ffffff'
    },

    // Animation settings
    animation: {
      enabled: true,
      duration: 500, // milliseconds
      easing: 'easeCubicOut' // easeLinear, easeCubicOut, easeElastic, easeBounce
    },

    // Font settings
    font: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      titleWeight: 600,
      labelWeight: 400
    },

    // Axis settings
    axisMode: 'dual', // 'dual' or 'shared'
    syncDualAxis: false, // When true, both Y-axes share the same scale

    xAxis: {
      show: true,
      title: '',
      showTitle: true,
      showLabels: true,
      showTickMarks: true,
      showAxisLine: true,
      fontSize: 12,
      rotation: 0,
      align: 'center',
      sort: 'default',
      maxWidth: 'none',
      tickColor: '#999999',
      lineColor: '#999999'
    },

    yAxisLeft: {
      show: true,
      title: '',
      showTitle: true,
      showLabels: true,
      showTickMarks: true,
      showAxisLine: true,
      min: null,
      max: null,
      format: 'auto',
      tickColor: '#999999',
      lineColor: '#999999'
    },

    yAxisRight: {
      show: true,
      title: '',
      showTitle: true,
      showLabels: true,
      showTickMarks: true,
      showAxisLine: true,
      min: null,
      max: null,
      format: 'auto',
      tickColor: '#999999',
      lineColor: '#999999'
    },

    grid: {
      horizontal: true,
      vertical: false,
      color: '#e0e0e0',
      opacity: 0.5
    },

    // Labels
    title: {
      show: true,
      text: 'Combo Chart',
      fontSize: 18,
      color: '#333333',
      bgColor: 'transparent',
      padding: 10
    },

    barLabels: {
      show: false,
      position: 'top', // 'top', 'inside', 'center'
      fontSize: 10,
      color: '#333333',
      offsetX: 0,
      offsetY: 0
    },

    lineLabels: {
      show: false,
      position: 'top', // 'top', 'bottom', 'left', 'right', 'center'
      fontSize: 10,
      color: '#333333',
      offsetX: 0,
      offsetY: 0
    },

    legend: {
      show: true,
      position: 'bottom', // 'bottom', 'top', 'right', 'left'
      bar1Label: '',  // Custom label for bar 1 (empty = use measure name)
      bar2Label: '',  // Custom label for bar 2
      lineLabel: '',  // Custom label for line
      bgColor: 'transparent',
      padding: 14
    },

    // Tooltip
    tooltip: {
      show: true,
      showDimension: true,
      showMeasureName: true,
      showValue: true,
      bgColor: '#333333',
      textColor: '#ffffff',
      fontSize: 12
    },

    // Header controls visibility (for dashboard)
    headerControls: {
      showLegendToggle: true,
      showSettingsCog: true
    },

    // Individual font settings for each text element
    titleFont: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 18,
      weight: 600,
      color: '#333333',
      italic: false
    },
    xAxisFont: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 12,
      weight: 400,
      color: '#666666',
      italic: false
    },
    yAxisFont: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 12,
      weight: 400,
      color: '#666666',
      italic: false
    },
    legendFont: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 12,
      weight: 400,
      color: '#333333',
      italic: false
    },
    barLabelFont: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 10,
      weight: 400,
      color: '#333333',
      italic: false
    },
    bar1LabelFont: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 10,
      weight: 400,
      color: '#333333',
      italic: false
    },
    bar2LabelFont: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 10,
      weight: 400,
      color: '#333333',
      italic: false
    },
    lineLabelFont: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 10,
      weight: 400,
      color: '#333333',
      italic: false
    },
    tooltipFont: {
      family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      size: 12,
      weight: 400,
      color: '#ffffff',
      italic: false
    }
  },

  // Current configuration
  current: null,

  /**
   * Initialize configuration from settings or defaults
   */
  init() {
    this.current = JSON.parse(JSON.stringify(this.defaults));
  },

  /**
   * Load configuration from Tableau settings
   */
  load() {
    try {
      const settings = tableau.extensions.settings.getAll();
      if (settings.comboChartConfig) {
        const saved = JSON.parse(settings.comboChartConfig);
        this.current = this.merge(this.defaults, saved);
      } else {
        this.current = JSON.parse(JSON.stringify(this.defaults));
      }
      // Ensure all font objects exist with proper defaults
      this.ensureFontObjects();
    } catch (e) {
      console.error('Error loading configuration:', e);
      this.current = JSON.parse(JSON.stringify(this.defaults));
    }
    return this.current;
  },

  /**
   * Ensure all font configuration objects exist with proper defaults
   */
  ensureFontObjects() {
    const defaultFont = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const fontDefaults = {
      titleFont: { family: defaultFont, size: 18, weight: 600, color: '#333333', italic: false },
      xAxisFont: { family: defaultFont, size: 12, weight: 400, color: '#666666', italic: false },
      yAxisFont: { family: defaultFont, size: 12, weight: 400, color: '#666666', italic: false },
      legendFont: { family: defaultFont, size: 12, weight: 400, color: '#333333', italic: false },
      barLabelFont: { family: defaultFont, size: 10, weight: 400, color: '#333333', italic: false },
      bar1LabelFont: { family: defaultFont, size: 10, weight: 400, color: '#333333', italic: false },
      bar2LabelFont: { family: defaultFont, size: 10, weight: 400, color: '#333333', italic: false },
      lineLabelFont: { family: defaultFont, size: 10, weight: 400, color: '#333333', italic: false },
      tooltipFont: { family: defaultFont, size: 12, weight: 400, color: '#ffffff', italic: false }
    };

    for (const [key, defaults] of Object.entries(fontDefaults)) {
      if (!this.current[key]) {
        this.current[key] = { ...defaults };
      } else {
        // Merge with defaults to fill in any missing properties
        this.current[key] = { ...defaults, ...this.current[key] };
      }
    }

    // Also ensure label offset defaults
    if (!this.current.barLabels) this.current.barLabels = {};
    if (this.current.barLabels.offsetX === undefined) this.current.barLabels.offsetX = 0;
    if (this.current.barLabels.offsetY === undefined) this.current.barLabels.offsetY = 0;

    if (!this.current.lineLabels) this.current.lineLabels = {};
    if (this.current.lineLabels.offsetX === undefined) this.current.lineLabels.offsetX = 0;
    if (this.current.lineLabels.offsetY === undefined) this.current.lineLabels.offsetY = 0;
  },

  /**
   * Save configuration to Tableau settings
   */
  async save() {
    try {
      tableau.extensions.settings.set('comboChartConfig', JSON.stringify(this.current));
      await tableau.extensions.settings.saveAsync();
      return true;
    } catch (e) {
      console.error('Error saving configuration:', e);
      return false;
    }
  },

  /**
   * Deep merge two objects
   */
  merge(defaults, overrides) {
    const result = JSON.parse(JSON.stringify(defaults));

    for (const key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        if (typeof overrides[key] === 'object' && overrides[key] !== null && !Array.isArray(overrides[key])) {
          result[key] = this.merge(result[key] || {}, overrides[key]);
        } else {
          result[key] = overrides[key];
        }
      }
    }

    return result;
  },

  /**
   * Update a specific configuration value
   */
  set(path, value) {
    const keys = path.split('.');
    let obj = this.current;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
  },

  /**
   * Get a specific configuration value
   */
  get(path) {
    const keys = path.split('.');
    let obj = this.current;

    for (const key of keys) {
      if (obj === undefined || obj === null) return undefined;
      obj = obj[key];
    }

    return obj;
  },

  /**
   * Check if configuration is valid (has required fields)
   * Note: No worksheet check needed for viz extensions
   */
  isValid() {
    return !!(
      this.current.dimension &&
      this.current.bar1Measure &&
      this.current.bar2Measure &&
      this.current.lineMeasure
    );
  },

  /**
   * Get number formatter based on format type
   */
  getFormatter(format) {
    switch (format) {
      case 'number':
        return d3.format(',.0f');
      case 'currency':
        return d3.format('$,.2f');
      case 'percent':
        return d3.format('.2%');
      case 'compact':
        return d3.format('.2s');
      default:
        return d3.format(',.2~f');
    }
  },

  /**
   * Apply a color palette to the current configuration
   */
  applyColorPalette(paletteId) {
    const palette = this.colorPalettes[paletteId];
    if (palette && palette.colors.length >= 3) {
      this.current.colorPalette = paletteId;
      this.current.bar1.color = palette.colors[0];
      this.current.bar2.color = palette.colors[1];
      this.current.line.color = palette.colors[2];
      this.current.points.fill = palette.colors[2];
      // Generate border colors (darker versions)
      this.current.bar1.borderColor = this.darkenColor(palette.colors[0], 20);
      this.current.bar2.borderColor = this.darkenColor(palette.colors[1], 20);
    }
  },

  /**
   * Darken a hex color by a percentage
   */
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  },

  /**
   * Get D3 easing function based on config
   */
  getEasing(easingName) {
    const easings = {
      'easeLinear': d3.easeLinear,
      'easeCubicOut': d3.easeCubicOut,
      'easeCubicInOut': d3.easeCubicInOut,
      'easeElastic': d3.easeElasticOut,
      'easeBounce': d3.easeBounceOut,
      'easeBack': d3.easeBackOut,
      'easeQuad': d3.easeQuadOut
    };
    return easings[easingName] || d3.easeCubicOut;
  }
};

// Initialize on load
Config.init();
