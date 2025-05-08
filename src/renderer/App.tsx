import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Viewer from './pages/Viewer'
import { useAppStore } from './store/useAppStore'

function App() {
  const theme = useAppStore((s) => s.theme)
  
  // Apply theme to html element
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Viewer />} />
        <Route path="/quiz" element={<div>Quiz Page (Coming Soon)</div>} />
        <Route path="/settings" element={<div>Settings Page (Coming Soon)</div>} />
      </Routes>
    </Router>
  )
}

export default App
