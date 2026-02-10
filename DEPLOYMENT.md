# Deployment Guide - Combo Chart Extension

## Step 1: Initialize Git Repository

```bash
cd "/home/john/Projects/Tableau Extensions/combo-chart-extension"
git init
git add .
git commit -m "Initial commit: Combo Chart Tableau Extension"
```

## Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `tableau-combo-chart`
3. Keep it **Public** (required for Cloudflare Pages free tier)
4. **Do NOT** initialize with README (you already have files)
5. Click "Create repository"

## Step 3: Push to GitHub

After creating the repository, run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/tableau-combo-chart.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 4: Connect to Cloudflare Pages

1. Go to https://dash.cloudflare.com/
2. Click "Workers & Pages" in the left sidebar
3. Click "Create application" → "Pages" → "Connect to Git"
4. Authorize Cloudflare to access your GitHub
5. Select the `tableau-combo-chart` repository
6. Configure the build settings:
   - **Project name**: `tableau-combo-chart`
   - **Production branch**: `main`
   - **Build command**: (leave empty - no build needed)
   - **Build output directory**: `src`
7. Click "Save and Deploy"

## Step 5: Update the .trex File

Once deployed, your extension will be available at:
`https://tableau-combo-chart.pages.dev`

Update the URL in `ComboChart-hosted.trex`:

```xml
<source-location>
  <url>https://tableau-combo-chart.pages.dev/index.html</url>
</source-location>
```

## Step 6: Use in Tableau

### Tableau Desktop
1. Download the `ComboChart-hosted.trex` file
2. In Tableau, go to a worksheet
3. From the Marks card, click the dropdown arrow → "Add Extension"
4. Select "My Extensions" → "Access Local Extensions"
5. Browse to and select `ComboChart-hosted.trex`

### Tableau Cloud
1. Your organization admin may need to allowlist the extension URL
2. Go to Settings → Extensions → Allowlisted Extensions
3. Add: `https://tableau-combo-chart.pages.dev`

## Troubleshooting

### HTTPS Required
Tableau requires HTTPS for hosted extensions. Cloudflare Pages automatically provides this.

### CORS Issues
If you encounter CORS issues, the extension should work since it's a static site serving from the same origin.

### Extension Not Loading
- Check browser console (F12) for errors
- Verify the URL is accessible by visiting it directly
- Ensure all files were pushed to GitHub

## Files Overview

- `src/` - All extension source files (HTML, JS, CSS)
- `ComboChart.trex` - Local development manifest (localhost)
- `ComboChart-hosted.trex` - Production manifest (Cloudflare Pages)
- `.gitignore` - Excludes node_modules from version control
- `wrangler.toml` - Cloudflare Pages configuration
