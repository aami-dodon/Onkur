import React from 'react';
import HealthCheck from './features/health/HealthCheck';

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 32 }}>
      <h1>PERN Frontend</h1>
      <HealthCheck />
    </div>
  );
}

export default App;
