import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import SetupTenant from './SetupTenant';
import { Camera, History, Lock, CheckCircle } from 'lucide-react';

const Dashboard = () => {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastBill, setLastBill] = useState(null);
    const [currentReading, setCurrentReading] = useState('');
    const [photo, setPhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const tenantRes = await api.get('/tenant');
                setTenant(tenantRes.data);
                
                const billRes = await api.get('/bill/last');
                setLastBill(billRes.data);
            } catch (err) {
                // If 404, tenant is null, which is handled
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleGenerate = async () => {
        if (!currentReading || !photo) return;
        setGenerating(true);

        const formData = new FormData();
        formData.append('currentReading', currentReading);
        formData.append('currentPhoto', photo);
        // Auto-generate month string YYYY-MM based on today
        const date = new Date();
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        formData.append('month', month);

        try {
            const res = await api.post('/bill', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Redirect to the bill view instead of alert
            window.location.href = `/bill/${res.data._id}`;
        } catch (err) {
            alert(err.response?.data?.msg || 'Error generating bill');
            setGenerating(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen text-gray-500">Loading...</div>;
    if (!tenant) return <SetupTenant />;

    const previousReading = lastBill ? lastBill.currentReading : 0;
    const units = currentReading ? (parseFloat(currentReading) - previousReading) : 0;
    const amount = units > 0 ? (units * tenant.unitRate).toFixed(0) : 0; // Rounded for cleaner UI

    return (
        <div className="min-h-screen bg-[#f8f9fb] flex justify-center">
            <div className="w-full max-w-[420px] bg-[#f8f9fb] min-h-screen flex flex-col relative pb-24">
                
                {/* Header */}
                <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">Electricity Billing</h1>
                        <p className="text-xs text-gray-500">Monthly Meter Entry</p>
                    </div>
                    <Link to="/history" className="flex items-center text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full">
                        <History className="h-4 w-4 mr-1.5" />
                        <span className="text-xs font-semibold">History</span>
                    </Link>
                </header>

                <div className="p-4 space-y-4">
                    
                    {/* Section 1: Previous Reading (Read-Only) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Lock className="h-12 w-12 text-gray-400" />
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Previous Month</label>
                                <div className="text-3xl font-bold text-gray-400 mt-1">{previousReading} <span className="text-sm font-normal text-gray-400">units</span></div>
                                <p className="text-xs text-gray-400 mt-1">Last recorded reading</p>
                            </div>
                            {lastBill && lastBill.currentPhotoUrl && (
                                <div className="h-16 w-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0" onClick={() => setShowPhotoModal(lastBill.currentPhotoUrl)}>
                                    <img src={lastBill.currentPhotoUrl} alt="Prev" className="h-full w-full object-cover" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section 2: Current Reading (Input) */}
                    <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5 ring-1 ring-blue-50">
                        <label className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Current Meter Reading</label>
                        <div className="mt-2 relative">
                            <input 
                                type="number" 
                                pattern="[0-9]*"
                                inputMode="numeric"
                                className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-b-2 border-blue-100 focus:border-blue-600 outline-none py-2 bg-transparent transition-colors"
                                placeholder="0000"
                                value={currentReading}
                                onChange={e => setCurrentReading(e.target.value)}
                            />
                            <span className="absolute right-0 bottom-4 text-sm text-gray-400">units</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Enter the number shown on the meter</p>
                    </div>

                    {/* Section 3: Meter Photo Upload (Mandatory) */}
                    <div className={`rounded-xl border-2 border-dashed p-4 transition-colors ${photo ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                        <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full py-4">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                            
                            {photo ? (
                                <div className="flex flex-col items-center text-green-700">
                                    <CheckCircle className="h-10 w-10 mb-2" />
                                    <span className="font-bold text-sm">Photo Attached</span>
                                    <span className="text-xs mt-1">Tap to retake</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-gray-500">
                                    <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                                        <Camera className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <span className="font-bold text-sm text-gray-700">Capture Meter Photo</span>
                                    <span className="text-xs text-red-500 font-medium mt-1">* Required for proof</span>
                                </div>
                            )}
                        </label>
                        {previewUrl && (
                            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                                <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover" />
                            </div>
                        )}
                    </div>

                    {/* Section 4: Calculation Summary */}
                    <div className="bg-gray-800 rounded-xl p-5 text-white shadow-lg">
                        <div className="flex justify-between items-center text-sm text-gray-300 border-b border-gray-700 pb-3 mb-3">
                            <span>Units ({units > 0 ? units : 0}) × ₹{tenant.unitRate}</span>
                            <span>Rate Calculation</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-medium text-gray-300 mb-1">TOTAL PAYABLE</span>
                            <span className="text-3xl font-bold">₹{amount}</span>
                        </div>
                    </div>

                </div>

                {/* Section 5: Generate Button (Fixed Bottom) */}
                <div className="fixed bottom-0 w-full max-w-[420px] bg-white p-4 border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button 
                        onClick={handleGenerate}
                        disabled={!currentReading || !photo || generating}
                        className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide shadow-md transition-all active:scale-[0.98] ${
                            (!currentReading || !photo) 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                        }`}
                    >
                        {generating ? 'GENERATING...' : 'GENERATE BILL'}
                    </button>
                </div>

                {/* Photo Modal */}
                {showPhotoModal && (
                    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(null)}>
                        <img src={showPhotoModal} alt="Enlarged" className="max-w-full max-h-full rounded" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
