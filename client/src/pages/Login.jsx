import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { Mail } from 'lucide-react';

const Login = () => {
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [resending, setResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setNeedsVerification(false);
        
        try {
            await login(formData.email, formData.password);
            navigate('/');
        } catch (err) {
            const response = err.response?.data;
            
            // Check if email not verified (403)
            if (response?.needsVerification) {
                setNeedsVerification(true);
                setVerificationEmail(response.email || formData.email);
            } else {
                setError(err.message || 'Login failed. Please try again.');
            }
        }
    };

    const handleResendVerification = async () => {
        setResending(true);
        setResendSuccess(false);
        try {
            await api.post('/auth/resend-verification', { email: verificationEmail });
            setResendSuccess(true);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to resend verification email');
        } finally {
            setResending(false);
        }
    };

    // Show verification needed UI
    if (needsVerification) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm text-center">
                    <div className="bg-yellow-100 rounded-full p-4 w-fit mx-auto mb-4">
                        <Mail className="h-10 w-10 text-yellow-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Email Not Verified</h2>
                    <p className="text-gray-600 mb-4">
                        Please verify your email before logging in.<br />
                        Check your inbox at <strong>{verificationEmail}</strong>
                    </p>
                    
                    {resendSuccess ? (
                        <p className="text-green-600 text-sm mb-4">✓ Verification email sent!</p>
                    ) : (
                        <button
                            onClick={handleResendVerification}
                            disabled={resending}
                            className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition mb-3 disabled:bg-gray-400"
                        >
                            {resending ? 'Sending...' : 'Resend Verification Email'}
                        </button>
                    )}
                    
                    <button
                        onClick={() => setNeedsVerification(false)}
                        className="w-full bg-gray-200 text-gray-700 p-3 rounded font-bold hover:bg-gray-300 transition"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-4 text-center">Owner Login</h2>
                {error && <p className="text-red-500 mb-2">{error}</p>}
                <form onSubmit={onSubmit} className="space-y-4">
                    <input 
                        type="email" 
                        placeholder="Email" 
                        className="w-full p-2 border rounded"
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        className="w-full p-2 border rounded"
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required
                    />
                    <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Login</button>
                </form>
                <p className="mt-4 text-center">
                    No account? <Link to="/register" className="text-blue-600">Register</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
