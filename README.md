<<<<<<< HEAD
=======
<<<<<<< HEAD
# eye-break-timer
=======
>>>>>>> 23f3c72 (Initial commit of Eye Break Timer app)
# Eye Break Timer

A simple app that reminds you to take eye breaks every 20 minutes to reduce eye strain and fatigue.

## Features

- Follows the 20-20-20 rule (every 20 minutes, look at something 20 feet away for 20 seconds)
- Shows a countdown before each break
- Displays a space-themed screensaver during breaks
- Press ESC key to skip a break
- Works on Windows, macOS, and Linux

## Installation

### Windows
- Download the latest `.exe` or `.msi` installer from the releases
- Run the installer and follow the prompts
- For portable version, extract the `.exe` file and run it directly

### macOS
- Download the `.dmg` file from the releases
- Open the .dmg and drag the app to your Applications folder
- Right-click and select "Open" the first time to bypass security warnings

### Linux
- Download the `.AppImage` or `.deb` file from the releases
- For AppImage: Make the file executable with `chmod +x Eye.Break.Timer-x.x.x.AppImage` and run it
- For .deb: Install with `sudo dpkg -i eye-break-timer_x.x.x_amd64.deb`

## Usage

- The app will start automatically and run in the background
- Every 20 minutes, a 5-second countdown appears near your cursor
- After the countdown, a full-screen break reminder appears for 20 seconds
- Press ESC to skip the break if needed
- The app will automatically schedule the next break

## Building from Source

If you want to build the app yourself:

```bash
# Clone the repository
git clone https://github.com/yourusername/eye-break-timer.git

# Navigate to the project directory
cd eye-break-timer

# Install dependencies
npm install

# Run the app
npm start

# Build for your platform
npm run dist

# Build for a specific platform
npm run dist:mac  # macOS
npm run dist:win  # Windows
npm run dist:linux  # Linux
```

## License
=======
AGPL 
