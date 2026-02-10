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
