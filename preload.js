const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is running');
console.log('Process args:', process.argv);

// Expose a limited API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Method to close the break window
  close: () => {
    console.log('electronAPI.close() called from renderer');
    ipcRenderer.send('close-break-window');
  },
  
  // Method to set break duration
  setBreakDuration: (seconds) => {
    console.log(`electronAPI.setBreakDuration(${seconds}) called from renderer`);
    ipcRenderer.send('set-break-duration', seconds);
  },
  
  // Method to set break interval
  setBreakInterval: (minutes) => {
    console.log(`electronAPI.setBreakInterval(${minutes}) called from renderer`);
    ipcRenderer.send('set-break-interval', minutes);
  },
  
  // Methods to test features
  testCountdown: () => {
    console.log('electronAPI.testCountdown() called from renderer');
    ipcRenderer.send('test-countdown');
  },
  
  testScreensaver: () => {
    console.log('electronAPI.testScreensaver() called from renderer');
    ipcRenderer.send('test-screensaver');
  },
  
  // Get current settings
  getBreakDuration: () => {
    return ipcRenderer.invoke('get-break-duration');
  },
  
  getBreakInterval: () => {
    return ipcRenderer.invoke('get-break-interval');
  },
  
  // Stay on top functionality
  getStayOnTop: () => {
    return ipcRenderer.invoke('get-stay-on-top');
  },
  
  setStayOnTop: (enabled) => {
    ipcRenderer.send('set-stay-on-top', enabled);
  },
  
  // Events
  onResetTimer: (callback) => {
    ipcRenderer.on('reset-timer', () => {
      console.log('Reset timer event received in renderer');
      callback();
    });
  }
});

// Expose process information safely
contextBridge.exposeInMainWorld('process', {
  argv: process.argv,
  platform: process.platform
});

// Log when the window is ready
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, electronAPI should be available');
}); 