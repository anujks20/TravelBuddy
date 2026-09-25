import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || (typeof window !== "undefined" && window.location ? `http://${window.location.hostname || "localhost"}:5000/api` : "http://localhost:5000/api");
const POLICE_TOKEN_KEY = "travelbuddy_police_token";

const defaultMapCenter = [20.5937, 78.9629];

const emergencyIcon = L.divIcon({
  className: "emergency-map-marker",
  html: `
    <div class="emergency-marker-pulse">
      <div class="emergency-marker-dot"></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const geofenceBreachIcon = L.divIcon({
  className: "geofence-map-marker",
  html: `
    <div class="geofence-marker-pulse">
      <div class="geofence-marker-dot">⛔</div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const locationIcon = L.divIcon({
  className: "tourist-map-marker",
  html: `
    <div class="tourist-marker">
      <div class="tourist-marker-dot"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(POLICE_TOKEN_KEY);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(POLICE_TOKEN_KEY);
    }
    throw new Error(
      data.message || "Something went wrong."
    );
  }

  return data;
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

function formatLocation(latitude, longitude) {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return "Location unavailable";
  }

  return `${Number(latitude).toFixed(6)}, ${Number(
    longitude
  ).toFixed(6)}`;
}

function MapRecenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 14);
    } else {
      map.setView(defaultMapCenter, 5);
    }
  }, [map, position]);

  return null;
}

function EmergencyMap({ incident, restrictedZones = [], breachFocus = null, hideHeader = false }) {
  const latitude = breachFocus ? breachFocus.latitude : incident?.latitude;
  const longitude = breachFocus ? breachFocus.longitude : incident?.longitude;

  const hasLocation =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined;

  const position = hasLocation
    ? [Number(latitude), Number(longitude)]
    : null;

  return (
    <div className="map-wrapper">
      {!hideHeader && (
        <div className="map-heading">
          <div>
            <p className="eyebrow">
              {breachFocus
                ? "GEOFENCE BREACH LOCATION"
                : incident
                  ? "LIVE LOCATION & DANGER ZONES"
                  : "NATIONAL SAFETY MONITOR"}
            </p>

            <h3>
              {breachFocus
                ? `Breach: ${breachFocus.zone_name}`
                : incident
                  ? "Tourist & Threat Map"
                  : "Live Map of India"}
            </h3>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {restrictedZones.length > 0 && (
              <span className="zone-count-badge">
                ⛔ {restrictedZones.length} Restricted Zones
              </span>
            )}
            <span className="map-status">
              {hasLocation
                ? "Coordinates Active"
                : "Live India Grid"}
            </span>
          </div>
        </div>
      )}

      <div className="map-container">
        <MapContainer
          center={position || defaultMapCenter}
          zoom={position ? 14 : 5}
          scrollWheelZoom
          className="emergency-map"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter position={position} />

          {/* Red Restricted Danger Circles */}
          {restrictedZones.map((zone) => (
            <Circle
              key={zone.id}
              center={[Number(zone.latitude), Number(zone.longitude)]}
              radius={Number(zone.radius_meters || 300)}
              pathOptions={{
                color: "#dc2626",
                fillColor: "#ef4444",
                fillOpacity: 0.25,
                weight: 2,
                dashArray: "6, 6",
              }}
            >
              <Popup>
                <div style={{ padding: "4px", minWidth: "180px" }}>
                  <strong style={{ color: "#dc2626", fontSize: "13px" }}>
                    ⛔ RESTRICTED DANGER ZONE
                  </strong>
                  <div style={{ fontWeight: "700", marginTop: "4px" }}>{zone.name}</div>
                  <p style={{ margin: "4px 0", fontSize: "11px", color: "#475569" }}>
                    {zone.description}
                  </p>
                  <div style={{ fontSize: "11px", marginTop: "6px", display: "flex", justifyContent: "space-between" }}>
                    <span>Danger: <strong style={{ color: "#dc2626" }}>{zone.danger_level}</strong></span>
                    <span>Radius: <strong>{zone.radius_meters}m</strong></span>
                  </div>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Incident / Breach Marker */}
          {position && (
            <Marker
              position={position}
              icon={breachFocus ? geofenceBreachIcon : emergencyIcon}
            >
              <Popup>
                <div style={{ padding: "4px" }}>
                  <strong>
                    {breachFocus ? breachFocus.tourist_name || "Tourist Breach" : (incident?.full_name || "Emergency Location")}
                  </strong>
                  <br />
                  {breachFocus ? (
                    <span style={{ color: "#dc2626", fontWeight: "600" }}>
                      Inside: {breachFocus.zone_name}
                    </span>
                  ) : (
                    <span>Accuracy: {incident?.location_accuracy ?? "Unknown"} m</span>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {hasLocation && (
        <div className="map-coordinate-bar">
          <span>
            Lat/Lng: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
          </span>
          {breachFocus ? (
            <span style={{ color: "#dc2626", fontWeight: "600" }}>
              Tracking Source: {breachFocus.source}
            </span>
          ) : (
            incident?.location_accuracy !== null &&
            incident?.location_accuracy !== undefined && (
              <span>Accuracy: {incident.location_accuracy} m</span>
            )
          )}
        </div>
      )}
    </div>
  );
}

function App() {
  const [policeUser, setPoliceUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Navigation tab: 'monitor' | 'geofence' | 'profile'
  const [activeTab, setActiveTab] = useState("monitor");

  const [sosIncidents, setSosIncidents] = useState([]);
  const [selectedSos, setSelectedSos] = useState(null);
  const [details, setDetails] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  // Geofence & IoT State
  const [restrictedZones, setRestrictedZones] = useState([]);
  const [geofenceBreaches, setGeofenceBreaches] = useState([]);
  const [selectedBreach, setSelectedBreach] = useState(null);
  const [geofenceFilter, setGeofenceFilter] = useState("ALL"); // 'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
  const [iotHealth, setIotHealth] = useState(null);

  // Police Profile & Password State
  const [editDeskName, setEditDeskName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  // Sync desk name when user data loads
  useEffect(() => {
    if (policeUser?.name) {
      setEditDeskName(policeUser.name);
    }
  }, [policeUser]);

  async function handleUpdateStationProfile(e) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const data = await apiRequest("/police/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: editDeskName })
      });

      if (data.policeUser) {
        setPoliceUser(data.policeUser);
      }
      setProfileSuccess("Station dispatch details updated successfully!");
    } catch (err) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangeStationPassword(e) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwError("New password and confirm password do not match.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }

    setPwSaving(true);
    setPwError("");
    setPwSuccess("");

    try {
      await apiRequest("/police/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw
        })
      });

      setPwSuccess("Command account password changed successfully!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwError(err.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  }

  async function loadPoliceProfile() {
    try {
      const data = await apiRequest("/police/auth/me");
      setPoliceUser(data.policeUser);
    } catch {
      localStorage.removeItem(POLICE_TOKEN_KEY);
      setPoliceUser(null);
    }
  }

  async function loadRestrictedZones() {
    try {
      const data = await apiRequest("/geofence/zones");
      setRestrictedZones(data.zones || []);
    } catch (err) {
      console.error("Failed to load restricted zones:", err);
    }
  }

  async function loadGeofenceBreaches() {
    if (!localStorage.getItem(POLICE_TOKEN_KEY)) {
      return;
    }

    try {
      const data = await apiRequest("/police/geofence/breaches");
      const breaches = data.breaches || [];
      setGeofenceBreaches(breaches);

      setSelectedBreach((current) => {
        if (!current) {
          return breaches[0] || null;
        }
        return breaches.find((b) => b.id === current.id) || breaches[0] || null;
      });
    } catch (err) {
      console.error("Failed to load geofence breaches:", err);
    }
  }

  async function loadActiveSos() {
    if (!localStorage.getItem(POLICE_TOKEN_KEY)) {
      return;
    }

    try {
      setDashboardError("");
      const data = await apiRequest("/police/sos/active");
      const incidents = data.sosIncidents || [];
      setSosIncidents(incidents);

      if (incidents.length === 0) {
        setSelectedSos(null);
        setDetails(null);
      } else {
        setSelectedSos((current) => {
          if (!current) {
            return incidents[0] || null;
          }

          const updated = incidents.find(
            (item) => item.id === current.id
          );

          return updated || incidents[0] || null;
        });
      }
    } catch (error) {
      setDashboardError(error.message);
    }
  }

  async function loadSosDetails(id) {
    try {
      setSelectedSos(
        sosIncidents.find(
          (item) => item.id === id
        ) || null
      );

      const data = await apiRequest(`/police/sos/${id}`);
      setDetails(data);
    } catch (error) {
      setDashboardError(error.message);
    }
  }

  async function loadIotHealth() {
    try {
      const data = await apiRequest("/iot/telemetry/health/ESP32-MPU6050-NODE-01");
      setIotHealth(data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const token = localStorage.getItem(POLICE_TOKEN_KEY);
    if (token) {
      loadPoliceProfile();
      loadActiveSos();
      loadRestrictedZones();
      loadGeofenceBreaches();
      loadIotHealth();
    }
  }, []);

  useEffect(() => {
    if (!policeUser) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadActiveSos();
      loadGeofenceBreaches();
      loadIotHealth();
    }, 5000);
    return () => clearInterval(interval);
  }, [policeUser]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const data = await apiRequest("/police/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      localStorage.setItem(POLICE_TOKEN_KEY, data.token);
      setPoliceUser(data.policeUser);
      setEmail("");
      setPassword("");
      await loadActiveSos();
      await loadRestrictedZones();
      await loadGeofenceBreaches();
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(POLICE_TOKEN_KEY);
    setPoliceUser(null);
    setSosIncidents([]);
    setSelectedSos(null);
    setDetails(null);
    setGeofenceBreaches([]);
    setSelectedBreach(null);
  }

  async function handleAcknowledge() {
    if (!selectedSos) {
      return;
    }

    setActionLoading(true);

    try {
      await apiRequest(`/police/sos/${selectedSos.id}/acknowledge`, {
        method: "POST",
      });

      await loadActiveSos();
      await loadSosDetails(selectedSos.id);
    } catch (error) {
      setDashboardError(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDispatch() {
    if (!selectedSos) {
      return;
    }

    setActionLoading(true);

    try {
      await apiRequest(`/police/sos/${selectedSos.id}/dispatch`, {
        method: "POST",
      });

      await loadActiveSos();
      await loadSosDetails(selectedSos.id);
    } catch (error) {
      setDashboardError(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve() {
    if (!selectedSos) {
      return;
    }

    setActionLoading(true);

    try {
      await apiRequest(`/police/sos/${selectedSos.id}/resolve`, {
        method: "POST",
      });

      setDetails(null);
      setSelectedSos(null);
      await loadActiveSos();
    } catch (error) {
      setDashboardError(error.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAcknowledgeBreach(breachId) {
    setActionLoading(true);
    try {
      await apiRequest(`/police/geofence/breaches/${breachId}/acknowledge`, {
        method: "PATCH",
      });
      await loadGeofenceBreaches();
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolveBreach(breachId) {
    setActionLoading(true);
    try {
      await apiRequest(`/police/geofence/breaches/${breachId}/resolve`, {
        method: "PATCH",
      });
      await loadGeofenceBreaches();
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (!policeUser) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ position: "relative" }}>
          <div className="login-badge">
            🛡️
          </div>

          <p className="eyebrow">
            TRAVELBUDDY LAW ENFORCEMENT
          </p>

          <h1>Police Command Center</h1>

          <p className="login-subtitle">
            Authorized emergency response & station dispatch
          </p>

          <form onSubmit={handleLogin}>
            <label>
              Police Command Email
              <div className="input-field-wrapper">
                <span className="input-field-icon">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="police@travelbuddy.com"
                  required
                />
              </div>
            </label>

            <label>
              Password
              <div className="input-field-wrapper">
                <span className="input-field-icon">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter password"
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
            </label>

            {loginError && (
              <div className="error-box">
                {loginError}
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={loginLoading}
            >
              {loginLoading
                ? "Signing in..."
                : "Sign In to Police Portal"}
            </button>
          </form>

          <div className="demo-credentials-card">
            <div className="demo-credentials-header">
              <span className="demo-key-icon">🔑</span>
              <strong>Official Demo Access (Seeded):</strong>
            </div>
            <div className="demo-credentials-info">
              <div>Email: <strong>police@travelbuddy.com</strong></div>
              <div>Password: <strong>police123</strong></div>
            </div>
            <button
              type="button"
              className="demo-autofill-btn"
              onClick={() => {
                setEmail("police@travelbuddy.com");
                setPassword("police123");
              }}
            >
              Auto-Fill Demo Credentials
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeCount = sosIncidents.length;
  const activeGeofenceBreaches = geofenceBreaches.filter((b) => b.status === "ACTIVE");
  const activeGeofenceCount = activeGeofenceBreaches.length;

  const filteredBreaches = geofenceFilter === "ALL"
    ? geofenceBreaches
    : geofenceBreaches.filter((b) => b.status === geofenceFilter);

  return (
    <div className="dashboard-container">
      {/* Portal Header */}
      <header className="portal-header">
        <div className="header-top">
          <div className="brand-section">
            <div className="brand-logo-icon">🛡️</div>
            <div>
              <div className="brand-title">TravelBuddy Police Command Center</div>
              <div className="brand-subtitle">Official Emergency Response & Station Dispatch</div>
            </div>
          </div>

          <div className="hotel-info-section">
            <div className="hotel-badge">
              <div>
                <span className="hotel-name-label">{policeUser.station || "Agra Central Police Station"}</span>
                <span className="hotel-city-label"> • Agra District</span>
              </div>
              <span className="partner-pill verified">
                Verified Law Enforcement
              </span>
            </div>

            <div className="user-session-info">
              <div className="staff-meta">
                <div className="staff-name">{policeUser.name || "Emergency Control Desk"}</div>
                <div className="staff-role">{policeUser.role || "OFFICER"}</div>
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
            className={`nav-tab ${activeTab === "monitor" ? "active" : ""}`}
            onClick={() => setActiveTab("monitor")}
          >
            <span>🚨</span> Emergency Monitor
            {activeCount > 0 && <span className="badge-count">{activeCount}</span>}
          </button>
          <button
            className={`nav-tab ${activeTab === "geofence" ? "active" : ""}`}
            onClick={() => setActiveTab("geofence")}
          >
            <span>⛔</span> Geofence Violations & IoT
            {activeGeofenceCount > 0 && (
              <span className="badge-count danger-badge">{activeGeofenceCount}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("profile");
              setProfileSuccess("");
              setProfileError("");
              setPwSuccess("");
              setPwError("");
            }}
          >
            <span>🏛️</span> Police Station Profile
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="portal-main">
        {/* Geofence Breach Warning Banner across all views if active breach exists */}
        {activeGeofenceCount > 0 && activeTab !== "geofence" && (
          <div
            className="geofence-alert-banner"
            onClick={() => setActiveTab("geofence")}
            style={{ cursor: "pointer" }}
          >
            <div className="banner-pulse-icon">⚠️</div>
            <div className="banner-text">
              <strong>CRITICAL GEOFENCE VIOLATION DETECTED:</strong> {activeGeofenceCount} tourist(s) currently inside restricted danger zones!
            </div>
            <button className="banner-action-btn">
              View Breaches & Map →
            </button>
          </div>
        )}

        {/* TAB 1: EMERGENCY MONITOR */}
        {activeTab === "monitor" && (
          <div>
            <section className="status-bar">
              <div>
                <span className="status-dot" />
                Emergency Monitoring Network Active
              </div>

              <div style={{ display: "flex", gap: "16px" }}>
                <div className={`active-counter ${activeCount > 0 ? "has-emergencies" : "zero-emergencies"}`}>
                  <span>Active Emergencies</span>
                  <strong>{activeCount}</strong>
                </div>
                {activeGeofenceCount > 0 && (
                  <div className="active-counter has-breaches">
                    <span>Danger Breaches</span>
                    <strong>{activeGeofenceCount}</strong>
                  </div>
                )}
              </div>
            </section>

            {dashboardError && (
              <div className="error-box">
                {dashboardError}
              </div>
            )}

            <section className="dashboard-grid">
              <div className="incident-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      LIVE MONITORING
                    </p>

                    <h2>
                      Active SOS Incidents
                    </h2>
                  </div>

                  <button
                    className="refresh-button"
                    onClick={loadActiveSos}
                  >
                    Refresh
                  </button>
                </div>

                {sosIncidents.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      ✓
                    </div>

                    <h3>
                      No Active Emergencies
                    </h3>

                    <p>
                      The system is actively monitoring for new SOS incidents.
                    </p>
                  </div>
                ) : (
                  <div className="incident-list">
                    {sosIncidents.map((incident) => (
                      <button
                        key={incident.id}
                        className={`incident-card ${
                          selectedSos?.id === incident.id ? "selected" : ""
                        }`}
                        onClick={() => loadSosDetails(incident.id)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <div className="incident-alert">
                            <span className="blink-dot" />
                            {incident.status} SOS
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "800",
                              letterSpacing: "0.5px",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: (incident.sos_type === "IOT ALERT" || incident.trigger_source === "IOT_ALERT") ? "#7c3aed" : "#2563eb",
                              color: "#ffffff"
                            }}
                          >
                            SOS Type: {(incident.sos_type === "IOT ALERT" || incident.trigger_source === "IOT_ALERT") ? "IOT ALERT" : "MANUAL"}
                          </span>
                        </div>

                        <div className="incident-header">
                          <strong>
                            {incident.sos_reference}
                          </strong>

                          <span
                            className={`status-pill ${incident.status.toLowerCase()}`}
                          >
                            {incident.status}
                          </span>
                        </div>

                        <h3>
                          {incident.full_name}
                        </h3>

                        <p>
                          Tourist UID:{" "}
                          <strong>
                            {incident.tourist_uid}
                          </strong>
                        </p>

                        <p>
                          {incident.type} emergency
                        </p>

                        <span className="incident-time">
                          {formatDate(incident.created_at)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="details-panel">
                {!details ? (
                  <div className="overview-india-panel">
                    <div className="overview-header-card">
                      <div className="overview-title-group">
                        <div className="overview-beacon-line">
                          <span className="live-radar-dot" />
                          <span className="overview-eyebrow">NATIONAL SURVEILLANCE & SAFETY GRID</span>
                          <span className="overview-tag">MONITORING</span>
                        </div>
                        <h2 className="overview-title">Live Map of India — Security Overview</h2>
                        <p className="overview-subline">Real-time geospatial telemetry across all states, union territories & restricted perimeters</p>
                      </div>

                      <div className="overview-badge-cluster">
                        {restrictedZones.length > 0 && (
                          <span className="overview-danger-pill">
                            <span className="pill-dot red-pulse" />
                            <strong>{restrictedZones.length}</strong> Restricted Zones
                          </span>
                        )}
                        <span className="overview-live-pill">
                          <span className="pill-dot green-pulse" />
                          Live Interactive Grid
                        </span>
                      </div>
                    </div>

                    <div className="tactical-map-viewport">
                      <EmergencyMap
                        incident={null}
                        restrictedZones={restrictedZones}
                        hideHeader={true}
                      />
                      <div className="map-tactical-overlay">
                        <div className="tactical-overlay-chip">
                          <span className="pulse-icon">📡</span>
                          <span>GEOFENCE PERIMETER ONLINE</span>
                        </div>
                        <div className="tactical-coord-chip">
                          <span>GRID: 8.4°N – 37.6°N | 68.7°E – 97.2°E</span>
                        </div>
                      </div>
                    </div>

                    <div className="overview-status-deck">
                      <div className="status-deck-main">
                        <div className="status-deck-icon-wrapper">
                          <div className="status-icon-shield">🛡️</div>
                        </div>
                        <div className="status-deck-info">
                          <div className="status-deck-heading">
                            <strong>Command Center National Monitoring:</strong>
                            <span className="status-deck-subtag">ALL SECTORS SECURE</span>
                          </div>
                          <p className="status-deck-desc">
                            {sosIncidents.length === 0
                              ? "All regional sectors are secure. No active SOS emergency currently reported. Map of India is live and interactive (scroll to zoom, drag to pan)."
                              : `🚨 ${sosIncidents.length} active emergency alert(s) in queue. Select an incident from the left queue to view tourist details and dispatch response units.`}
                          </p>
                          <div className="status-quick-chips">
                            <span className="quick-chip"><span>🟢</span> Telemetry: Live</span>
                            <span className="quick-chip"><span>⛔</span> Active Zones: {restrictedZones.length}</span>
                            <span className="quick-chip"><span>📍</span> Pan-India GeoGrid</span>
                          </div>
                        </div>
                      </div>

                      <div className="status-deck-action">
                        <div className="all-clear-badge">
                          <span className="pulse-glow-ring" />
                          <span className="all-clear-text">ALL SYSTEMS NORMAL</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="details-content">
                    <div className="details-header">
                      <div>
                        <p className="eyebrow">
                          EMERGENCY DETAILS
                        </p>

                        <h2>
                          {details.sos.sos_reference}
                        </h2>
                      </div>

                      <span
                        className={`large-status ${details.sos.status?.toLowerCase()}`}
                      >
                        {details.sos.status}
                      </span>
                    </div>

                    <div className="tourist-banner">
                      <div className="tourist-avatar">
                        {details.sos.full_name
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </div>

                      <div>
                        <h3>
                          {details.sos.full_name}
                        </h3>

                        <p>
                          Tourist UID:{" "}
                          <strong>
                            {
                              details.sos
                                .tourist_uid
                            }
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="info-grid">
                      <InfoItem
                        label="SOS Type"
                        value={
                          <span
                            style={{
                              fontWeight: "800",
                              fontSize: "12px",
                              padding: "3px 9px",
                              borderRadius: "4px",
                              background: (details.sos.sos_type === "IOT ALERT" || details.sos.trigger_source === "IOT_ALERT") ? "#7c3aed" : "#2563eb",
                              color: "#ffffff",
                              display: "inline-block"
                            }}
                          >
                            SOS Type: {(details.sos.sos_type === "IOT ALERT" || details.sos.trigger_source === "IOT_ALERT") ? "IOT ALERT" : "MANUAL"}
                          </span>
                        }
                      />

                      <InfoItem
                        label="Emergency Type"
                        value={
                          details.sos.type
                        }
                      />

                      <InfoItem
                        label="Phone"
                        value={
                          details.sos.phone ||
                          "Not available"
                        }
                      />

                      <InfoItem
                        label="Nationality"
                        value={
                          details.sos
                            .nationality_code ||
                          "Not available"
                        }
                      />

                      <InfoItem
                        label="Language"
                        value={
                          details.sos
                            .language ||
                          "Not available"
                        }
                      />

                      <InfoItem
                        label="Identity"
                        value={
                          details.sos
                            .identity_type ||
                          "Not available"
                        }
                      />

                      <InfoItem
                        label="Identity Status"
                        value={
                          details.sos
                            .identity_verified
                            ? "Verified"
                            : "Not verified"
                        }
                      />
                    </div>

                    <EmergencyMap
                      incident={details.sos}
                      restrictedZones={restrictedZones}
                    />

                    {(details.sos.sos_type === "IOT ALERT" || details.sos.trigger_source === "IOT_ALERT" || details.sos.device_id) && (
                      <div className="detail-section" style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "8px", padding: "14px", marginTop: "14px" }}>
                        <h3 style={{ color: "#6d28d9", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 10px 0", fontSize: "14px" }}>
                          <span>⚡</span> Automated IoT Sensor Diagnostic Data
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", fontSize: "0.85rem" }}>
                          <div>
                            <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>IoT Device ID:</span>
                            <strong>{details.sos.device_id || "ESP32-MPU6050-NODE-01"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>Measured G-Force:</span>
                            <strong style={{ color: "#dc2626" }}>
                              {details.sos.sensor_data?.gForce ? `${details.sos.sensor_data.gForce} G` : "Critical Shock (> 2.8G)"}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>Incident Trigger:</span>
                            <strong style={{ color: "#7c3aed" }}>Fall / High-G Impact</strong>
                          </div>
                          <div>
                            <span style={{ color: "#6b7280", display: "block", fontSize: "11px" }}>Telemetry Source:</span>
                            <strong>{details.sos.sensor_data?.source || "ESP32 Sensor Telemetry"}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="detail-section">
                      <h3>
                        Emergency Location
                      </h3>

                      <div className="location-box">
                        <span className="location-icon">
                          📍
                        </span>

                        <div>
                          <strong>
                            {formatLocation(
                              details.sos
                                .latitude,
                              details.sos
                                .longitude
                            )}
                          </strong>

                          <span>
                            Accuracy:{" "}
                            {details.sos
                              .location_accuracy ??
                              "Unknown"}{" "}
                            m
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h3>
                        Emergency Contact
                      </h3>

                      {details.emergencyContacts
                        ?.length ? (
                        details.emergencyContacts.map(
                          (contact) => (
                            <div
                              className="contact-row"
                              key={contact.id}
                            >
                              <div>
                                <strong>
                                  {contact.name}
                                </strong>

                                <span>
                                  {
                                    contact.relationship
                                  }
                                </span>
                              </div>

                              <a
                                href={`tel:${contact.phone}`}
                              >
                                {contact.phone}
                              </a>
                            </div>
                          )
                        )
                      ) : (
                        <p className="muted">
                          No emergency contacts
                          registered.
                        </p>
                      )}
                    </div>

                    <div className="detail-section">
                      <h3>
                        Current Trip
                      </h3>

                      {details.sos.trip_destination ? (
                        <div className="trip-box">
                          <strong>
                            {details.sos
                              .trip_title ||
                              "Current Trip"}
                          </strong>

                          <span>
                            {
                              details.sos
                                .trip_destination
                            }
                          </span>

                          <span>
                            {
                              details.sos
                                .trip_start_date
                            }{" "}
                            →{" "}
                            {
                              details.sos
                                .trip_end_date
                            }
                          </span>
                        </div>
                      ) : (
                        <p className="muted">
                          No trip information available.
                        </p>
                      )}
                    </div>

                    <div className="detail-section">
                      <h3>
                        Current Hotel
                      </h3>

                      {details.sos.hotel_name ? (
                        <div className="trip-box">
                          <strong>
                            {details.sos.hotel_name}
                          </strong>

                          <span>
                            {details.sos
                              .hotel_address ||
                              "Address unavailable"}
                          </span>

                          <span>
                            {details.sos
                              .hotel_city ||
                              ""}
                          </span>
                        </div>
                      ) : (
                        <p className="muted">
                          No active hotel stay available.
                        </p>
                      )}
                    </div>

                    {details.sos.message && (
                      <div className="detail-section">
                        <h3>
                          Tourist Message
                        </h3>

                        <div className="message-box">
                          {details.sos.message}
                        </div>
                      </div>
                    )}

                    <div className="action-area">
                      {details.sos.status === "ACTIVE" && (
                        <button
                          className="acknowledge-button"
                          disabled={actionLoading}
                          onClick={handleAcknowledge}
                        >
                          {actionLoading ? "Processing..." : "Acknowledge SOS"}
                        </button>
                      )}

                      {(details.sos.status === "ACTIVE" || details.sos.status === "ACKNOWLEDGED") && (
                        <button
                          className="dispatch-button"
                          style={{
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            padding: "10px 18px",
                            borderRadius: "6px",
                            fontWeight: "700",
                            cursor: actionLoading ? "not-allowed" : "pointer"
                          }}
                          disabled={actionLoading}
                          onClick={handleDispatch}
                        >
                          {actionLoading ? "Processing..." : "Dispatch Response Unit"}
                        </button>
                      )}

                      {details.sos.status !== "RESOLVED" && (
                        <button
                          className="resolve-button"
                          disabled={actionLoading}
                          onClick={handleResolve}
                        >
                          {actionLoading ? "Processing..." : "Resolve Emergency"}
                        </button>
                      )}
                    </div>

                    <div className="event-section">
                      <h3>
                        Incident Timeline
                      </h3>

                      {details.events?.map(
                        (event) => (
                          <div
                            className="event-row"
                            key={event.id}
                          >
                            <span className="event-dot" />

                            <div>
                              <strong>
                                {event.event_type}
                              </strong>

                              <span>
                                {formatDate(
                                  event.created_at
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: GEOFENCE VIOLATIONS & IOT SENSOR TELEMETRY */}
        {activeTab === "geofence" && (
          <div className="geofence-page">
            <section className="status-bar">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="status-dot" style={{ background: "#dc2626" }} />
                <span>Geo-Fencing Threat Radar & Restricted Perimeter Monitoring</span>
                {iotHealth && (
                  <span
                    className={
                      iotHealth.source === "REAL" && iotHealth.online
                        ? "iot-source-real"
                        : iotHealth.source === "DEMO" && iotHealth.online
                        ? "iot-source-demo"
                        : "iot-source-sim"
                    }
                    style={{ marginLeft: "10px" }}
                  >
                    {iotHealth.source === "REAL" && iotHealth.online
                      ? "🟢 REAL IoT ONLINE"
                      : iotHealth.source === "DEMO" && iotHealth.online
                      ? "🟢 DEMO IoT ONLINE"
                      : "🟡 SIMULATION / DEVICE OFFLINE"}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#475569" }}>Filter:</span>
                {["ALL", "ACTIVE", "ACKNOWLEDGED", "RESOLVED"].map((st) => (
                  <button
                    key={st}
                    className={`filter-pill ${geofenceFilter === st ? "active" : ""}`}
                    onClick={() => setGeofenceFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </section>

            <section className="dashboard-grid">
              {/* Left Panel: Breach list */}
              <div className="incident-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">DANGER PERIMETER</p>
                    <h2>Geofence Violations</h2>
                  </div>
                  <button className="refresh-button" onClick={loadGeofenceBreaches}>
                    Refresh
                  </button>
                </div>

                {filteredBreaches.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
                      ✓
                    </div>
                    <h3>No Restricted Zone Violations</h3>
                    <p>All monitored tourists are currently in verified safe travel zones.</p>
                  </div>
                ) : (
                  <div className="incident-list">
                    {filteredBreaches.map((breach) => {
                      const isSelected = selectedBreach?.id === breach.id;
                      const isHot = breach.status === "ACTIVE";

                      return (
                        <button
                          key={breach.id}
                          className={`incident-card ${isSelected ? "selected" : ""} ${isHot ? "danger-card-border" : ""}`}
                          onClick={() => setSelectedBreach(breach)}
                        >
                          <div className="incident-alert" style={{ background: isHot ? "#fee2e2" : "#f1f5f9", color: isHot ? "#dc2626" : "#475569" }}>
                            <span className={isHot ? "blink-dot" : ""} style={{ background: isHot ? "#dc2626" : "#94a3b8" }} />
                            {breach.status} BREACH
                          </div>

                          <div className="incident-header">
                            <strong style={{ color: "#dc2626" }}>
                              ⛔ {breach.zone_name || "Restricted Area"}
                            </strong>
                            <span className={`status-pill ${breach.status.toLowerCase()}`}>
                              {breach.danger_level || "HIGH"}
                            </span>
                          </div>

                          <h3>{breach.tourist_name || "Tourist #" + (breach.tourist_uid || "Unknown")}</h3>
                          <p>UID: <strong>{breach.tourist_uid || "N/A"}</strong></p>
                          <p>Source: <span className="source-tag">{breach.source}</span></p>

                          <span className="incident-time">
                            {formatDate(breach.created_at)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Panel: Selected Breach Details & Map */}
              <div className="details-panel">
                {!selectedBreach ? (
                  <div className="details-placeholder">
                    <div className="placeholder-icon" style={{ background: "#fee2e2", color: "#dc2626" }}>
                      ⛔
                    </div>
                    <h2>Select a Geofence Breach</h2>
                    <p>Click on any violation on the left to view the tourist profile, danger zone coordinates, and live MPU6050 IoT sensor motion readings.</p>
                  </div>
                ) : (
                  <div className="details-content">
                    <div className="details-header" style={{ borderBottom: "1px solid #fee2e2" }}>
                      <div>
                        <p className="eyebrow" style={{ color: "#dc2626" }}>RESTRICTED ZONE VIOLATION</p>
                        <h2 style={{ color: "#991b1b" }}>{selectedBreach.zone_name}</h2>
                        <p className="details-subtitle">
                          Detected via <strong>{selectedBreach.source}</strong> at {formatDate(selectedBreach.created_at)}
                        </p>
                      </div>

                      <div className="action-buttons">
                        {selectedBreach.status === "ACTIVE" && (
                          <button
                            className="btn btn-warning"
                            onClick={() => handleAcknowledgeBreach(selectedBreach.id)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? "Processing..." : "Acknowledge Breach"}
                          </button>
                        )}
                        {selectedBreach.status !== "RESOLVED" && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleResolveBreach(selectedBreach.id)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? "Processing..." : "Dispatch Patrol & Clear"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="details-grid">
                      {/* Tourist Details */}
                      <div className="info-card">
                        <h3>Tourist Information</h3>
                        <div className="info-list">
                          <InfoItem label="Name" value={selectedBreach.tourist_name || "Unregistered / IoT Node"} />
                          <InfoItem label="Tourist UID" value={selectedBreach.tourist_uid || "Direct IoT Device"} />
                          <InfoItem label="Phone" value={selectedBreach.tourist_phone || "Not available"} />
                          <InfoItem label="Nationality" value={selectedBreach.nationality_code || "IND"} />
                          <InfoItem label="Status" value={selectedBreach.status} />
                        </div>
                      </div>

                      {/* Danger Zone Info */}
                      <div className="info-card">
                        <h3 style={{ color: "#dc2626" }}>Danger Zone Specs</h3>
                        <div className="info-list">
                          <InfoItem label="Zone Name" value={selectedBreach.zone_name} />
                          <InfoItem label="Danger Level" value={selectedBreach.danger_level} />
                          <InfoItem label="Zone Radius" value={`${selectedBreach.zone_radius || 300} meters`} />
                          <InfoItem label="Epicenter" value={formatLocation(selectedBreach.zone_latitude, selectedBreach.zone_longitude)} />
                        </div>
                      </div>
                    </div>

                    {/* IoT Sensor Telemetry Card (ESP32 + MPU6050) */}
                    <div className="iot-telemetry-card">
                      <div className="iot-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="iot-icon">📡</span>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <strong>IoT Sensor Telemetry (ESP32 + MPU6050)</strong>
                              {selectedBreach.telemetry_data?.source === "REAL" || selectedBreach.source === "IOT_SENSOR_ESP32" ? (
                                <span className="iot-source-real">🟢 REAL IoT</span>
                              ) : selectedBreach.telemetry_data?.source === "DEMO" || selectedBreach.source === "IOT_SENSOR_DEMO" ? (
                                <span className="iot-source-demo">🟢 DEMO IoT</span>
                              ) : (
                                <span className="iot-source-sim">🟡 SIMULATION</span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                              Node: <code>{selectedBreach.telemetry_data?.device_id || "ESP32-MPU6050-NODE-01"}</code> • Status:{" "}
                              <strong style={{ color: selectedBreach.telemetry_data?.online ? "#16a34a" : "#d97706" }}>
                                {selectedBreach.telemetry_data?.online
                                  ? (selectedBreach.telemetry_data?.source === "DEMO" ? "● DEMO Online" : "● Real Online")
                                  : "● ESP32 Offline"}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {selectedBreach.telemetry_data?.fall_detected ? (
                          <span className="fall-alert-pill">
                            ⚠️ IMPACT / FALL DETECTED
                          </span>
                        ) : (
                          <span className="fall-normal-pill">
                            ✓ Motion Steady
                          </span>
                        )}
                      </div>

                      <div className="telemetry-grid">
                        <div className="telemetry-box">
                          <span>Accel X ($a_x$)</span>
                          <strong>{selectedBreach.telemetry_data?.ax ?? "0.02"} g</strong>
                        </div>
                        <div className="telemetry-box">
                          <span>Accel Y ($a_y$)</span>
                          <strong>{selectedBreach.telemetry_data?.ay ?? "-0.04"} g</strong>
                        </div>
                        <div className="telemetry-box">
                          <span>Accel Z ($a_z$)</span>
                          <strong>{selectedBreach.telemetry_data?.az ?? "0.98"} g</strong>
                        </div>
                        <div className="telemetry-box">
                          <span>Total G-Force</span>
                          <strong>{selectedBreach.telemetry_data?.gForce ?? "1.00"} G</strong>
                        </div>
                        <div className="telemetry-box">
                          <span>Gyro ($\omega$)</span>
                          <strong>{selectedBreach.telemetry_data?.gx ? `${selectedBreach.telemetry_data.gx}°/s` : "0.0°/s"}</strong>
                        </div>
                        <div className="telemetry-box">
                          <span>Pitch / Roll</span>
                          <strong>{selectedBreach.telemetry_data?.pitch != null ? `${selectedBreach.telemetry_data.pitch}° / ${selectedBreach.telemetry_data.roll}°` : "0.0° / 0.0°"}</strong>
                        </div>
                        <div className="telemetry-box">
                          <span>Battery</span>
                          <strong style={{ color: selectedBreach.telemetry_data?.battery_level < 20 ? "#dc2626" : "#16a34a" }}>
                            {selectedBreach.telemetry_data?.battery_level != null ? `${Number(selectedBreach.telemetry_data.battery_level).toFixed(0)}%` : "92%"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Leaflet Map with Danger Circles */}
                    <EmergencyMap
                      restrictedZones={restrictedZones}
                      breachFocus={selectedBreach}
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: STATION PROFILE */}
        {activeTab === "profile" && (
          <div className="profile-page">
            <div className="profile-container" style={{ maxWidth: "800px", margin: "0 auto" }}>
              <div className="profile-header-card">
                <div className="profile-avatar-large">🏛️</div>
                <div>
                  <h2>{policeUser.station || "Agra Central Police Station"}</h2>
                  <p className="text-muted">
                    Official Command Center Account • {policeUser.email}
                  </p>
                </div>
              </div>

              {profileSuccess && (
                <div className="alert alert-success">
                  <span>✓</span>
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="alert alert-danger">
                  <span>⚠️</span>
                  <span>{profileError}</span>
                </div>
              )}

              <div className="profile-card" style={{ marginBottom: "24px" }}>
                <h3>Station Dispatch Information</h3>
                <form onSubmit={handleUpdateStationProfile}>
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label">Control Desk Title / Officer Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editDeskName}
                      onChange={(e) => setEditDeskName(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                    {profileSaving ? "Saving..." : "Save Station Details"}
                  </button>
                </form>
              </div>

              <div className="profile-card">
                <h3>Security & Password</h3>
                {pwSuccess && (
                  <div className="alert alert-success">
                    <span>✓</span>
                    <span>{pwSuccess}</span>
                  </div>
                )}
                {pwError && (
                  <div className="alert alert-danger">
                    <span>⚠️</span>
                    <span>{pwError}</span>
                  </div>
                )}
                <form onSubmit={handleChangeStationPassword}>
                  <div className="form-group" style={{ marginBottom: "16px" }}>
                    <label className="form-label">Current Password</label>
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      className="form-input"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row" style={{ marginBottom: "16px" }}>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input
                        type={showNewPw ? "text" : "password"}
                        className="form-input"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type={showConfirmPw ? "text" : "password"}
                        className="form-input"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                    {pwSaving ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;