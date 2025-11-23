// src/app/student/blogs/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/student/LoadingSpinner';

export default function BlogsPage() {
  const [allBlogs, setAllBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await fetch('/api/blogs?status=published');
        if (response.ok) {
          const data = await response.json();
          setAllBlogs(data.blogs || []);
        }
      } catch (error) {
        console.error('Failed to fetch blogs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  // Get all unique tags
  const allTags = Array.from(new Set(allBlogs.flatMap(blog => blog.tags || [])));

  // Filter blogs
  const filteredBlogs = allBlogs.filter(blog => {
    const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (blog.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || (blog.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag && blog.status === 'published';
  });

  // Calculate real stats
  const totalArticles = filteredBlogs.length;
  const totalCategories = allTags.length;
  
  // Calculate total read time (estimate: 200 words per minute, average word length ~5 chars)
  const calculateReadTime = (content: string): number => {
    // Remove HTML tags and count words
    const textContent = content.replace(/<[^>]*>/g, '');
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  };
  
  const totalReadTime = filteredBlogs.reduce((sum, blog) => {
    return sum + calculateReadTime(blog.content || '');
  }, 0);

  const featuredBlog = filteredBlogs[0];
  const regularBlogs = filteredBlogs.slice(1);

  if (loading) {
    return <LoadingSpinner message="Loading blogs..." fullScreen />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -ml-32 -mb-32"></div>

        <div className="relative z-10">
          <h1 className="text-5xl font-bold mb-4">Learning Blog</h1>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl">
            Insights, tutorials, and stories from the world of learning and development
          </p>

          {/* Search */}
          <div className="max-w-xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-12 pr-4 py-4 bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30 rounded-2xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalArticles}</p>
              <p className="text-sm text-gray-600">Total Articles</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalCategories}</p>
              <p className="text-sm text-gray-600">Categories</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalReadTime}</p>
              <p className="text-sm text-gray-600">Min Read Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tags Filter */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              !selectedTag
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Topics
          </button>
          {allTags.map((tag: string) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-xl font-medium transition capitalize ${
                selectedTag === tag
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Blog */}
      {featuredBlog && (
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="relative h-96">
              <img
                src={featuredBlog.cover}
                alt={featuredBlog.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-6">
                <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-full shadow-lg">
                  ⭐ FEATURED
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            </div>
            <div className="p-8 flex flex-col justify-center">
              <div className="flex items-center space-x-2 mb-4">
                {featuredBlog.tags.slice(0, 2).map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full uppercase">
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                {featuredBlog.title}
              </h2>
              <p className="text-gray-600 mb-6 line-clamp-3">
                {featuredBlog.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{featuredBlog.createdAt ? new Date(featuredBlog.createdAt).toLocaleDateString() : ''}</span>
                  </span>
                  <span>•</span>
                  <span>5 min read</span>
                </div>
                <Link href={`/student/blogs/${featuredBlog.slug}`}>
                  <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition shadow-lg flex items-center space-x-2">
                    <span>Read More</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regular Blogs Grid */}
      {regularBlogs.length > 0 ? (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Latest Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularBlogs.map(blog => (
              <Link key={blog.id} href={`/student/blogs/${blog.slug}`}>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={blog.cover}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      {blog.tags.slice(0, 2).map((tag: string) => (
                        <span key={tag} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full uppercase">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {blog.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {blog.content.replace(/<[^>]*>/g, '').substring(0, 120)}...
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : ''}</span>
                      </span>
                      <span className="text-purple-600 font-semibold flex items-center space-x-1">
                        <span>Read</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
