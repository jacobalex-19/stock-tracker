// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import AddTrade from './AddTrade';
import ViewTrades from './ViewTrades';
import EditTrade from './EditTrade';
import CloseTradePage from './CloseTradePage';
import LoginPage from './LoginPage';

// Import the main app layout CSS. LoginPage.css should still be imported within LoginPage.js.
import './MainAppLayout.css'; 

// Component to protect routes (a wrapper around other components)
const ProtectedRoute = ({ children, isAuthenticated }) => {
    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    // State to track authentication status
    // Initialize from localStorage to persist login across refreshes
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        const storedAuth = localStorage.getItem('isAuthenticated');
        return storedAuth === 'true'; // Convert string 'true' to boolean true
    });

    // Effect to update localStorage whenever isAuthenticated changes
    useEffect(() => {
        localStorage.setItem('isAuthenticated', isAuthenticated);
    }, [isAuthenticated]);

    // Callback function to be passed to LoginPage
    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        // On logout, implicitly redirect to /login due to ProtectedRoute or direct / route
    };

    return (
        <Router>
            <div className="app-wrapper"> {/* Main app wrapper, spans full viewport */}
                {isAuthenticated && ( // Only show navigation if authenticated
                    <div className="container"> {/* Navigation always constrained */}
                        <nav className="main-nav">
                            {/* NEW: Add a class for the div containing navigation links */}
                            <div className="nav-links-group"> 
                                <Link to="/dashboard" className="nav-link">Home</Link>
                                <Link to="/add" className="nav-link">Add New Trade</Link>
                                <Link to="/view" className="nav-link">View Your Trades</Link>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="logout-button"
                            >
                                Logout
                            </button>
                        </nav>
                    </div>
                )}

                <Routes>
                    {/* Login Page Route:
                        - If authenticated, immediately redirect to /dashboard.
                        - Otherwise, render the LoginPage component. */}
                    <Route
                        path="/login"
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
                    />

                    {/* Default route for the root path '/' */}
                    <Route
                        path="/"
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
                    />

                    {/* Protected Routes - These routes are now inside a conditional container or directly rendered */}

                    {/* Dashboard, Add, Edit, Close: Render inside a constrained container */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <div className="container dashboard-content"> {/* Constrained container */}
                                <h1>Welcome to QuantDash</h1>
                                <p>Manage your options trades effortlessly. Add new positions, view existing ones, and track performance.</p>
                            </div>
                        </ProtectedRoute>
                    } />
                    <Route path="/add" element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <div className="container standard-content"> {/* Constrained container */}
                                <AddTrade />
                            </div>
                        </ProtectedRoute>
                    } />
                    <Route path="/edit/:id" element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <div className="container standard-content"> {/* Constrained container */}
                                <EditTrade />
                            </div>
                        </ProtectedRoute>
                    } />
                    <Route path="/close/:id" element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <div className="container standard-content"> {/* Constrained container */}
                                <CloseTradePage />
                            </div>
                        </ProtectedRoute>
                    } />

                    
                    <Route path="/view" element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <ViewTrades />
                        </ProtectedRoute>
                    } />

                    
                    <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
                </Routes>

                <footer className="trademark-section">
                    <p> @2025 QuantDash. All rights reserved. </p>
                </footer>
            </div>
        </Router>
    );
}

export default App;
