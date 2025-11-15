'use client';

import { useState } from 'react';
import { getCourses } from '@/lib/data';

export default function AdminSettingsPage() {
  const courses = getCourses();
  const [settings, setSettings] = useState({
    siteName: 'Nurse Pro Academy',
    siteDescription: 'Professional Nursing Education Platform',
    supportEmail: 'support@nurseproacademy.com',
    dailyVideoEnabled: true,
    dailyVideoSourceType: 'manual' as 'manual' | 'auto',
    dailyVideoSourceCourses: [] as string[],
    dailyVideoActiveStudentsOnly: true,
    dailyVideoAvailabilityHours: 24,
    autoApproveRequests: false,
    requireFaceID: true,
    allowPhoneOTP: true,
    maintenanceMode: false,
  });

  const handleSave = () => alert('Settings saved successfully! ✅');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
        <p className="mt-2 text-gray-600">Configure system-wide settings and preferences</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">General Settings</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
            <input type="text" value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
            <textarea value={settings.siteDescription} onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
            <input type="email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Daily Video Module</h2>
            <p className="text-gray-600">Configure daily video challenge settings</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={settings.dailyVideoEnabled} onChange={(e) => setSettings({ ...settings, dailyVideoEnabled: e.target.checked })} className="sr-only peer" />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600" />
          </label>
        </div>

        {settings.dailyVideoEnabled && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Video Selection Method</label>
              <div className="grid md:grid-cols-2 gap-4">
                <button onClick={() => setSettings({ ...settings, dailyVideoSourceType: 'manual' })} className={`p-4 rounded-xl border-2 transition text-left ${settings.dailyVideoSourceType === 'manual' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-semibold text-gray-900 mb-1">Manual Selection</p>
                  <p className="text-sm text-gray-600">Manually choose which video to share daily</p>
                </button>
                <button onClick={() => setSettings({ ...settings, dailyVideoSourceType: 'auto' })} className={`p-4 rounded-xl border-2 transition text-left ${settings.dailyVideoSourceType === 'auto' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-semibold text-gray-900 mb-1">Auto-Rotate</p>
                  <p className="text-sm text-gray-600">Automatically rotate by publish order</p>
                </button>
              </div>
            </div>

            {settings.dailyVideoSourceType === 'auto' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source Courses (Select courses to pull videos from)</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-4">
                  {courses.map(course => (
                    <label key={course.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                      <input type="checkbox" checked={settings.dailyVideoSourceCourses.includes(course.id)} onChange={(e) => {
                        if (e.target.checked) {
                          setSettings({ ...settings, dailyVideoSourceCourses: [...settings.dailyVideoSourceCourses, course.id] });
                        } else {
                          setSettings({ ...settings, dailyVideoSourceCourses: settings.dailyVideoSourceCourses.filter(id => id !== course.id) });
                        }
                      }} className="w-4 h-4 text-purple-600 rounded" />
                      <span className="text-gray-900">{course.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
              <input type="checkbox" checked={settings.dailyVideoActiveStudentsOnly} onChange={(e) => setSettings({ ...settings, dailyVideoActiveStudentsOnly: e.target.checked })} className="w-5 h-5 text-purple-600 rounded mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Share Only to Active Students</p>
                <p className="text-sm text-gray-600">Only students marked as &quot;Active&quot; will receive daily videos</p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Video Availability Duration (hours)</label>
              <input type="number" value={settings.dailyVideoAvailabilityHours} onChange={(e) => setSettings({ ...settings, dailyVideoAvailabilityHours: Number(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" min={1} max={168} />
              <p className="mt-2 text-sm text-gray-500">Videos will be available for {settings.dailyVideoAvailabilityHours} hours after being shared</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Authentication Settings</h2>
        <div className="space-y-4">
          <label className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
            <input type="checkbox" checked={settings.requireFaceID} onChange={(e) => setSettings({ ...settings, requireFaceID: e.target.checked })} className="w-5 h-5 text-purple-600 rounded mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Require Face ID Enrollment</p>
              <p className="text-sm text-gray-600">All students must enroll Face ID during registration</p>
            </div>
          </label>
          <label className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
            <input type="checkbox" checked={settings.allowPhoneOTP} onChange={(e) => setSettings({ ...settings, allowPhoneOTP: e.target.checked })} className="w-5 h-5 text-purple-600 rounded mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Allow Phone + OTP Fallback</p>
              <p className="text-sm text-gray-600">Students can login with phone number and OTP if Face ID fails</p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Access Control</h2>
        <div className="space-y-4">
          <label className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
            <input type="checkbox" checked={settings.autoApproveRequests} onChange={(e) => setSettings({ ...settings, autoApproveRequests: e.target.checked })} className="w-5 h-5 text-purple-600 rounded mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Auto-Approve Course Requests</p>
              <p className="text-sm text-gray-600">Automatically approve all course access requests</p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-red-900 mb-6">Maintenance Mode</h2>
        <label className="flex items-start space-x-3 p-4 bg-white rounded-xl cursor-pointer hover:bg-red-50 transition">
          <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })} className="w-5 h-5 text-red-600 rounded mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Enable Maintenance Mode</p>
            <p className="text-sm text-red-700">Platform will be inaccessible to students. Only admins can access.</p>
          </div>
        </label>
      </div>

      <div className="flex items-center justify-end space-x-4">
        <button className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition">Reset to Defaults</button>
        <button onClick={handleSave} className="px-12 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-blue-700 transition shadow-lg">Save All Settings</button>
      </div>
    </div>
  );
}


