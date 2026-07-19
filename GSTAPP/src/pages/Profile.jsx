import { useState } from 'react';
import { User, Mail, Shield, Building2, Save, Key, UserCircle } from 'lucide-react';

export default function Profile() {
  const [name, setName] = useState(localStorage.getItem('userName') || 'John Smith');
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || 'john@gstrecon.in');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    setIsEditing(false);
    // You could optionally dispatch an event here to notify Header to update immediately
    window.location.reload();
  };

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JS';

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your personal information and account security.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Info */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4 ring-4 ring-blue-50">
                {initials}
              </div>
              <button className="absolute bottom-4 right-0 bg-white p-2 rounded-full shadow border border-gray-200 text-gray-500 hover:text-blue-600 transition-colors">
                <UserCircle size={18} />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{name}</h2>
            <p className="text-sm text-gray-500 mt-1">{email}</p>
            <div className="mt-4 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-100 flex items-center gap-1.5 inline-flex">
              <Shield size={12} />
              Senior Auditor
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Account Details</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Building2 size={16} className="text-gray-400" />
                <span>GST Recon Inc.</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Shield size={16} className="text-gray-400" />
                <span>Admin Privileges</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Key size={16} className="text-gray-400" />
                <span>Last login: 2 hours ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 sm:text-sm rounded-lg transition-colors ${
                        isEditing 
                          ? 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                      } border`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="email"
                      disabled={!isEditing}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 sm:text-sm rounded-lg transition-colors ${
                        isEditing 
                          ? 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed'
                      } border`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Company / Organization
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    disabled={true}
                    value="GST Recon Inc."
                    className="block w-full pl-10 pr-3 py-2.5 sm:text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Your organization is managed by the system administrator.</p>
              </div>

              {isEditing && (
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setName(localStorage.getItem('userName') || 'John Smith');
                      setEmail(localStorage.getItem('userEmail') || 'john@gstrecon.in');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                  >
                    <Save size={16} />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
