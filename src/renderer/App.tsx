import React, { useEffect } from 'react';
import MainWindow from './components/MainWindow';

function App() {
  useEffect(() => {
    // Log app info on load
    window.electron.getAppInfo().then((info) => {
      console.log('iOS Capture Agent Info:', info);
    });
  }, []);

  return <MainWindow />;
}

export default App;
