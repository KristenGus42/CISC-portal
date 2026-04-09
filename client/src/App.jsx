import { Routes, Route } from 'react-router';

// Import Page Components 
import EditForm from '../draft-snippets/edit-form/EditFormFINALDRAFT'
import NewForm from './components/NewForm'
import ExistingCase from './components/ExistingCase'

import Index from './components/Index'
import CaseLibrary from './components/CaseLibrary'
import Schedule from './components/Schedule'
import DndExample from './components/DndExample'


function App() {

  const attorney  = true;
  return (
    <div>
      <Routes>
        <Route index element={<Index />} />

        {/**Forms */}
        <Route path="new-form" element={<NewForm/>} />
        <Route path="edit-form/:id?" element={<ExistingCase attorney={attorney} />} />

        <Route path="case-library" element={<CaseLibrary/>} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="example" element={<DndExample />} />

      </Routes>
    </div>
  )
}

export default App;