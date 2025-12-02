import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import {
  MapPin,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Edit2,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  Circle,
  Pentagon,
  Palette,
  GripVertical,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';

interface Place {
  id: number;
  pill_id: number;
  name: string;
  name_ar: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  zone_geojson: any | null;
  zone_fill_color: string;
  zone_stroke_color: string;
  zone_stroke_width: number;
  marker_icon: string;
  marker_color: string;
  place_type: 'point' | 'zone';
  sort_order: number;
  is_active: boolean;
}

interface Pill {
  id: number;
  name: string;
  name_ar: string | null;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  places: Place[];
}

const ICONS = [
  'map-pin', 'waves', 'hotel', 'building-2', 'utensils', 'compass',
  'home', 'tree', 'mountain', 'umbrella', 'coffee', 'shopping-bag',
  'car', 'plane', 'ship', 'train', 'bus', 'bike',
  'heart', 'star', 'flag', 'camera', 'music', 'film',
];

const COLORS = [
  '#3B82F6', '#0EA5E9', '#06B6D4', '#14B8A6', '#10B981', '#22C55E',
  '#84CC16', '#EAB308', '#F59E0B', '#F97316', '#EF4444', '#DC2626',
  '#EC4899', '#D946EF', '#A855F7', '#8B5CF6', '#6366F1', '#64748B',
];

export default function MapPills() {
  const [pills, setPills] = useState<Pill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pill form state
  const [showPillForm, setShowPillForm] = useState(false);
  const [editingPill, setEditingPill] = useState<Pill | null>(null);
  const [pillForm, setPillForm] = useState({
    name: '',
    name_ar: '',
    icon: 'map-pin',
    color: '#3B82F6',
    sort_order: 0,
  });
  
  // Place form state
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [selectedPillId, setSelectedPillId] = useState<number | null>(null);
  const [placeForm, setPlaceForm] = useState({
    name: '',
    name_ar: '',
    description: '',
    place_type: 'point' as 'point' | 'zone',
    latitude: '',
    longitude: '',
    zone_geojson: '',
    zone_fill_color: '#3B82F680',
    zone_stroke_color: '#3B82F6',
    zone_stroke_width: 2,
    marker_icon: 'map-pin',
    marker_color: '#3B82F6',
    sort_order: 0,
  });
  
  // Expanded pills
  const [expandedPills, setExpandedPills] = useState<Set<number>>(new Set());

  const fetchPills = async () => {
    try {
      setLoading(true);
      const data = await api.getMapPillsAdmin();
      setPills(data.pills || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPills();
  }, []);

  const toggleExpanded = (pillId: number) => {
    setExpandedPills(prev => {
      const next = new Set(prev);
      if (next.has(pillId)) {
        next.delete(pillId);
      } else {
        next.add(pillId);
      }
      return next;
    });
  };

  // Pill CRUD
  const handlePillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPill) {
        await api.updateMapPill(editingPill.id, pillForm);
      } else {
        await api.createMapPill(pillForm);
      }
      setShowPillForm(false);
      setEditingPill(null);
      resetPillForm();
      fetchPills();
    } catch (err: any) {
      setError(err.message || 'Failed to save pill');
    }
  };

  const handleEditPill = (pill: Pill) => {
    setEditingPill(pill);
    setPillForm({
      name: pill.name,
      name_ar: pill.name_ar || '',
      icon: pill.icon,
      color: pill.color,
      sort_order: pill.sort_order,
    });
    setShowPillForm(true);
  };

  const handleDeletePill = async (id: number, name: string) => {
    if (!confirm(`Delete pill "${name}" and all its places?`)) return;
    try {
      await api.deleteMapPill(id);
      fetchPills();
    } catch (err: any) {
      setError(err.message || 'Failed to delete pill');
    }
  };

  const handleTogglePill = async (id: number) => {
    try {
      await api.toggleMapPill(id);
      fetchPills();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle pill');
    }
  };

  const resetPillForm = () => {
    setPillForm({
      name: '',
      name_ar: '',
      icon: 'map-pin',
      color: '#3B82F6',
      sort_order: 0,
    });
  };

  // Place CRUD
  const handlePlaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPillId && !editingPlace) return;

    try {
      const payload: any = {
        name: placeForm.name,
        name_ar: placeForm.name_ar || null,
        description: placeForm.description || null,
        place_type: placeForm.place_type,
        marker_icon: placeForm.marker_icon,
        marker_color: placeForm.marker_color,
        sort_order: placeForm.sort_order,
      };

      if (placeForm.place_type === 'point') {
        payload.latitude = parseFloat(placeForm.latitude);
        payload.longitude = parseFloat(placeForm.longitude);
      } else {
        payload.zone_geojson = JSON.parse(placeForm.zone_geojson);
        payload.zone_fill_color = placeForm.zone_fill_color;
        payload.zone_stroke_color = placeForm.zone_stroke_color;
        payload.zone_stroke_width = placeForm.zone_stroke_width;
      }

      if (editingPlace) {
        await api.updateMapPlace(editingPlace.id, payload);
      } else {
        await api.createMapPlace(selectedPillId!, payload);
      }

      setShowPlaceForm(false);
      setEditingPlace(null);
      setSelectedPillId(null);
      resetPlaceForm();
      fetchPills();
    } catch (err: any) {
      setError(err.message || 'Failed to save place');
    }
  };

  const handleAddPlace = (pillId: number) => {
    setSelectedPillId(pillId);
    setEditingPlace(null);
    resetPlaceForm();
    setShowPlaceForm(true);
    // Expand this pill
    setExpandedPills(prev => new Set(prev).add(pillId));
  };

  const handleEditPlace = (place: Place) => {
    setEditingPlace(place);
    setSelectedPillId(place.pill_id);
    setPlaceForm({
      name: place.name,
      name_ar: place.name_ar || '',
      description: place.description || '',
      place_type: place.place_type,
      latitude: place.latitude?.toString() || '',
      longitude: place.longitude?.toString() || '',
      zone_geojson: place.zone_geojson ? JSON.stringify(place.zone_geojson, null, 2) : '',
      zone_fill_color: place.zone_fill_color,
      zone_stroke_color: place.zone_stroke_color,
      zone_stroke_width: place.zone_stroke_width,
      marker_icon: place.marker_icon,
      marker_color: place.marker_color,
      sort_order: place.sort_order,
    });
    setShowPlaceForm(true);
  };

  const handleDeletePlace = async (id: number, name: string) => {
    if (!confirm(`Delete place "${name}"?`)) return;
    try {
      await api.deleteMapPlace(id);
      fetchPills();
    } catch (err: any) {
      setError(err.message || 'Failed to delete place');
    }
  };

  const handleTogglePlace = async (id: number) => {
    try {
      await api.toggleMapPlace(id);
      fetchPills();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle place');
    }
  };

  const resetPlaceForm = () => {
    setPlaceForm({
      name: '',
      name_ar: '',
      description: '',
      place_type: 'point',
      latitude: '',
      longitude: '',
      zone_geojson: '',
      zone_fill_color: '#3B82F680',
      zone_stroke_color: '#3B82F6',
      zone_stroke_width: 2,
      marker_icon: 'map-pin',
      marker_color: '#3B82F6',
      sort_order: 0,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Map Pills</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage location categories and places displayed on the explore map
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPill(null);
            resetPillForm();
            setShowPillForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Pill
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-red-600">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pills List */}
      <div className="space-y-4">
        {pills.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No pills yet. Create your first one!</p>
          </div>
        ) : (
          pills.map((pill) => (
            <div key={pill.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Pill Header */}
              <div 
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpanded(pill.id)}
              >
                <button className="text-gray-400">
                  {expandedPills.has(pill.id) ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
                
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: pill.color + '20' }}
                >
                  <MapPin className="w-5 h-5" style={{ color: pill.color }} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{pill.name}</span>
                    {pill.name_ar && (
                      <span className="text-sm text-gray-500">({pill.name_ar})</span>
                    )}
                    {!pill.is_active && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {pill.places.length} place{pill.places.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleAddPlace(pill.id)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    title="Add Place"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleTogglePill(pill.id)}
                    className={`p-2 rounded-lg ${pill.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                    title={pill.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {pill.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEditPill(pill)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePill(pill.id, pill.name)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Places List */}
              {expandedPills.has(pill.id) && (
                <div className="border-t border-gray-100 bg-gray-50">
                  {pill.places.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      No places yet
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {pill.places.map((place) => (
                        <div key={place.id} className="flex items-center gap-3 p-3 pl-12 hover:bg-gray-100">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: place.marker_color + '20' }}
                          >
                            {place.place_type === 'point' ? (
                              <Circle className="w-4 h-4" style={{ color: place.marker_color }} />
                            ) : (
                              <Pentagon className="w-4 h-4" style={{ color: place.marker_color }} />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 truncate">{place.name}</span>
                              <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-200 rounded">
                                {place.place_type}
                              </span>
                              {!place.is_active && (
                                <span className="text-xs text-gray-400">inactive</span>
                              )}
                            </div>
                            {place.place_type === 'point' && (
                              <p className="text-xs text-gray-500 truncate">
                                {place.latitude?.toFixed(6)}, {place.longitude?.toFixed(6)}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTogglePlace(place.id)}
                              className={`p-1.5 rounded ${place.is_active ? 'text-green-500' : 'text-gray-300'}`}
                            >
                              {place.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleEditPlace(place)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePlace(place.id, place.name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pill Form Modal */}
      {showPillForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingPill ? 'Edit Pill' : 'New Pill'}
              </h2>
              <button onClick={() => setShowPillForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePillSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={pillForm.name}
                  onChange={e => setPillForm({ ...pillForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Beaches"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arabic Name</label>
                <input
                  type="text"
                  value={pillForm.name_ar}
                  onChange={e => setPillForm({ ...pillForm, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., الشواطئ"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPillForm({ ...pillForm, color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        pillForm.color === color ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={pillForm.sort_order}
                  onChange={e => setPillForm({ ...pillForm, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPillForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingPill ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Place Form Modal */}
      {showPlaceForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingPlace ? 'Edit Place' : 'New Place'}
              </h2>
              <button onClick={() => setShowPlaceForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePlaceSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={placeForm.name}
                  onChange={e => setPlaceForm({ ...placeForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Dakhla Beach"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Arabic Name</label>
                <input
                  type="text"
                  value={placeForm.name_ar}
                  onChange={e => setPlaceForm({ ...placeForm, name_ar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="شاطئ الداخلة"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={placeForm.description}
                  onChange={e => setPlaceForm({ ...placeForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlaceForm({ ...placeForm, place_type: 'point' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      placeForm.place_type === 'point' 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Circle className="w-4 h-4" />
                    Point
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaceForm({ ...placeForm, place_type: 'zone' })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      placeForm.place_type === 'zone' 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Pentagon className="w-4 h-4" />
                    Zone
                  </button>
                </div>
              </div>

              {placeForm.place_type === 'point' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={placeForm.latitude}
                      onChange={e => setPlaceForm({ ...placeForm, latitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="23.7136"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={placeForm.longitude}
                      onChange={e => setPlaceForm({ ...placeForm, longitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="-15.9369"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zone GeoJSON
                      <span className="text-gray-400 font-normal ml-1">(Polygon)</span>
                    </label>
                    <textarea
                      value={placeForm.zone_geojson}
                      onChange={e => setPlaceForm({ ...placeForm, zone_geojson: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                      rows={6}
                      placeholder='{"type": "Polygon", "coordinates": [[[lng, lat], ...]]}'
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Use geojson.io to draw your zone and paste the coordinates here
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fill Color</label>
                      <input
                        type="text"
                        value={placeForm.zone_fill_color}
                        onChange={e => setPlaceForm({ ...placeForm, zone_fill_color: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="#3B82F680"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stroke Color</label>
                      <input
                        type="text"
                        value={placeForm.zone_stroke_color}
                        onChange={e => setPlaceForm({ ...placeForm, zone_stroke_color: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marker Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setPlaceForm({ ...placeForm, marker_color: color })}
                      className={`w-6 h-6 rounded-md border-2 transition-all ${
                        placeForm.marker_color === color ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={placeForm.sort_order}
                  onChange={e => setPlaceForm({ ...placeForm, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPlaceForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingPlace ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
