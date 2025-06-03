import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Authentication from './pages/Authentication/index';
import TravelPlanner from './pages/Authentication/TravelPlanner';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Authentication />} />
          <Route path="/planner" element={<TravelPlanner />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
