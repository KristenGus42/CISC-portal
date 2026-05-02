import { Routes, Route } from 'react-router';


// Import page compinen
import EditForm from './components/EditForm'
import Index from './components/Index'
import CaseLibrary from './components/CaseLibrary'
import Schedule from './components/Schedule'
import DndExample from './components/DndExample'
import PersonnelLibary from './components/PersonnelLibrary'

function App() {

  const attorney  = true;
  return (
    <div>
      <Routes>
        <Route index element={<Index />} />

        {/**Forms */}
        <Route path="new-form" element={<EditForm newForm={true} attorney={attorney}/>} />
        <Route path="edit-form/:id?" element={<EditForm newForm={false} attorney={attorney} />} />


        <Route path="case-library" element={<CaseLibrary/>} />
        <Route path="personnel-library" element={<PersonnelLibary/>} />

        <Route path="schedule" element={<Schedule />} />
        <Route path="example" element={<DndExample />} />

      </Routes>
    </div>
  )
}

export default App;