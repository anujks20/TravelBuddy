import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== "undefined" && window.location ? `http://${window.location.hostname || "localhost"}:5000/api` : "http://localhost:5000/api");
const TOKEN_KEY = "travelbuddy_hotel_token";

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return isoString;
  }
}

function formatISODateInput(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function App() {
  // Auth State
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [hotelUser, setHotelUser] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Navigation
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'search' | 'stays' | 'profile'

  // Dashboard / Stays Data
  const [stays, setStays] = useState([]);
  const [staysLoading, setStaysLoading] = useState(false);
  const [staysFilter, setStaysFilter] = useState("ALL"); // 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  const [staysSearch, setStaysSearch] = useState("");

  // Tourist Search State
  const [searchMode, setSearchMode] = useState("uid"); // 'uid' | 'identity' | 'general'
  const [searchUid, setSearchUid] = useState("");
  const [searchIdentityType, setSearchIdentityType] = useState("AADHAAR");
  const [searchIdentityNumber, setSearchIdentityNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Tourist Registration State (Hotel Front Desk)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regNationality, setRegNationality] = useState("IND");
  const [regIdentityType, setRegIdentityType] = useState("AADHAAR");
  const [regIdentityNumber, setRegIdentityNumber] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccessTourist, setRegSuccessTourist] = useState(null);

  // Stay Creation Modal / Inline
  const [checkinTourist, setCheckinTourist] = useState(null);
  const [checkInDate, setCheckInDate] = useState(() => formatISODateInput());
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return formatISODateInput(d);
  });
  const [bookingRef, setBookingRef] = useState("");
  const [createStayLoading, setCreateStayLoading] = useState(false);
  const [createStayError, setCreateStayError] = useState("");
  const [createStaySuccess, setCreateStaySuccess] = useState("");

  // Stay Detail Modal
  const [selectedStayId, setSelectedStayId] = useState(null);
  const [stayDetails, setStayDetails] = useState(null);
  const [stayDetailsLoading, setStayDetailsLoading] = useState(false);
  const [stayDetailsError, setStayDetailsError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Profile data & edit state
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editStaffName, setEditStaffName] = useState("");
  const [editHotelPhone, setEditHotelPhone] = useState("");
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState("");
  const [profileSaveError, setProfileSaveError] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaveLoading, setPwSaveLoading] = useState(false);
  const [pwSaveSuccess, setPwSaveSuccess] = useState("");
  const [pwSaveError, setPwSaveError] = useState("");

  // Check auth on load
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const data = await apiRequest("/hotel/auth/me");
        setHotelUser(data.hotelUser);
        setHotel(data.hotel);
        setAuthToken(token);
      } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem(TOKEN_KEY);
        setAuthToken(null);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Fetch stays when user is authenticated or activeTab changes
  useEffect(() => {
    if (authToken && (activeTab === "dashboard" || activeTab === "stays")) {
      fetchStays();
    }
    if (authToken && activeTab === "profile") {
      fetchProfile();
    }
  }, [authToken, activeTab]);

  async function fetchStays() {
    setStaysLoading(true);
    try {
      const data = await apiRequest("/hotel/stays");
      setStays(data.stays || []);
    } catch (err) {
      console.error("Fetch stays error:", err);
    } finally {
      setStaysLoading(false);
    }
  }

  async function fetchProfile() {
    setProfileLoading(true);
    try {
      const data = await apiRequest("/hotel/profile");
      setProfileData(data);
    } catch (err) {
      console.error("Fetch profile error:", err);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const data = await apiRequest("/hotel/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      });

      localStorage.setItem(TOKEN_KEY, data.token);
      setAuthToken(data.token);
      setHotelUser(data.hotelUser);
      setHotel(data.hotel);
      setActiveTab("dashboard");
    } catch (err) {
      setLoginError(err.message || "Failed to log in.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setHotelUser(null);
    setHotel(null);
    setActiveTab("dashboard");
    setStays([]);
    setSearchResults([]);
  }

  // Search Tourist
  async function handleSearch(e) {
    if (e) e.preventDefault();
    setSearchError("");
    setSearchLoading(true);
    setSearched(true);
    setSearchResults([]);

    try {
      const payload = {};
      if (searchMode === "uid") {
        if (!searchUid.trim()) {
          throw new Error("Please enter a Tourist UID (e.g. TB-IND-87F1-SCP4)");
        }
        payload.touristUid = searchUid.trim();
      } else if (searchMode === "identity") {
        if (!searchIdentityNumber.trim()) {
          throw new Error("Please enter the document number / last digits.");
        }
        payload.identityType = searchIdentityType;
        payload.identityNumber = searchIdentityNumber.trim();
      } else {
        if (!searchQuery.trim()) {
          throw new Error("Please enter a search term.");
        }
        payload.query = searchQuery.trim();
      }

      const data = await apiRequest("/hotel/guests/search", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setSearchResults(data.tourists || []);
    } catch (err) {
      setSearchError(err.message || "Search failed.");
    } finally {
      setSearchLoading(false);
    }
  }

  // Register New Tourist (Hotel Front Desk)
  async function handleRegisterTourist(e) {
    if (e) e.preventDefault();
    setRegError("");
    setRegLoading(true);

    try {
      if (!regFullName.trim() || !regEmail.trim() || !regIdentityNumber.trim()) {
        throw new Error("Full name, email, and identity document number are required.");
      }

      const payload = {
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim() || undefined,
        nationalityCode: regNationality.trim() || "IND",
        identityType: regIdentityType,
        identityNumber: regIdentityNumber.trim()
      };

      const data = await apiRequest("/hotel/guests/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setRegSuccessTourist(data.tourist);
      setSearchResults([data.tourist]);
    } catch (err) {
      setRegError(err.message || "Failed to register tourist identity.");
    } finally {
      setRegLoading(false);
    }
  }

  // Create Stay / Check-in
  async function handleCreateStay(e) {
    e.preventDefault();
    if (!checkinTourist) return;

    setCreateStayError("");
    setCreateStaySuccess("");
    setCreateStayLoading(true);

    try {
      const payload = {
        userId: checkinTourist.id,
        touristUid: checkinTourist.tourist_uid,
        checkIn: new Date(checkInDate).toISOString(),
        checkOut: checkOutDate ? new Date(checkOutDate).toISOString() : null,
        bookingReference: bookingRef ? bookingRef.trim() : null,
        status: "ACTIVE"
      };

      const data = await apiRequest("/hotel/stays", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setCreateStaySuccess(`Successfully checked in ${checkinTourist.full_name} (${checkinTourist.tourist_uid})!`);
      fetchStays();

      setTimeout(() => {
        setCheckinTourist(null);
        setBookingRef("");
        setActiveTab("stays");
      }, 1200);
    } catch (err) {
      setCreateStayError(err.message || "Failed to create stay.");
    } finally {
      setCreateStayLoading(false);
    }
  }

  // Open Stay Details
  async function openStayDetails(stayId) {
    setSelectedStayId(stayId);
    setStayDetails(null);
    setStayDetailsError("");
    setStayDetailsLoading(true);

    try {
      const data = await apiRequest(`/hotel/stays/${stayId}`);
      setStayDetails(data);
    } catch (err) {
      setStayDetailsError(err.message || "Failed to load stay details.");
    } finally {
      setStayDetailsLoading(false);
    }
  }

  // Update Stay Status (Check Out / Cancel)
  async function handleUpdateStayStatus(stayId, newStatus) {
    setActionLoading(true);
    try {
      const payload = {
        status: newStatus,
        checkOut: newStatus === "COMPLETED" ? new Date().toISOString() : undefined
      };

      await apiRequest(`/hotel/stays/${stayId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      fetchStays();
      if (selectedStayId === stayId) {
        openStayDetails(stayId);
      }
    } catch (err) {
      alert(`Error updating stay: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Sync initial profile edit inputs
  useEffect(() => {
    if (hotelUser?.name && !editStaffName) setEditStaffName(hotelUser.name);
    if (hotel?.phone && !editHotelPhone) setEditHotelPhone(hotel.phone);
  }, [hotelUser, hotel]);

  // Handle Save Staff Profile
  async function handleSaveStaffProfile(e) {
    e.preventDefault();
    setProfileSaveLoading(true);
    setProfileSaveError("");
    setProfileSaveSuccess("");

    try {
      const data = await apiRequest("/hotel/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: editStaffName,
          phone: editHotelPhone
        })
      });

      if (data.hotelUser) {
        setHotelUser((prev) => ({ ...prev, name: data.hotelUser.name }));
      }
      if (data.hotel) {
        setHotel((prev) => ({ ...prev, phone: data.hotel.phone }));
      }
      setProfileSaveSuccess("Staff profile updated successfully!");
    } catch (err) {
      setProfileSaveError(err.message || "Failed to update profile.");
    } finally {
      setProfileSaveLoading(false);
    }
  }

  // Handle Change Hotel Staff Password
  async function handleChangeHotelPassword(e) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwSaveError("New password and confirm password do not match.");
      return;
    }
    if (newPw.length < 6) {
      setPwSaveError("New password must be at least 6 characters.");
      return;
    }

    setPwSaveLoading(true);
    setPwSaveError("");
    setPwSaveSuccess("");

    try {
      await apiRequest("/hotel/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw
        })
      });

      setPwSaveSuccess("Hotel staff password updated successfully!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwSaveError(err.message || "Failed to change password.");
    } finally {
      setPwSaveLoading(false);
    }
  }

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="login-container">
        <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🏨</div>
          <p>Connecting to TravelBuddy Hotel Service...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Login Screen
  if (!authToken || !hotelUser) {
    return (
      <div className="login-container">
        <div className="login-card">

          <div className="login-brand">
            <div className="login-logo">🏨</div>
            <h1 className="login-title">Hotel Partner Portal</h1>
            <p className="login-subtitle">TravelBuddy Tourist Verification & Stay Management</p>
          </div>

          {loginError && (
            <div className="alert alert-danger">
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Hotel Staff Email</label>
              <div className="input-field-wrapper">
                <span className="input-field-icon">✉️</span>
                <input
                  type="email"
                  className="form-input"
                  placeholder="staff@hotel.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-field-wrapper">
                <span className="input-field-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "8px" }} disabled={loginLoading}>
              {loginLoading ? "Authenticating..." : "Sign In to Hotel Portal"}
            </button>
          </form>

          <div className="demo-credentials-card">
            <div className="demo-credentials-header">
              <span className="demo-key-icon">🔑</span>
              <strong>Demo Credentials (Seeded):</strong>
            </div>
            <div className="demo-credentials-info">
              <div>Email: <strong>hotel@travelbuddy.com</strong></div>
              <div>Password: <strong>hotel123</strong></div>
            </div>
            <button
              type="button"
              className="demo-autofill-btn"
              onClick={() => {
                setLoginEmail("hotel@travelbuddy.com");
                setLoginPassword("hotel123");
              }}
            >
              Auto-Fill Demo Credentials
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculated Metrics (Stable across all filter selections)
  const totalStaysCount = stays.length;
  const activeStaysCount = stays.filter((s) => s.status === "ACTIVE").length;
  const completedStaysCount = stays.filter((s) => s.status === "COMPLETED").length;
  const cancelledStaysCount = stays.filter((s) => s.status === "CANCELLED").length;

  const filteredStays = stays.filter((s) => {
    // Status tab filter
    if (staysFilter !== "ALL" && s.status !== staysFilter) {
      return false;
    }
    // Search query filter
    if (!staysSearch.trim()) return true;
    const q = staysSearch.toLowerCase();
    return (
      (s.tourist_name || "").toLowerCase().includes(q) ||
      (s.tourist_uid || "").toLowerCase().includes(q) ||
      (s.booking_reference || "").toLowerCase().includes(q) ||
      (s.tourist_phone || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="app-container">
      {/* Portal Header */}
      <header className="portal-header">
        <div className="header-top">
          <div className="brand-section">
            <div className="brand-logo-icon">🏨</div>
            <div>
              <div className="brand-title">TravelBuddy Hotel Portal</div>
              <div className="brand-subtitle">Official Partner Station</div>
            </div>
          </div>

          <div className="hotel-info-section">
            <div className="hotel-badge">
              <div>
                <span className="hotel-name-label">{hotel?.name || "Partner Hotel"}</span>
                {hotel?.city && <span className="hotel-city-label"> • {hotel.city}</span>}
              </div>
              <span className={`partner-pill ${hotel?.partnerStatus ? "verified" : "standard"}`}>
                {hotel?.partnerStatus ? "Verified Partner" : "Standard Partner"}
              </span>
            </div>

            <div className="user-session-info">
              <div className="staff-meta">
                <div className="staff-name">{hotelUser.name}</div>
                <div className="staff-role">{hotelUser.role || "STAFF"}</div>
              </div>
              <button className="btn-logout" onClick={handleLogout} title="Sign Out">
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="header-nav">
          <button
            className={`nav-tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <span>📊</span> Dashboard
          </button>
          <button
            className={`nav-tab ${activeTab === "search" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("search");
              setCheckinTourist(null);
            }}
          >
            <span>🔍</span> Guest Search & Check-in
          </button>
          <button
            className={`nav-tab ${activeTab === "stays" ? "active" : ""}`}
            onClick={() => setActiveTab("stays")}
          >
            <span>🛏️</span> Stays Management
            {activeStaysCount > 0 && <span className="badge-count">{activeStaysCount}</span>}
          </button>
          <button
            className={`nav-tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <span>🏢</span> Hotel Profile
          </button>
        </nav>
      </header>

      {/* Main Content Body */}
      <main className="portal-main">
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            {/* Metrics */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon-box green">🟢</div>
                <div className="metric-content">
                  <div className="metric-label">Active Guests</div>
                  <div className="metric-value">{activeStaysCount}</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-box blue">🛏️</div>
                <div className="metric-content">
                  <div className="metric-label">Completed Stays</div>
                  <div className="metric-value">{completedStaysCount}</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-box purple">👥</div>
                <div className="metric-content">
                  <div className="metric-label">Total Records</div>
                  <div className="metric-value">{stays.length}</div>
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-icon-box amber">🛡️</div>
                <div className="metric-content">
                  <div className="metric-label">TravelBuddy UID</div>
                  <div className="metric-value" style={{ fontSize: "1.1rem" }}>Verified Integration</div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Currently Active Guests */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title"><span>🟢</span> Active In-House Guests</h2>
                  <p className="card-description">Tourists currently checked in at {hotel?.name}</p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setActiveTab("search");
                    setCheckinTourist(null);
                  }}
                >
                  <span>+</span> New Guest Check-in
                </button>
              </div>

              {staysLoading ? (
                <div className="empty-state">
                  <p>Loading active stays...</p>
                </div>
              ) : stays.filter((s) => s.status === "ACTIVE").length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-text">No active guests checked in currently.</div>
                  <div className="empty-state-sub">Use the Guest Search to look up a TravelBuddy tourist and record a stay.</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Guest Name</th>
                        <th>Tourist UID</th>
                        <th>Phone</th>
                        <th>Booking Ref</th>
                        <th>Check-in Time</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stays
                        .filter((s) => s.status === "ACTIVE")
                        .map((stay) => (
                          <tr key={stay.id}>
                            <td><strong>{stay.tourist_name}</strong></td>
                            <td><span className="uid-badge">{stay.tourist_uid}</span></td>
                            <td>{stay.tourist_phone || "—"}</td>
                            <td><code>{stay.booking_reference || "Direct / Walk-in"}</code></td>
                            <td>{formatDate(stay.check_in)}</td>
                            <td><span className="status-badge active">Active</span></td>
                            <td>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button className="btn btn-outline btn-sm" onClick={() => openStayDetails(stay.id)}>
                                  Details
                                </button>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleUpdateStayStatus(stay.id, "COMPLETED")}
                                  disabled={actionLoading}
                                >
                                  Check Out
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Stays Log */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title"><span>🕒</span> Recent Stay History</h2>
                  <p className="card-description">Latest records logged at this property</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => setActiveTab("stays")}>
                  View All Stays →
                </button>
              </div>

              {stays.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-text">No stay history recorded yet.</div>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Guest Name</th>
                        <th>UID</th>
                        <th>Booking Ref</th>
                        <th>Check-in</th>
                        <th>Check-out</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stays.slice(0, 5).map((stay) => (
                        <tr key={stay.id}>
                          <td>{stay.tourist_name}</td>
                          <td><span className="uid-badge">{stay.tourist_uid}</span></td>
                          <td><code>{stay.booking_reference || "—"}</code></td>
                          <td>{formatDate(stay.check_in)}</td>
                          <td>{formatDate(stay.check_out)}</td>
                          <td>
                            <span className={`status-badge ${stay.status.toLowerCase()}`}>
                              {stay.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GUEST SEARCH & CHECK-IN */}
        {activeTab === "search" && (
          <div>
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title"><span>🔍</span> Tourist Search & Verification</h2>
                  <p className="card-description">
                    Find and verify TravelBuddy tourists using their UID or Identity Document (Aadhaar / Passport).
                  </p>
                </div>
              </div>

              {/* Search Mode Selector */}
              <div className="filter-bar">
                <div className="filter-pills">
                  <button
                    className={`filter-pill ${searchMode === "uid" ? "active" : ""}`}
                    onClick={() => {
                      setSearchMode("uid");
                      setSearchResults([]);
                      setSearched(false);
                    }}
                  >
                    By Tourist UID
                  </button>
                  <button
                    className={`filter-pill ${searchMode === "identity" ? "active" : ""}`}
                    onClick={() => {
                      setSearchMode("identity");
                      setSearchResults([]);
                      setSearched(false);
                    }}
                  >
                    By Identity Document (Aadhaar / Passport)
                  </button>
                  <button
                    className={`filter-pill ${searchMode === "general" ? "active" : ""}`}
                    onClick={() => {
                      setSearchMode("general");
                      setSearchResults([]);
                      setSearched(false);
                    }}
                  >
                    By Phone / Email / Name
                  </button>
                </div>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch}>
                {searchMode === "uid" && (
                  <div className="form-group">
                    <label className="form-label">Tourist UID</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. TB-IND-87F1-SCP4"
                        value={searchUid}
                        onChange={(e) => setSearchUid(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                        {searchLoading ? "Searching..." : "Search Tourist"}
                      </button>
                    </div>
                  </div>
                )}

                {searchMode === "identity" && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Identity Document Type</label>
                      <select
                        className="form-select"
                        value={searchIdentityType}
                        onChange={(e) => setSearchIdentityType(e.target.value)}
                      >
                        <option value="AADHAAR">Aadhaar Card</option>
                        <option value="PASSPORT">Passport</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Identity Number / Last Digits</label>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Document number / digits"
                          value={searchIdentityNumber}
                          onChange={(e) => setSearchIdentityNumber(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                          {searchLoading ? "Searching..." : "Verify & Search"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {searchMode === "general" && (
                  <div className="form-group">
                    <label className="form-label">Search Query (Phone / Email / Name)</label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 9876543210 or test@travelbuddy.com"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                        {searchLoading ? "Searching..." : "Search"}
                      </button>
                    </div>
                  </div>
                )}
              </form>

              {searchError && (
                <div className="alert alert-danger" style={{ marginTop: "16px" }}>
                  <span>⚠️</span>
                  <span>{searchError}</span>
                </div>
              )}

              {/* Search Results Display */}
              {searchLoading && (
                <div className="empty-state">
                  <p>Searching TravelBuddy tourist database...</p>
                </div>
              )}

              {!searchLoading && searched && searchResults.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">❌</div>
                  <div className="empty-state-text">No TravelBuddy tourist found matching your criteria.</div>
                  <div className="empty-state-sub" style={{ marginBottom: "16px" }}>
                    This guest does not have an active TravelBuddy UID registered yet.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setShowRegisterModal(true);
                      setRegError("");
                      setRegSuccessTourist(null);
                      setRegFullName("");
                      setRegEmail("");
                      setRegPhone("");
                      setRegIdentityNumber("");
                    }}
                  >
                    <span>➕</span> Register Tourist & Generate UID
                  </button>
                </div>
              )}

              {!searchLoading && searchResults.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <h3 style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    Matching Verified Tourists ({searchResults.length})
                  </h3>

                  {searchResults.map((tourist) => (
                    <div key={tourist.id} className="tourist-result-card">
                      <div className="tourist-details-col">
                        <div className="tourist-name-row">
                          <span className="tourist-name-text">{tourist.full_name}</span>
                          <span className="uid-badge">{tourist.tourist_uid}</span>
                          <span className={`status-badge ${tourist.identity_verified ? "active" : "completed"}`}>
                            {tourist.identity_verified ? "ID Verified" : tourist.identity_type || "Tourist"}
                          </span>
                        </div>
                        <div className="tourist-meta-row">
                          <span>📱 Phone: {tourist.phone || "Not provided"}</span>
                          <span>✉️ Email: {tourist.email}</span>
                          <span>🌍 Nationality: {tourist.nationality_code || "IND"}</span>
                        </div>
                        {tourist.current_stay_status === "ACTIVE" && (
                          <div style={{ color: "#34d399", fontSize: "0.82rem", marginTop: "4px" }}>
                            🟢 Currently Checked In (Room: {tourist.current_stay_booking_ref || "Standard"})
                          </div>
                        )}
                      </div>

                      <div>
                        {tourist.current_stay_status === "ACTIVE" ? (
                          <button
                            className="btn btn-outline"
                            onClick={() => openStayDetails(tourist.current_stay_id)}
                          >
                            View Active Stay
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              setCheckinTourist(tourist);
                              setCreateStayError("");
                              setCreateStaySuccess("");
                            }}
                          >
                            <span>+</span> Check-in / Link Stay
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stay Check-in Form Modal / Drawer */}
            {checkinTourist && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <div>
                      <h2 className="modal-title">Record Guest Stay</h2>
                      <p className="card-description">
                        Linking <strong>{checkinTourist.full_name}</strong> ({checkinTourist.tourist_uid}) to {hotel?.name}
                      </p>
                    </div>
                    <button className="btn-close-modal" onClick={() => setCheckinTourist(null)}>
                      ✕
                    </button>
                  </div>

                  {createStayError && (
                    <div className="alert alert-danger">
                      <span>⚠️</span>
                      <span>{createStayError}</span>
                    </div>
                  )}

                  {createStaySuccess && (
                    <div className="alert alert-success">
                      <span>✅</span>
                      <span>{createStaySuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateStay}>
                    <div className="form-group">
                      <label className="form-label">Room Number / Room No.</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Room 302, Suite 101"
                        value={bookingRef}
                        onChange={(e) => setBookingRef(e.target.value)}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Check-in Date & Time *</label>
                        <input
                          type="datetime-local"
                          className="form-input"
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Expected Check-out Date & Time</label>
                        <input
                          type="datetime-local"
                          className="form-input"
                          value={checkOutDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stay Status</label>
                      <input type="text" className="form-input" value="ACTIVE (Checked In)" disabled />
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setCheckinTourist(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success"
                        style={{ flex: 2 }}
                        disabled={createStayLoading}
                      >
                        {createStayLoading ? "Recording Stay..." : "Confirm & Check In"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Tourist Registration Modal (Hotel Front Desk) */}
            {showRegisterModal && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: "560px" }}>
                  <div className="modal-header">
                    <div>
                      <h2 className="modal-title">Register New Tourist</h2>
                      <p className="card-description">
                        Create official TravelBuddy identity and generate a unique permanent UID.
                      </p>
                    </div>
                    <button className="btn-close-modal" onClick={() => setShowRegisterModal(false)}>
                      ✕
                    </button>
                  </div>

                  {regError && (
                    <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
                      <span>⚠️</span>
                      <span>{regError}</span>
                    </div>
                  )}

                  {regSuccessTourist ? (
                    <div style={{ textAlign: "center", padding: "16px 0" }}>
                      <div className="alert alert-success" style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "1.8rem" }}>🎉</span>
                        <strong>Tourist Identity Created Successfully!</strong>
                        <div style={{ margin: "8px 0" }}>
                          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Assigned Unique UID:</span>
                          <div style={{ marginTop: "4px" }}>
                            <span className="uid-badge" style={{ fontSize: "1.2rem", padding: "6px 14px" }}>
                              {regSuccessTourist.tourist_uid}
                            </span>
                          </div>
                        </div>
                        <p style={{ fontSize: "0.85rem", margin: "4px 0" }}>
                          Name: <strong>{regSuccessTourist.full_name}</strong> | Email: <strong>{regSuccessTourist.email}</strong>
                        </p>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          This UID is the single source of truth across Hotel, Website, and Mobile App.
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                          onClick={() => {
                            setShowRegisterModal(false);
                            setCheckinTourist(regSuccessTourist);
                            setCreateStayError("");
                            setCreateStaySuccess("");
                          }}
                        >
                          Continue to Guest Check-in →
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setShowRegisterModal(false)}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleRegisterTourist}>
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Rahul Sharma"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Email Address *</label>
                          <input
                            type="email"
                            className="form-input"
                            placeholder="rahul@example.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Phone Number</label>
                          <input
                            type="tel"
                            className="form-input"
                            placeholder="+91 9876543210"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Nationality Code</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="IND"
                            maxLength={3}
                            value={regNationality}
                            onChange={(e) => setRegNationality(e.target.value.toUpperCase())}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Identity Document Type</label>
                          <select
                            className="form-select"
                            value={regIdentityType}
                            onChange={(e) => setRegIdentityType(e.target.value)}
                          >
                            <option value="AADHAAR">Aadhaar Card</option>
                            <option value="PASSPORT">Passport</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Identity Document Number *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Enter Aadhaar (12 digits) or Passport Number"
                          value={regIdentityNumber}
                          onChange={(e) => setRegIdentityNumber(e.target.value)}
                          required
                        />
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
                          Used securely by the backend to derive the official UID.
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() => setShowRegisterModal(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ flex: 2 }}
                          disabled={regLoading}
                        >
                          {regLoading ? "Generating UID..." : "Generate UID & Register Tourist"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STAYS MANAGEMENT */}
        {activeTab === "stays" && (
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title"><span>🛏️</span> Hotel Stays Roster</h2>
                <p className="card-description">All guest stays associated with {hotel?.name}</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setActiveTab("search");
                  setCheckinTourist(null);
                }}
              >
                <span>+</span> New Stay Check-in
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="filter-bar">
              <div className="filter-pills">
                <button
                  className={`filter-pill ${staysFilter === "ALL" ? "active" : ""}`}
                  onClick={() => setStaysFilter("ALL")}
                >
                  All ({totalStaysCount})
                </button>
                <button
                  className={`filter-pill ${staysFilter === "ACTIVE" ? "active" : ""}`}
                  onClick={() => setStaysFilter("ACTIVE")}
                >
                  Active ({activeStaysCount})
                </button>
                <button
                  className={`filter-pill ${staysFilter === "COMPLETED" ? "active" : ""}`}
                  onClick={() => setStaysFilter("COMPLETED")}
                >
                  Completed ({completedStaysCount})
                </button>
                <button
                  className={`filter-pill ${staysFilter === "CANCELLED" ? "active" : ""}`}
                  onClick={() => setStaysFilter("CANCELLED")}
                >
                  Cancelled {cancelledStaysCount > 0 ? `(${cancelledStaysCount})` : "(0)"}
                </button>
              </div>

              <div style={{ minWidth: "280px" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter by name, UID, room no..."
                  value={staysSearch}
                  onChange={(e) => setStaysSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            {staysLoading ? (
              <div className="empty-state">
                <p>Loading hotel stays records...</p>
              </div>
            ) : filteredStays.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-text">No stay records found for this filter.</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Guest Name</th>
                      <th>Tourist UID</th>
                      <th>Phone</th>
                      <th>Room No.</th>
                      <th>Check-in</th>
                      <th>Check-out</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStays.map((stay) => (
                      <tr key={stay.id}>
                        <td><strong>{stay.tourist_name}</strong></td>
                        <td><span className="uid-badge">{stay.tourist_uid}</span></td>
                        <td>{stay.tourist_phone || "—"}</td>
                        <td><code>{stay.booking_reference || "—"}</code></td>
                        <td>{formatDate(stay.check_in)}</td>
                        <td>{formatDate(stay.check_out)}</td>
                        <td>
                          <span className={`status-badge ${stay.status.toLowerCase()}`}>
                            {stay.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openStayDetails(stay.id)}
                            >
                              Details
                            </button>
                            {stay.status === "ACTIVE" && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleUpdateStayStatus(stay.id, "COMPLETED")}
                                disabled={actionLoading}
                              >
                                Check Out
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: HOTEL PROFILE */}
        {activeTab === "profile" && (
          <div>
            {/* FIXED PROPERTY & ACCOUNT CARD */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title"><span>🏢</span> Property & Credentials (Read-Only)</h2>
                  <p className="card-description">Official registered property details & assigned hotel staff credentials</p>
                </div>
                <span className={`partner-pill ${hotel?.partnerStatus ? "verified" : "standard"}`}>
                  {hotel?.partnerStatus ? "Verified Partner" : "Standard Partner"}
                </span>
              </div>

              {profileLoading ? (
                <div className="empty-state"><p>Loading hotel profile...</p></div>
              ) : (
                <div>
                  <div className="form-row" style={{ marginBottom: "16px" }}>
                    <div>
                      <label className="form-label">🔒 Property Name (Fixed)</label>
                      <div className="form-display-value">
                        {profileData?.hotel?.name || hotel?.name}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">🔒 Staff Account Email (Fixed)</label>
                      <div className="form-display-value">
                        {hotelUser.email}
                      </div>
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: "16px" }}>
                    <div>
                      <label className="form-label">🔒 Registered Address (Fixed)</label>
                      <div className="form-display-value">
                        {profileData?.hotel?.address || hotel?.address || "—"}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">🔒 City, State & Country (Fixed)</label>
                      <div className="form-display-value">
                        {`${profileData?.hotel?.city || hotel?.city || ""}, ${profileData?.hotel?.state || hotel?.state || ""} (${profileData?.hotel?.country || "India"})`}
                      </div>
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: "16px" }}>
                    <div>
                      <label className="form-label">🔒 Hotel Partner ID (UUID)</label>
                      <div className="form-display-value" style={{ fontFamily: "monospace" }}>
                        {hotel?.id}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">🔒 Staff Role</label>
                      <div className="form-display-value">
                        🛡️ {hotelUser.role || "STAFF"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* EDITABLE STAFF PROFILE CARD */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title"><span>✏️</span> Edit Staff Profile Details</h2>
                  <p className="card-description">Update your staff contact name and property front desk phone</p>
                </div>
              </div>

              {profileSaveSuccess && (
                <div className="alert alert-success" style={{ marginBottom: "16px" }}>
                  <span>✓</span>
                  <span>{profileSaveSuccess}</span>
                </div>
              )}

              {profileSaveError && (
                <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
                  <span>⚠️</span>
                  <span>{profileSaveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveStaffProfile}>
                <div className="form-row" style={{ marginBottom: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">Staff Member Name <span style={{ color: "#ef4444" }}>*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={editStaffName}
                      onChange={(e) => setEditStaffName(e.target.value)}
                      placeholder="e.g. Front Desk Lead"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hotel / Front Desk Contact Phone</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editHotelPhone}
                      onChange={(e) => setEditHotelPhone(e.target.value)}
                      placeholder="+91 22 6665 3366"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={profileSaveLoading}
                  style={{ minWidth: "180px" }}
                >
                  {profileSaveLoading ? "Saving Changes..." : "Save Staff Profile"}
                </button>
              </form>
            </div>

            {/* CHANGE PASSWORD CARD */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title"><span>🔒</span> Change Staff Account Password</h2>
                  <p className="card-description">Update your login security credentials</p>
                </div>
              </div>

              {pwSaveSuccess && (
                <div className="alert alert-success" style={{ marginBottom: "16px" }}>
                  <span>✓</span>
                  <span>{pwSaveSuccess}</span>
                </div>
              )}

              {pwSaveError && (
                <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
                  <span>⚠️</span>
                  <span>{pwSaveError}</span>
                </div>
              )}

              <form onSubmit={handleChangeHotelPassword}>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label className="form-label">Current Password <span style={{ color: "#ef4444" }}>*</span></label>
                  <div className="input-field-wrapper">
                    <span className="input-field-icon">🔒</span>
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      className="form-input"
                      placeholder="Enter current password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                    >
                      {showCurrentPw ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: "20px" }}>
                  <div className="form-group">
                    <label className="form-label">New Password <span style={{ color: "#ef4444" }}>*</span> (min 6 chars)</label>
                    <div className="input-field-wrapper">
                      <span className="input-field-icon">🔒</span>
                      <input
                        type={showNewPw ? "text" : "password"}
                        className="form-input"
                        placeholder="Enter new password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowNewPw(!showNewPw)}
                      >
                        {showNewPw ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm New Password <span style={{ color: "#ef4444" }}>*</span></label>
                    <div className="input-field-wrapper">
                      <span className="input-field-icon">🔒</span>
                      <input
                        type={showConfirmPw ? "text" : "password"}
                        className="form-input"
                        placeholder="Confirm new password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                      >
                        {showConfirmPw ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={pwSaveLoading}
                  style={{ minWidth: "180px" }}
                >
                  {pwSaveLoading ? "Updating Password..." : "Update Password"}
                </button>
              </form>
            </div>

            {/* Authorized Staff Roster */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title"><span>👥</span> Authorized Property Staff</h2>
                  <p className="card-description">Hotel staff members with portal access credentials</p>
                </div>
              </div>

              {profileData?.staff && profileData.staff.length > 0 ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Staff Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Account Status</th>
                        <th>Registered Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileData.staff.map((staff) => (
                        <tr key={staff.id}>
                          <td><strong>{staff.name}</strong></td>
                          <td>{staff.email}</td>
                          <td><code>{staff.role}</code></td>
                          <td>
                            <span className={`status-badge ${staff.active ? "active" : "cancelled"}`}>
                              {staff.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>{formatDate(staff.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>1 Staff Member logged in: {hotelUser.name} ({hotelUser.email})</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STAY DETAIL MODAL */}
        {selectedStayId && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: "700px" }}>
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">Stay & Guest Details</h2>
                  <p className="card-description">
                    Stay Record ID: <code style={{ fontSize: "0.75rem" }}>{selectedStayId}</code>
                  </p>
                </div>
                <button className="btn-close-modal" onClick={() => setSelectedStayId(null)}>
                  ✕
                </button>
              </div>

              {stayDetailsLoading && (
                <div className="empty-state"><p>Loading stay details...</p></div>
              )}

              {stayDetailsError && (
                <div className="alert alert-danger">{stayDetailsError}</div>
              )}

              {stayDetails?.stay && (
                <div>
                  {/* Guest Identity Card */}
                  <div className="tourist-result-card" style={{ marginTop: 0, marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", width: "100%" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: "600" }}>{stayDetails.stay.tourist_name}</span>
                      <span className="uid-badge">{stayDetails.stay.tourist_uid}</span>
                    </div>
                    <div className="tourist-meta-row" style={{ width: "100%" }}>
                      <span>📱 {stayDetails.stay.tourist_phone || "No phone"}</span>
                      <span>✉️ {stayDetails.stay.tourist_email}</span>
                      <span>🌍 {stayDetails.stay.nationality_code || "IND"}</span>
                      <span>🆔 {stayDetails.stay.identity_type || "Standard"}</span>
                    </div>
                  </div>

                  {/* Stay Information */}
                  <div className="form-row" style={{ marginBottom: "16px" }}>
                    <div>
                      <label className="form-label">Room Number</label>
                      <div className="form-display-value">
                        {stayDetails.stay.booking_reference || "Standard"}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Stay Status</label>
                      <div style={{ paddingTop: "6px" }}>
                        <span className={`status-badge ${stayDetails.stay.status.toLowerCase()}`}>
                          {stayDetails.stay.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: "20px" }}>
                    <div>
                      <label className="form-label">Check-in Timestamp</label>
                      <div className="form-display-value">
                        {formatDate(stayDetails.stay.check_in)}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Check-out Timestamp</label>
                      <div className="form-display-value">
                        {formatDate(stayDetails.stay.check_out)}
                      </div>
                    </div>
                  </div>

                  {/* Stay History at this Hotel */}
                  {stayDetails.guestHistory && stayDetails.guestHistory.length > 0 && (
                    <div style={{ marginTop: "20px" }}>
                      <h4 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "8px" }}>
                        Previous Stays by this Guest at this Property ({stayDetails.guestHistory.length})
                      </h4>
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Room No.</th>
                              <th>Check-in</th>
                              <th>Check-out</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stayDetails.guestHistory.map((h) => (
                              <tr key={h.id}>
                                <td><code>{h.booking_reference || "—"}</code></td>
                                <td>{formatDate(h.check_in)}</td>
                                <td>{formatDate(h.check_out)}</td>
                                <td>
                                  <span className={`status-badge ${h.status.toLowerCase()}`}>{h.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
                    {stayDetails.stay.status === "ACTIVE" && (
                      <>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleUpdateStayStatus(stayDetails.stay.id, "CANCELLED")}
                          disabled={actionLoading}
                        >
                          Cancel Stay
                        </button>
                        <button
                          className="btn btn-success"
                          onClick={() => handleUpdateStayStatus(stayDetails.stay.id, "COMPLETED")}
                          disabled={actionLoading}
                        >
                          Check Out Guest
                        </button>
                      </>
                    )}
                    <button className="btn btn-secondary" onClick={() => setSelectedStayId(null)}>
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
