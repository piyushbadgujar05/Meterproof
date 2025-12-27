import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Mail, CheckCircle } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', mobile: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            await api.post('/auth/register', formData);
            setSuccess(true);
        } catch (err) {
            const msg = err.response?.data?.msg || 'Registration failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Success state - show verification message
    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-lg border w-full max-w-sm text-center">
                    <div className="bg-green-100 rounded-full p-4 w-fit mx-auto mb-4">
                        <Mail className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Check Your Email!</h2>
                    <p className="text-gray-600 mb-4">
                        We've sent a verification link to<br />
                        <strong>{formData.email}</strong>
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        Click the link in the email to verify your account. 
                        The link expires in 24 hours.
                    </p>
                    <Link 
                        to="/login" 
                        className="block w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
            <div className="bg-white p-8 rounded-lg shadow-sm border w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Owner Registration</h2>
                {error && <p className="text-red-500 mb-4 text-sm bg-red-50 p-2 rounded">{error}</p>}
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Rahul Sharma" 
                            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                        <input 
                            type="tel" 
                            placeholder="e.g. 9876543210" 
                            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.mobile} 
                            onChange={e => setFormData({...formData, mobile: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input 
                            type="email" 
                            placeholder="name@example.com" 
                            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition-colors mt-2 disabled:bg-gray-400"
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Login here</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
