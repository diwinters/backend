import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Eye, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Search,
  Tag,
  MapPin,
  Users,
  Home,
  Sparkles
} from 'lucide-react'
import { api } from '../lib/api'

interface StayPost {
  id: number
  postUri: string
  postCid: string
  authorDid: string
  authorHandle?: string
  categories: {
    propertyType?: string
    experience?: string
    amenities: string[]
    priceRange?: string
    guestType?: string
    dakhlaSpecific?: {
      kitesurf?: boolean
      windExposure?: string
      lagoonAccess?: string
    }
  }
  amenities: string[]
  propertyType?: string
  priceRange?: string
  guestType?: string
  pricePerNight?: number
  currency?: string
  locationText?: string
  latitude?: number
  longitude?: number
  approvalStatus: 'pending' | 'approved' | 'rejected'
  curatedCategories: string[]
  submittedAt: string
  reviewedAt?: string
  rejectionReason?: string
  providerName?: string
  provider_is_active?: boolean
}

const CURATED_CATEGORIES = [
  { id: 'kitesurfer_package', name: 'Kitesurfer Package', icon: '🪁' },
  { id: 'family_vacation', name: 'Family Vacation', icon: '👨‍👩‍👧‍👦' },
  { id: 'digital_nomad', name: 'Digital Nomad', icon: '💻' },
  { id: 'romantic_getaway', name: 'Romantic Getaway', icon: '💖' },
  { id: 'adventure_seeker', name: 'Adventure Seeker', icon: '🧗‍♂️' },
  { id: 'beachfront_luxury', name: 'Beachfront Luxury', icon: '🏖️' },
  { id: 'budget_friendly', name: 'Budget Friendly', icon: '💰' },
  { id: 'desert_experience', name: 'Desert Experience', icon: '🏜️' },
]

export default function StayPostsApproval() {
  const [posts, setPosts] = useState<StayPost[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedCurated, setSelectedCurated] = useState<Record<number, string[]>>({})

  useEffect(() => {
    fetchPosts()
  }, [filter])

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const data = await api.getStayPosts(params)
      setPosts(data.posts || [])
    } catch (error) {
      console.error('Error fetching stay posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: number) => {
    try {
      const curatedCategories = selectedCurated[id] || []
      await api.approveStayPost(id, curatedCategories)
      fetchPosts()
    } catch (error) {
      console.error('Error approving post:', error)
      alert('Failed to approve post')
    }
  }

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }
    try {
      await api.rejectStayPost(id, rejectReason)
      setRejectingId(null)
      setRejectReason('')
      fetchPosts()
    } catch (error) {
      console.error('Error rejecting post:', error)
      alert('Failed to reject post')
    }
  }

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const toggleCuratedCategory = (postId: number, categoryId: string) => {
    setSelectedCurated(prev => {
      const current = prev[postId] || []
      const updated = current.includes(categoryId)
        ? current.filter(c => c !== categoryId)
        : [...current, categoryId]
      return { ...prev, [postId]: updated }
    })
  }

  const filteredPosts = posts.filter(post => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      post.authorHandle?.toLowerCase().includes(search) ||
      post.providerName?.toLowerCase().includes(search) ||
      post.locationText?.toLowerCase().includes(search) ||
      post.propertyType?.toLowerCase().includes(search)
    )
  })

  const stats = {
    pending: posts.filter(p => p.approval_status === 'pending').length,
    approved: posts.filter(p => p.approval_status === 'approved').length,
    rejected: posts.filter(p => p.approval_status === 'rejected').length,
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Stay Post Approvals</h1>
        <p className="text-gray-600">Review and approve stay accommodation posts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
            <div className="bg-yellow-200 p-3 rounded-full">
              <Eye className="h-6 w-6 text-yellow-700" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Approved</p>
              <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
            </div>
            <div className="bg-green-200 p-3 rounded-full">
              <Check className="h-6 w-6 text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
            </div>
            <div className="bg-red-200 p-3 rounded-full">
              <X className="h-6 w-6 text-red-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex gap-2">
            {[
              { value: 'pending', label: 'Pending', count: stats.pending },
              { value: 'approved', label: 'Approved', count: stats.approved },
              { value: 'rejected', label: 'Rejected', count: stats.rejected },
              { value: 'all', label: 'All', count: posts.length },
            ].map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => setFilter(value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label} <span className="text-sm">({count})</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by author, provider, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {filter !== 'all' ? filter : ''} posts found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Post
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categories
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPosts.map((post) => (
                  <React.Fragment key={post.id}>
                    {/* Main Row */}
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleExpanded(post.id)}
                            className="mt-1 text-gray-400 hover:text-gray-600"
                          >
                            {expandedRows.has(post.id) ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                          <div>
                            <p className="font-medium text-gray-900">
                              {post.authorHandle || post.authorDid.slice(0, 20)}
                            </p>
                            <p className="text-sm text-gray-500">{post.providerName}</p>
                            {post.locationText && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {post.locationText}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {post.propertyType && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <Home className="h-3 w-3 mr-1" />
                              {post.propertyType}
                            </span>
                          )}
                          {post.categories.experience && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {post.categories.experience}
                            </span>
                          )}
                          {post.guestType && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Users className="h-3 w-3 mr-1" />
                              {post.guestType}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {post.pricePerNight ? (
                          <div>
                            <p className="font-medium text-gray-900">
                              {post.currency || 'EUR'} {post.pricePerNight}
                            </p>
                            <p className="text-xs text-gray-500">per night</p>
                            {post.priceRange && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                {post.priceRange}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-900">
                          {format(new Date(post.submittedAt), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(post.submittedAt), 'HH:mm')}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {post.approvalStatus === 'pending' && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                        {post.approvalStatus === 'approved' && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Approved
                          </span>
                        )}
                        {post.approvalStatus === 'rejected' && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {post.approvalStatus === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(post.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingId(post.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </button>
                          </div>
                        )}
                        {post.approvalStatus === 'approved' && (
                          <a
                            href={`https://bsky.app/profile/${post.authorDid}/post/${post.postUri.split('/').pop()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Post →
                          </a>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedRows.has(post.id) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="space-y-4">
                            {/* Amenities */}
                            {post.categories.amenities && post.categories.amenities.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Amenities</h4>
                                <div className="flex flex-wrap gap-2">
                                  {post.categories.amenities.map((amenity) => (
                                    <span
                                      key={amenity}
                                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                                    >
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      {amenity}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Dakhla Kitesurf Features */}
                            {post.categories.dakhlaSpecific && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">🪁 Dakhla Kitesurf Features</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  {post.categories.dakhlaSpecific.kitesurf && (
                                    <div className="flex items-center gap-2">
                                      <Check className="h-4 w-4 text-green-600" />
                                      <span>Kitesurf Friendly</span>
                                    </div>
                                  )}
                                  {post.categories.dakhlaSpecific.windExposure && (
                                    <div>
                                      <span className="text-gray-600">Wind: </span>
                                      <span className="font-medium">{post.categories.dakhlaSpecific.windExposure}</span>
                                    </div>
                                  )}
                                  {post.categories.dakhlaSpecific.lagoonAccess && (
                                    <div>
                                      <span className="text-gray-600">Lagoon: </span>
                                      <span className="font-medium">{post.categories.dakhlaSpecific.lagoonAccess}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Curated Categories Selection (for pending posts) */}
                            {post.approvalStatus === 'pending' && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  Assign to Curated Categories (Optional)
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {CURATED_CATEGORIES.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => toggleCuratedCategory(post.id, cat.id)}
                                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-colors ${
                                        (selectedCurated[post.id] || []).includes(cat.id)
                                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                      }`}
                                    >
                                      <span className="text-lg">{cat.icon}</span>
                                      <span className="text-sm font-medium">{cat.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Curated Categories Display (for approved posts) */}
                            {post.approvalStatus === 'approved' && post.curatedCategories && post.curatedCategories.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Curated Categories</h4>
                                <div className="flex flex-wrap gap-2">
                                  {post.curatedCategories.map((catId) => {
                                    const cat = CURATED_CATEGORIES.find(c => c.id === catId)
                                    return cat ? (
                                      <span
                                        key={catId}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                      >
                                        <span className="mr-1">{cat.icon}</span>
                                        {cat.name}
                                      </span>
                                    ) : null
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Post URI */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-1">Post URI</h4>
                              <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                {post.postUri}
                              </code>
                            </div>

                            {/* Rejection Reason (for rejected posts) */}
                            {post.approvalStatus === 'rejected' && post.rejectionReason && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-red-800 mb-1">Rejection Reason</h4>
                                <p className="text-sm text-red-700">{post.rejectionReason}</p>
                              </div>
                            )}

                            {/* Rejection Form */}
                            {rejectingId === post.id && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-red-800 mb-2">Provide Rejection Reason</h4>
                                <textarea
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  className="w-full px-3 py-2 border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  rows={3}
                                  placeholder="Explain why this post is being rejected..."
                                />
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleReject(post.id)}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
                                  >
                                    Confirm Rejection
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectingId(null)
                                      setRejectReason('')
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

