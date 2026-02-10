# Combo Chart Viz Extension for Tableau

A customizable **Tableau Viz Extension** that creates combo charts with dual bar charts and a line chart overlay, featuring full marks card-style customization options.

## What is a Viz Extension?

Unlike Dashboard Extensions (which are added as objects in dashboards), **Viz Extensions** are custom visualization types that appear in the Marks card dropdown. They replace the standard chart types like bar, line, etc., giving you a completely custom visualization.

## Features

- **Dual Bar Charts**: Display two measures as side-by-side (grouped) or stacked bars
- **Line Chart Overlay**: Display a third measure as a line with data points
- **Dual or Shared Axis**: Toggle between dual Y-axes or a shared axis
- **Full Customization**:
  - Colors, opacity, and borders for each element
  - Corner radius for bars
  - Line style (solid, dashed, dotted) and curve types
  - Data point shapes (circle, square, diamond, triangle)
  - Axis titles, formats, and min/max values
  - Grid lines (horizontal/vertical)
  - Value labels for bars and line
  - Legend position
  - Tooltip content and styling

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Tableau Desktop](https://www.tableau.com/products/desktop) (2021.1 or higher for Viz Extensions)

### Setup

1. **Navigate to the extension folder**

   ```bash
   cd "/home/john/Projects/Tableau Extensions/combo-chart-extension"
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the local server**

   ```bash
   npm start
   ```

   The extension will be served at `http://localhost:8765`

4. **Add to Tableau Worksheet**

   - Open Tableau Desktop and create/open a worksheet
   - Add your dimension and measures to the shelf (these will provide data to the extension)
   - In the **Marks card**, click the dropdown (where it says "Automatic", "Bar", etc.)
   - Select **"Add Extension..."** at the bottom
   - Browse to `ComboChart.trex` and select it
   - The extension will load and replace the default visualization

## Usage

### Adding Data

Before configuring the extension, add fields to your worksheet:
1. Add a **dimension** to Columns or Rows (this will be your X-axis categories)
2. Add at least **3 measures** (for Bar 1, Bar 2, and Line)

### Configuration

Right-click on the viz and select **"Configure"** or click the gear icon to open the configuration dialog:

1. **Data Tab**: Map the fields from your worksheet
   - **Dimension**: Select the category field for the X-axis
   - **Bar 1 Measure**: First bar chart measure
   - **Bar 2 Measure**: Second bar chart measure
   - **Line Measure**: Line chart measure

2. **Bars Tab**: Customize bar appearance
   - Toggle between grouped or stacked bars
   - Set colors, opacity, borders, and corner radius for each bar

3. **Line Tab**: Customize line appearance
   - Set color, width, opacity, and style (solid/dashed/dotted)
   - Choose curve type (linear, monotone, cardinal, step)
   - Configure data points (show/hide, size, shape, colors)

4. **Axes Tab**: Configure axis settings
   - Toggle dual axis or shared axis mode
   - Show/hide axes, set titles and font sizes
   - Set custom min/max values
   - Choose number formats
   - Configure grid lines

5. **Labels Tab**: Configure labels and title
   - Set chart title text and styling
   - Show/hide value labels on bars and line
   - Configure legend position

6. **Tooltip Tab**: Customize tooltips
   - Enable/disable tooltips
   - Choose what content to display
   - Set tooltip colors and font size

### Interactivity

- **Hover**: Shows tooltip with dimension and measure values
- **Data Updates**: Chart automatically updates when Tableau filters change
- **Resize**: Chart responsively adapts to container size

## Project Structure

```
combo-chart-extension/
├── ComboChart.trex          # Tableau viz extension manifest
├── package.json             # Node.js dependencies
├── README.md                # This file
└── src/
    ├── index.html           # Main extension page
    ├── dialog.html          # Configuration dialog
    ├── css/
    │   ├── styles.css       # Main styles
    │   └── dialog.css       # Dialog styles
    └── js/
        ├── config.js        # Configuration management
        ├── dataHandler.js   # Tableau data handling
        ├── comboChart.js    # D3.js visualization
        ├── main.js          # Main entry point
        └── dialogConfig.js  # Dialog logic
```

## Development

### Local Development

```bash
# Start server with auto-reload
npm run dev
```

### Building for Production

For production deployment, you'll need to:

1. Host the extension files on an HTTPS server
2. Update the `source-location` URL in `ComboChart.trex`
3. Consider using a bundler like Webpack for optimization

## Troubleshooting

### Extension doesn't appear in Marks dropdown

- Ensure the local server is running (`npm start`)
- Check that port 8765 is not in use
- Verify you're using Tableau Desktop 2021.1 or later

### "This extension is not a viz extension" error

- Make sure the manifest uses `<worksheet-extension>` (not `<dashboard-extension>`)
- Re-download/refresh the .trex file

### No data displayed

- Ensure your worksheet has data (add dimensions and measures to the shelf)
- Configure the extension to map fields correctly
- Check browser console for errors

### Styling issues

- Clear browser cache if styles don't update
- Check browser console for CSS errors

## API Reference

This extension uses:

- [Tableau Extensions API](https://tableau.github.io/extensions-api/) v1.1+ (Viz Extensions)
- [D3.js](https://d3js.org/) v7

## License

MIT License - Feel free to modify and distribute.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
