'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CourseEditorPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<'details' | 'curriculum' | 'settings'>('details');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingChapter, setEditingChapter] = useState<any>(null);

  const [moduleForm, setModuleForm] = useState({ title: '', description: '', order: 1, isPublished: true, duration: 0 });
  const [savingModule, setSavingModule] = useState(false);

  const [chapterForm, setChapterForm] = useState({
    title: '',
    description: '',
    type: 'video' as 'video' | 'textbook' | 'mcq',
    order: 1,
    isPublished: true,
    videoUrl: '',
    videoDuration: 0,
    videoProvider: 'youtube' as 'youtube' | 'vimeo',
    transcript: '',
    textbookContent: '',
    textbookFileUrl: '',
    readingTime: 0,
    prerequisiteChapterId: '',
    mcqData: '',
  });
  const [savingChapter, setSavingChapter] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  async function fetchCourse() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
      } else {
        console.error('Failed to fetch course');
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveCourseDetails() {
    if (!course) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: course.id,
          title: course.title,
          description: course.description,
          instructor: course.instructor,
          thumbnail: course.thumbnail,
          pricing: course.pricing,
          status: course.status,
          isRequestable: course.isRequestable,
        }),
      });
      if (response.ok) {
        alert('Course updated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update course');
      }
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Course not found</h2>
        <Link href="/admin/courses" className="text-purple-600 hover:text-purple-700">← Back to courses</Link>
      </div>
    );
  }

  const handleCreateModule = () => {
    setEditingModule(null);
    setModuleForm({ title: '', description: '', order: (course.modules?.length || 0) + 1, isPublished: true, duration: 0 });
    setShowModuleModal(true);
  };

  const handleEditModule = (module: any) => {
    setEditingModule(module);
    setModuleForm({ title: module.title, description: module.description || '', order: module.order || 1, isPublished: !!module.isPublished, duration: module.duration || 0 });
    setShowModuleModal(true);
  };

  async function handleSaveModule() {
    if (!moduleForm.title) {
      alert('Module title is required');
      return;
    }

    setSavingModule(true);
    try {
      const url = `/api/admin/courses/${courseId}/modules`;
      const method = editingModule ? 'PUT' : 'POST';
      const body = editingModule ? { id: editingModule.id, ...moduleForm } : moduleForm;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchCourse(); // Refresh course data
        setShowModuleModal(false);
        alert(editingModule ? 'Module updated!' : 'Module created!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save module');
      }
    } catch (error) {
      console.error('Error saving module:', error);
      alert('Failed to save module');
    } finally {
      setSavingModule(false);
    }
  }

  async function handleDeleteModule(moduleId: string) {
    if (!confirm('Delete this module and all its chapters?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules?id=${moduleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchCourse(); // Refresh course data
        alert('Module deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('Failed to delete module');
    }
  }

  const handleCreateChapter = (module: any) => {
    setSelectedModule(module);
    setEditingChapter(null);
    setChapterForm({ 
      title: '', 
      description: '',
      type: 'video', 
      order: (module.chapters?.length || 0) + 1, 
      isPublished: true, 
      videoUrl: '', 
      videoDuration: 0, 
      videoProvider: 'youtube', 
      transcript: '', 
      textbookContent: '', 
      textbookFileUrl: '', 
      readingTime: 0, 
      prerequisiteChapterId: '',
      mcqData: '',
    });
    setShowChapterModal(true);
  };

  const handleEditChapter = (module: any, chapter: any) => {
    setSelectedModule(module);
    setEditingChapter(chapter);
    let formData: any = { 
      title: chapter.title, 
      description: chapter.description || '',
      type: chapter.type, 
      order: chapter.order, 
      isPublished: chapter.isPublished, 
      prerequisiteChapterId: chapter.prerequisiteChapterId || '' 
    };
    if (chapter.type === 'video') {
      formData = { 
        ...formData, 
        videoUrl: chapter.videoUrl || '', 
        videoDuration: chapter.videoDuration || 0, 
        videoProvider: chapter.videoProvider || 'youtube', 
        transcript: chapter.transcript || '' 
      };
    } else if (chapter.type === 'textbook') {
      formData = { 
        ...formData, 
        textbookContent: chapter.textbookContent || '', 
        textbookFileUrl: chapter.textbookFileUrl || '', 
        readingTime: chapter.readingTime || 0 
      };
    } else if (chapter.type === 'mcq') {
      formData = { ...formData, mcqData: chapter.mcqData || '' };
    }
    setChapterForm(formData);
    setShowChapterModal(true);
  };

  async function handleSaveChapter() {
    if (!chapterForm.title) {
      alert('Chapter title is required');
      return;
    }

    setSavingChapter(true);
    try {
      const url = `/api/admin/courses/${courseId}/modules/${selectedModule.id}/chapters`;
      const method = editingChapter ? 'PUT' : 'POST';
      const body = editingChapter ? { id: editingChapter.id, ...chapterForm } : chapterForm;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await fetchCourse(); // Refresh course data
        setShowChapterModal(false);
        alert(editingChapter ? 'Chapter updated!' : 'Chapter created!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to save chapter');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Failed to save chapter');
    } finally {
      setSavingChapter(false);
    }
  }

  async function handleDeleteChapter(moduleId: string, chapterId: string) {
    if (!confirm('Delete this chapter?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/modules/${moduleId}/chapters?id=${chapterId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchCourse(); // Refresh course data
        alert('Chapter deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete chapter');
      }
    } catch (error) {
      console.error('Error deleting chapter:', error);
      alert('Failed to delete chapter');
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/courses" className="p-2 hover:bg-gray-100 rounded-xl transition">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-600">Edit course details and curriculum</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{course.status === 'published' ? 'Published' : 'Draft'}</span>
          <button onClick={saveCourseDetails} disabled={saving} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        <div className="flex space-x-2">
          <button onClick={() => setActiveTab('details')} className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${activeTab === 'details' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}>Course Details</button>
          <button onClick={() => setActiveTab('curriculum')} className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${activeTab === 'curriculum' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}>Curriculum Builder</button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${activeTab === 'settings' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}>Settings</button>
        </div>
      </div>

      {activeTab === 'details' && (
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Information</h2>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
                <input type="text" value={course.title || ''} onChange={(e) => setCourse({ ...course, title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructor *</label>
                <input type="text" value={course.instructor || ''} onChange={(e) => setCourse({ ...course, instructor: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pricing (₹)</label>
                <input type="number" value={course.pricing || 0} onChange={(e) => setCourse({ ...course, pricing: Number(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea value={course.description || ''} onChange={(e) => setCourse({ ...course, description: e.target.value })} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL</label>
              <input type="text" value={course.thumbnail || ''} onChange={(e) => setCourse({ ...course, thumbnail: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              {course.thumbnail && (<img src={course.thumbnail} alt="Preview" className="mt-3 w-full h-64 object-cover rounded-xl" />)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'curriculum' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Curriculum Builder</h2>
            <button onClick={handleCreateModule} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition shadow-md flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              <span>Add Module</span>
            </button>
          </div>

          {(course.modules?.length || 0) === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No modules yet</h3>
              <p className="text-gray-600 mb-6">Start building your course curriculum by adding modules</p>
              <button onClick={handleCreateModule} className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition shadow-lg">Create First Module</button>
            </div>
          ) : (
            <div className="space-y-4">
              {course.modules.map((module: any, moduleIndex: number) => (
                <div key={module.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">{moduleIndex + 1}</div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{module.title}</h3>
                          <p className="text-sm text-gray-600">{(module.chapters?.length || 0)} chapters · {module.isPublished ? ' Published' : ' Draft'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleCreateChapter(module)} className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition border border-purple-200">+ Add Chapter</button>
                        <button onClick={() => handleEditModule(module)} className="p-2 text-gray-600 hover:bg-white rounded-lg transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteModule(module.id)} className="p-2 text-red-600 hover:bg-white rounded-lg transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  {(module.chapters?.length || 0) > 0 && (
                    <div className="p-4 space-y-2">
                      {module.chapters.map((chapter: any, chapterIndex: number) => (
                        <div key={chapter.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${chapter.type === 'video' ? 'bg-blue-100' : chapter.type === 'textbook' ? 'bg-green-100' : 'bg-purple-100'}`}>
                              {chapter.type === 'video' && (<svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>)}
                              {chapter.type === 'textbook' && (<svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>)}
                              {chapter.type === 'mcq' && (<svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{chapterIndex + 1}. {chapter.title}</p>
                              <p className="text-sm text-gray-600 capitalize">{chapter.type}{chapter.type === 'video' && chapter.videoDuration ? ` · ${chapter.videoDuration} min` : ''}{chapter.prerequisiteChapterId ? ' · Has prerequisite' : ''}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${chapter.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>{chapter.isPublished ? 'Published' : 'Draft'}</span>
                            <button onClick={() => handleEditChapter(module, chapter)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteChapter(module.id, chapter.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Settings</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Visibility & Access</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                  <input type="checkbox" checked={!!course.isRequestable} onChange={(e) => setCourse({ ...course, isRequestable: e.target.checked })} className="w-5 h-5 text-purple-600 rounded" />
                  <div>
                    <p className="font-semibold text-gray-900">Allow Access Requests</p>
                    <p className="text-sm text-gray-600">Students can request access to this course</p>
                  </div>
                </label>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Publication Status</h3>
              <div className="flex space-x-4">
                <button onClick={async () => {
                  setCourse({ ...course, status: 'draft' });
                  await saveCourseDetails();
                }} className={`flex-1 p-4 rounded-xl border-2 transition ${course.status === 'draft' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-semibold text-gray-900">Draft</p>
                  <p className="text-sm text-gray-600">Only visible to admins</p>
                </button>
                <button onClick={async () => {
                  setCourse({ ...course, status: 'published' });
                  await saveCourseDetails();
                }} className={`flex-1 p-4 rounded-xl border-2 transition ${course.status === 'published' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-semibold text-gray-900">Published</p>
                  <p className="text-sm text-gray-600">Visible to students</p>
                </button>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-red-900 mb-4">Danger Zone</h3>
              <button onClick={async () => {
                if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                  return;
                }
                try {
                  const response = await fetch(`/api/admin/courses?id=${course.id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                  });
                  if (response.ok) {
                    window.location.href = '/admin/courses';
                  } else {
                    const error = await response.json();
                    alert(error.message || 'Failed to delete course');
                  }
                } catch (error) {
                  console.error('Error deleting course:', error);
                  alert('Failed to delete course');
                }
              }} className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition">Delete Course</button>
            </div>
          </div>
        </div>
      )}

      {showModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingModule ? 'Edit Module' : 'Create New Module'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Module Title *</label>
                <input type="text" value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" placeholder="e.g., Introduction to HTML" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <input type="number" value={moduleForm.order} onChange={(e) => setModuleForm({ ...moduleForm, order: Number(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <input type="number" value={moduleForm.duration} onChange={(e) => setModuleForm({ ...moduleForm, duration: Number(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <label className="flex items-center space-x-3">
                <input type="checkbox" checked={moduleForm.isPublished} onChange={(e) => setModuleForm({ ...moduleForm, isPublished: e.target.checked })} className="w-5 h-5 text-purple-600 rounded" />
                <span className="font-medium text-gray-700">Published</span>
              </label>
            </div>
            <div className="mt-6 flex space-x-3">
              <button onClick={handleSaveModule} disabled={!moduleForm.title || savingModule} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {savingModule ? 'Saving...' : (editingModule ? 'Update Module' : 'Create Module')}
              </button>
              <button onClick={() => setShowModuleModal(false)} className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showChapterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingChapter ? 'Edit Chapter' : 'Create New Chapter'}</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chapter Title *</label>
                <input type="text" value={chapterForm.title} onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" placeholder="e.g., Introduction to React Hooks" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={chapterForm.description} onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Chapter Type *</label>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => setChapterForm({ ...chapterForm, type: 'video' })} className={`p-4 rounded-xl border-2 transition ${chapterForm.type === 'video' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
                    <p className="font-semibold text-gray-900">Video</p>
                  </button>
                  <button onClick={() => setChapterForm({ ...chapterForm, type: 'textbook' })} className={`p-4 rounded-xl border-2 transition ${chapterForm.type === 'textbook' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <svg className="w-8 h-8 mx-auto mb-2 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>
                    <p className="font-semibold text-gray-900">Textbook</p>
                  </button>
                  <button onClick={() => setChapterForm({ ...chapterForm, type: 'mcq' })} className={`p-4 rounded-xl border-2 transition ${chapterForm.type === 'mcq' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <svg className="w-8 h-8 mx-auto mb-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                    <p className="font-semibold text-gray-900">Quiz</p>
                  </button>
                </div>
              </div>

              {chapterForm.type === 'video' && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Video Provider</label>
                      <select value={chapterForm.videoProvider} onChange={(e) => setChapterForm({ ...chapterForm, videoProvider: e.target.value as 'youtube' | 'vimeo' })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white">
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                      <input type="number" value={chapterForm.videoDuration} onChange={(e) => setChapterForm({ ...chapterForm, videoDuration: Number(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Video URL (Embed)</label>
                    <input type="text" value={chapterForm.videoUrl} onChange={(e) => setChapterForm({ ...chapterForm, videoUrl: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" placeholder="https://www.youtube.com/embed/..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transcript (Optional)</label>
                    <textarea value={chapterForm.transcript} onChange={(e) => setChapterForm({ ...chapterForm, transcript: e.target.value })} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
                  </div>
                </>
              )}

              {chapterForm.type === 'textbook' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reading Time (minutes)</label>
                    <input type="number" value={chapterForm.readingTime} onChange={(e) => setChapterForm({ ...chapterForm, readingTime: Number(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rich Text Content</label>
                    <textarea value={chapterForm.textbookContent} onChange={(e) => setChapterForm({ ...chapterForm, textbookContent: e.target.value })} rows={8} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm" placeholder="<h1>Chapter Content</h1><p>Your content here...</p>" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PDF URL (Optional)</label>
                    <input type="text" value={chapterForm.textbookFileUrl} onChange={(e) => setChapterForm({ ...chapterForm, textbookFileUrl: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" placeholder="https://example.com/document.pdf" />
                  </div>
                </>
              )}

              {chapterForm.type === 'mcq' && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center">
                  <svg className="w-12 h-12 text-purple-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  <p className="text-gray-700 font-medium">Quiz questions can be added after creating the chapter</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisite Chapter (Optional)</label>
                <select value={chapterForm.prerequisiteChapterId} onChange={(e) => setChapterForm({ ...chapterForm, prerequisiteChapterId: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white">
                  <option value="">None</option>
                  {selectedModule?.chapters?.filter((ch: any) => ch.id !== editingChapter?.id).map((ch: any) => (<option key={ch.id} value={ch.id}>{ch.title}</option>))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <input type="number" value={chapterForm.order} onChange={(e) => setChapterForm({ ...chapterForm, order: Number(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl w-full">
                    <input type="checkbox" checked={chapterForm.isPublished} onChange={(e) => setChapterForm({ ...chapterForm, isPublished: e.target.checked })} className="w-5 h-5 text-purple-600 rounded" />
                    <span className="font-medium text-gray-700">Published</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-8 flex space-x-3">
              <button onClick={handleSaveChapter} disabled={!chapterForm.title || savingChapter} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {savingChapter ? 'Saving...' : (editingChapter ? 'Update Chapter' : 'Create Chapter')}
              </button>
              <button onClick={() => setShowChapterModal(false)} className="px-8 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


