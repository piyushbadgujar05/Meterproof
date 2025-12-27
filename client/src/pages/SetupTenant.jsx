import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const SetupTenant = () => {
    const [formData, setFormData] = useState({ name: '', unitRate: '', mobile: '' });
    const navigate = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tenant', formData);
            window.location.reload(); // Reload to update dashboard state
        } catch (err) {
            alert('Error setting up tenant');
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4">One-Time Tenant Setup</h2>
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Tenant Name</label>
                    <input 
                        type="text" 
                        required 
                        className="w-full p-2 border rounded"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Mobile (Optional)</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border rounded"
                        value={formData.mobile}
                        onChange={e => setFormData({...formData, mobile: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Unit Rate (₹)</label>
                    <input 
                        type="number" 
                        required 
                        step="0.01"
                        className="w-full p-2 border rounded"
                        value={formData.unitRate}
                        onChange={e => setFormData({...formData, unitRate: e.target.value})}
                    />
                </div>
                <button className="w-full bg-blue-600 text-white p-3 rounded font-bold">Save Tenant</button>
            </form>
        </div>
    );
};

export default SetupTenant;
