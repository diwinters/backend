import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useCity } from '../contexts/CityContext';
import {
  Hash,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Pin,
  Star,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  Rss,
  Home,
  Compass,
  Users,
  Bookmark,
  Heart,
  Sparkles,
  TrendingUp,
  Globe,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface Feed {
  id: number;
  name: string;
  name_ar: string | null;
  feed_uri: string | null;
  feed_type: string;
  description: string | null;
  description_ar: string | null;
  icon: string;
  color: string;
  sort_order: number;
  is_pinned: boolean;
  is_default: boolean;
  is_active: boolean;
  city_id: number | null;
  city_name?: string;
  created_at: string;
  updated_at: string;
}

// Icon mapping
const iconOptions: { value: string; label: string; icon: React.ReactNode }[] = [
  { value: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
  { value: 'hash', label: 'Hash', icon: <Hash className="w-4 h-4" /> },
  { value: 'rss', label: 'Feed', icon: <Rss className="w-4 h-4" /> },
  { value: 'compass', label: 'Discover', icon: <Compass className="w-4 h-4" /> },
  { value: 'users', label: 'Following', icon: <Users className="w-4 h-4" /> },
  { value: 'bookmark', label: 'Saved', icon: <Bookmark className="w-4 h-4" /> },
  { value: 'heart', label: 'Heart', icon: <Heart className="w-4 h-4" /> },
  { value: 'sparkles', label: 'Sparkles', icon: <Sparkles className="w-4 h-4" /> },
  { value: 'trending', label: 'Trending', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'globe', label: 'Global', icon: <Globe className="w-4 h-4" /> },
];

const feedTypeOptions = [
  { value: 'following', label: 'Following (User\'s Timeline)' },
  { value: 'discover', label: 'Discover (Algorithm)' },
  { value: 'custom', label: 'Custom Feed (URI)' },
  { value: 'list', label: 'List' },
  { value: 'hashtag', label: 'Hashtag' },
];

// =============================================================================
// Icon Renderer
// =============================================================================

function FeedIcon({ icon, color, size = 'md' }: { icon: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  
  const IconComponent = (() => {
    switch (icon) {
      case 'home': return Home;
      case 'hash': return Hash;
      case 'rss': return Rss;
      case 'compass': return Compass;
      case 'users': return Users;
      case 'bookmark': return Bookmark;
      case 'heart': return Heart;
      case 'sparkles': return Sparkles;
      case 'trending': return TrendingUp;
      case 'globe': return Globe;
      default: return Hash;
    }
  })();
  
  return <IconComponent className={sizeClass} style={{ color }} />;
}

// =============================================================================
// Feed Card Component
// =============================================================================

function FeedCard({
  feed,
  onEdit,
  onDelete,
  onToggleActive,
  onTogglePinned,
  onSetDefault,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  feed: Feed;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onTogglePinned: () => void;
  onSetDefault: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${
      !feed.is_active ? 'opacity-60' : ''
    }`}>
      <div className="p-4 flex items-center gap-4">
        {/* Drag Handle / Order Controls */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className={`p-1 rounded transition-colors ${
              isFirst 
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                : 'text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 font-medium">{feed.sort_order}</span>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className={`p-1 rounded transition-colors ${
              isLast 
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' 
                : 'text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        {/* Icon */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${feed.color}20` }}
        >
          <FeedIcon icon={feed.icon} color={feed.color} size="lg" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {feed.name}
            </h3>
            {feed.is_default && (
              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                Default
              </span>
            )}
            {feed.is_pinned && (
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full flex items-center gap-1">
                <Pin className="w-3 h-3" />
                Pinned
              </span>
            )}
          </div>
          {feed.name_ar && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate" dir="rtl">
              {feed.name_ar}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 capitalize">{feed.feed_type}</span>
            {feed.feed_uri && (
              <span className="text-xs text-gray-400 truncate max-w-[200px]" title={feed.feed_uri}>
                • {feed.feed_uri}
              </span>
            )}
            {feed.city_name && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {feed.city_name}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleActive}
            className={`p-2 rounded-lg transition-colors ${
              feed.is_active 
                ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={feed.is_active ? 'Deactivate' : 'Activate'}
          >
            {feed.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button
            onClick={onTogglePinned}
            className={`p-2 rounded-lg transition-colors ${
              feed.is_pinned 
                ? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={feed.is_pinned ? 'Unpin from tabs' : 'Pin to tabs'}
          >
            <Pin className="w-5 h-5" />
          </button>
          <button
            onClick={onSetDefault}
            className={`p-2 rounded-lg transition-colors ${
              feed.is_default 
                ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title={feed.is_default ? 'Default feed' : 'Set as default'}
          >
            <Star className="w-5 h-5" />
          </button>
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-primary-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Edit"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Feed Form Dialog
// =============================================================================

function FeedFormDialog({
  feed,
  onClose,
  onSave,
}: {
  feed: Feed | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const { cities } = useCity();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: feed?.name || '',
    name_ar: feed?.name_ar || '',
    feed_uri: feed?.feed_uri || '',
    feed_type: feed?.feed_type || 'custom',
    description: feed?.description || '',
    description_ar: feed?.description_ar || '',
    icon: feed?.icon || 'hash',
    color: feed?.color || '#3B82F6',
    sort_order: feed?.sort_order ?? 0,
    is_pinned: feed?.is_pinned ?? true,
    is_default: feed?.is_default ?? false,
    is_active: feed?.is_active ?? true,
    city_id: feed?.city_id || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {feed ? 'Edit Feed' : 'Add Feed'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name (English) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Following"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name (Arabic)
              </label>
              <input
                type="text"
                value={formData.name_ar || ''}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="متابعون"
                dir="rtl"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Feed Type & URI */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Feed Type *
              </label>
              <select
                value={formData.feed_type}
                onChange={(e) => setFormData({ ...formData, feed_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {feedTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Feed URI {formData.feed_type === 'custom' && '(Required)'}
              </label>
              <input
                type="text"
                value={formData.feed_uri || ''}
                onChange={(e) => setFormData({ ...formData, feed_uri: e.target.value })}
                placeholder="at://did:plc:.../app.bsky.feed.generator/..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Feed description..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (Arabic)
              </label>
              <textarea
                value={formData.description_ar || ''}
                onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                placeholder="وصف التغذية..."
                dir="rtl"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Icon
              </label>
              <div className="flex flex-wrap gap-2">
                {iconOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: opt.value })}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      formData.icon === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    title={opt.label}
                  >
                    <div style={{ color: formData.color }}>{opt.icon}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              {/* Preset colors */}
              <div className="flex gap-2 mt-2">
                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City (Optional)
              </label>
              <select
                value={formData.city_id || ''}
                onChange={(e) => setFormData({ ...formData, city_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Cities (Global)</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Pinned (show in tabs)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Default (open on start)</span>
            </label>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Preview</p>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${formData.color}20` }}
              >
                <FeedIcon icon={formData.icon} color={formData.color} />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{formData.name || 'Feed Name'}</p>
                {formData.name_ar && (
                  <p className="text-sm text-gray-500" dir="rtl">{formData.name_ar}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {feed ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Main Feeds Page
// =============================================================================

export default function Feeds() {
  const { currentCity } = useCity();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeeds = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getFeeds();
      setFeeds(response.feeds);
    } catch (err: any) {
      setError(err.message || 'Failed to load feeds');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeeds();
  }, []);

  const handleCreateFeed = async (data: any) => {
    await api.createFeed(data);
    await loadFeeds();
    setShowAddDialog(false);
  };

  const handleUpdateFeed = async (data: any) => {
    if (!editingFeed) return;
    await api.updateFeed(editingFeed.id, data);
    await loadFeeds();
    setEditingFeed(null);
  };

  const handleDeleteFeed = async (feed: Feed) => {
    if (!confirm(`Are you sure you want to delete "${feed.name}"?`)) return;
    await api.deleteFeed(feed.id);
    await loadFeeds();
  };

  const handleToggleActive = async (feed: Feed) => {
    await api.toggleFeedActive(feed.id);
    await loadFeeds();
  };

  const handleTogglePinned = async (feed: Feed) => {
    await api.toggleFeedPinned(feed.id);
    await loadFeeds();
  };

  const handleSetDefault = async (feed: Feed) => {
    await api.setFeedDefault(feed.id);
    await loadFeeds();
  };

  const handleMoveUp = async (feed: Feed, index: number) => {
    if (index === 0) return;
    const prevFeed = feeds[index - 1];
    await api.reorderFeeds([
      { id: feed.id, sort_order: prevFeed.sort_order },
      { id: prevFeed.id, sort_order: feed.sort_order },
    ]);
    await loadFeeds();
  };

  const handleMoveDown = async (feed: Feed, index: number) => {
    if (index === feeds.length - 1) return;
    const nextFeed = feeds[index + 1];
    await api.reorderFeeds([
      { id: feed.id, sort_order: nextFeed.sort_order },
      { id: nextFeed.id, sort_order: feed.sort_order },
    ]);
    await loadFeeds();
  };

  // Filter feeds by selected city
  const filteredFeeds = currentCity 
    ? feeds.filter((f) => f.city_id === null || f.city_id === currentCity.id)
    : feeds;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Feed Tabs</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage the feed tabs that appear in the Feeds screen
          </p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Feed
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Rss className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{feeds.length}</p>
              <p className="text-sm text-gray-500">Total Feeds</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{feeds.filter((f) => f.is_active).length}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Pin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{feeds.filter((f) => f.is_pinned).length}</p>
              <p className="text-sm text-gray-500">Pinned</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{feeds.filter((f) => f.is_default).length}</p>
              <p className="text-sm text-gray-500">Default</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feed List */}
      {filteredFeeds.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <Rss className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No feeds yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create your first feed to get started
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Feed
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeeds.map((feed, index) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              onEdit={() => setEditingFeed(feed)}
              onDelete={() => handleDeleteFeed(feed)}
              onToggleActive={() => handleToggleActive(feed)}
              onTogglePinned={() => handleTogglePinned(feed)}
              onSetDefault={() => handleSetDefault(feed)}
              onMoveUp={() => handleMoveUp(feed, index)}
              onMoveDown={() => handleMoveDown(feed, index)}
              isFirst={index === 0}
              isLast={index === filteredFeeds.length - 1}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showAddDialog && (
        <FeedFormDialog
          feed={null}
          onClose={() => setShowAddDialog(false)}
          onSave={handleCreateFeed}
        />
      )}
      {editingFeed && (
        <FeedFormDialog
          feed={editingFeed}
          onClose={() => setEditingFeed(null)}
          onSave={handleUpdateFeed}
        />
      )}
    </div>
  );
}
