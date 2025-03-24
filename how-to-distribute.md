# How to Distribute Eye Break Timer

This guide explains how to build and distribute the Eye Break Timer app for Windows, macOS, and Linux.

## Prerequisites

- Node.js and npm installed
- Git for version control
- For building Windows app on macOS/Linux: Wine
- For building macOS app on Windows/Linux: Not directly possible (use macOS)

## Build Steps

### 1. Prepare Icons

Before building, make sure you have icons for all platforms:

- Create a `build` folder if it doesn't exist
- For basic builds, just place a 512x512 PNG file named `icon.png` in the `build` folder
- For proper platform-specific icons:
  - `icon.icns` (macOS)
  - `icon.ico` (Windows)
  - `icon.png` (Linux)

You can use online converters like https://convertico.com/ to create platform-specific icons from your PNG.

Alternatively, install the canvas package and use the icon generator script:

```bash
npm install canvas
node build/icons.js
```

### 2. Update Your Package Information

Make sure your `package.json` has correct information:
- Update the `author` field with your name/organization
- Set `appId` in the build configuration to something unique (e.g., com.yourname.eyebreaktimer)
- Adjust any other fields like description, license, etc.

### 3. Build for All Platforms

#### From macOS

You can build for all platforms from macOS:

```bash
# Install dependencies
npm install

# Build for all platforms (macOS, Windows, Linux)
npm run dist

# Or build for specific platforms
npm run dist:mac
npm run dist:win  # Requires Wine
npm run dist:linux
```

#### From Windows

```bash
# Install dependencies
npm install

# Build for Windows
npm run dist:win

# Build for Linux (requires WSL)
npm run dist:linux
```

#### From Linux

```bash
# Install dependencies
npm install

# Build for Linux
npm run dist:linux

# Build for Windows (requires Wine)
npm run dist:win
```

### 4. Locate Your Builds

After building, your distributables can be found in the `dist` folder:

- Windows: `.exe` installer and/or portable `.exe`
- macOS: `.dmg` file and/or `.zip` archive
- Linux: `.AppImage` and/or `.deb` files

## Sharing with Friends

### macOS
Send the `.dmg` file. Recipients need to:
1. Double-click the DMG to mount it
2. Drag the app to their Applications folder
3. Right-click and select "Open" the first time to bypass security warnings

### Windows
Send the installer `.exe` or portable `.exe`. Recipients need to:
1. Run the installer or extract the portable version
2. Follow on-screen instructions for installation
3. Launch the app from Start Menu or desktop shortcut

### Linux
Send the `.AppImage` or `.deb` file. Recipients need to:
1. For AppImage: Make executable (`chmod +x`) and run directly
2. For .deb: Install via package manager (`sudo dpkg -i`)

## Code Signing (For Production)

For proper distribution, you should code sign your app:

- **macOS**: Requires Apple Developer account ($99/year)
- **Windows**: Requires code signing certificate from certificate authority
- **Linux**: Usually not required

Refer to [Electron Builder documentation](https://www.electron.build/code-signing) for detailed instructions on code signing.

## Automatic Updates

For production apps, consider adding automatic updates:

1. Set up a server to host your app updates
2. Add `electron-updater` package
3. Configure auto-update in your main.js

See [Electron Builder Auto Update](https://www.electron.build/auto-update) for more details. 