import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { AuthModal } from './components/AuthModal';
import ImageUploader from './features/ImageUploader'; 
import ChatWithPDF from './features/ChatWithPDF';
import SummarizeTopic from './features/SummarizeTopic';
import SyntheticDataGenerator from './features/SyntheticDataGenerator';
import './index.css'; 

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/auth" element={<AuthModal />} />
      <Route path="/user" element={<SyntheticDataGenerator />} />
      <Route path="/image" element={<ImageUploader />} />
      <Route path="/pdf" element={<ChatWithPDF />} />
      <Route path="/summary" element={<SummarizeTopic />} />
    </Routes>
  );
}
