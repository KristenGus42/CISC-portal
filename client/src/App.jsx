import { Routes, Route } from 'react-router';

// Import Page Components 
import EditForm from './components/EditForm'
import Index from './components/Index'

function App() {
  return (
    <div>
      <Routes>
        <Route index element={<Index />} />
        <Route path="edit-form" element={<EditForm />} />
      </Routes>
    </div>
  )
}

export default App;