import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { newsAPI } from '../services/api';
import { Newspaper, Plus, Edit2, Trash2, Eye, EyeOff, Calendar, Megaphone, UserPlus, Award, X } from 'lucide-react';

const News = () => {
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general',
    eventDate: '',
    priority: 'medium',
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await newsAPI.getAll({ limit: 50 });
      setNews(response.data.data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPost) {
        await newsAPI.update(editingPost._id, formData);
      } else {
        await newsAPI.create(formData);
      }
      setShowModal(false);
      setEditingPost(null);
      setFormData({ title: '', content: '', type: 'general', eventDate: '', priority: 'medium' });
      fetchNews();
    } catch (error) {
      console.error('Error saving news:', error);
      alert(error.response?.data?.message || 'Failed to save news post');
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      type: post.type,
      eventDate: post.eventDate ? new Date(post.eventDate).toISOString().split('T')[0] : '',
      priority: post.priority,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await newsAPI.delete(id);
        fetchNews();
      } catch (error) {
        console.error('Error deleting news:', error);
        alert('Failed to delete post');
      }
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await newsAPI.toggleActive(id);
      fetchNews();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'announcement': return <Megaphone className="h-5 w-5" />;
      case 'employee': return <UserPlus className="h-5 w-5" />;
      case 'event': return <Calendar className="h-5 w-5" />;
      case 'achievement': return <Award className="h-5 w-5" />;
      default: return <Newspaper className="h-5 w-5" />;
    }
  };

  const getTypeConfig = (type) => {
    const configs = {
      announcement: { bg: 'bg-primary-50', border: 'border-primary-600', badge: 'bg-primary-600' },
      employee: { bg: 'bg-green-50', border: 'border-green-600', badge: 'bg-green-600' },
      event: { bg: 'bg-purple-50', border: 'border-purple-600', badge: 'bg-purple-600' },
      achievement: { bg: 'bg-yellow-50', border: 'border-yellow-600', badge: 'bg-yellow-600' },
      general: { bg: 'bg-gray-50', border: 'border-gray-600', badge: 'bg-gray-600' },
    };
    return configs[type] || configs.general;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading News...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-12 bg-primary-600"></div>
            <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Latest Updates</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight">News & Events</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingPost(null);
              setFormData({ title: '', content: '', type: 'general', eventDate: '', priority: 'medium' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold uppercase tracking-wide rounded-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            Create Post
          </button>
        )}
      </div>

      {/* News List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {news.map((post) => {
          const config = getTypeConfig(post.type);
          return (
            <div key={post._id} className={`relative ${config.bg} rounded-xl p-6 border-l-4 ${config.border} shadow-md hover:shadow-lg transition-all ${!post.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${config.badge} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md text-white`}>
                  {getTypeIcon(post.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-1 ${config.badge} text-white text-[10px] font-black uppercase tracking-widest rounded`}>
                      {post.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    {!post.isActive && (
                      <span className="px-2 py-1 bg-gray-600 text-white text-[10px] font-black uppercase tracking-widest rounded">
                        Hidden
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    {post.content}
                  </p>
                  {post.eventDate && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="font-semibold">
                        Event Date: {new Date(post.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  {post.createdBy && (
                    <p className="text-xs text-gray-500">
                      Posted by: {post.createdBy.fullName || post.createdBy.username}
                    </p>
                  )}
                </div>
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(post)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide rounded hover:bg-blue-200 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(post._id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wide rounded hover:bg-gray-200 transition-colors"
                  >
                    {post.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {post.isActive ? 'Hide' : 'Show'}
                  </button>
                  <button
                    onClick={() => handleDelete(post._id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wide rounded hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {news.length === 0 && !loading && (
        <div className="py-16 text-center text-gray-400">
          <Newspaper className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-semibold">No news posts yet</p>
          {isAdmin && <p className="text-sm mt-1">Create your first post to get started</p>}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                {editingPost ? 'Edit Post' : 'Create Post'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPost(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Content
                </label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows="5"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Enter post content"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                    Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
                  >
                    <option value="general">General</option>
                    <option value="announcement">Announcement</option>
                    <option value="employee">New Employee</option>
                    <option value="event">Event</option>
                    <option value="achievement">Achievement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Event Date (Optional)
                </label>
                <input
                  type="date"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary-600 text-white font-black uppercase tracking-wide rounded-lg hover:bg-primary-700 transition-all"
                >
                  {editingPost ? 'Update Post' : 'Create Post'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPost(null);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-bold uppercase tracking-wide rounded-lg hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default News;

