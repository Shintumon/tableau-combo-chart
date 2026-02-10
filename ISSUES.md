# Known Issues - Combo Chart Extension

## Fixed in Latest Update

### Issue #1: Blue dropdown arrows appearing multiple times
**Status:** Fixed
**Description:** The Category (X-Axis) dropdown showed multiple checkmark/arrow icons instead of a clean dropdown.
**Fix:** Added CSS to ensure proper dropdown rendering and prevent inline option display.

### Issue #2: Placeholder text had "--" prefix/suffix
**Status:** Fixed
**Description:** Dropdown placeholders showed "-- Select Dimension --" and "-- Select Measure --".
**Fix:** Updated placeholders to cleaner "Select Dimension" and "Select Measure" text.

### Issue #3: Cancel, Apply, Save & Close buttons not working
**Status:** Fixed
**Description:** Dialog footer buttons were not responding to clicks.
**Fix:** Added more robust event handler attachment using direct onclick assignment as fallback.

### Issue #4: Generic JavaScript error messages
**Status:** Fixed
**Description:** Pop-up errors and messages showed generic JavaScript alerts without extension branding.
**Fix:** Created custom styled modal with extension-specific titles ("Combo Chart - Validation Error", etc.) and improved error formatting.

### Issue #5: X-axis sorted in wrong direction
**Status:** Fixed
**Description:** The X-axis categories were sorted in an unexpected order.
**Fix:** Sort option already existed in Axes tab > X-Axis > Sort Order. Options: Default (Data Order), Ascending (A-Z), Descending (Z-A).

### Issue #6: Left Y-axis label and tick labels too close
**Status:** Fixed
**Description:** The left Y-axis title and tick labels were positioned too close to the chart, causing readability issues.
**Fix:** Increased left margin base from 50-90px to 70-110px and adjusted title offset positioning.

### Issue #7: Selected measures appear in all dropdowns
**Status:** Fixed
**Description:** When selecting a measure in one dropdown, it should not appear as an option in other measure dropdowns to prevent duplicate selection.
**Fix:** Added `updateMeasureDropdowns()` function that filters out already-selected measures from other dropdowns.

### Issue #8: Dimension/measure changes not applied
**Status:** Fixed
**Description:** When changing dimension or measures in the Data tab and clicking Apply, the chart didn't update with the new field selections.
**Fix:** Updated `DataHandler.getData()` to read and use the saved config values for field mapping, with auto-detection as fallback.

---

## How to Report New Issues

1. Go to https://github.com/Shintumon/tableau-combo-chart/issues
2. Click "New Issue"
3. Select Bug Report or Feature Request template
4. Fill in the details

## Testing Checklist

After deploying fixes, verify:
- [ ] Dropdowns display cleanly without extra icons
- [ ] Placeholder text shows "Select Dimension" (no dashes)
- [ ] Cancel button closes dialog without saving
- [ ] Apply button saves settings and shows feedback
- [ ] Save & Close button saves and closes dialog
- [ ] Validation errors show styled modal with "Combo Chart" title
- [ ] X-axis sort option works (Axes tab > X-Axis > Sort Order)
- [ ] Left Y-axis has adequate spacing from chart area
- [ ] Selected measures are filtered from other dropdowns
- [ ] Changing dimension/measures and clicking Apply updates the chart
