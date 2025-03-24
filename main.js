const { app, BrowserWindow, screen, globalShortcut, ipcMain } = require('electron');
const path = require('path');

// Time settings (in milliseconds)
let BREAK_INTERVAL = 20 * 60 * 1000; // 20 minutes
let BREAK_DURATION = 20 * 1000; // 20 seconds (default)
const COUNTDOWN_DURATION = 5; // 5 seconds countdown

let mainWindow;
let breakWindow;
let countdownWindow;
let breakTimer;
let breakDurationTimer;
let countdownTimer;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 480,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Eye Break Timer',
    icon: path.join(__dirname, 'icon.png'),
    resizable: true,
    minWidth: 380,
    minHeight: 480,
    maxWidth: 760,
    maxHeight: 960,
    transparent: false,
    backgroundColor: '#0a1a2a', // Match app's theme color
    autoHideMenuBar: true,
    center: true,
    show: false // Start hidden to prevent white flash
  });

  // Set aspect ratio to maintain uniform scaling
  mainWindow.setAspectRatio(380/480);

  mainWindow.loadFile('index.html');
  
  // Only show window after content is fully loaded
  mainWindow.webContents.once('did-finish-load', () => {
    // Small delay to ensure CSS is applied
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    }, 50);
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Start the timer for the first eye break
  scheduleBreak();
}

function scheduleBreak() {
  clearTimeout(breakTimer);
  breakTimer = setTimeout(showCountdown, BREAK_INTERVAL);
  
  // Ensure the main window is in a good state
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Check if the window has content or appears blank
    mainWindow.webContents.executeJavaScript(`
      document.querySelector('.container') ? true : false
    `).then(hasContent => {
      if (!hasContent) {
        console.log('Main window appears to be blank, reloading it');
        mainWindow.reload();
      }
    }).catch(err => {
      console.error('Error checking main window content:', err);
    });
  }
}

function showCountdown() {
  try {
    // Get current mouse position
    const mousePos = screen.getCursorScreenPoint();
    
    // Find the display where the mouse is located
    const currentDisplay = screen.getDisplayNearestPoint(mousePos);
    console.log(`Mouse at ${mousePos.x}, ${mousePos.y} on display: ${currentDisplay.id}`);
    
    // Create window for countdown - simple approach
    countdownWindow = new BrowserWindow({
      width: 120,
      height: 120,
      x: mousePos.x + 10, // Position closer to cursor
      y: mousePos.y - 60, // Vertically centered with cursor
      frame: false,
      transparent: true,
      backgroundColor: '#00000000', // Transparent background
      show: false, // Start hidden
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: true, // Make focusable so ESC key works
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    
    // Hide menu bar
    countdownWindow.setMenuBarVisibility(false);
    
    // Load the HTML file
    countdownWindow.loadFile('countdown.html');
    
    // Show window only after content is loaded and fully rendered
    countdownWindow.webContents.once('did-finish-load', () => {
      // Force transparency before showing
      countdownWindow.webContents.executeJavaScript(`
        document.documentElement.style.backgroundColor = 'transparent';
        document.documentElement.style.background = 'transparent';
        document.body.style.backgroundColor = 'transparent';
        document.body.style.background = 'transparent';
      `).catch(err => console.error('Error executing transparency JS:', err));
      
      // Short delay to ensure rendering complete
      setTimeout(() => {
        if (countdownWindow && !countdownWindow.isDestroyed()) {
          countdownWindow.show();
          countdownWindow.focus(); // Focus window to improve ESC key detection
        }
      }, 50);
    });
    
    // Add ESC key handler for countdown window
    globalShortcut.unregisterAll();
    const registered = globalShortcut.register('Escape', () => {
      console.log('ESC pressed during countdown, canceling break and resetting timer');
      if (countdownWindow && !countdownWindow.isDestroyed()) {
        countdownWindow.close();
        // Don't proceed to break screen, reset the timer instead
        scheduleBreak();
        
        // Tell the main window to reset its timer
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log('Sending reset-timer event to main window');
          mainWindow.webContents.send('reset-timer');
        }
      }
    });
    
    // Also add local ESC key handling
    countdownWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        console.log('ESC key detected in countdown window via before-input-event');
        event.preventDefault();
        if (countdownWindow && !countdownWindow.isDestroyed()) {
          countdownWindow.close();
          // Don't proceed to break screen, reset the timer instead
          scheduleBreak();
          
          // Tell the main window to reset its timer
          if (mainWindow && !mainWindow.isDestroyed()) {
            console.log('Sending reset-timer event to main window');
            mainWindow.webContents.send('reset-timer');
          }
        }
      }
    });
    
    // Track mouse movement and update window position
    const updatePosition = () => {
      if (countdownWindow && !countdownWindow.isDestroyed()) {
        const newPos = screen.getCursorScreenPoint();
        countdownWindow.setPosition(newPos.x + 10, newPos.y - 60); // Position closer to cursor
      }
    };
    
    // Update position frequently
    const mouseMoveInterval = setInterval(updatePosition, 50);
    
    // Start the countdown
    let secondsLeft = COUNTDOWN_DURATION;
    
    const updateCountdown = () => {
      if (countdownWindow && !countdownWindow.isDestroyed()) {
        // Safe way to execute JavaScript in the renderer
        countdownWindow.webContents.executeJavaScript(`
          if (typeof updateCount === 'function') {
            updateCount(${secondsLeft});
          }
        `).catch(err => console.error('Error executing JS in countdown window:', err));
        
        secondsLeft--;
        
        if (secondsLeft >= 0) {
          countdownTimer = setTimeout(updateCountdown, 1000);
        } else {
          clearInterval(mouseMoveInterval);
          countdownWindow.close();
          countdownWindow = null;
          showBreakScreen();
        }
      }
    };
    
    // Wait for window to load before starting countdown
    countdownWindow.webContents.on('did-finish-load', () => {
      updateCountdown();
    });
    
    // If window is closed, clean up resources
    countdownWindow.on('closed', () => {
      clearTimeout(countdownTimer);
      clearInterval(mouseMoveInterval);
      globalShortcut.unregisterAll(); // Unregister ESC shortcut
      countdownWindow = null;
    });
  } catch (error) {
    console.error('Error showing countdown window:', error);
    // If we failed to show the countdown, go directly to the break screen
    showBreakScreen();
  }
}

function showBreakScreen() {
  // Get all connected displays
  const allDisplays = screen.getAllDisplays();
  
  // Track all break windows
  const breakWindows = [];
  
  // Create a break window for each display
  allDisplays.forEach(display => {
    const { bounds } = display;
    
    // Create a new full-screen window for the break on this display
    const breakWindow = new BrowserWindow({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      fullscreen: true,
      show: false, // Start hidden to prevent white flash
      backgroundColor: '#0a1a2a', // Dark background matching HTML
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    
    // Load content but don't show until ready
    breakWindow.loadFile('break.html');
    
    // Show window only after content is fully loaded
    breakWindow.webContents.once('did-finish-load', () => {
      // Log the current break duration for debugging
      console.log(`Current break duration for regular screen: ${BREAK_DURATION/1000} seconds`);
      
      // Small delay to ensure CSS has been applied
      setTimeout(() => {
        if (!breakWindow.isDestroyed()) {
          breakWindow.show();
        }
      }, 50);
    });
    
    // Store the window reference
    breakWindows.push(breakWindow);
    
    // Handle ESC key on each window
    breakWindow.webContents.on('did-finish-load', () => {
      // Register local shortcuts as backup
      breakWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'Escape') {
          console.log('ESC key detected via before-input-event');
          event.preventDefault();
          closeAllBreakWindows();
        }
      });
    });
    
    // When any window is closed manually, close all of them
    breakWindow.on('closed', () => {
      // Remove this window from our array
      const index = breakWindows.indexOf(breakWindow);
      if (index > -1) {
        breakWindows.splice(index, 1);
      }
    });
  });
  
  // Store reference to all break windows
  breakWindow = breakWindows;
  
  // Register global ESC shortcut
  globalShortcut.unregisterAll();
  const registered = globalShortcut.register('Escape', () => {
    console.log('ESC pressed (global shortcut), closing all break windows');
    closeAllBreakWindows();
  });
  
  if (!registered) {
    console.log('Global Escape shortcut registration failed');
  }
  
  // Function to close all break windows
  function closeAllBreakWindows() {
    console.log('Closing all break windows');
    // Create a copy of the array to avoid modification during iteration
    const windows = Array.isArray(breakWindow) ? [...breakWindow] : [breakWindow];
    windows.forEach(win => {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });
    // Clear the array
    breakWindow = null;
    
    // Make sure the main window is restored and visible
    if (mainWindow && !mainWindow.isDestroyed()) {
      // If the main window exists but is not showing content, reload it
      console.log('Ensuring main window is visible and properly loaded');
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      
      // Check if window needs to be reloaded (to fix blank window issue)
      mainWindow.webContents.executeJavaScript(`
        document.querySelector('.container') ? true : false
      `).then(hasContent => {
        if (!hasContent) {
          console.log('Main window appears to be blank, reloading it');
          mainWindow.reload();
          
          // Make sure it's visible after reload
          mainWindow.webContents.once('did-finish-load', () => {
            setTimeout(() => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.show();
                mainWindow.focus();
                
                // Tell the main window to reset its timer
                mainWindow.webContents.send('reset-timer');
              }
            }, 50);
          });
        } else {
          console.log('Main window has content, focusing it');
          mainWindow.focus();
          
          // Tell the main window to reset its timer
          mainWindow.webContents.send('reset-timer');
        }
      }).catch(err => {
        console.error('Error checking main window content:', err);
        // If there's an error, reload anyway as a precaution
        mainWindow.reload();
      });
    }
    
    // Immediately schedule the next break
    console.log('ESC key pressed, scheduling next break immediately');
    scheduleBreak();
  }
  
  // Close all break windows after the specified duration
  console.log(`Setting timer to close break window after ${BREAK_DURATION/1000} seconds`);
  breakDurationTimer = setTimeout(() => {
    console.log('Break duration timer expired, closing break windows');
    closeAllBreakWindows();
    // Schedule the next break - this is now handled in closeAllBreakWindows()
  }, BREAK_DURATION);
}

// Setup IPC handlers
function setupIPC() {
  // Handle close-break-window message
  ipcMain.on('close-break-window', () => {
    console.log('Received close-break-window IPC message');
    
    // Close all break windows if any exist
    if (breakWindow) {
      // Handle if breakWindow is an array (multiple windows)
      if (Array.isArray(breakWindow)) {
        breakWindow.forEach(win => {
          if (win && !win.isDestroyed()) {
            win.close();
          }
        });
      } else if (!breakWindow.isDestroyed()) {
        // Handle if it's a single window
        breakWindow.close();
      }
      // Ensure breakWindow is null after closing
      breakWindow = null;
      
      // Schedule the next break
      scheduleBreak();
      
      // Tell the main window to reset its timer
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Sending reset-timer event to main window');
        mainWindow.webContents.send('reset-timer');
      }
    } else if (countdownWindow && !countdownWindow.isDestroyed()) {
      // If it's the countdown window, close it and reset the timer
      console.log('Closing countdown window from IPC and resetting timer');
      countdownWindow.close();
      countdownWindow = null;
      
      // Reset the timer for the next break
      scheduleBreak();
      
      // Tell the main window to reset its timer
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('Sending reset-timer event to main window');
        mainWindow.webContents.send('reset-timer');
      }
    } else {
      console.log('No windows available to close via IPC');
    }
  });
  
  // Handle setting break duration
  ipcMain.on('set-break-duration', (event, seconds) => {
    console.log(`Setting break duration to ${seconds} seconds`);
    BREAK_DURATION = seconds * 1000; // Convert to milliseconds
    
    // If break window is active, update its timer
    if (breakWindow) {
      clearTimeout(breakDurationTimer);
      breakDurationTimer = setTimeout(() => {
        // Close all break windows
        if (Array.isArray(breakWindow)) {
          breakWindow.forEach(win => {
            if (win && !win.isDestroyed()) {
              win.close();
            }
          });
          breakWindow = null;
        } else if (breakWindow && !breakWindow.isDestroyed()) {
          breakWindow.close();
          breakWindow = null;
        }
        
        scheduleBreak();
      }, BREAK_DURATION);
    }
  });
  
  // Handle getting break duration - return value to renderer
  ipcMain.handle('get-break-duration', () => {
    return BREAK_DURATION / 1000; // Convert back to seconds for UI
  });
  
  // Handle setting break interval
  ipcMain.on('set-break-interval', (event, minutes) => {
    console.log(`Setting break interval to ${minutes} minutes`);
    BREAK_INTERVAL = minutes * 60 * 1000; // Convert to milliseconds
    
    // Reschedule the break with the new interval
    clearTimeout(breakTimer);
    scheduleBreak();
  });
  
  // Handle getting break interval - return value to renderer
  ipcMain.handle('get-break-interval', () => {
    return BREAK_INTERVAL / (60 * 1000); // Convert back to minutes for UI
  });
  
  // Handle test countdown button
  ipcMain.on('test-countdown', () => {
    console.log('Test countdown requested');
    // Cancel any existing timers first
    clearTimeout(breakTimer);
    clearTimeout(breakDurationTimer);
    
    // Close any existing windows
    if (countdownWindow && !countdownWindow.isDestroyed()) {
      countdownWindow.close();
    }
    
    if (breakWindow && !breakWindow.isDestroyed()) {
      breakWindow.close();
    }
    
    // Show the countdown immediately
    showCountdown();
  });
  
  // Handle test screensaver button
  ipcMain.on('test-screensaver', () => {
    console.log('Test screensaver requested');
    // Cancel any existing timers first
    clearTimeout(breakTimer);
    clearTimeout(breakDurationTimer);
    
    // Store main window state so we can restore it later
    const mainWindowWasVisible = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible();
    console.log(`Main window was visible: ${mainWindowWasVisible}`);
    
    // Close any existing windows
    if (countdownWindow && !countdownWindow.isDestroyed()) {
      countdownWindow.close();
    }
    
    // Close all break windows if any exist
    if (breakWindow) {
      if (Array.isArray(breakWindow)) {
        breakWindow.forEach(win => {
          if (win && !win.isDestroyed()) {
            win.close();
          }
        });
      } else if (breakWindow && !breakWindow.isDestroyed()) {
        breakWindow.close();
      }
      breakWindow = null;
    }
    
    // Create a custom showBreakScreen function for testing that won't kill processes
    const testShowBreakScreen = () => {
      // Get all connected displays
      const allDisplays = screen.getAllDisplays();
      
      // Track all break windows
      const breakWindows = [];
      
      // Create a break window for each display
      allDisplays.forEach(display => {
        const { bounds } = display;
        
        // Create a new full-screen window for the break on this display
        const breakWindow = new BrowserWindow({
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          frame: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          fullscreen: true,
          show: false, // Start hidden to prevent white flash
          backgroundColor: '#0a1a2a', // Dark background matching HTML
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
          }
        });
        
        // Load content but don't show until ready
        breakWindow.loadFile('break.html');
        
        // Send current break duration to the window
        breakWindow.webContents.once('did-finish-load', () => {
          // Log the current break duration for debugging
          console.log(`Current break duration for test screen: ${BREAK_DURATION/1000} seconds`);
          
          // Small delay to ensure CSS has been applied
          setTimeout(() => {
            if (!breakWindow.isDestroyed()) {
              breakWindow.show();
            }
          }, 50);
        });
        
        // Store the window reference
        breakWindows.push(breakWindow);
        
        // Handle ESC key on each window
        breakWindow.webContents.on('did-finish-load', () => {
          // Register local shortcuts as backup
          breakWindow.webContents.on('before-input-event', (event, input) => {
            if (input.type === 'keyDown' && input.key === 'Escape') {
              console.log('ESC key detected via before-input-event');
              event.preventDefault();
              testCloseAllBreakWindows();
            }
          });
        });
        
        // When any window is closed manually, close all of them
        breakWindow.on('closed', () => {
          // Remove this window from our array
          const index = breakWindows.indexOf(breakWindow);
          if (index > -1) {
            breakWindows.splice(index, 1);
          }
        });
      });
      
      // Store reference to all break windows
      breakWindow = breakWindows;
      
      // Register global ESC shortcut
      globalShortcut.unregisterAll();
      const registered = globalShortcut.register('Escape', () => {
        console.log('ESC pressed (global shortcut), closing all break windows');
        testCloseAllBreakWindows();
      });
      
      if (!registered) {
        console.log('Global Escape shortcut registration failed');
      }
      
      // Function to close all break windows without killing processes
      function testCloseAllBreakWindows() {
        console.log('Closing all break windows (test mode)');
        // Create a copy of the array to avoid modification during iteration
        const windows = [...breakWindows];
        windows.forEach(win => {
          if (!win.isDestroyed()) {
            win.close();
          }
        });
        // Clear the array
        breakWindows.length = 0;
        breakWindow = null;
        
        // Make sure the main window is restored and visible
        if (mainWindow && !mainWindow.isDestroyed()) {
          // If the main window exists but is not showing content, reload it
          console.log('Ensuring main window is visible and properly loaded');
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          
          // Check if window needs to be reloaded (to fix blank window issue)
          mainWindow.webContents.executeJavaScript(`
            document.querySelector('.container') ? true : false
          `).then(hasContent => {
            if (!hasContent) {
              console.log('Main window appears to be blank, reloading it');
              mainWindow.reload();
              
              // Make sure it's visible after reload
              mainWindow.webContents.once('did-finish-load', () => {
                setTimeout(() => {
                  if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.show();
                    mainWindow.focus();
                    
                    // Tell the main window to reset its timer
                    mainWindow.webContents.send('reset-timer');
                  }
                }, 50);
              });
            } else {
              console.log('Main window has content, focusing it');
              mainWindow.focus();
              
              // Tell the main window to reset its timer
              mainWindow.webContents.send('reset-timer');
            }
          }).catch(err => {
            console.error('Error checking main window content:', err);
            // If there's an error, reload anyway as a precaution
            mainWindow.reload();
          });
        }
        
        // Cancel existing timer for break duration
        clearTimeout(breakDurationTimer);
        
        // Immediately schedule the next break
        console.log('ESC key pressed in test mode, scheduling next break immediately');
        scheduleBreak();
      }
      
      // Close all break windows after the specified duration
      console.log(`Setting timer to close break window after ${BREAK_DURATION/1000} seconds`);
      breakDurationTimer = setTimeout(() => {
        console.log('Break duration timer expired, closing break windows');
        testCloseAllBreakWindows();
        // Schedule the next break - this is now handled in testCloseAllBreakWindows()
      }, BREAK_DURATION);
    };
    
    // Show the break screen using the test version
    testShowBreakScreen();
  });
}

// When app is ready, create window and set up IPC
app.whenReady().then(() => {
  createMainWindow();
  setupIPC();
});

// Register a global application shortcut for ESC that works regardless of focus
app.whenReady().then(() => {
  console.log('Registering app-wide ESC shortcut');
  
  // This is a backup if other methods fail
  app.on('browser-window-focus', (event, focusedWindow) => {
    console.log('Window focused:', focusedWindow.getTitle());
    
    // Check if the focused window is one of our break windows
    let isBreakWindow = false;
    
    if (breakWindow) {
      if (Array.isArray(breakWindow)) {
        // Check if focusedWindow is in our array of break windows
        isBreakWindow = breakWindow.some(win => win === focusedWindow);
      } else {
        // Check against single break window
        isBreakWindow = (focusedWindow === breakWindow);
      }
    }
    
    // If the focused window is a break window, set up an application shortcut
    if (isBreakWindow) {
      console.log('Break window focused, enabling ESC application shortcut');
      
      // Use a more forceful approach
      globalShortcut.register('Escape', () => {
        console.log('ESC pressed (app-level shortcut)');
        
        // Close all break windows
        if (Array.isArray(breakWindow)) {
          breakWindow.forEach(win => {
            if (win && !win.isDestroyed()) {
              win.close();
            }
          });
          breakWindow = null;
        } else if (breakWindow && !breakWindow.isDestroyed()) {
          breakWindow.close();
          breakWindow = null;
        }
      });
    } else if (focusedWindow === mainWindow) {
      // Unregister global shortcuts when the main window is focused
      globalShortcut.unregisterAll();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Clean up resources on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  clearTimeout(breakTimer);
  clearTimeout(breakDurationTimer);
  clearTimeout(countdownTimer);
}); 