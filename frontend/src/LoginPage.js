// src/LoginPage.js
import React, { useState } from 'react';
// Import the new CSS file for LoginPage
import './LoginPage.css';

function LoginPage({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Hardcoded credentials for demonstration purposes, as requested.
    const HARDCODED_USERNAME = 'alexjacob@gmail.com';
    const HARDCODED_PASSWORD = 'alex@123'; // Your hardcoded password

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (username.trim() === HARDCODED_USERNAME && password === HARDCODED_PASSWORD) {
            if (onLoginSuccess) {
                onLoginSuccess();
            }
        } else {
            setError('Invalid username or password.');
        }
    };

    return (
        // Main container: Centers content, dark background
        <div className="login-container">
            {/* Login card container */}
            <div className="login-card">
                {/* Title */}
                <h2 className="login-title">Welcome Back!</h2>

                {/* Error message display */}
                {error && (
                    <p className="login-error-message">
                        {error}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    {/* Username Input Field */}
                    <div className="form-group">
                        <label htmlFor="username">Username (Email):</label>
                        <input
                            type="email"
                            id="username"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin@example.com"
                            required
                            autoComplete="username"
                        />
                    </div>

                    {/* Password Input Field */}
                    <div className="form-group">
                        <label htmlFor="password">Password:</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="password123"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    
                    <div className="button-group">
                        <button type="submit" className="login-button">
                            Log In
                        </button>
                    </div>
                </form>

                
                <p className="login-hint">
                    Hint: Username is `<span className="hint-highlight">admin@gmail.com</span>`, Password is `<span className="hint-highlight">password@123</span>`.
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
