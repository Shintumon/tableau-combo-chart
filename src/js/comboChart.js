/**
 * D3.js Combo Chart Visualization
 * Renders dual bars + line chart with full customization
 */

const ComboChart = {
  // SVG elements
  svg: null,
  chartGroup: null,
  tooltip: null,

  // Dimensions - will be calculated dynamically
  margin: { top: 30, right: 60, bottom: 80, left: 60 },
  width: 0,
  height: 0,

  // Scales
  xScale: null,
  yScaleLeft: null,
  yScaleRight: null,

  // Data
  data: null,
  originalData: null,  // Store original unsorted data to prevent double-reverse on resize
  fieldNames: null,
  detectedFormats: null,
  dimensionType: 'string',
  config: null,

  // Animation state
  isFirstRender: true,

  /**
   * Initialize the chart
   */
  init(containerId, tooltipId) {
    this.svg = d3.select(`#${containerId}`);
    this.tooltip = d3.select(`#${tooltipId}`);

    // Ensure SVG has no fixed dimensions initially
    this.svg
      .style('width', '100%')
      .style('height', '100%');

    // Create main chart group
    this.chartGroup = this.svg.append('g')
      .attr('class', 'chart-group');

    // Create sub-groups for layering
    this.chartGroup.append('g').attr('class', 'grid-group');
    this.chartGroup.append('g').attr('class', 'bars-group');
    this.chartGroup.append('g').attr('class', 'line-group');
    this.chartGroup.append('g').attr('class', 'x-axis');
    this.chartGroup.append('g').attr('class', 'y-axis-left');
    this.chartGroup.append('g').attr('class', 'y-axis-right');
    this.chartGroup.append('g').attr('class', 'labels-group');

    // Set up resize observer
    this.setupResizeObserver();

    // Initialize context menu
    if (typeof ContextMenu !== 'undefined') {
      ContextMenu.init();
    }

    // Add right-click on chart background
    this.svg.on('contextmenu', (event) => {
      event.preventDefault();
      if (typeof ContextMenu !== 'undefined') {
        ContextMenu.show(event.clientX, event.clientY, 'background', event.target);
      }
    });
  },

  /**
   * Set up resize observer for responsive chart
   */
  setupResizeObserver() {
    const container = this.svg.node().parentElement;
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(entries => {
      // Debounce resize events to avoid excessive re-renders
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        for (const entry of entries) {
          if (this.data) {
            this.render(this.data, this.fieldNames, this.config);
          }
        }
      }, 100);
    });
    resizeObserver.observe(container);
  },

  /**
   * Update dimensions based on container size
   */
  updateDimensions() {
    const container = this.svg.node().parentElement;
    const rect = container.getBoundingClientRect();

    // Calculate responsive margins based on container size and axis configuration
    const baseMargin = Math.min(rect.width, rect.height) * 0.08;

    // Top margin - accommodate title
    this.margin.top = this.config.title?.show ? Math.max(25, Math.min(45, baseMargin * 0.8)) : 20;

    // Bottom margin - accommodate x-axis labels based on rotation
    const xRotation = Math.abs(this.config.xAxis?.rotation || 0);
    const bottomBase = xRotation === 0 ? 45 : xRotation <= 45 ? 60 : 80;
    // Add extra space if x-axis title is shown
    const hasXTitle = this.config.xAxis?.showTitle !== false &&
      (this.config.xAxis?.title || this.fieldNames?.dimension);
    const bottomExtra = hasXTitle ? 20 : 0;
    this.margin.bottom = Math.max(40, Math.min(110, bottomBase + bottomExtra));

    // Left margin - accommodate y-axis labels and title (increased for better readability)
    const leftBase = Math.max(70, Math.min(110, baseMargin * 1.4));
    const leftExtra = this.config.yAxisLeft?.showTitle !== false ? 25 : 0;
    this.margin.left = leftBase + leftExtra;

    // Right margin - accommodate right y-axis if dual mode
    if (this.config.axisMode === 'dual') {
      const rightBase = Math.max(50, Math.min(80, baseMargin * 1.1));
      const rightExtra = this.config.yAxisRight?.showTitle !== false ? 20 : 0;
      this.margin.right = rightBase + rightExtra;
    } else {
      this.margin.right = 20;
    }

    this.width = Math.max(0, rect.width - this.margin.left - this.margin.right);
    this.height = Math.max(0, rect.height - this.margin.top - this.margin.bottom);

    this.svg
      .attr('width', rect.width)
      .attr('height', rect.height)
      .style('width', '100%')
      .style('height', '100%');

    this.chartGroup.attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
  },

  /**
   * Get animation settings
   */
  getAnimation() {
    const anim = this.config.animation || { enabled: true, duration: 500, easing: 'easeCubicOut' };
    // Use full animation duration if it's first render or if animation preview was triggered
    const useFullDuration = this.isFirstRender || this.config.forceAnimationPreview;
    return {
      enabled: anim.enabled !== false,
      duration: useFullDuration ? anim.duration : anim.duration * 0.5,
      easing: Config.getEasing(anim.easing)
    };
  },

  /**
   * Apply font settings to SVG
   */
  applyFontSettings() {
    const font = this.config.font || {};
    const fontFamily = font.family || 'system-ui, sans-serif';
    const labelWeight = font.labelWeight || 400;

    this.svg
      .style('font-family', fontFamily)
      .style('font-weight', labelWeight);
  },

  /**
   * Get font style string
   */
  getFontStyle(fontConfig) {
    return fontConfig && fontConfig.italic ? 'italic' : 'normal';
  },

  /**
   * Get display name for a measure (custom legend label or cleaned field name)
   */
  getDisplayName(type) {
    const legend = this.config.legend || {};
    const fieldName = type === 'bar1' ? this.fieldNames?.bar1
      : type === 'bar2' ? this.fieldNames?.bar2
      : this.fieldNames?.line;
    const customLabel = type === 'bar1' ? legend.bar1Label
      : type === 'bar2' ? legend.bar2Label
      : legend.lineLabel;
    if (customLabel) return customLabel;
    if (!fieldName) return 'Unknown';
    return fieldName.replace(/^(SUM|AVG|MIN|MAX|COUNT|AGG|MEDIAN|STDEV|VAR)\((.+)\)$/i, '$2').trim();
  },

  /**
   * Main render function
   */
  render(data, fieldNames, config) {
    // Store original data only if this is new data (not a resize re-render)
    // ResizeObserver passes this.data, which is already sorted; we detect this by reference
    if (data !== this.data) {
      this.originalData = data;
    }
    this.data = data;
    this.fieldNames = fieldNames;
    this.config = config;

    // If animation preview is triggered, treat as first render for full animation
    if (config.forceAnimationPreview) {
      this.isFirstRender = true;
    }

    this.updateDimensions();
    this.applyFontSettings();
    this.createScales();
    this.renderGrid();
    this.renderAxes();
    this.renderBars();
    this.renderLine();
    this.renderLabels();
    this.renderLegend();
    this.updateTitle();
    this.applySeparators();

    this.isFirstRender = false;
  },

  /**
   * Create scales
   */
  createScales() {
    // Always sort from original data to prevent double-reverse on resize
    const dataSource = this.originalData || this.data;
    let sortedData = [...dataSource];
    const sortOrder = this.config.xAxis?.sort || 'default';

    if (sortOrder === 'asc' || sortOrder === 'desc') {
      // Try to detect if values are dates and sort accordingly
      const parseDate = (str) => {
        if (!str) return null;
        // Try parsing as date string (e.g., "February 2026", "Jan 2025", "2025-01-15")
        const date = new Date(str);
        if (!isNaN(date.getTime())) return date.getTime();
        // Try month-year formats like "February 2026"
        const monthYear = str.match(/^(\w+)\s+(\d{4})$/);
        if (monthYear) {
          const parsed = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
          if (!isNaN(parsed.getTime())) return parsed.getTime();
        }
        return null;
      };

      // Check if first few values look like dates
      const sampleDates = sortedData.slice(0, 3).map(d => parseDate(d.dimension));
      const isDateData = sampleDates.filter(d => d !== null).length >= 2;

      if (isDateData) {
        // Sort by date
        sortedData.sort((a, b) => {
          const dateA = parseDate(a.dimension) || 0;
          const dateB = parseDate(b.dimension) || 0;
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
      } else {
        // Sort alphabetically
        sortedData.sort((a, b) => {
          const cmp = String(a.dimension).localeCompare(String(b.dimension));
          return sortOrder === 'asc' ? cmp : -cmp;
        });
      }
    } else if (sortOrder === 'reverse') {
      // Reverse the original data order
      sortedData.reverse();
    }
    this.data = sortedData;

    // X Scale (band scale for categories)
    this.xScale = d3.scaleBand()
      .domain(this.data.map(d => d.dimension))
      .range([0, this.width])
      .padding(this.config.barPadding);

    // Calculate max values
    let barMax;
    if (this.config.barStyle === 'stacked') {
      barMax = d3.max(this.data, d => d.bar1Value + d.bar2Value);
    } else {
      barMax = d3.max(this.data, d => Math.max(d.bar1Value, d.bar2Value));
    }

    const lineMax = d3.max(this.data, d => d.lineValue);

    // Y Scale Left (for bars)
    const barMin = d3.min(this.data, d => Math.min(d.bar1Value, d.bar2Value));
    const yLeftAutoMin = this.config.yAxisLeft.includeZero !== false ? 0 : barMin * 0.9;
    const yLeftMin = this.config.yAxisLeft.min !== null ? this.config.yAxisLeft.min : yLeftAutoMin;
    const yLeftMax = this.config.yAxisLeft.max !== null ? this.config.yAxisLeft.max : barMax * 1.1;

    this.yScaleLeft = d3.scaleLinear()
      .domain([yLeftMin, yLeftMax])
      .range([this.height, 0])
      .nice();

    // Y Scale Right (for line) - only if dual axis
    if (this.config.axisMode === 'dual') {
      // Check if scales should be synchronized
      if (this.config.syncDualAxis) {
        // Sync dual axis - both axes share the same scale range
        const combinedMax = Math.max(barMax, lineMax) * 1.1;
        const lineMinVal = d3.min(this.data, d => d.lineValue);
        const leftAutoMin = this.config.yAxisLeft.includeZero !== false ? 0 : barMin * 0.9;
        const rightAutoMin = this.config.yAxisRight.includeZero !== false ? 0 : lineMinVal * 0.9;
        const syncMin = Math.min(
          this.config.yAxisLeft.min !== null ? this.config.yAxisLeft.min : leftAutoMin,
          this.config.yAxisRight.min !== null ? this.config.yAxisRight.min : rightAutoMin
        );
        const syncMax = Math.max(
          this.config.yAxisLeft.max !== null ? this.config.yAxisLeft.max : combinedMax,
          this.config.yAxisRight.max !== null ? this.config.yAxisRight.max : combinedMax
        );

        this.yScaleLeft.domain([syncMin, syncMax]).nice();
        this.yScaleRight = d3.scaleLinear()
          .domain([syncMin, syncMax])
          .range([this.height, 0])
          .nice();
      } else {
        // Independent dual axis scales
        const lineMin = d3.min(this.data, d => d.lineValue);
        const yRightAutoMin = this.config.yAxisRight.includeZero !== false ? 0 : lineMin * 0.9;
        const yRightMin = this.config.yAxisRight.min !== null ? this.config.yAxisRight.min : yRightAutoMin;
        const yRightMax = this.config.yAxisRight.max !== null ? this.config.yAxisRight.max : lineMax * 1.1;

        this.yScaleRight = d3.scaleLinear()
          .domain([yRightMin, yRightMax])
          .range([this.height, 0])
          .nice();
      }
      // Apply line vertical position (compress the line's Y range)
      const vertPos = this.config.line?.verticalPosition || 'auto';
      if (vertPos !== 'auto' && vertPos !== 'top') {
        const rangeTopFraction = {
          'upper': 0.15,
          'middle': 0.35,
          'lower': 0.55,
          'bottom': 0.75
        }[vertPos] || 0;
        this.yScaleRight = this.yScaleRight.range([this.height, this.height * rangeTopFraction]);
      }
    } else {
      // Shared axis - use left scale for everything
      const combinedMax = Math.max(barMax, lineMax) * 1.1;
      const sharedMin = this.config.yAxisLeft.includeZero !== false ? 0 : Math.min(barMin, d3.min(this.data, d => d.lineValue)) * 0.9;
      this.yScaleLeft.domain([this.config.yAxisLeft.min !== null ? this.config.yAxisLeft.min : sharedMin, this.config.yAxisLeft.max || combinedMax]).nice();
      this.yScaleRight = this.yScaleLeft;
    }
  },

  /**
   * Render grid lines
   */
  renderGrid() {
    const gridGroup = this.chartGroup.select('.grid-group');
    gridGroup.selectAll('*').remove();

    if (this.config.grid.horizontal) {
      gridGroup.append('g')
        .attr('class', 'grid grid-horizontal')
        .call(d3.axisLeft(this.yScaleLeft)
          .tickSize(-this.width)
          .tickFormat('')
        )
        .selectAll('line')
        .attr('stroke', this.config.grid.color)
        .attr('stroke-opacity', this.config.grid.opacity);
    }

    if (this.config.grid.vertical) {
      gridGroup.append('g')
        .attr('class', 'grid grid-vertical')
        .attr('transform', `translate(0, ${this.height})`)
        .call(d3.axisBottom(this.xScale)
          .tickSize(-this.height)
          .tickFormat('')
        )
        .selectAll('line')
        .attr('stroke', this.config.grid.color)
        .attr('stroke-opacity', this.config.grid.opacity);
    }
  },

  /**
   * Render axes
   */
  renderAxes() {
    // Y-axis formatters: use detected Tableau format when 'auto', otherwise use user selection
    const leftFormat = this.config.yAxisLeft.format || 'auto';
    const formatLeft = leftFormat !== 'auto'
      ? Config.getFormatter(leftFormat, this.config.yAxisLeft.decimals, this.config.yAxisLeft.currencySymbol)
      : (this.detectedFormats?.bar1 ? Config.getAutoFormatter(this.detectedFormats.bar1) : Config.getFormatter('auto'));
    const rightFormat = this.config.yAxisRight.format || 'auto';
    const formatRight = rightFormat !== 'auto'
      ? Config.getFormatter(rightFormat, this.config.yAxisRight.decimals, this.config.yAxisRight.currencySymbol)
      : (this.detectedFormats?.line ? Config.getAutoFormatter(this.detectedFormats.line) : Config.getFormatter('auto'));

    const self = this;

    // X Axis - clear and rebuild to ensure sort order is applied
    const xAxisGroup = this.chartGroup.select('.x-axis');
    xAxisGroup.selectAll('*').remove();  // Clear existing axis elements
    xAxisGroup
      .attr('transform', `translate(0, ${this.height})`)
      .on('contextmenu', function(event) {
        event.preventDefault();
        if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'xAxis', this);
      });

    if (this.config.xAxis.show) {
      const xAxisFont = this.config.xAxisFont || {};
      const xAxisConfig = this.config.xAxis;
      const xAxis = d3.axisBottom(this.xScale)
        .tickSize(xAxisConfig.showTickMarks !== false ? 6 : 0);

      xAxisGroup.call(xAxis);

      // Style axis line
      xAxisGroup.select('.domain')
        .style('display', xAxisConfig.showAxisLine !== false ? null : 'none')
        .attr('stroke', xAxisConfig.lineColor || '#999999');

      // Style tick marks
      xAxisGroup.selectAll('.tick line')
        .style('display', xAxisConfig.showTickMarks !== false ? null : 'none')
        .attr('stroke', xAxisConfig.tickColor || '#999999');

      // Style labels
      const rotation = this.config.xAxis.rotation || 0;
      const alignment = this.config.xAxis.align || 'center';
      const maxWidth = this.config.xAxis.maxWidth;

      // Determine text-anchor based on rotation and alignment
      const xLabelOffsetX = xAxisConfig.labelOffsetX || 0;
      const xLabelOffsetY = xAxisConfig.labelOffsetY || 0;
      let textAnchor = 'middle';
      let dx = '0';
      let dy = '0.85em';

      if (rotation !== 0) {
        textAnchor = 'end';
        dx = '-0.8em';
        dy = '0.15em';
      } else {
        // Apply alignment for horizontal labels
        switch (alignment) {
          case 'start': textAnchor = 'end'; break;    // Left = text extends left from center
          case 'end': textAnchor = 'start'; break;    // Right = text extends right from center
          default: textAnchor = 'middle';
        }
      }

      // Apply X-axis label formatting if not 'auto'
      const xFormat = xAxisConfig.format || 'auto';
      if (xFormat !== 'auto') {
        const isDate = this.dimensionType === 'date' || this.dimensionType === 'date-time';
        const isCustomDate = xFormat.startsWith('custom:');
        const dateFormatter = (isDate || isCustomDate) ? Config.getDateFormatter(xFormat) : null;
        const numFormatter = !isDate ? Config.getFormatter(xFormat, xAxisConfig.decimals, xAxisConfig.currencySymbol) : null;
        // Build lookup from display text → raw value
        const rawLookup = {};
        this.data.forEach(d => { rawLookup[d.dimension] = d.dimensionRaw; });
        xAxisGroup.selectAll('.tick text').each(function() {
          const el = d3.select(this);
          const label = el.text();
          const raw = rawLookup[label];
          if (raw !== null && raw !== undefined) {
            if (dateFormatter) {
              // Parse date from raw value and format
              const date = new Date(raw);
              if (!isNaN(date.getTime())) {
                el.text(dateFormatter(date));
              }
            } else if (numFormatter && !isNaN(Number(raw))) {
              el.text(numFormatter(Number(raw)));
            }
          }
        });
      }

      xAxisGroup.selectAll('.tick text')
        .style('display', xAxisConfig.showLabels !== false ? null : 'none')
        .style('font-size', `${xAxisFont.size || this.config.xAxis.fontSize || 12}px`)
        .style('font-family', xAxisFont.family || null)
        .style('font-weight', xAxisFont.weight || 400)
        .style('fill', xAxisFont.color || '#666666')
        .style('font-style', this.getFontStyle(xAxisFont))
        .attr('transform', `rotate(${rotation}) translate(${xLabelOffsetX}, ${xLabelOffsetY})`)
        .attr('dx', dx)
        .attr('dy', dy)
        .style('text-anchor', textAnchor)
        .each(function() {
          // Apply max width truncation if configured
          if (maxWidth && maxWidth !== 'none') {
            const maxWidthPx = parseInt(maxWidth);
            const self = d3.select(this);
            const originalText = self.text();
            let truncatedText = originalText;

            // Create temp element to measure width
            const tempText = self.clone(true).style('visibility', 'hidden');
            self.node().parentNode.appendChild(tempText.node());

            // Truncate until it fits
            while (tempText.node().getComputedTextLength() > maxWidthPx && truncatedText.length > 1) {
              truncatedText = truncatedText.slice(0, -1);
              tempText.text(truncatedText + '...');
            }

            tempText.remove();

            if (truncatedText !== originalText) {
              self.text(truncatedText + '...');
              self.append('title').text(originalText); // Add tooltip with full text
            }
          }
        });

      // X Axis title - adjust position based on label rotation
      xAxisGroup.selectAll('.axis-title').remove();
      if (xAxisConfig.showTitle !== false) {
        // Fall back to dimension field name if no custom title (matches Y-axis behavior)
        const xTitle = this.config.xAxis.title || this.fieldNames?.dimension || '';
        if (xTitle) {
          // Calculate title Y offset based on rotation angle and label offset
          const rotation = Math.abs(this.config.xAxis.rotation || 0);
          const labelYOff = Math.abs(this.config.xAxis.labelOffsetY || 0);
          const titleYOffset = (rotation === 0 ? 45 : rotation <= 45 ? 60 : 75) + labelYOff;

          xAxisGroup.append('text')
            .attr('class', 'axis-title')
            .attr('x', this.width / 2)
            .attr('y', titleYOffset)
            .attr('text-anchor', 'middle')
            .style('font-family', xAxisFont.family || null)
            .style('font-weight', xAxisFont.weight || 400)
            .style('fill', xAxisFont.color || '#666666')
            .style('font-style', this.getFontStyle(xAxisFont))
            .text(xTitle);
        }
      }
    } else {
      xAxisGroup.selectAll('*').remove();
    }

    // Y Axis Left
    const yAxisLeftGroup = this.chartGroup.select('.y-axis-left')
      .on('contextmenu', function(event) {
        event.preventDefault();
        if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'yAxisLeft', this);
      });

    if (this.config.yAxisLeft.show) {
      const yAxisFont = this.config.yAxisFont || {};
      const yAxisLeftConfig = this.config.yAxisLeft;
      const yAxisLeft = d3.axisLeft(this.yScaleLeft)
        .tickFormat(formatLeft)
        .tickSize(yAxisLeftConfig.showTickMarks !== false ? 6 : 0);

      yAxisLeftGroup.call(yAxisLeft);

      // Style axis line
      yAxisLeftGroup.select('.domain')
        .style('display', yAxisLeftConfig.showAxisLine !== false ? null : 'none')
        .attr('stroke', yAxisLeftConfig.lineColor || '#999999');

      // Style tick marks
      yAxisLeftGroup.selectAll('.tick line')
        .style('display', yAxisLeftConfig.showTickMarks !== false ? null : 'none')
        .attr('stroke', yAxisLeftConfig.tickColor || '#999999');

      // Style labels
      const yLeftOffsetX = yAxisLeftConfig.labelOffsetX || 0;
      const yLeftOffsetY = yAxisLeftConfig.labelOffsetY || 0;
      yAxisLeftGroup.selectAll('.tick text')
        .style('display', yAxisLeftConfig.showLabels !== false ? null : 'none')
        .style('font-size', `${yAxisFont.size || 12}px`)
        .style('font-family', yAxisFont.family || null)
        .style('font-weight', yAxisFont.weight || 400)
        .style('fill', yAxisFont.color || '#666666')
        .style('font-style', this.getFontStyle(yAxisFont))
        .each(function() {
          if (yLeftOffsetX || yLeftOffsetY) {
            const el = d3.select(this);
            const existingTransform = el.attr('transform') || '';
            el.attr('transform', `${existingTransform} translate(${yLeftOffsetX}, ${yLeftOffsetY})`);
          }
        });

      // Y Axis Left title - position based on left margin to avoid overlap
      yAxisLeftGroup.selectAll('.axis-title').remove();
      if (yAxisLeftConfig.showTitle !== false) {
        const leftTitle = this.config.yAxisLeft.title ||
          `${this.getDisplayName('bar1')} / ${this.getDisplayName('bar2')}`;
        // Position title at a safe distance from tick labels (increased offset)
        const titleXOffset = -Math.max(this.margin.left - 10, 60);

        yAxisLeftGroup.append('text')
          .attr('class', 'axis-title')
          .attr('transform', 'rotate(-90)')
          .attr('x', -this.height / 2)
          .attr('y', titleXOffset)
          .attr('text-anchor', 'middle')
          .style('font-family', yAxisFont.family || null)
          .style('font-weight', yAxisFont.weight || 400)
          .style('fill', yAxisFont.color || '#666666')
          .style('font-style', this.getFontStyle(yAxisFont))
          .text(leftTitle);
      }
    } else {
      yAxisLeftGroup.selectAll('*').remove();
    }

    // Y Axis Right (only for dual axis mode)
    const yAxisRightGroup = this.chartGroup.select('.y-axis-right')
      .attr('transform', `translate(${this.width}, 0)`)
      .on('contextmenu', function(event) {
        event.preventDefault();
        if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'yAxisRight', this);
      });

    if (this.config.axisMode === 'dual' && this.config.yAxisRight.show) {
      const yAxisFont = this.config.yAxisFont || {};
      const yAxisRightConfig = this.config.yAxisRight;
      const yAxisRight = d3.axisRight(this.yScaleRight)
        .tickFormat(formatRight)
        .tickSize(yAxisRightConfig.showTickMarks !== false ? 6 : 0);

      yAxisRightGroup.call(yAxisRight);

      // Style axis line
      yAxisRightGroup.select('.domain')
        .style('display', yAxisRightConfig.showAxisLine !== false ? null : 'none')
        .attr('stroke', yAxisRightConfig.lineColor || '#999999');

      // Style tick marks
      yAxisRightGroup.selectAll('.tick line')
        .style('display', yAxisRightConfig.showTickMarks !== false ? null : 'none')
        .attr('stroke', yAxisRightConfig.tickColor || '#999999');

      // Style labels
      const yRightOffsetX = yAxisRightConfig.labelOffsetX || 0;
      const yRightOffsetY = yAxisRightConfig.labelOffsetY || 0;
      yAxisRightGroup.selectAll('.tick text')
        .style('display', yAxisRightConfig.showLabels !== false ? null : 'none')
        .style('font-size', `${yAxisFont.size || 12}px`)
        .style('font-family', yAxisFont.family || null)
        .style('font-weight', yAxisFont.weight || 400)
        .style('fill', yAxisFont.color || '#666666')
        .style('font-style', this.getFontStyle(yAxisFont))
        .each(function() {
          if (yRightOffsetX || yRightOffsetY) {
            const el = d3.select(this);
            const existingTransform = el.attr('transform') || '';
            el.attr('transform', `${existingTransform} translate(${yRightOffsetX}, ${yRightOffsetY})`);
          }
        });

      // Y Axis Right title - position based on right margin to avoid overlap
      yAxisRightGroup.selectAll('.axis-title').remove();
      if (yAxisRightConfig.showTitle !== false) {
        const rightTitle = this.config.yAxisRight.title || this.getDisplayName('line');
        // Position title at a safe distance from tick labels
        const titleXOffset = -Math.max(this.margin.right - 15, 45);

        yAxisRightGroup.append('text')
          .attr('class', 'axis-title')
          .attr('transform', 'rotate(90)')
          .attr('x', this.height / 2)
          .attr('y', titleXOffset)
          .attr('text-anchor', 'middle')
          .style('font-family', yAxisFont.family || null)
          .style('font-weight', yAxisFont.weight || 400)
          .style('fill', yAxisFont.color || '#666666')
          .style('font-style', this.getFontStyle(yAxisFont))
          .text(rightTitle);
      }
    } else {
      yAxisRightGroup.selectAll('*').remove();
    }
  },

  /**
   * Render bars with animations
   */
  renderBars() {
    const barsGroup = this.chartGroup.select('.bars-group');
    barsGroup.selectAll('*').remove();

    const self = this;
    const bandWidth = this.xScale.bandwidth();
    const anim = this.getAnimation();

    // Calculate bar dimensions from config
    const barGap = this.config.barGap !== undefined ? this.config.barGap : 4;
    const barWidthPercent = this.config.barWidth !== undefined ? this.config.barWidth : 100;

    if (this.config.barStyle === 'grouped') {
      // Grouped bars - side by side
      const autoBarWidth = (bandWidth - barGap) / 2;
      const barWidth = autoBarWidth * (barWidthPercent / 100);
      // Center the bar group within the band
      const groupWidth = Math.min(barWidth * 2 + barGap, bandWidth);
      const groupOffset = (bandWidth - groupWidth) / 2;

      // Bar 1
      const bar1ShowBorder = this.config.bar1.showBorder !== false;
      const bars1 = barsGroup.selectAll('.bar-1')
        .data(this.data)
        .enter()
        .append('rect')
        .attr('class', 'bar bar-1')
        .attr('x', d => this.xScale(d.dimension) + groupOffset)
        .attr('rx', this.config.bar1.cornerRadius)
        .attr('fill', this.config.bar1.color)
        .attr('fill-opacity', this.config.bar1.opacity)
        .attr('stroke', bar1ShowBorder ? this.config.bar1.borderColor : 'none')
        .attr('stroke-width', bar1ShowBorder ? this.config.bar1.borderWidth : 0)
        .on('mouseover', function(event, d) { self.showTooltip(event, d, 'bar1'); })
        .on('mousemove', function(event) { self.moveTooltip(event); })
        .on('mouseout', function() { self.hideTooltip(); })
        .on('contextmenu', function(event) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'bar1', this);
        });

      if (anim.enabled) {
        bars1
          .attr('y', this.height)
          .attr('height', 0)
          .attr('width', barWidth)
          .transition()
          .duration(anim.duration)
          .ease(anim.easing)
          .delay((d, i) => i * 20)
          .attr('y', d => this.yScaleLeft(d.bar1Value))
          .attr('height', d => this.height - this.yScaleLeft(d.bar1Value));
      } else {
        bars1
          .attr('y', d => this.yScaleLeft(d.bar1Value))
          .attr('width', barWidth)
          .attr('height', d => this.height - this.yScaleLeft(d.bar1Value));
      }

      // Bar 2
      const bar2ShowBorder = this.config.bar2.showBorder !== false;
      const bars2 = barsGroup.selectAll('.bar-2')
        .data(this.data)
        .enter()
        .append('rect')
        .attr('class', 'bar bar-2')
        .attr('x', d => this.xScale(d.dimension) + groupOffset + barWidth + barGap)
        .attr('rx', this.config.bar2.cornerRadius)
        .attr('fill', this.config.bar2.color)
        .attr('fill-opacity', this.config.bar2.opacity)
        .attr('stroke', bar2ShowBorder ? this.config.bar2.borderColor : 'none')
        .attr('stroke-width', bar2ShowBorder ? this.config.bar2.borderWidth : 0)
        .on('mouseover', function(event, d) { self.showTooltip(event, d, 'bar2'); })
        .on('mousemove', function(event) { self.moveTooltip(event); })
        .on('mouseout', function() { self.hideTooltip(); })
        .on('contextmenu', function(event) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'bar2', this);
        });

      if (anim.enabled) {
        bars2
          .attr('y', this.height)
          .attr('height', 0)
          .attr('width', barWidth)
          .transition()
          .duration(anim.duration)
          .ease(anim.easing)
          .delay((d, i) => i * 20 + 50)
          .attr('y', d => this.yScaleLeft(d.bar2Value))
          .attr('height', d => this.height - this.yScaleLeft(d.bar2Value));
      } else {
        bars2
          .attr('y', d => this.yScaleLeft(d.bar2Value))
          .attr('width', barWidth)
          .attr('height', d => this.height - this.yScaleLeft(d.bar2Value));
      }

    } else {
      // Stacked bars
      const autoStackWidth = bandWidth - 4;
      const barWidth = autoStackWidth * (barWidthPercent / 100);
      const stackOffset = (bandWidth - barWidth) / 2;
      const bar1ShowBorder = this.config.bar1.showBorder !== false;
      const bar2ShowBorder = this.config.bar2.showBorder !== false;

      // Bar 1 (bottom)
      const stackedBars1 = barsGroup.selectAll('.bar-1')
        .data(this.data)
        .enter()
        .append('rect')
        .attr('class', 'bar bar-1')
        .attr('x', d => this.xScale(d.dimension) + stackOffset)
        .attr('fill', this.config.bar1.color)
        .attr('fill-opacity', this.config.bar1.opacity)
        .attr('stroke', bar1ShowBorder ? this.config.bar1.borderColor : 'none')
        .attr('stroke-width', bar1ShowBorder ? this.config.bar1.borderWidth : 0)
        .on('mouseover', function(event, d) { self.showTooltip(event, d, 'bar1'); })
        .on('mousemove', function(event) { self.moveTooltip(event); })
        .on('mouseout', function() { self.hideTooltip(); })
        .on('contextmenu', function(event) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'bar1', this);
        });

      if (anim.enabled) {
        stackedBars1
          .attr('y', this.height)
          .attr('height', 0)
          .attr('width', barWidth)
          .transition()
          .duration(anim.duration)
          .ease(anim.easing)
          .delay((d, i) => i * 20)
          .attr('y', d => this.yScaleLeft(d.bar1Value))
          .attr('height', d => this.height - this.yScaleLeft(d.bar1Value));
      } else {
        stackedBars1
          .attr('y', d => this.yScaleLeft(d.bar1Value))
          .attr('width', barWidth)
          .attr('height', d => this.height - this.yScaleLeft(d.bar1Value));
      }

      // Bar 2 (top, stacked)
      const stackedBars2 = barsGroup.selectAll('.bar-2')
        .data(this.data)
        .enter()
        .append('rect')
        .attr('class', 'bar bar-2')
        .attr('x', d => this.xScale(d.dimension) + stackOffset)
        .attr('rx', this.config.bar2.cornerRadius)
        .attr('fill', this.config.bar2.color)
        .attr('fill-opacity', this.config.bar2.opacity)
        .attr('stroke', bar2ShowBorder ? this.config.bar2.borderColor : 'none')
        .attr('stroke-width', bar2ShowBorder ? this.config.bar2.borderWidth : 0)
        .on('mouseover', function(event, d) { self.showTooltip(event, d, 'bar2'); })
        .on('mousemove', function(event) { self.moveTooltip(event); })
        .on('mouseout', function() { self.hideTooltip(); })
        .on('contextmenu', function(event) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'bar2', this);
        });

      if (anim.enabled) {
        stackedBars2
          .attr('y', d => this.yScaleLeft(d.bar1Value))
          .attr('height', 0)
          .attr('width', barWidth)
          .transition()
          .duration(anim.duration)
          .ease(anim.easing)
          .delay((d, i) => i * 20 + anim.duration * 0.3)
          .attr('y', d => this.yScaleLeft(d.bar1Value + d.bar2Value))
          .attr('height', d => this.yScaleLeft(d.bar1Value) - this.yScaleLeft(d.bar1Value + d.bar2Value));
      } else {
        stackedBars2
          .attr('y', d => this.yScaleLeft(d.bar1Value + d.bar2Value))
          .attr('width', barWidth)
          .attr('height', d => this.yScaleLeft(d.bar1Value) - this.yScaleLeft(d.bar1Value + d.bar2Value));
      }
    }
  },

  /**
   * Render line with animations
   */
  renderLine() {
    const lineGroup = this.chartGroup.select('.line-group');
    lineGroup.selectAll('*').remove();

    const self = this;
    const yScale = this.config.axisMode === 'dual' ? this.yScaleRight : this.yScaleLeft;
    const anim = this.getAnimation();

    // Get curve function
    let curveFunc;
    switch (this.config.line.curve) {
      case 'monotone': curveFunc = d3.curveMonotoneX; break;
      case 'cardinal': curveFunc = d3.curveCardinal; break;
      case 'step': curveFunc = d3.curveStepAfter; break;
      default: curveFunc = d3.curveLinear;
    }

    // Create line generator
    const lineGenerator = d3.line()
      .x(d => this.xScale(d.dimension) + this.xScale.bandwidth() / 2)
      .y(d => yScale(d.lineValue))
      .curve(curveFunc);

    // Get stroke dash array
    let strokeDasharray = 'none';
    if (this.config.line.style === 'dashed') strokeDasharray = '8,4';
    if (this.config.line.style === 'dotted') strokeDasharray = '2,2';

    // Draw line with animation
    const linePath = lineGroup.append('path')
      .datum(this.data)
      .attr('class', 'line-path')
      .attr('d', lineGenerator)
      .attr('stroke', this.config.line.color)
      .attr('stroke-width', this.config.line.width)
      .attr('stroke-opacity', this.config.line.opacity)
      .attr('stroke-dasharray', strokeDasharray)
      .style('cursor', 'pointer')
      .on('contextmenu', function(event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'line', this);
      });

    // Animate line drawing
    if (anim.enabled) {
      const totalLength = linePath.node().getTotalLength();
      linePath
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(anim.duration * 1.2)
        .ease(anim.easing)
        .attr('stroke-dashoffset', 0)
        .on('end', function() {
          // Restore original dash array after animation
          if (self.config.line.style === 'dashed') {
            d3.select(this).attr('stroke-dasharray', '8,4');
          } else if (self.config.line.style === 'dotted') {
            d3.select(this).attr('stroke-dasharray', '2,2');
          } else {
            d3.select(this).attr('stroke-dasharray', 'none');
          }
        });
    }

    // Draw points
    if (this.config.points.show) {
      const points = lineGroup.selectAll('.data-point')
        .data(this.data)
        .enter()
        .append('g')
        .attr('class', 'data-point')
        .attr('transform', d => `translate(${this.xScale(d.dimension) + this.xScale.bandwidth() / 2}, ${yScale(d.lineValue)})`);

      // Draw shape based on config
      points.each(function(d) {
        const point = d3.select(this);
        const size = self.config.points.size;

        switch (self.config.points.shape) {
          case 'square':
            point.append('rect')
              .attr('x', -size/2)
              .attr('y', -size/2)
              .attr('width', size)
              .attr('height', size);
            break;
          case 'diamond':
            point.append('rect')
              .attr('x', -size/2)
              .attr('y', -size/2)
              .attr('width', size)
              .attr('height', size)
              .attr('transform', 'rotate(45)');
            break;
          case 'triangle':
            point.append('polygon')
              .attr('points', `0,${-size} ${size},${size} ${-size},${size}`);
            break;
          default: // circle
            point.append('circle')
              .attr('r', size);
        }
      });

      const pointElements = points.selectAll('circle, rect, polygon')
        .attr('fill', this.config.points.fill)
        .attr('stroke', this.config.points.stroke)
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) { self.showTooltip(event, d, 'line'); })
        .on('mousemove', function(event) { self.moveTooltip(event); })
        .on('mouseout', function() { self.hideTooltip(); });

      // Animate points appearing
      if (anim.enabled) {
        points
          .style('opacity', 0)
          .transition()
          .duration(anim.duration * 0.5)
          .delay((d, i) => anim.duration * 0.8 + i * 30)
          .ease(anim.easing)
          .style('opacity', 1);
      }
    }
  },

  /**
   * Render value labels
   */
  renderLabels() {
    const labelsGroup = this.chartGroup.select('.labels-group');
    labelsGroup.selectAll('*').remove();

    const bandWidth = this.xScale.bandwidth();
    const yScaleLine = this.config.axisMode === 'dual' ? this.yScaleRight : this.yScaleLeft;

    // Bar labels
    if (this.config.barLabels.show) {
      const barGap = this.config.barGap !== undefined ? this.config.barGap : 4;
      const configBarWidth = this.config.barWidth || 0;
      let barWidth, bar1LabelX, bar2LabelX;
      if (this.config.barStyle === 'grouped') {
        const autoW = (bandWidth - barGap) / 2;
        barWidth = configBarWidth > 0 ? Math.min(configBarWidth, autoW) : autoW;
        const groupWidth = barWidth * 2 + barGap;
        const groupOffset = (bandWidth - groupWidth) / 2;
        bar1LabelX = (d) => this.xScale(d.dimension) + groupOffset + barWidth / 2;
        bar2LabelX = (d) => this.xScale(d.dimension) + groupOffset + barWidth + barGap + barWidth / 2;
      } else {
        const autoW = bandWidth - 4;
        barWidth = configBarWidth > 0 ? Math.min(configBarWidth, autoW) : autoW;
        bar1LabelX = (d) => this.xScale(d.dimension) + bandWidth / 2;
        bar2LabelX = (d) => this.xScale(d.dimension) + bandWidth / 2;
      }
      const barLabelConfig = this.config.barLabels || {};

      // Bar 1 font settings with fallbacks
      const bar1LabelFont = this.config.bar1LabelFont || this.config.barLabelFont || {};
      const bar1FontSize = bar1LabelFont.size || barLabelConfig.fontSize || 12;
      const bar1FontFamily = bar1LabelFont.family || null;
      const bar1FontWeight = bar1LabelFont.weight || 400;
      const bar1FontColor = bar1LabelFont.color || barLabelConfig.color || '#333333';
      const bar1FontStyle = bar1LabelFont.italic ? 'italic' : 'normal';
      const bar1OffsetX = bar1LabelFont.offsetX || barLabelConfig.offsetX || 0;
      const bar1OffsetY = bar1LabelFont.offsetY || barLabelConfig.offsetY || 0;

      // Bar 2 font settings with fallbacks
      const bar2LabelFont = this.config.bar2LabelFont || this.config.barLabelFont || {};
      const bar2FontSize = bar2LabelFont.size || barLabelConfig.fontSize || 12;
      const bar2FontFamily = bar2LabelFont.family || null;
      const bar2FontWeight = bar2LabelFont.weight || 400;
      const bar2FontColor = bar2LabelFont.color || barLabelConfig.color || '#333333';
      const bar2FontStyle = bar2LabelFont.italic ? 'italic' : 'normal';
      const bar2OffsetX = bar2LabelFont.offsetX || barLabelConfig.offsetX || 0;
      const bar2OffsetY = bar2LabelFont.offsetY || barLabelConfig.offsetY || 0;

      // Bar label formatter
      const barFormat = barLabelConfig.format || 'auto';
      const barFormatter = barFormat !== 'auto' ? Config.getFormatter(barFormat, barLabelConfig.decimals, barLabelConfig.currencySymbol) : null;

      // Bar 1 labels
      labelsGroup.selectAll('.bar-label-1')
        .data(this.data)
        .enter()
        .append('text')
        .attr('class', 'bar-label bar-label-1')
        .attr('x', d => bar1LabelX(d) + bar1OffsetX)
        .attr('y', d => {
          const y = this.yScaleLeft(d.bar1Value);
          let baseY;
          if (barLabelConfig.position === 'top') baseY = y - 5;
          else if (barLabelConfig.position === 'inside') baseY = y + 15;
          else baseY = y + (this.height - y) / 2;
          return baseY + bar1OffsetY;
        })
        .attr('text-anchor', 'middle')
        .style('font-size', `${bar1FontSize}px`)
        .style('font-family', bar1FontFamily)
        .style('font-weight', bar1FontWeight)
        .style('fill', bar1FontColor)
        .style('font-style', bar1FontStyle)
        .text(d => barFormatter ? barFormatter(d.bar1Value) : d.bar1Formatted);

      // Bar 2 labels
      labelsGroup.selectAll('.bar-label-2')
        .data(this.data)
        .enter()
        .append('text')
        .attr('class', 'bar-label bar-label-2')
        .attr('x', d => bar2LabelX(d) + bar2OffsetX)
        .attr('y', d => {
          const y = this.config.barStyle === 'grouped'
            ? this.yScaleLeft(d.bar2Value)
            : this.yScaleLeft(d.bar1Value + d.bar2Value);
          let baseY;
          if (barLabelConfig.position === 'top') baseY = y - 5;
          else if (barLabelConfig.position === 'inside') baseY = y + 15;
          else baseY = y + (this.height - y) / 2;
          return baseY + bar2OffsetY;
        })
        .attr('text-anchor', 'middle')
        .style('font-size', `${bar2FontSize}px`)
        .style('font-family', bar2FontFamily)
        .style('font-weight', bar2FontWeight)
        .style('fill', bar2FontColor)
        .style('font-style', bar2FontStyle)
        .text(d => barFormatter ? barFormatter(d.bar2Value) : d.bar2Formatted);
    }

    // Line labels
    if (this.config.lineLabels.show) {
      const lineLabelConfig = this.config.lineLabels || {};
      const lineLabelFont = this.config.lineLabelFont || {};
      const lineOffsetX = lineLabelConfig.offsetX || 0;
      const lineOffsetY = lineLabelConfig.offsetY || 0;
      const position = lineLabelConfig.position || 'top';

      // Resolved font values with fallbacks
      const lineFontSize = lineLabelFont.size || lineLabelConfig.fontSize || 10;
      const lineFontFamily = lineLabelFont.family || null;
      const lineFontWeight = lineLabelFont.weight || 400;
      const lineFontColor = lineLabelFont.color || lineLabelConfig.color || '#333333';
      const lineFontStyle = lineLabelFont.italic ? 'italic' : 'normal';

      // Line label formatter
      const lineFormat = lineLabelConfig.format || 'auto';
      const lineFormatter = lineFormat !== 'auto' ? Config.getFormatter(lineFormat, lineLabelConfig.decimals, lineLabelConfig.currencySymbol) : null;

      labelsGroup.selectAll('.line-label')
        .data(this.data)
        .enter()
        .append('text')
        .attr('class', 'line-label')
        .attr('x', d => {
          const xCenter = this.xScale(d.dimension) + bandWidth / 2;
          let x;
          switch (position) {
            case 'left': x = xCenter - 10; break;
            case 'right': x = xCenter + 10; break;
            default: x = xCenter;
          }
          return x + lineOffsetX;
        })
        .attr('y', d => {
          const yCenter = yScaleLine(d.lineValue);
          let y;
          switch (position) {
            case 'top': y = yCenter - 10; break;
            case 'bottom': y = yCenter + 18; break;
            case 'center': y = yCenter + 4; break;
            default: y = yCenter + 4;
          }
          return y + lineOffsetY;
        })
        .attr('text-anchor', d => {
          switch (position) {
            case 'left': return 'end';
            case 'right': return 'start';
            default: return 'middle';
          }
        })
        .style('font-size', `${lineFontSize}px`)
        .style('font-family', lineFontFamily)
        .style('font-weight', lineFontWeight)
        .style('fill', lineFontColor)
        .style('font-style', lineFontStyle)
        .text(d => lineFormatter ? lineFormatter(d.lineValue) : d.lineFormatted);
    }
  },

  /**
   * Render legend
   */
  renderLegend() {
    const legendContainer = d3.select('#legend');
    legendContainer.html('');

    if (!this.config.legend.show) {
      legendContainer.style('display', 'none');
      return;
    }

    legendContainer.style('display', 'flex');

    // Apply legend styling
    const legendConfig = this.config.legend || {};
    const bgColor = legendConfig.bgColor || 'transparent';
    const legendPadding = legendConfig.padding !== undefined ? legendConfig.padding : 14;
    const legendGap = legendConfig.gap !== undefined ? legendConfig.gap : 24;
    const legendAlign = legendConfig.align || 'center';

    // Map alignment to CSS flex values
    const alignMap = { 'left': 'flex-start', 'center': 'center', 'right': 'flex-end' };
    const flexAlign = alignMap[legendAlign] || 'center';

    legendContainer
      .style('background-color', bgColor)
      .style('padding', `${legendPadding}px`)
      .style('gap', `${legendGap}px`)
      .style('border-radius', bgColor !== 'transparent' ? '4px' : null);

    // Apply legend position styling
    const position = this.config.legend.position || 'bottom';
    const chartContainer = document.querySelector('.chart-container');

    // Reset legend position classes
    legendContainer.classed('legend-right', false).classed('legend-left', false)
      .classed('legend-top', false).classed('legend-bottom', false);

    // Reset container layout classes
    if (chartContainer) {
      chartContainer.style.flexDirection = '';
      chartContainer.classList.remove('legend-layout-right', 'legend-layout-left');
    }

    if (position === 'right') {
      legendContainer.classed('legend-right', true);
      if (chartContainer) chartContainer.classList.add('legend-layout-right');
    } else if (position === 'left') {
      legendContainer.classed('legend-left', true);
      if (chartContainer) chartContainer.classList.add('legend-layout-left');
    } else if (position === 'top') {
      legendContainer.classed('legend-top', true);
    } else {
      // Bottom (default)
      legendContainer.classed('legend-bottom', true);
    }

    // Apply legend alignment
    if (position === 'left' || position === 'right') {
      // Column layout: align-items controls horizontal alignment
      legendContainer.style('align-items', flexAlign);
      legendContainer.style('justify-content', null);
    } else {
      // Row layout: justify-content controls horizontal alignment
      legendContainer.style('justify-content', flexAlign);
      legendContainer.style('align-items', 'center');
    }

    // Trigger re-render if legend position changed (to recalculate SVG dimensions)
    const prevPosition = this._lastLegendPosition;
    this._lastLegendPosition = position;
    if (prevPosition && prevPosition !== position) {
      setTimeout(() => {
        if (this._lastLegendPosition === position) {
          this.render();
        }
      }, 50);
    }

    // Get display labels (custom legend labels or cleaned field names)
    const bar1Label = this.getDisplayName('bar1');
    const bar2Label = this.getDisplayName('bar2');
    const lineLabel = this.getDisplayName('line');

    // Apply legend font settings
    const legendFont = this.config.legendFont || {};
    const legendFontStyle = {
      fontFamily: legendFont.family || 'inherit',
      fontSize: (legendFont.size || 12) + 'px',
      fontWeight: legendFont.weight || 400,
      color: legendFont.color || '#333333',
      fontStyle: legendFont.italic ? 'italic' : 'normal'
    };

    // Bar 1 legend
    const bar1Item = legendContainer.append('div').attr('class', 'legend-item');
    bar1Item.append('div')
      .attr('class', 'legend-color')
      .style('background-color', this.config.bar1.color);
    bar1Item.append('span')
      .style('font-family', legendFontStyle.fontFamily)
      .style('font-size', legendFontStyle.fontSize)
      .style('font-weight', legendFontStyle.fontWeight)
      .style('color', legendFontStyle.color)
      .style('font-style', legendFontStyle.fontStyle)
      .text(bar1Label);

    // Bar 2 legend
    const bar2Item = legendContainer.append('div').attr('class', 'legend-item');
    bar2Item.append('div')
      .attr('class', 'legend-color')
      .style('background-color', this.config.bar2.color);
    bar2Item.append('span')
      .style('font-family', legendFontStyle.fontFamily)
      .style('font-size', legendFontStyle.fontSize)
      .style('font-weight', legendFontStyle.fontWeight)
      .style('color', legendFontStyle.color)
      .style('font-style', legendFontStyle.fontStyle)
      .text(bar2Label);

    // Line legend
    const lineItem = legendContainer.append('div').attr('class', 'legend-item');
    lineItem.append('div')
      .attr('class', 'legend-line')
      .style('background-color', this.config.line.color);
    lineItem.append('span')
      .style('font-family', legendFontStyle.fontFamily)
      .style('font-size', legendFontStyle.fontSize)
      .style('font-weight', legendFontStyle.fontWeight)
      .style('color', legendFontStyle.color)
      .style('font-style', legendFontStyle.fontStyle)
      .text(lineLabel);

    // Add right-click context menu
    legendContainer.on('contextmenu', function(event) {
      event.preventDefault();
      if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'legend', this);
    });
  },

  /**
   * Update chart title
   */
  updateTitle() {
    const titleElement = document.getElementById('chart-title');
    if (this.config.title.show && titleElement) {
      titleElement.textContent = this.config.title.text || 'Combo Chart';
      titleElement.style.display = 'block';
      titleElement.style.cursor = 'pointer';

      // Apply individual title font settings
      const titleFont = this.config.titleFont || {};
      const fallbackFont = this.config.font || {};

      titleElement.style.fontFamily = titleFont.family || fallbackFont.family || 'system-ui, sans-serif';
      titleElement.style.fontSize = `${titleFont.size || this.config.title.fontSize || 18}px`;
      titleElement.style.fontWeight = titleFont.weight || fallbackFont.titleWeight || 600;
      titleElement.style.color = titleFont.color || this.config.title.color || '#333333';
      titleElement.style.fontStyle = titleFont.italic ? 'italic' : 'normal';

      // Apply background color
      const bgColor = this.config.title.bgColor || 'transparent';
      titleElement.style.backgroundColor = bgColor;
      if (bgColor !== 'transparent') {
        titleElement.style.padding = `${this.config.title.padding || 10}px`;
        titleElement.style.borderRadius = '4px';
      } else {
        titleElement.style.padding = '0';
        titleElement.style.borderRadius = '0';
      }

      // Add right-click context menu (only once)
      if (!titleElement.dataset.hasContextMenu) {
        titleElement.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          if (typeof ContextMenu !== 'undefined') ContextMenu.show(event.clientX, event.clientY, 'title', titleElement);
        });
        titleElement.dataset.hasContextMenu = 'true';
      }
    } else if (titleElement) {
      titleElement.style.display = 'none';
    }
  },

  /**
   * Apply section separator visibility
   */
  applySeparators() {
    const separators = this.config.separators || {};
    const header = document.querySelector('.chart-header');
    const legend = document.getElementById('legend');

    if (header) {
      header.style.borderBottom = separators.showHeaderBorder === false ? 'none' : '';
    }
    if (legend) {
      // Only apply border-top removal for bottom/default position
      // Left/right positions use border-left/border-right (handled by CSS classes)
      if (separators.showLegendBorder === false) {
        legend.style.borderTop = 'none';
        legend.style.borderBottom = 'none';
        legend.style.borderLeft = 'none';
        legend.style.borderRight = 'none';
      } else {
        legend.style.borderTop = '';
        legend.style.borderBottom = '';
        legend.style.borderLeft = '';
        legend.style.borderRight = '';
      }
    }
  },

  /**
   * Show tooltip
   */
  showTooltip(event, d, type) {
    if (!this.config.tooltip.show) return;

    let html = '';

    const measureName = this.getDisplayName(type);
    const value = type === 'bar1' ? d.bar1Formatted
      : type === 'bar2' ? d.bar2Formatted
      : d.lineFormatted;

    if (this.config.tooltip.useCustom && this.config.tooltip.template) {
      const bar1Name = this.getDisplayName('bar1');
      const bar2Name = this.getDisplayName('bar2');
      const lineName = this.getDisplayName('line');

      // Get dimension label - use custom if set, otherwise clean field name
      const legend = this.config.legend || {};
      const dimFieldName = this.fieldNames?.dimension || this.config.dimension || '';
      const cleanDimName = dimFieldName.replace(/^(SUM|AVG|MIN|MAX|COUNT|AGG|MEDIAN|STDEV|VAR|YEAR|MONTH|DAY|QUARTER|WEEK)\((.+)\)$/i, '$2').trim();
      const dimensionLabel = legend.dimensionLabel || cleanDimName || 'Dimension';

      const lines = this.config.tooltip.template.split('\n');
      lines.forEach(line => {
        const rendered = line
          .replace(/\{dimension_label\}/g, dimensionLabel)
          .replace(/\{dimension\}/g, d.dimension || '')
          .replace(/\{bar1_label\}/g, bar1Name)
          .replace(/\{bar1_value\}/g, d.bar1Formatted || '')
          .replace(/\{bar1\}/g, `${bar1Name} : ${d.bar1Formatted || ''}`)
          .replace(/\{bar2_label\}/g, bar2Name)
          .replace(/\{bar2_value\}/g, d.bar2Formatted || '')
          .replace(/\{bar2\}/g, `${bar2Name} : ${d.bar2Formatted || ''}`)
          .replace(/\{line_label\}/g, lineName)
          .replace(/\{line_value\}/g, d.lineFormatted || '')
          .replace(/\{line\}/g, `${lineName} : ${d.lineFormatted || ''}`)
          .replace(/\{measure\}/g, measureName)
          .replace(/\{value\}/g, value || '');
        html += `<div class="tooltip-row">${rendered}</div>`;
      });
    } else {
      if (this.config.tooltip.showDimension) {
        html += `<div class="tooltip-title">${d.dimension}</div>`;
      }

      if (this.config.tooltip.showMeasureName && this.config.tooltip.showValue) {
        html += `<div class="tooltip-row"><span class="tooltip-label">${measureName} :</span><span class="tooltip-value">${value}</span></div>`;
      } else if (this.config.tooltip.showValue) {
        html += `<div class="tooltip-value">${value}</div>`;
      }
    }

    // Apply tooltip font settings
    const tooltipFont = this.config.tooltipFont || {};

    this.tooltip
      .html(html)
      .style('background-color', this.config.tooltip.bgColor)
      .style('color', tooltipFont.color || this.config.tooltip.textColor)
      .style('font-size', `${tooltipFont.size || this.config.tooltip.fontSize}px`)
      .style('font-family', tooltipFont.family || 'inherit')
      .style('font-weight', tooltipFont.weight || 400)
      .classed('hidden', false);

    this.moveTooltip(event);
  },

  /**
   * Move tooltip
   */
  moveTooltip(event) {
    const tooltipNode = this.tooltip.node();
    const tooltipRect = tooltipNode.getBoundingClientRect();

    let left = event.clientX + 15;
    let top = event.clientY - 10;

    // Keep tooltip in viewport
    if (left + tooltipRect.width > window.innerWidth) {
      left = event.clientX - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = event.clientY - tooltipRect.height - 10;
    }

    this.tooltip
      .style('left', `${left}px`)
      .style('top', `${top}px`);
  },

  /**
   * Hide tooltip
   */
  hideTooltip() {
    this.tooltip.classed('hidden', true);
  },

  /**
   * Clear chart
   */
  clear() {
    if (this.chartGroup) {
      this.chartGroup.selectAll('.bars-group *').remove();
      this.chartGroup.selectAll('.line-group *').remove();
      this.chartGroup.selectAll('.labels-group *').remove();
    }
    d3.select('#legend').html('');
  }
};
