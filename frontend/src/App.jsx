import { Routes, Route } from 'react-router-dom';
import Home from './Home.jsx';
import Education from './Education.jsx';
import VoiceAssistantPopup from './VoiceAssistantPopUp.jsx';
import FinancialDashboard from './FinancialDashboard.jsx';
import InputForm from './InputForm.jsx';
import Chatbot from './Chatbot.jsx';
import VideoRecommendations from './VideoRecommendations.jsx';
import FinancialAssessment from './FinancialAssessment.jsx';
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/education" element={<Education />} />
      <Route path="/dashboard" element={<FinancialDashboard />} />
      <Route path="/vid" element={<VideoRecommendations />} />
      <Route path="/fin" element={<FinancialAssessment />} />
      <Route path="/voice" element={<VoiceAssistantPopup />} />
      <Route path="/inp" element={<InputForm />} />
      <Route path="/chat" element={<Chatbot />} />
    </Routes>
  );
}

export default App;