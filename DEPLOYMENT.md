# DEPLOYMENT GUIDE

Complete instructions for deploying the Invoice System to all platforms.

---

## 🌐 Web Deployment

### Option 1: Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# Follow prompts, select project settings
```

### Option 2: Netlify

```bash
# 1. Build the app
npm run build

# 2. Install Netlify CLI
npm i -g netlify-cli

# 3. Deploy
netlify deploy --prod --dir=out
```

### Option 3: Static Hosting (AWS S3, Azure, etc.)

```bash
# 1. Build
npm run build

# 2. Upload 'out' folder contents to your hosting
# Configure as static site with index.html as entry point
```

---

## 💻 Windows EXE Deployment

### Prerequisites

- Node.js installed
- Windows machine (or Windows VM)

### Build Process

```bash
# 1. Install dependencies
npm install

# 2. Build Next.js app
npm run build

# 3. Build Electron app
npm run electron:build
```

### Output

- Location: `electron-dist/` folder
- File: `Rug Invoice System Setup.exe`
- Size: ~150-200 MB (includes Chromium)

### Distribution Options

1. **Direct Download**: Host the .exe on your website
2. **USB/Network**: Copy to shared drive
3. **Auto-Updater**: Configure electron-updater for automatic updates

### Code Signing (Optional but Recommended)

```bash
# Install electron-builder certificate tool
npm install -g app-builder-bin

# Sign the executable
# Requires code signing certificate
```

---

## 📱 Android APK Deployment

### Prerequisites

- Android Studio installed
- Java JDK 11 or higher
- Android SDK installed

### First-Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Build Next.js app
npm run build

# 3. Initialize Capacitor
npx cap init "Rug Invoice System" com.rugbusiness.invoice

# 4. Add Android platform
npx cap add android

# 5. Sync files
npx cap sync
```

### Build APK

```bash
# 1. Open in Android Studio
npx cap open android

# 2. In Android Studio:
# - Wait for Gradle sync to complete
# - Build > Generate Signed Bundle / APK
# - Select "APK"
# - Click "Next"
```

### Create Keystore (First Time)

```bash
# Create keystore
keytool -genkey -v -keystore rug-invoice.keystore \
  -alias rug-invoice-key -keyalg RSA -keysize 2048 -validity 10000

# Follow prompts to set passwords and details
```

### Sign and Build

In Android Studio:
1. **Build > Generate Signed Bundle / APK**
2. Select **APK**
3. Choose your keystore file
4. Enter passwords
5. Select **release** build variant
6. Click **Finish**

### Output

- Location: `android/app/build/outputs/apk/release/`
- File: `app-release.apk`
- Size: ~30-50 MB

### Testing APK

```bash
# Install on connected device
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Distribution Options

1. **Google Play Store**
   - Create developer account ($25 one-time fee)
   - Upload APK through Play Console
   - Fill in app details and screenshots
   - Submit for review

2. **Direct Distribution**
   - Host APK on your website
   - Users must enable "Install from Unknown Sources"
   - Send via email or cloud storage

3. **Enterprise Distribution**
   - MDM solutions
   - Internal app stores

---

## 🔄 Update Strategy

### Web
- Automatic updates on next page load
- No user action required

### Windows EXE
- Implement electron-updater
- Add auto-update server
- Or distribute new .exe

### Android APK
- Update through Play Store (automatic)
- Or distribute new APK (manual install)

---

## 📊 Build Checklist

Before deploying to production:

- [ ] Test all four invoice modes
- [ ] Verify calculations match Excel
- [ ] Test print output
- [ ] Test PDF generation
- [ ] Check on different screen sizes
- [ ] Update business information
- [ ] Update app version numbers
- [ ] Test on target platform
- [ ] Create backup of keystore (Android)
- [ ] Document deployment process

---

## 🔐 Security Notes

### Keystore (Android)
- **CRITICAL**: Backup your keystore file
- Store passwords securely
- Never commit to version control
- Lost keystore = cannot update app

### Code Signing (Windows)
- Recommended for production
- Prevents security warnings
- Builds trust with users

### Environment Variables
- Use `.env.local` for sensitive data
- Never commit secrets to Git
- Use environment variables in CI/CD

---

## 📈 Performance Optimization

### Web
```bash
# Already configured in next.config.js
# Static export with image optimization disabled
```

### Windows EXE
```javascript
// In electron.js, add:
mainWindow.webContents.session.clearCache();
```

### Android APK
```json
// In capacitor.config.json, ensure:
{
  "android": {
    "buildOptions": {
      "signingConfig": "release"
    }
  }
}
```

---

## 🐛 Common Issues

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Electron build fails
```bash
# Clear electron cache
rm -rf ~/.electron
npm run electron:build
```

### Android Gradle errors
```bash
# In Android Studio
File > Invalidate Caches and Restart
```

### PDF generation issues
- Use Print > Save as PDF as fallback
- Check browser compatibility

---

## 📞 Post-Deployment

### Monitoring
- Set up error tracking (Sentry, LogRocket)
- Monitor user feedback
- Track usage analytics

### Maintenance
- Regular dependency updates
- Security patches
- Feature improvements based on feedback

---

## ✅ Final Steps

1. **Test thoroughly** on all target platforms
2. **Document** any custom configurations
3. **Train users** on the system
4. **Provide support** documentation
5. **Plan for updates** and maintenance

---

**Remember**: Test in production-like environment before releasing to users!
