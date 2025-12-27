import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Link } from 'react-router-dom';

const History = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBills = async () => {
            try {
                const res = await api.get('/bill');
                setBills(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBills();
    }, []);

    if (loading) return <div className="p-4">Loading...</div>;

    return (
        <div className="p-4 max-w-md mx-auto">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">Bill History</h1>
                <Link to="/" className="text-blue-600">Back</Link>
            </header>
            
            <div className="space-y-4">
                {bills.map(bill => (
                    <div key={bill._id} className="border p-4 rounded flex justify-between items-center bg-white shadow-sm">
                        <div>
                            <div className="font-bold text-lg">{bill.month}</div>
                            <div className="text-sm text-gray-500">{bill.units} Units</div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-blue-600">₹{bill.amount}</div>
                            <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${bill.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {bill.status}
                            </div>
                        </div>
                        <Link to={`/bill/${bill._id}`} className="ml-4 text-gray-400 hover:text-blue-600">
                            View
                        </Link>
                    </div>
                ))}
                {bills.length === 0 && <p className="text-center text-gray-500">No bills generated yet.</p>}
            </div>
        </div>
    );
};

export default History;
