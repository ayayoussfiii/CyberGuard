
import { Routes, Route } from 'react-router-dom'

import Sidebar from './components/Sidebar.jsx'

import Overview from './pages/Overview.jsx'
import Alerts from './pages/Alerts.jsx'
import Analytics from './pages/Analytics.jsx'
import ModelPerformance from './pages/ModelPerformance.jsx'
import Methodology from './pages/Methodology.jsx'
import ApiStatus from './pages/ApiStatus.jsx'

import './App.css'


/* Cela signifie : lorsque l'utilisateur visite
 /alerts, React affiche le composant Alerts qui est la page*/
function App() {
  return (
    <div className="app-layout">

      <Sidebar />

      <main className="main-content">
        <video
          className="background-video"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source
            src="/videos/2.mp4"
            type="video/mp4"
          />
        </video>

        <div className="video-overlay" />

        <div className="page-content">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/performance" element={<ModelPerformance />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/api-status" element={<ApiStatus />} />
          <Route path="*" element={<Overview />} />
        </Routes>
        </div>
      </main>

    </div>
  )
}

export default App
