// src/components/Layout/DashboardLayout.jsx
import React from 'react';
import Sidebar from '../Sidebar/Sidebar.jsx';
import Header from '../Header/Header.jsx';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="d-flex">
      <Header />
      <Sidebar />
      <main
        className="flex-grow-1 p-4 bg-white"
        style={{ height: '100vh', overflowY: 'auto', marginTop: '60px' }}
      >
        <Outlet /> {/* This is where child routes render */}
      </main>
    </div>
  );
};

export default DashboardLayout;
