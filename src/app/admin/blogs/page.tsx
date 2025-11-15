"use client";

import { useState, useEffect } from 'react';

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    cover: '',
    content: '',
    tags: '',
    status: 'draft' as 'draft' | 'published',
  });

  const handleCreate = () => {
    setEditingBlog(null);
    setFormData({ title: '', slug: '', cover: '', content: '', tags: '', status: 'draft' });
    setShowModal(true);
  };

  const handleEdit = (blog: any) => {
    setEditingBlog(blog);
    setFormData({ 
      title: blog.title, 
      slug: blog.slug, 
      cover: blog.cover || '', 
      content: blog.content, 
      tags: (blog.tags || []).join(', '), 
      status: blog.status 
    });
    setShowModal(true);
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await fetch('/api/blogs');
        if (response.ok) {
          const data = await response.json();
          setBlogs(data.blogs || []);
        }
      } catch (error) {
        console.error('Failed to fetch blogs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const handleSave = async () => {
    const blogData = {
      title: formData.title,
      slug: formData.slug,
      cover: formData.cover,
      content: formData.content,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      status: formData.status,
      author: editingBlog?.author || 'Nurse Pro Academy Team',
    };

    try {
      if (editingBlog) {
        // Update existing blog
        const response = await fetch(`/api/blogs/${editingBlog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blogData),
        });
        if (response.ok) {
          const data = await response.json();
          setBlogs(blogs.map(b => b.id === editingBlog.id ? data.blog : b));
          alert('Blog updated!');
        } else {
          alert('Failed to update blog');
        }
      } else {
        // Create new blog
        const response = await fetch('/api/blogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blogData),
        });
        if (response.ok) {
          const data = await response.json();
          setBlogs([...blogs, data.blog]);
          alert('Blog created!');
        } else {
          alert('Failed to create blog');
        }
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save blog:', error);
      alert('Failed to save blog');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this blog post?')) {
      try {
        const response = await fetch(`/api/blogs/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setBlogs(blogs.filter(b => b.id !== id));
        } else {
          alert('Failed to delete blog');
        }
      } catch (error) {
        console.error('Failed to delete blog:', error);
        alert('Failed to delete blog');
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    const blog = blogs.find(b => b.id === id);
    if (!blog) {
      return;
    }

    const newStatus = blog.status === 'draft' ? 'published' : 'draft';
    try {
      const response = await fetch(`/api/blogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...blog, status: newStatus }),
      });
      if (response.ok) {
        const data = await response.json();
        setBlogs(blogs.map(b => b.id === id ? data.blog : b));
      } else {
        alert('Failed to update blog status');
      }
    } catch (error) {
      console.error('Failed to update blog status:', error);
      alert('Failed to update blog status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Loading blogs...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
          <p className="mt-2 text-gray-600">Create and manage blog posts</p>
        </div>
        <button onClick={handleCreate} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          <span>Create New Post</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{blogs.length}</p>
              <p className="text-sm text-gray-600">Total Posts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{blogs.filter(b => b.status === 'published').length}</p>
              <p className="text-sm text-gray-600">Published</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{blogs.filter(b => b.status === 'draft').length}</p>
              <p className="text-sm text-gray-600">Drafts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">2.4k</p>
              <p className="text-sm text-gray-600">Total Views</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {blogs.map(blog => (
              <tr key={blog.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-4">
                    <img src={blog.cover} alt={blog.title} className="w-20 h-14 object-cover rounded-lg" />
                    <div>
                      <p className="font-semibold text-gray-900">{blog.title}</p>
                      <p className="text-sm text-gray-500">{blog.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {blog.tags.slice(0, 2).map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">{tag}</span>
                    ))}
                    {blog.tags.length > 2 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">+{blog.tags.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleToggleStatus(blog.id)} className={`px-3 py-1 rounded-full text-xs font-semibold ${blog.status === 'published' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'} transition`}>
                    {blog.status === 'published' ? 'Published' : 'Draft'}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : ''}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(blog)} className="text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                  <button onClick={() => handleDelete(blog.id)} className="text-red-600 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl my-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value, slug: generateSlug(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" placeholder="e.g., 10 Tips for Learning Web Development" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL Slug *</label>
                <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-gray-50" placeholder="10-tips-learning-web-development" />
                <p className="mt-1 text-sm text-gray-500">URL: /student/blogs/{formData.slug || 'your-post-slug'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image URL *</label>
                <input type="text" value={formData.cover} onChange={(e) => setFormData({ ...formData, cover: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" placeholder="https://images.unsplash.com/..." />
                {formData.cover && (<img src={formData.cover} alt="Preview" className="mt-3 w-full h-48 object-cover rounded-xl" />)}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content (HTML) *</label>
                <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} rows={10} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white font-mono text-sm" placeholder="<h1>Your Content</h1><p>Write your blog post content here...</p>" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white" placeholder="web development, javascript, react" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex space-x-4">
                  <button onClick={() => setFormData({ ...formData, status: 'draft' })} className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${formData.status === 'draft' ? 'bg-yellow-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Save as Draft</button>
                  <button onClick={() => setFormData({ ...formData, status: 'published' })} className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${formData.status === 'published' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Publish Now</button>
                </div>
              </div>
            </div>
            <div className="mt-8 flex space-x-3">
              <button onClick={handleSave} disabled={!formData.title || !formData.slug || !formData.cover || !formData.content} className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">{editingBlog ? 'Update Post' : 'Create Post'}</button>
              <button onClick={() => setShowModal(false)} className="px-8 bg-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-300 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
