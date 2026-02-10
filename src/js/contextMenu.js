/**
 * Context Menu for Chart Elements
 * Provides right-click formatting options
 */

const ContextMenu = {
  menu: null,
  currentTarget: null,
  currentType: null,

  /**
   * Initialize the context menu
   */
  init() {
    this.menu = document.getElementById('context-menu');
    this.titleEl = document.getElementById('context-menu-title');
    this.itemsEl = document.getElementById('context-menu-items');

    // Close menu on click outside
    document.addEventListener('click', (e) => {
      if (!this.menu.contains(e.target)) {
        this.hide();
      }
    });

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    // Prevent context menu from showing browser's default menu
    this.menu.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  /**
   * Show context menu at position
   */
  show(x, y, type, target) {
    this.currentTarget = target;
    this.currentType = type;

    // Build menu items based on type
    this.buildMenu(type);

    // Position menu
    this.menu.style.left = `${x}px`;
    this.menu.style.top = `${y}px`;
    this.menu.classList.remove('hidden');

    // Adjust if menu goes off screen
    const rect = this.menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      this.menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
  },

  /**
   * Hide context menu
   */
  hide() {
    this.menu.classList.add('hidden');
    this.currentTarget = null;
    this.currentType = null;
  },

  /**
   * Build menu items based on element type
   */
  buildMenu(type) {
    const config = Config.current;
    let items = [];

    switch (type) {
      case 'bar1':
        this.titleEl.textContent = 'Format Bar 1';
        items = this.getBarMenuItems('bar1', config.bar1);
        break;

      case 'bar2':
        this.titleEl.textContent = 'Format Bar 2';
        items = this.getBarMenuItems('bar2', config.bar2);
        break;

      case 'line':
        this.titleEl.textContent = 'Format Line';
        items = this.getLineMenuItems(config.line, config.points);
        break;

      case 'xAxis':
        this.titleEl.textContent = 'Format X-Axis';
        items = this.getAxisMenuItems('xAxis', config.xAxis);
        break;

      case 'yAxisLeft':
        this.titleEl.textContent = 'Format Left Y-Axis';
        items = this.getYAxisMenuItems('yAxisLeft', config.yAxisLeft);
        break;

      case 'yAxisRight':
        this.titleEl.textContent = 'Format Right Y-Axis';
        items = this.getYAxisMenuItems('yAxisRight', config.yAxisRight);
        break;

      case 'legend':
        this.titleEl.textContent = 'Format Legend';
        items = this.getLegendMenuItems(config.legend);
        break;

      case 'title':
        this.titleEl.textContent = 'Format Title';
        items = this.getTitleMenuItems(config.title);
        break;

      case 'grid':
        this.titleEl.textContent = 'Format Grid';
        items = this.getGridMenuItems(config.grid);
        break;

      case 'background':
        this.titleEl.textContent = 'Format Background';
        items = this.getBackgroundMenuItems();
        break;

      default:
        this.titleEl.textContent = 'Format';
        items = [{ label: 'Open Settings', icon: 'settings', action: () => this.openSettings() }];
    }

    // Determine which tab and section to open based on type
    const tabMapping = {
      'bar1': { tab: 'bars', section: 'bar1' },
      'bar2': { tab: 'bars', section: 'bar2' },
      'line': { tab: 'line', section: 'line' },
      'xAxis': { tab: 'axes', section: 'xAxis' },
      'yAxisLeft': { tab: 'axes', section: 'yAxisLeft' },
      'yAxisRight': { tab: 'axes', section: 'yAxisRight' },
      'legend': { tab: 'labels', section: 'legend' },
      'title': { tab: 'labels', section: 'title' },
      'grid': { tab: 'axes', section: 'grid' }
    };
    const mapping = tabMapping[type] || { tab: 'data', section: null };

    // Add common items
    items.push({ divider: true });
    items.push({ label: 'Open Full Settings...', icon: 'settings', action: () => this.openSettings(mapping.tab, mapping.section) });

    this.renderItems(items);
  },

  /**
   * Get bar formatting menu items
   */
  getBarMenuItems(barKey, barConfig) {
    return [
      { label: 'Color', type: 'color', value: barConfig.color, onChange: (v) => this.updateConfig(`${barKey}.color`, v) },
      { label: 'Border Color', type: 'color', value: barConfig.borderColor, onChange: (v) => this.updateConfig(`${barKey}.borderColor`, v) },
      { label: 'Border Width', type: 'number', value: barConfig.borderWidth, min: 0, max: 5, onChange: (v) => this.updateConfig(`${barKey}.borderWidth`, parseInt(v)) },
      { label: 'Corner Radius', type: 'number', value: barConfig.cornerRadius, min: 0, max: 20, onChange: (v) => this.updateConfig(`${barKey}.cornerRadius`, parseInt(v)) },
      { label: 'Opacity', type: 'number', value: barConfig.opacity, min: 0, max: 1, step: 0.1, onChange: (v) => this.updateConfig(`${barKey}.opacity`, parseFloat(v)) },
      { divider: true },
      { label: 'Show Labels', type: 'toggle', value: Config.current.barLabels.show, onChange: (v) => this.updateConfig('barLabels.show', v) }
    ];
  },

  /**
   * Get line formatting menu items
   */
  getLineMenuItems(lineConfig, pointsConfig) {
    return [
      { label: 'Line Color', type: 'color', value: lineConfig.color, onChange: (v) => { this.updateConfig('line.color', v); this.updateConfig('points.fill', v); } },
      { label: 'Line Width', type: 'number', value: lineConfig.width, min: 1, max: 10, onChange: (v) => this.updateConfig('line.width', parseInt(v)) },
      { label: 'Line Style', type: 'select', value: lineConfig.style, options: [
        { value: 'solid', label: 'Solid' },
        { value: 'dashed', label: 'Dashed' },
        { value: 'dotted', label: 'Dotted' }
      ], onChange: (v) => this.updateConfig('line.style', v) },
      { divider: true },
      { label: 'Show Points', type: 'toggle', value: pointsConfig.show, onChange: (v) => this.updateConfig('points.show', v) },
      { label: 'Point Size', type: 'number', value: pointsConfig.size, min: 2, max: 15, onChange: (v) => this.updateConfig('points.size', parseInt(v)) },
      { divider: true },
      { label: 'Show Labels', type: 'toggle', value: Config.current.lineLabels.show, onChange: (v) => this.updateConfig('lineLabels.show', v) }
    ];
  },

  /**
   * Get X-axis formatting menu items
   */
  getAxisMenuItems(axisKey, axisConfig) {
    return [
      { label: 'Show Axis', type: 'toggle', value: axisConfig.show, onChange: (v) => this.updateConfig(`${axisKey}.show`, v) },
      { label: 'Font Size', type: 'number', value: axisConfig.fontSize, min: 8, max: 24, onChange: (v) => this.updateConfig(`${axisKey}.fontSize`, parseInt(v)) },
      { label: 'Label Rotation', type: 'select', value: axisConfig.rotation, options: [
        { value: 0, label: 'Horizontal (0)' },
        { value: -45, label: 'Diagonal (-45)' },
        { value: -90, label: 'Vertical (-90)' }
      ], onChange: (v) => this.updateConfig(`${axisKey}.rotation`, parseInt(v)) },
      { divider: true },
      { label: 'Edit Title...', icon: 'edit', action: () => this.promptAxisTitle(axisKey) }
    ];
  },

  /**
   * Get Y-axis formatting menu items
   */
  getYAxisMenuItems(axisKey, axisConfig) {
    return [
      { label: 'Show Axis', type: 'toggle', value: axisConfig.show, onChange: (v) => this.updateConfig(`${axisKey}.show`, v) },
      { label: 'Number Format', type: 'select', value: axisConfig.format, options: [
        { value: 'auto', label: 'Auto' },
        { value: 'number', label: 'Number (1,234)' },
        { value: 'currency', label: 'Currency ($1,234)' },
        { value: 'percent', label: 'Percent (12.34%)' },
        { value: 'compact', label: 'Compact (1.2K)' }
      ], onChange: (v) => this.updateConfig(`${axisKey}.format`, v) },
      { divider: true },
      { label: 'Edit Title...', icon: 'edit', action: () => this.promptAxisTitle(axisKey) },
      { label: 'Set Min/Max...', icon: 'edit', action: () => this.promptAxisRange(axisKey) }
    ];
  },

  /**
   * Get legend formatting menu items
   */
  getLegendMenuItems(legendConfig) {
    return [
      { label: 'Show Legend', type: 'toggle', value: legendConfig.show, onChange: (v) => this.updateConfig('legend.show', v) },
      { label: 'Position', type: 'select', value: legendConfig.position, options: [
        { value: 'bottom', label: 'Bottom' },
        { value: 'top', label: 'Top' },
        { value: 'right', label: 'Right' },
        { value: 'left', label: 'Left' }
      ], onChange: (v) => this.updateConfig('legend.position', v) },
      { divider: true },
      { label: 'Edit Labels...', icon: 'edit', action: () => this.openSettings() }
    ];
  },

  /**
   * Get title formatting menu items
   */
  getTitleMenuItems(titleConfig) {
    return [
      { label: 'Show Title', type: 'toggle', value: titleConfig.show, onChange: (v) => this.updateConfig('title.show', v) },
      { label: 'Font Size', type: 'number', value: titleConfig.fontSize, min: 12, max: 36, onChange: (v) => this.updateConfig('title.fontSize', parseInt(v)) },
      { label: 'Color', type: 'color', value: titleConfig.color, onChange: (v) => this.updateConfig('title.color', v) },
      { divider: true },
      { label: 'Edit Title...', icon: 'edit', action: () => this.promptTitle() }
    ];
  },

  /**
   * Get grid formatting menu items
   */
  getGridMenuItems(gridConfig) {
    return [
      { label: 'Horizontal Lines', type: 'toggle', value: gridConfig.horizontal, onChange: (v) => this.updateConfig('grid.horizontal', v) },
      { label: 'Vertical Lines', type: 'toggle', value: gridConfig.vertical, onChange: (v) => this.updateConfig('grid.vertical', v) },
      { label: 'Grid Color', type: 'color', value: gridConfig.color, onChange: (v) => this.updateConfig('grid.color', v) },
      { label: 'Opacity', type: 'number', value: gridConfig.opacity, min: 0, max: 1, step: 0.1, onChange: (v) => this.updateConfig('grid.opacity', parseFloat(v)) }
    ];
  },

  /**
   * Get background menu items
   */
  getBackgroundMenuItems() {
    return [
      { label: 'Background Color', type: 'color', value: '#ffffff', onChange: (v) => {
        document.querySelector('.chart-area').style.backgroundColor = v;
      }},
      { divider: true },
      { label: 'Reset to Default', icon: 'reset', action: () => {
        document.querySelector('.chart-area').style.backgroundColor = '';
      }}
    ];
  },

  /**
   * Render menu items
   */
  renderItems(items) {
    this.itemsEl.innerHTML = '';

    items.forEach(item => {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'context-menu-divider';
        this.itemsEl.appendChild(divider);
        return;
      }

      const el = document.createElement('div');
      el.className = 'context-menu-item';

      if (item.icon) {
        el.innerHTML = `<span>${this.getIcon(item.icon)}</span>`;
      }

      const label = document.createElement('span');
      label.textContent = item.label;
      el.appendChild(label);

      if (item.type === 'color') {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = item.value;
        input.addEventListener('change', (e) => {
          item.onChange(e.target.value);
          this.applyAndRefresh();
        });
        el.appendChild(input);
      } else if (item.type === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = item.value;
        input.min = item.min || 0;
        input.max = item.max || 100;
        if (item.step) input.step = item.step;
        input.addEventListener('change', (e) => {
          item.onChange(e.target.value);
          this.applyAndRefresh();
        });
        el.appendChild(input);
      } else if (item.type === 'toggle') {
        const toggle = document.createElement('div');
        toggle.className = 'toggle-switch' + (item.value ? ' active' : '');
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const newValue = !toggle.classList.contains('active');
          toggle.classList.toggle('active', newValue);
          item.onChange(newValue);
          this.applyAndRefresh();
        });
        el.appendChild(toggle);
      } else if (item.type === 'select') {
        const select = document.createElement('select');
        select.style.marginLeft = 'auto';
        select.style.padding = '4px 8px';
        select.style.border = '1px solid var(--gray-300)';
        select.style.borderRadius = '4px';
        select.style.fontSize = '12px';
        item.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          option.selected = opt.value == item.value;
          select.appendChild(option);
        });
        select.addEventListener('change', (e) => {
          item.onChange(e.target.value);
          this.applyAndRefresh();
        });
        el.appendChild(select);
      } else if (item.action) {
        el.addEventListener('click', () => {
          item.action();
          this.hide();
        });
      }

      this.itemsEl.appendChild(el);
    });
  },

  /**
   * Get icon SVG
   */
  getIcon(name) {
    const icons = {
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
    };
    return icons[name] || '';
  },

  /**
   * Update configuration value
   */
  updateConfig(path, value) {
    Config.set(path, value);
  },

  /**
   * Apply changes and refresh chart
   */
  async applyAndRefresh() {
    try {
      await Config.save();
      // The settings change listener in main.js will handle re-rendering
      // But we can also dispatch a custom event as a backup
      window.dispatchEvent(new CustomEvent('comboChartConfigChanged'));
    } catch (error) {
      console.error('Error applying changes:', error);
    }
  },

  /**
   * Open full settings dialog with optional tab and section
   */
  openSettings(tab = null, section = null) {
    // Dispatch event to open settings with tab/section info
    window.dispatchEvent(new CustomEvent('openComboChartSettings', {
      detail: { tab, section }
    }));
  },

  /**
   * Prompt for title edit
   */
  promptTitle() {
    const current = Config.current.title.text || 'Combo Chart';
    const newTitle = prompt('Enter chart title:', current);
    if (newTitle !== null) {
      this.updateConfig('title.text', newTitle);
      this.applyAndRefresh();
    }
  },

  /**
   * Prompt for axis title
   */
  promptAxisTitle(axisKey) {
    const current = Config.current[axisKey].title || '';
    const newTitle = prompt('Enter axis title:', current);
    if (newTitle !== null) {
      this.updateConfig(`${axisKey}.title`, newTitle);
      this.applyAndRefresh();
    }
  },

  /**
   * Prompt for axis range
   */
  promptAxisRange(axisKey) {
    const current = Config.current[axisKey];
    const min = prompt('Enter minimum value (leave empty for auto):', current.min || '');
    const max = prompt('Enter maximum value (leave empty for auto):', current.max || '');

    this.updateConfig(`${axisKey}.min`, min ? parseFloat(min) : null);
    this.updateConfig(`${axisKey}.max`, max ? parseFloat(max) : null);
    this.applyAndRefresh();
  }
};
