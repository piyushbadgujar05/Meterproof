import React, { useEffect, useState, useContext } from 'react';
import api from '../utils/api';
import { useParams } from 'react-router-dom';
import { Share2, Download, CheckCircle, Zap, ZoomIn, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import ImageModal from '../components/ImageModal';

const ViewBill = () => {
    const { id } = useParams();
    const [bill, setBill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [modalImage, setModalImage] = useState(null); // { url, title, subtitle }
    const authContext = useContext(AuthContext);
    const user = authContext?.user;

    useEffect(() => {
        const fetchBill = async () => {
            try {
                const res = await api.get(`/bill/${id}`);
                setBill(res.data);
            } catch (err) {
                alert('Bill not found');
            } finally {
                setLoading(false);
            }
        };
        fetchBill();
    }, [id]);

    const toggleStatus = async () => {
        try {
            const res = await api.put(`/bill/${id}/status`);
            setBill(res.data);
        } catch (err) {
            alert('Error updating status');
        }
    };

    // Handle UPI Payment
    const handleUpiPayment = () => {
        if (!bill.upiLink) {
            alert('UPI payment not available. Owner has not set up UPI ID.');
            return;
        }
        // Redirect to UPI deep link (opens GPay/PhonePe/Paytm)
        window.location.href = bill.upiLink;
    };

    // Tenant confirms payment
    const handleTenantConfirm = async () => {
        if (!confirm('Have you completed the payment? Click OK to confirm.')) return;
        
        try {
            const res = await api.post(`/bill/${id}/tenant-confirm`);
            setBill(res.data.bill);
            alert('Payment confirmation recorded! Owner will verify.');
        } catch (err) {
            alert(err.response?.data?.msg || 'Error confirming payment');
        }
    };

    // Check if device is mobile (UPI only works on mobile)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const handleDownloadPDF = async () => {
        setDownloading(true);
        try {
            const response = await api.post(`/bill/${id}/generate-pdf`, {}, {
                responseType: 'blob' // Important for handling binary data
            });

            // Create a link element, hide it, direct it towards the blob, and then 'click' it.
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `MeterProof_Bill_${bill.month}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error("Download Error:", err);
            alert("Error downloading PDF. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    const shareWhatsApp = () => {
        const text = `Your electricity bill for ${bill.month} is ready. Amount: ₹${bill.amount}. View here: ${window.location.href}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Helper to format dates
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen text-gray-500">Loading Bill...</div>;
    if (!bill) return <div className="p-8 text-center text-red-500">Bill not found or deleted.</div>;

    const billIdShort = `MP-${bill.month.replace('-', '')}-${bill._id.slice(-4).toUpperCase()}`;

    return (
        <div className="min-h-screen bg-gray-100 py-4 sm:py-8 flex justify-center items-start">
            <div className="w-full max-w-2xl flex flex-col gap-4 px-4 sm:px-0">
                
                {/* Content Area */}
                <div className="bg-white shadow-xl sm:rounded-lg overflow-hidden relative">
                    {/* Header */}
                    <div className="bg-blue-600 text-white p-6 sm:p-8">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <Zap className="h-6 w-6 text-yellow-300 fill-current" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-wide">MeterProof</h1>
                                    <p className="text-xs text-blue-100 uppercase tracking-wider">Electricity Billing System</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-bold">INVOICE</h2>
                                <p className="text-sm text-blue-100 font-mono mt-1">#{billIdShort}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status & Dates */}
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Billing Month</p>
                            <p className="text-lg font-bold text-gray-800">{new Date(bill.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <div className={`px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2 ${bill.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                {bill.status === 'PAID' ? <CheckCircle className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />}
                                {bill.status}
                            </div>
                            {/* Payment Status */}
                            {bill.status === 'UNPAID' && bill.payment?.status === 'TENANT_CONFIRMED' && (
                                <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Awaiting Owner Confirmation
                                </div>
                            )}
                        </div>
                    </div>

                    {/* From / To Section */}
                    <div className="p-6 sm:p-8 grid grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">From (Owner)</h3>
                            <div className="space-y-1">
                                <p className="font-bold text-gray-900 text-lg">{bill.ownerId?.name || "House Owner"}</p>
                                <p className="text-sm text-gray-600">Landlord / Building Owner</p>
                                <p className="text-sm text-gray-600 font-mono">Mo: {bill.ownerId?.mobile || "Not Provided"}</p>
                            </div>
                        </div>
                        <div className="text-right sm:text-left">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">To (Tenant)</h3>
                            <div className="space-y-1">
                                <p className="font-bold text-gray-900 text-lg">{bill.tenantId?.name || "Tenant"}</p>
                                <p className="text-sm text-gray-600">Rental Unit</p>
                                <p className="text-sm text-gray-600 font-mono">Mo: {bill.tenantId?.mobile || "Not Provided"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Consumption Cards */}
                    <div className="px-6 sm:px-8 pb-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Consumption Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Previous Reading</p>
                                <p className="text-xl font-mono font-semibold text-gray-700">{bill.previousReading}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <p className="text-xs text-blue-600 mb-1">Current Reading</p>
                                <p className="text-xl font-mono font-bold text-blue-800">{bill.currentReading}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Units Consumed</p>
                                <p className="text-xl font-bold text-gray-900">{bill.units} <span className="text-xs font-normal text-gray-500">units</span></p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-500 mb-1">Rate per Unit</p>
                                <p className="text-xl font-bold text-gray-900">₹{bill.unitRate}</p>
                            </div>
                        </div>
                    </div>

                    {/* Total Amount */}
                    <div className="mx-6 sm:mx-8 mb-8 bg-gray-900 rounded-xl p-6 text-white shadow-lg flex justify-between items-center">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Total Payable Amount</p>
                            <p className="text-xs text-gray-500">Due within 5 days</p>
                        </div>
                        <div className="text-4xl font-bold">
                            ₹{bill.amount}
                        </div>
                    </div>

                    {/* Meter Proof Images */}
                    <div className="px-6 sm:px-8 pb-8">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Verified Meter Proof
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Previous Reading */}
                            <div 
                                className="space-y-2 cursor-pointer group"
                                onClick={() => setModalImage({ 
                                    url: bill.previousPhotoUrl, 
                                    title: "Previous Month Reading", 
                                    subtitle: `Reading: ${bill.previousReading}` 
                                })}
                            >
                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group-hover:ring-2 ring-blue-500 transition-all">
                                    {bill.previousPhotoUrl ? (
                                        <>
                                            <img src={bill.previousPhotoUrl} alt="Previous" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                                    )}
                                    <div className="absolute bottom-0 w-full bg-black/60 text-white text-[10px] p-1 text-center backdrop-blur-sm">
                                        Reading: {bill.previousReading}
                                    </div>
                                </div>
                                <p className="text-xs text-center text-gray-500">Previous Month</p>
                            </div>

                            {/* Current Reading */}
                            <div 
                                className="space-y-2 cursor-pointer group"
                                onClick={() => setModalImage({ 
                                    url: bill.currentPhotoUrl, 
                                    title: "Current Month Reading", 
                                    subtitle: `Reading: ${bill.currentReading} | Date: ${formatDate(bill.createdAt)}` 
                                })}
                            >
                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative shadow-sm group-hover:ring-2 ring-blue-500 transition-all">
                                    {bill.currentPhotoUrl ? (
                                        <>
                                            <img src={bill.currentPhotoUrl} alt="Current" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                                    )}
                                    <div className="absolute bottom-0 w-full bg-blue-600/80 text-white text-[10px] p-1 text-center backdrop-blur-sm">
                                        Reading: {bill.currentReading} | {formatDate(bill.createdAt)}
                                    </div>
                                </div>
                                <p className="text-xs text-center text-gray-500 font-medium">Current Month</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 p-6 text-center border-t border-gray-200">
                        <p className="text-[10px] text-gray-400">
                            This is a computer-generated invoice from MeterProof. <br/>
                            Generated on {new Date().toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* OWNER VIEW - Payment Confirmation Panel */}
                {user && user._id === bill.ownerId?._id && bill.status === 'UNPAID' && (
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl shadow-lg p-5 mb-4 border border-orange-200">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            🏠 Owner Payment Confirmation
                        </h3>
                        
                        {/* Tenant Payment Status */}
                        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Tenant Status:</span>
                                {bill.payment?.status === 'TENANT_CONFIRMED' ? (
                                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                                        ⏳ Says they paid
                                    </span>
                                ) : (
                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                                        Not confirmed
                                    </span>
                                )}
                            </div>
                            {bill.payment?.tenantConfirmedAt && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Confirmed: {formatDate(bill.payment.tenantConfirmedAt)}
                                </p>
                            )}
                        </div>

                        {bill.payment?.status === 'TENANT_CONFIRMED' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                <p className="text-yellow-800 text-sm font-medium">
                                    ⚠️ Tenant says they have paid. Please check your UPI app and confirm if you received ₹{bill.amount}.
                                </p>
                            </div>
                        )}

                        <button 
                            onClick={toggleStatus}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="h-5 w-5" /> Confirm Payment Received (₹{bill.amount})
                        </button>
                        
                        <p className="text-xs text-gray-500 text-center mt-3">
                            Only click this after you've verified the payment in your UPI app
                        </p>
                    </div>
                )}

                {/* TENANT VIEW - UPI Payment Section */}
                {(!user || user._id !== bill.ownerId?._id) && bill.status === 'UNPAID' && (
                    <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
                        <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" /> Quick Pay via UPI
                        </h3>
                        
                        {bill.upiLink ? (
                            <div className="space-y-3">
                                {isMobile ? (
                                    <button
                                        onClick={handleUpiPayment}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="text-xl">📲</span> Pay ₹{bill.amount} via GPay/PhonePe
                                    </button>
                                ) : (
                                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                                        <p className="text-gray-600 text-sm mb-2">Open this page on your phone to pay via UPI</p>
                                        <p className="text-xs text-gray-400">UPI deep links only work on mobile devices</p>
                                    </div>
                                )}
                                
                                {bill.payment?.status !== 'TENANT_CONFIRMED' && (
                                    <button
                                        onClick={handleTenantConfirm}
                                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> I have already paid
                                    </button>
                                )}
                                
                                {bill.payment?.status === 'TENANT_CONFIRMED' && (
                                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-center">
                                        <p className="text-yellow-700 text-sm font-medium">✓ You confirmed payment</p>
                                        <p className="text-yellow-600 text-xs">Waiting for owner to verify</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <p className="text-gray-500 text-sm">UPI payment not available</p>
                                <p className="text-xs text-gray-400">Owner has not configured UPI ID</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mb-8">
                    <button 
                        onClick={shareWhatsApp} 
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Share2 className="h-5 w-5" /> WhatsApp
                    </button>
                    
                    <button 
                        onClick={handleDownloadPDF} 
                        disabled={downloading}
                        className="flex-1 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 py-3 rounded-xl font-bold shadow-lg shadow-gray-100 transition-all flex items-center justify-center gap-2"
                    >
                        {downloading ? (
                            <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"/> Generating...</span>
                        ) : (
                            <><Download className="h-5 w-5" /> Download PDF</>
                        )}
                    </button>

                    {/* Owner: Button to mark as unpaid if already paid */}
                    {user && user._id === bill.ownerId?._id && bill.status === 'PAID' && (
                        <button 
                            onClick={toggleStatus}
                            className="px-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center bg-orange-100 text-orange-600"
                        >
                            Mark Unpaid
                        </button>
                    )}
                </div>

            </div>

            {/* Fullscreen Image Modal */}
            <ImageModal 
                isOpen={!!modalImage}
                onClose={() => setModalImage(null)}
                imageUrl={modalImage?.url}
                title={modalImage?.title}
                subtitle={modalImage?.subtitle}
            />
        </div>
    );
};

export default ViewBill;
