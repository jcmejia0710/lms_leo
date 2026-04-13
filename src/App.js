import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import ForumDetail from './pages/ForumDetail';
import TaskDetail from './pages/TaskDetail';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminPanel from './pages/AdminPanel';
import QuizDetail from './pages/QuizDetail';
import Settings from './pages/Settings';
import Grades from './pages/Grades';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center',
        justifyContent: 'center', background: 'linear-gradient(135deg, #0f0c29, #302b63)',
        flexDirection: 'column', gap: '1.25rem'
      }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #4f46e5, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
          📚
        </div>
        <div className="loading-spinner" style={{ borderTopColor: '#4f46e5' }}></div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Cargando LMS LEO...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Rutas protegidas */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/forum/:forumId" element={<ForumDetail />} />
          <Route path="/task/:taskId" element={<TaskDetail />} />
          <Route path="/quiz/:quizId" element={<QuizDetail />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
