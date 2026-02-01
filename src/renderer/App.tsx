import React, { useEffect } from 'react';
import MainWindow from './components/MainWindow';
import { useCaptureSession } from './store/captureSession';

function App() {
  const { loadWindows } = useCaptureSession();

  useEffect(() => {
    // Load available windows on app start
    loadWindows();

    // Log app info on load
    window.electron.getAppInfo().then((info) => {
      console.log('iOS Capture Agent Info:', info);
    });
  }, [loadWindows]);

  return <MainWindow />;
}

export default App;
