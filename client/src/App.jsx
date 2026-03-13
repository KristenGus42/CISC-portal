import { Routes, Route } from 'react-router';

// Import Page Components 
import EditForm from './components/EditForm'
import Index from './components/Index'
import CaseLibrary from './components/CaseLibrary'
import Schedule from './components/Schedule'
import DndExample from './components/DndExample'


function App() {
  return (
    <div>
      <Routes>
        <Route index element={<Index />} />
        <Route path="edit-form/:id?" element={<EditForm />} />
        <Route path="case-library" element={<CaseLibrary/>} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="example" element={<DndExample />} />

      </Routes>
    </div>
  )
}

export default App;