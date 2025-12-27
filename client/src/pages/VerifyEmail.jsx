import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const VerifyEmail = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verify = async () => {
            try {
                const res = await api.get(`/auth/verify-email/${token}`);
                setStatus('success');
                setMessage(res.data.msg);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.msg || 'Verification failed. Link may be expired.');
            }
        };

        if (token) {
            verify();
        }
    }, [token]);

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                
                {status === 'verifying' && (
                    <>
                        <Loader className="h-16 w-16 text-blue-600 mx-auto animate-spin mb-4" />
                        <h2 className="text-xl font-bold text-gray-800">Verifying your email...</h2>
                        <p className="text-gray-500 mt-2">Please wait a moment.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="bg-green-100 rounded-full p-4 w-fit mx-auto mb-4">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Email Verified!</h2>
                        <p className="text-gray-600 mt-2">{message}</p>
                        <Link 
                            to="/login" 
                            className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                        >
                            Go to Login
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="bg-red-100 rounded-full p-4 w-fit mx-auto mb-4">
                            <XCircle className="h-12 w-12 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Verification Failed</h2>
                        <p className="text-gray-600 mt-2">{message}</p>
                        <div className="mt-6 space-y-3">
                            <Link 
                                to="/login" 
                                className="block bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-300 transition"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
