# Deployment Guide

This guide explains how to deploy Optima to GitHub Pages.

## Prerequisites

- Node.js and Yarn installed
- Git repository connected to GitHub
- GitHub account with access to the repository

## Deployment Methods

### Method 1: Automatic Deployment via GitHub Actions (Recommended)

The repository is configured with GitHub Actions to automatically deploy on every push to the `main` branch.

#### Setup Steps:

1. **Enable GitHub Pages in Repository Settings**
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Under "Build and deployment", select:
     - Source: **GitHub Actions**
   - Save the settings

2. **Push to Main Branch**
   ```bash
   git add .
   git commit -m "Configure GitHub Pages deployment"
   git push origin main
   ```

3. **Monitor Deployment**
   - Go to the "Actions" tab in your GitHub repository
   - Watch the "Deploy to GitHub Pages" workflow run
   - Once complete, your site will be live at: `https://danobroz.github.io/optima`

### Method 2: Manual Deployment via CLI

You can also deploy manually using the gh-pages package:

1. **Build and Deploy**
   ```bash
   yarn deploy
   ```

   This command will:
   - Run `yarn build` to create an optimized production build
   - Deploy the `dist` folder to the `gh-pages` branch
   - Make the site available at `https://danobroz.github.io/optima`

2. **Verify Deployment**
   - Visit `https://danobroz.github.io/optima`
   - Check that the application loads correctly

## Configuration Files

### package.json
- `homepage`: Set to `https://danobroz.github.io/optima`
- `predeploy`: Runs build before deployment
- `deploy`: Deploys dist folder to gh-pages branch

### vite.config.ts
- `base`: Set to `/optima/` to match the repository name

### .github/workflows/deploy.yml
- Automated deployment workflow
- Triggers on push to main branch
- Can also be triggered manually via workflow_dispatch

### public/.nojekyll
- Prevents GitHub Pages from using Jekyll processing
- Required for proper asset loading

### public/404.html
- Handles client-side routing for React Router
- Redirects 404s back to index.html

## Troubleshooting

### Site shows 404 error
- Verify GitHub Pages is enabled in repository settings
- Check that the workflow completed successfully
- Ensure `base` path in `vite.config.ts` matches your repository name

### Assets not loading
- Verify the `base` path in `vite.config.ts` is correct
- Check that `.nojekyll` file exists in the public folder
- Clear browser cache and try again

### Build fails
- Check the Actions tab for error messages
- Ensure all dependencies are listed in package.json
- Verify Node.js version compatibility (requires Node 20+)

### Routes show 404
- Ensure `404.html` and redirect script in `index.html` are present
- Clear browser cache
- Try hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

## Manual Build Testing

Test the production build locally before deploying:

```bash
# Build the project
yarn build

# Preview the production build
yarn preview
```

Visit the preview URL (usually http://localhost:4173/optima) to verify everything works correctly.

## Updating the Deployment

To update your deployed site:

### Using GitHub Actions (Automatic)
Simply push changes to the main branch:
```bash
git add .
git commit -m "Your update message"
git push origin main
```

### Using Manual Deployment
Run the deploy command:
```bash
yarn deploy
```

## Additional Notes

- The site uses IndexedDB for local storage, so data is stored in the browser
- No backend server is required
- All data remains on the user's device
- Consider adding analytics if you want to track usage (optional)

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to the `public` folder with your domain
2. Configure DNS settings with your domain provider
3. Update the `homepage` field in package.json
4. Update the `base` path in vite.config.ts

For more information, see [GitHub Pages Custom Domain Documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).
