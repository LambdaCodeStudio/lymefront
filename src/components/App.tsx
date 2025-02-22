import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoutes.tsx';
import Login from './auth/LoginForm';
import AdminDashboard from '../pages/admin.astro';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <PrivateRoute path="/admin" component={AdminDashboard} allowedRoles={['admin']} />
        {/* <PrivateRoute path="/dashboard" component={Dashboard} allowedRoles={['admin', 'supervisor', 'basic']} />
        <PrivateRoute path="/supervisor" component={SupervisorView} allowedRoles={['admin', 'supervisor']} /> */}
      </Routes>
    </Router>
  );
};

export default App;