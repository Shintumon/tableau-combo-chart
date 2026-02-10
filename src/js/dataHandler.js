/**
 * Data Handler for Tableau Viz Extension
 * Manages data retrieval using encodings from the Marks card
 */

const DataHandler = {
  // Reference to the worksheet
  worksheet: null,

  /**
   * Initialize with the worksheet from viz extension context
   */
  init() {
    // For viz extensions, we access the worksheet directly
    this.worksheet = tableau.extensions.worksheetContent.worksheet;
    return this.worksheet;
  },

  /**
   * Get the worksheet (for viz extensions, there's only one)
   */
  getWorksheet() {
    if (!this.worksheet) {
      this.init();
    }
    return this.worksheet;
  },

  /**
   * Get data from worksheet using encodings
   * Encodings are defined in the manifest and appear as Marks card fields
   */
  async getData() {
    const worksheet = this.getWorksheet();
    if (!worksheet) {
      throw new Error('Worksheet not available');
    }

    try {
      // Get the summary data from the worksheet
      const dataTable = await worksheet.getSummaryDataAsync();
      const columns = dataTable.columns;
      const data = dataTable.data;

      console.log('Columns:', columns.map(c => ({
        name: c.fieldName,
        dataType: c.dataType,
        index: c.index
      })));
      console.log('Data rows:', data.length);

      if (data.length === 0) {
        return { data: [], fieldNames: {} };
      }

      // Smart field detection based on field names and data types
      let dimIndex = -1;
      let bar1Index = -1;
      let bar2Index = -1;
      let lineIndex = -1;

      const measureIndices = [];

      columns.forEach((col, idx) => {
        const name = col.fieldName.toLowerCase();
        const isDateOrString = col.dataType === 'string' || col.dataType === 'date' || col.dataType === 'date-time';
        const isNumeric = col.dataType === 'int' || col.dataType === 'float';

        // Detect dimension (date/time fields or string categories)
        if (isDateOrString) {
          if (dimIndex === -1) {
            dimIndex = idx;
          }
        } else if (isNumeric) {
          // Try to detect line measure (usually percentage or ratio)
          if (name.includes('%') || name.includes('margin') || name.includes('ratio') || name.includes('rate')) {
            if (lineIndex === -1) {
              lineIndex = idx;
            }
          } else {
            measureIndices.push(idx);
          }
        }
      });

      // Assign bar measures from remaining numeric fields
      if (measureIndices.length >= 1) bar1Index = measureIndices[0];
      if (measureIndices.length >= 2) bar2Index = measureIndices[1];

      // If line wasn't detected by name, use third measure
      if (lineIndex === -1 && measureIndices.length >= 3) {
        lineIndex = measureIndices[2];
      }

      // If we still don't have a line, use bar2 as line and leave bar2 empty
      if (lineIndex === -1 && bar2Index >= 0) {
        lineIndex = bar2Index;
        bar2Index = measureIndices.length >= 3 ? measureIndices[2] : -1;
      }

      // If we don't have a dimension, use first column
      if (dimIndex === -1 && columns.length > 0) {
        dimIndex = 0;
      }

      console.log('Field mapping:', { dimIndex, bar1Index, bar2Index, lineIndex });

      // Transform data
      const chartData = data.map(row => {
        return {
          dimension: dimIndex >= 0 ? row[dimIndex].formattedValue : 'N/A',
          bar1Value: bar1Index >= 0 ? this.parseNumber(row[bar1Index]) : 0,
          bar2Value: bar2Index >= 0 ? this.parseNumber(row[bar2Index]) : 0,
          lineValue: lineIndex >= 0 ? this.parseNumber(row[lineIndex]) : 0,
          bar1Formatted: bar1Index >= 0 ? row[bar1Index].formattedValue : '0',
          bar2Formatted: bar2Index >= 0 ? row[bar2Index].formattedValue : '0',
          lineFormatted: lineIndex >= 0 ? row[lineIndex].formattedValue : '0'
        };
      });

      // Get field names for labels
      const fieldNames = {
        dimension: dimIndex >= 0 ? columns[dimIndex].fieldName : 'Category',
        bar1: bar1Index >= 0 ? columns[bar1Index].fieldName : 'Bar 1',
        bar2: bar2Index >= 0 ? columns[bar2Index].fieldName : 'Bar 2',
        line: lineIndex >= 0 ? columns[lineIndex].fieldName : 'Line'
      };

      console.log('Field names:', fieldNames);
      console.log('Chart data sample:', chartData.slice(0, 3));

      return {
        data: chartData,
        fieldNames: fieldNames,
        hasAllFields: dimIndex >= 0 && bar1Index >= 0 && bar2Index >= 0 && lineIndex >= 0
      };
    } catch (e) {
      console.error('Error getting data:', e);
      throw e;
    }
  },

  /**
   * Get columns from the worksheet (for config dialog)
   */
  async getColumns() {
    const worksheet = this.getWorksheet();
    if (!worksheet) {
      throw new Error('Worksheet not available');
    }

    try {
      const dataTable = await worksheet.getSummaryDataAsync();
      const columns = dataTable.columns;

      const result = {
        dimensions: [],
        measures: []
      };

      columns.forEach(col => {
        const columnInfo = {
          fieldName: col.fieldName,
          dataType: col.dataType,
          index: col.index
        };

        if (col.dataType === 'string' || col.dataType === 'date' || col.dataType === 'date-time') {
          result.dimensions.push(columnInfo);
        } else {
          result.measures.push(columnInfo);
        }
      });

      return result;
    } catch (e) {
      console.error('Error getting columns:', e);
      throw e;
    }
  },

  /**
   * Parse a number from Tableau data value
   */
  parseNumber(dataValue) {
    if (dataValue.value !== null && dataValue.value !== undefined) {
      return Number(dataValue.value);
    }
    // Try parsing formatted value
    const num = parseFloat(String(dataValue.formattedValue).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  },

  /**
   * Register event listener for data changes
   */
  registerDataChangeListener(callback) {
    const worksheet = this.getWorksheet();
    if (worksheet) {
      worksheet.addEventListener(tableau.TableauEventType.FilterChanged, callback);
      worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, callback);
      return true;
    }
    return false;
  },

  /**
   * Remove event listeners
   */
  removeDataChangeListener(callback) {
    const worksheet = this.getWorksheet();
    if (worksheet) {
      worksheet.removeEventListener(tableau.TableauEventType.FilterChanged, callback);
      worksheet.removeEventListener(tableau.TableauEventType.SummaryDataChanged, callback);
    }
  }
};
