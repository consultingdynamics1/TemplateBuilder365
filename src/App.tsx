import { Toolbar } from './components/Toolbar';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import './App.css'

function App() {
  return (
    <div className="app">
      <Toolbar />
      <div className="app-content">
        <div className="canvas-container">
          <Canvas />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  )
}

export default App
