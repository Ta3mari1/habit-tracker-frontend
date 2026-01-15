import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Plus, Check, X, TrendingUp, Calendar, Star, Award, LogOut } from 'lucide-react';

// IMPORTANT:
// In Vercel set:
// REACT_APP_API_URL = https://habit-tracker-backend-olna.onrender.com
// (NO /api at end)
const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`;


export default function HabitTracker() {
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('health');
  const [totalPoints, setTotalPoints] = useState(0);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const getToken = () => localStorage.getItem('token');

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const token = getToken();
    if (token) {
      setShowAuthModal(false);
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    await Promise.allSettled([loadUserData(), loadHabits()]);
  };

  const loadUserData = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { ...authHeaders() }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const u = data.data;
        setUser(u);
        setTotalPoints(u.totalPoints || 0);
        setBadges(u.badges || []);
      } else {
        if (response.status === 401) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Load user error:', err);
    }
  };

  const loadHabits = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/habits`, {
        headers: { ...authHeaders() }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setHabits(data.data || []);
      } else {
        if (response.status === 401) {
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Load habits error:', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? 'login' : 'register';

      const body = isLogin
        ? { email: authForm.email, password: authForm.password }
        : { username: authForm.username, email: authForm.email, password: authForm.password };

      const response = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const token = data?.data?.token;
        if (token) localStorage.setItem('token', token);

        // If backend returns user fields, set them quickly
        setUser({
          id: data.data.id,
          username: data.data.username,
          email: data.data.email,
          totalPoints: data.data.totalPoints,
          badges: data.data.badges || []
        });

        setShowAuthModal(false);

        // Load fresh data from /me + habits
        await loadAll();
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      console.error(err);
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setHabits([]);
    setBadges([]);
    setTotalPoints(0);
    setShowAuthModal(true);
  };

  const addHabit = async () => {
    if (!newHabitName.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/habits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ name: newHabitName.trim(), category: newHabitCategory })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNewHabitName('');
        setShowAddModal(false);
        await loadAll();
      } else {
        setError(data.message || 'Failed to create habit');
      }
    } catch (err) {
      console.error('Add habit error:', err);
      setError('Failed to create habit');
    }
  };

  const toggleHabitToday = async (habitId) => {
    try {
      const response = await fetch(`${API_BASE}/api/habits/${habitId}/toggle`, {
        method: 'PUT',
        headers: { ...authHeaders() }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update that habit locally
        setHabits((prev) => prev.map((h) => (h._id === habitId ? data.data : h)));

        // Refresh user points/badges if they changed
        await loadUserData();

        // If backend returns new badges
        if (data.newBadges && Array.isArray(data.newBadges) && data.newBadges.length > 0) {
          setBadges((prev) => [...prev, ...data.newBadges]);
        }
      } else {
        setError(data.message || 'Failed to toggle habit');
      }
    } catch (err) {
      console.error('Toggle habit error:', err);
      setError('Failed to toggle habit');
    }
  };

  const isCompletedToday = (habit) => {
    const today = new Date().toISOString().split('T')[0];
    return (habit.completedDates || []).some(date =>
      new Date(date).toISOString().split('T')[0] === today
    );
  };

  const getCategoryColor = (category) => {
    const colors = {
      health: 'bg-green-100 text-green-700 border-green-200',
      learning: 'bg-blue-100 text-blue-700 border-blue-200',
      productivity: 'bg-purple-100 text-purple-700 border-purple-200',
      social: 'bg-pink-100 text-pink-700 border-pink-200'
    };
    return colors[category] || colors.health;
  };

  const getBadgeInfo = (badgeId) => {
    const badgeData = {
      week_warrior: { name: '7-Day Warrior', icon: '🔥', color: 'bg-orange-100 text-orange-700' },
      month_master: { name: 'Month Master', icon: '👑', color: 'bg-yellow-100 text-yellow-700' },
      habit_collector: { name: 'Habit Collector', icon: '⭐', color: 'bg-blue-100 text-blue-700' },
      dedication_champion: { name: 'Dedication Champion', icon: '🏆', color: 'bg-purple-100 text-purple-700' }
    };
    return badgeData[badgeId] || { name: 'Badge', icon: '🎖️', color: 'bg-gray-100 text-gray-700' };
  };

  const getCompletionRate = (habit) => {
    const createdAt = habit.createdAt ? new Date(habit.createdAt) : new Date();
    const daysSinceCreated = Math.max(
      1,
      Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24)) + 1
    );
    return Math.round(((habit.totalCompletions || 0) / daysSinceCreated) * 100);
  };

  // AUTH SCREEN
  if (showAuthModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Habit Tracker
          </h1>
          <p className="text-center text-gray-600 mb-6">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth}>
            {!isLogin && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
            </button>
          </form>

          <p className="text-center mt-4 text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-indigo-600 font-medium hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Habit Tracker</h1>
            <p className="text-gray-600">Build better habits, one day at a time 🚀</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome back,</p>
              <p className="font-bold text-gray-800">{user?.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Points</p>
                <p className="text-3xl font-bold text-yellow-600">{totalPoints}</p>
              </div>
              <Star className="text-yellow-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Habits</p>
                <p className="text-3xl font-bold text-blue-600">{habits.length}</p>
              </div>
              <TrendingUp className="text-blue-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Badges Earned</p>
                <p className="text-3xl font-bold text-purple-600">{badges.length}</p>
              </div>
              <Trophy className="text-purple-500" size={40} />
            </div>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Award size={24} className="text-yellow-500" />
              Your Achievements
            </h2>
            <div className="flex flex-wrap gap-3">
              {badges.map((badge, idx) => {
                const badgeInfo = getBadgeInfo(badge.badgeId || badge);
                return (
                  <div
                    key={idx}
                    className={`px-4 py-2 rounded-lg border-2 ${badgeInfo.color} font-medium flex items-center gap-2`}
                  >
                    <span className="text-xl">{badgeInfo.icon}</span>
                    <span>{badgeInfo.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={24} />
            Add New Habit
          </button>
        </div>

        <div className="space-y-4">
          {habits.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No habits yet. Start building your routine!</p>
            </div>
          ) : (
            habits.map(habit => (
              <div
                key={habit._id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">{habit.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(habit.category)}`}>
                        {habit.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Flame size={16} className="text-orange-500" />
                        <span className="font-medium">{habit.streak} day streak</span>
                      </div>
                      <div>
                        <span className="font-medium">{habit.totalCompletions}</span> total completions
                      </div>
                      <div>
                        <span className="font-medium">{getCompletionRate(habit)}%</span> completion rate
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleHabitToday(habit._id)}
                    className={`p-3 rounded-full transition-all ${isCompletedToday(habit)
                      ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                      }`}
                  >
                    {isCompletedToday(habit) ? <Check size={24} /> : <X size={24} />}
                  </button>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{getCompletionRate(habit)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${getCompletionRate(habit)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-gray-600 mb-2">Last 7 days</p>
                  <div className="flex gap-2">
                    {[...Array(7)].map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - i));
                      const dateStr = date.toISOString().split('T')[0];
                      const completed = (habit.completedDates || []).some(d =>
                        new Date(d).toISOString().split('T')[0] === dateStr
                      );

                      return (
                        <div
                          key={i}
                          className={`flex-1 h-8 rounded ${completed ? 'bg-green-400' : 'bg-gray-200'}`}
                          title={dateStr}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Add New Habit</h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Habit Name</label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g., Drink 8 glasses of water"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newHabitCategory}
                  onChange={(e) => setNewHabitCategory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="health">Health & Fitness</option>
                  <option value="learning">Learning</option>
                  <option value="productivity">Productivity</option>
                  <option value="social">Social</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addHabit}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Add Habit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
