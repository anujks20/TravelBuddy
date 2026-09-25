(function () {
    "use strict";

    const TOKEN_KEY = "travelbuddy_token";
    const USER_KEY = "travelbuddy_user";

    function getToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    function getUser() {
        try {
            return JSON.parse(
                localStorage.getItem(USER_KEY) || "null"
            );
        } catch {
            return null;
        }
    }

    function saveSession(data) {
        if (data.token) {
            localStorage.setItem(
                TOKEN_KEY,
                data.token
            );
        }

        if (data.user) {
            localStorage.setItem(
                USER_KEY,
                JSON.stringify(data.user)
            );
        }
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    function authHeaders(extra = {}) {
        const token = getToken();

        return {
            ...extra,
            ...(token
                ? {
                    Authorization:
                        `Bearer ${token}`
                }
                : {})
        };
    }

    function isLoggedIn() {
        return !!getToken();
    }

    function showAuthModal(defaultMode = "login") {
        const existing =
            document.getElementById(
                "tb-auth-modal"
            );

        if (existing) {
            existing.classList.remove("hidden");
            setMode(defaultMode);
            return;
        }

        const modal =
            document.createElement("div");

        modal.id = "tb-auth-modal";

        modal.innerHTML = `
            <div style="
                position:fixed;
                inset:0;
                z-index:99999;
                background:rgba(0,0,0,.72);
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
                font-family:Inter,Arial,sans-serif;
            ">
                <div class="auth-card" style="
                    width:min(460px,100%);
                    max-height:90vh;
                    overflow:auto;
                    border-radius:20px;
                    padding:30px;
                    box-shadow:0 25px 80px rgba(0,0,0,.35);
                    position:relative;
                ">
                    <button id="tb-auth-close"
                        style="
                            position:absolute;
                            right:18px;
                            top:15px;
                            border:0;
                            background:none;
                            font-size:26px;
                            cursor:pointer;
                        ">×</button>

                    <div style="text-align:center;margin-bottom:22px;">
                        <div style="
                            font-size:28px;
                            font-weight:700;
                            margin-bottom:6px;
                        ">TravelBuddy</div>

                        <div id="tb-auth-subtitle"
                            style="color:#64748b;">
                            Login to your account
                        </div>
                    </div>

                    <div style="
                        display:flex;
                        gap:8px;
                        margin-bottom:20px;
                    ">
                        <button id="tb-login-tab"
                            style="
                                flex:1;
                                padding:11px;
                                border-radius:10px;
                                border:1px solid #ddd;
                                cursor:pointer;
                            ">Login</button>

                        <button id="tb-register-tab"
                            style="
                                flex:1;
                                padding:11px;
                                border-radius:10px;
                                border:1px solid #ddd;
                                cursor:pointer;
                            ">Register</button>
                    </div>

                    <form id="tb-auth-form">

                        <div id="tb-register-fields">

                            <label style="display:block;margin:10px 0 5px;">
                                Full Name
                            </label>

                            <input id="tb-full-name"
                                type="text"
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:12px;
                                    border:1px solid #ddd;
                                    border-radius:9px;
                                ">

                            <label style="display:block;margin:10px 0 5px;">
                                Phone
                            </label>

                            <input id="tb-phone"
                                type="tel"
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:12px;
                                    border:1px solid #ddd;
                                    border-radius:9px;
                                ">

                            <label style="display:block;margin:10px 0 5px;">
                                Nationality Code
                            </label>

                            <input id="tb-nationality"
                                type="text"
                                maxlength="3"
                                placeholder="IND"
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:12px;
                                    border:1px solid #ddd;
                                    border-radius:9px;
                                    text-transform:uppercase;
                                ">

                            <label style="display:block;margin:10px 0 5px;">
                                Identity Type
                            </label>

                            <select id="tb-identity-type"
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:12px;
                                    border:1px solid #ddd;
                                    border-radius:9px;
                                ">
                                <option value="AADHAAR">Aadhaar</option>
                                <option value="PASSPORT">Passport</option>
                            </select>

                            <label style="display:block;margin:10px 0 5px;">
                                Identity Number
                            </label>

                            <input id="tb-identity-number"
                                type="text"
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:12px;
                                    border:1px solid #ddd;
                                    border-radius:9px;
                                ">

                        </div>

                        <label style="display:block;margin:12px 0 6px;font-size:14px;font-weight:600;color:#334155;">
                            Email
                        </label>
                        <div style="position:relative;display:flex;align-items:center;">
                            <span style="position:absolute;left:14px;font-size:16px;opacity:0.6;pointer-events:none;">✉️</span>
                            <input id="tb-email"
                                type="email"
                                placeholder="test@travelbuddy.com"
                                required
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:12px 14px 12px 42px;
                                    border:1px solid #d9e1ea;
                                    border-radius:10px;
                                    font-size:14px;
                                    color:#0f172a;
                                    outline:none;
                                ">
                        </div>

                        <label style="display:block;margin:12px 0 6px;font-size:14px;font-weight:600;color:#334155;">
                            Password
                        </label>
                        <div style="position:relative;display:flex;align-items:center;">
                            <span style="position:absolute;left:14px;font-size:16px;opacity:0.6;pointer-events:none;">🔒</span>
                            <input id="tb-password"
                                type="password"
                                placeholder="Enter password"
                                required
                                style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:12px 42px 12px 42px;
                                    border:1px solid #d9e1ea;
                                    border-radius:10px;
                                    font-size:14px;
                                    color:#0f172a;
                                    outline:none;
                                ">
                            <button id="tb-password-toggle"
                                type="button"
                                style="
                                    position:absolute;
                                    right:10px;
                                    background:none;
                                    border:none;
                                    padding:6px;
                                    cursor:pointer;
                                    font-size:16px;
                                    opacity:0.6;
                                " title="Toggle password visibility">👁️</button>
                        </div>

                        <div id="tb-auth-message"
                            style="
                                display:none;
                                margin-top:14px;
                                padding:10px;
                                border-radius:8px;
                                background:#fee2e2;
                                color:#991b1b;
                                font-size:14px;
                            "></div>

                        <button id="tb-auth-submit"
                            type="submit"
                            style="
                                width:100%;
                                margin-top:20px;
                                padding:13px;
                                border:0;
                                border-radius:10px;
                                background:#2563eb;
                                color:#fff;
                                font-weight:600;
                                cursor:pointer;
                            ">
                            Login
                        </button>

                        <div id="tb-demo-credentials" style="
                            margin-top:20px;
                            padding:16px;
                            background:#eff6ff;
                            border:1.2px solid #93c5fd;
                            border-radius:12px;
                            font-size:13px;
                            color:#1e293b;
                            text-align:left;
                            display:flex;
                            flex-direction:column;
                            gap:8px;
                        ">
                            <div style="display:flex;align-items:center;gap:8px;color:#1e40af;font-size:13px;font-weight:700;">
                                <span>🔑</span>
                                <strong>Demo Credentials (Seeded):</strong>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:4px;font-size:13px;color:#1e293b;">
                                <div>Email: <strong>test@travelbuddy.com</strong></div>
                                <div>Password: <strong>password123</strong></div>
                            </div>
                            <button id="tb-autofill-btn"
                                type="button"
                                style="
                                    align-self:flex-start;
                                    margin-top:4px;
                                    padding:7px 14px;
                                    background:#2563eb;
                                    color:#ffffff;
                                    border:none;
                                    border-radius:6px;
                                    font-size:12px;
                                    font-weight:700;
                                    cursor:pointer;
                                ">
                                Auto-Fill Demo Credentials
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document
            .getElementById("tb-auth-close")
            .addEventListener("click", () => {
                modal.remove();
            });

        document
            .getElementById("tb-login-tab")
            .addEventListener("click", () =>
                setMode("login")
            );

        document
            .getElementById("tb-register-tab")
            .addEventListener("click", () =>
                setMode("register")
            );

        const autofillBtn = document.getElementById("tb-autofill-btn");
        if (autofillBtn) {
            autofillBtn.addEventListener("click", () => {
                const emailInput = document.getElementById("tb-email");
                const passInput = document.getElementById("tb-password");
                if (emailInput) emailInput.value = "test@travelbuddy.com";
                if (passInput) passInput.value = "password123";
            });
        }

        const toggleBtn = document.getElementById("tb-password-toggle");
        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                const passInput = document.getElementById("tb-password");
                if (passInput) {
                    const isPassword = passInput.type === "password";
                    passInput.type = isPassword ? "text" : "password";
                    toggleBtn.textContent = isPassword ? "👁️‍🗨️" : "👁️";
                }
            });
        }

        document
            .getElementById("tb-auth-form")
            .addEventListener(
                "submit",
                submitAuth
            );

        setMode(defaultMode);
    }

    function setMode(mode) {
        const registerFields =
            document.getElementById(
                "tb-register-fields"
            );

        const subtitle =
            document.getElementById(
                "tb-auth-subtitle"
            );

        const submit =
            document.getElementById(
                "tb-auth-submit"
            );

        const message =
            document.getElementById(
                "tb-auth-message"
            );

        const demoCredentials =
            document.getElementById(
                "tb-demo-credentials"
            );

        if (!registerFields) return;

        const register =
            mode === "register";

        registerFields.style.display =
            register ? "block" : "none";

        if (demoCredentials) {
            demoCredentials.style.display =
                register ? "none" : "flex";
        }

        subtitle.textContent = register
            ? "Create your TravelBuddy account"
            : "Login to your account";

        submit.textContent = register
            ? "Create Account"
            : "Login";

        if (message) {
            message.style.display = "none";
        }
    }

    async function submitAuth(event) {
        event.preventDefault();

        const modal =
            document.getElementById(
                "tb-auth-modal"
            );

        const registerFields =
            document.getElementById(
                "tb-register-fields"
            );

        const isRegister =
            registerFields &&
            registerFields.style.display !==
                "none";

        const message =
            document.getElementById(
                "tb-auth-message"
            );

        const submit =
            document.getElementById(
                "tb-auth-submit"
            );

        message.style.display = "none";
        submit.disabled = true;
        submit.textContent = "Please wait...";

        try {
            const payload = {
                email:
                    document.getElementById(
                        "tb-email"
                    ).value.trim(),
                password:
                    document.getElementById(
                        "tb-password"
                    ).value
            };

            let endpoint;

            if (isRegister) {
                endpoint = "/api/auth/register";

                payload.fullName =
                    document
                        .getElementById(
                            "tb-full-name"
                        )
                        .value.trim();

                payload.phone =
                    document
                        .getElementById(
                            "tb-phone"
                        )
                        .value.trim();

                payload.nationalityCode =
                    document
                        .getElementById(
                            "tb-nationality"
                        )
                        .value.trim()
                        .toUpperCase();

                payload.identityType =
                    document
                        .getElementById(
                            "tb-identity-type"
                        )
                        .value;

                payload.identityNumber =
                    document
                        .getElementById(
                            "tb-identity-number"
                        )
                        .value.trim();

                payload.language = "English";
            } else {
                endpoint = "/api/auth/login";
            }

            const response = await fetch(
                endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify(payload)
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Authentication failed."
                );
            }

            saveSession(data);

            modal.remove();

            updateAuthUI();

            window.dispatchEvent(
                new CustomEvent(
                    "travelbuddy-authenticated",
                    {
                        detail: data.user
                    }
                )
            );

            if (isRegister && data.user) {
                alert(
                    `Account created successfully!\n\nYour Tourist UID is:\n${data.user.tourist_uid}`
                );
            }
        } catch (error) {
            message.textContent =
                error.message;

            message.style.display = "block";
        } finally {
            submit.disabled = false;
            submit.textContent =
                isRegister
                    ? "Create Account"
                    : "Login";
        }
    }

    async function fetchFreshUser() {
        try {
            const token = getToken();
            if (!token) return null;
            const res = await fetch("/api/auth/me", {
                headers: authHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.user) {
                    saveSession({ user: data.user });
                    return data.user;
                }
            }
        } catch (_) {}
        return getUser();
    }

    async function showProfileModal() {
        if (!isLoggedIn()) {
            showAuthModal("login");
            return;
        }

        const user = (await fetchFreshUser()) || getUser() || {};

        const existing = document.getElementById("tb-profile-modal");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.id = "tb-profile-modal";

        const identityType = user.identity_type || "PASSPORT";
        const nationalityCode = user.nationality_code || "IND";
        const touristUid = user.tourist_uid || "TB-TOURIST";
        const userEmail = user.email || "";
        const fullName = user.full_name || "";
        const phone = user.phone || "";
        const language = user.language || "English";
        const isVerified = user.identity_verified === true;

        modal.innerHTML = `
            <div style="
                position:fixed;
                inset:0;
                z-index:99999;
                background:rgba(0,0,0,.75);
                backdrop-filter:blur(6px);
                display:flex;
                align-items:center;
                justify-content:center;
                padding:16px;
                font-family:Inter,Arial,sans-serif;
            ">
                <div class="profile-card" style="
                    width:min(540px, 100%);
                    max-height:92vh;
                    overflow-y:auto;
                    background:#ffffff;
                    color:#0f172a;
                    border-radius:20px;
                    padding:28px;
                    box-shadow:0 30px 90px rgba(0,0,0,.45);
                    position:relative;
                ">
                    <button id="tb-profile-close"
                        style="
                            position:absolute;
                            right:18px;
                            top:18px;
                            border:0;
                            background:#f1f5f9;
                            border-radius:50%;
                            width:34px;
                            height:34px;
                            font-size:20px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            cursor:pointer;
                            color:#475569;
                        ">×</button>

                    <!-- Header -->
                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
                        <div style="
                            width:52px;
                            height:52px;
                            border-radius:50%;
                            background:linear-gradient(135deg, #176B87 0%, #051923 100%);
                            color:#fff;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            font-size:22px;
                            font-weight:700;
                            flex-shrink:0;
                        ">
                            ${(fullName || userEmail || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">
                                Tourist Profile
                            </h2>
                            <p style="margin:2px 0 0;font-size:13px;color:#64748b;">
                                View credentials and update personal details
                            </p>
                        </div>
                    </div>

                    <!-- Read-Only Identity Card -->
                    <div style="
                        background:#f8fafc;
                        border:1px solid #e2e8f0;
                        border-radius:14px;
                        padding:16px;
                        margin-bottom:20px;
                    ">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                            <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#64748b;">
                                🔒 Fixed / Identity Records
                            </span>
                            <span style="
                                font-size:11px;
                                font-weight:600;
                                padding:3px 8px;
                                border-radius:12px;
                                background:${isVerified ? "#dcfce7" : "#fef3c7"};
                                color:${isVerified ? "#166534" : "#92400e"};
                            ">
                                ${isVerified ? "✓ Verified Identity" : "Standard Tourist"}
                            </span>
                        </div>

                        <!-- Tourist UID Pill -->
                        <div style="
                            display:flex;
                            align-items:center;
                            justify-content:space-between;
                            background:#ffffff;
                            border:1px dashed #cbd5e1;
                            border-radius:10px;
                            padding:10px 14px;
                            margin-bottom:12px;
                        ">
                            <div>
                                <div style="font-size:11px;color:#64748b;font-weight:600;">OFFICIAL TOURIST UID</div>
                                <div id="tb-display-uid" style="font-size:16px;font-weight:800;letter-spacing:0.8px;color:#176B87;font-family:monospace;">
                                    ${escapeHtml(touristUid)}
                                </div>
                            </div>
                            <button id="tb-copy-uid-btn" type="button" style="
                                padding:6px 12px;
                                background:#f1f5f9;
                                border:1px solid #cbd5e1;
                                border-radius:8px;
                                font-size:12px;
                                font-weight:600;
                                cursor:pointer;
                                color:#334155;
                            ">📋 Copy</button>
                        </div>

                        <!-- Fixed Grid Info -->
                        <div class="tb-fixed-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;">
                            <div>
                                <div style="font-size:11px;color:#64748b;font-weight:500;">Email Address</div>
                                <div style="font-size:13px;font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(userEmail)}">
                                    ${escapeHtml(userEmail)}
                                </div>
                            </div>
                            <div>
                                <div style="font-size:11px;color:#64748b;font-weight:500;">Nationality Code</div>
                                <div style="font-size:13px;font-weight:600;color:#334155;">
                                    🌍 ${escapeHtml(nationalityCode)}
                                </div>
                            </div>
                            <div>
                                <div style="font-size:11px;color:#64748b;font-weight:500;">Identity Type</div>
                                <div style="font-size:13px;font-weight:600;color:#334155;">
                                    🆔 ${escapeHtml(identityType)}
                                </div>
                            </div>
                            <div>
                                <div style="font-size:11px;color:#64748b;font-weight:500;">Account Role</div>
                                <div style="font-size:13px;font-weight:600;color:#334155;">
                                    🛡️ TOURIST
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Profile Tabs -->
                    <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:10px;">
                        <button id="tb-tab-edit-profile" type="button" style="
                            padding:8px 16px;
                            border-radius:8px;
                            border:none;
                            background:#176B87;
                            color:#ffffff;
                            font-size:13px;
                            font-weight:600;
                            cursor:pointer;
                        ">✏️ Edit Details</button>
                        <button id="tb-tab-change-password" type="button" style="
                            padding:8px 16px;
                            border-radius:8px;
                            border:1px solid #e2e8f0;
                            background:#ffffff;
                            color:#475569;
                            font-size:13px;
                            font-weight:600;
                            cursor:pointer;
                        ">🔒 Change Password</button>
                    </div>

                    <!-- Alert message container -->
                    <div id="tb-profile-alert" style="display:none;padding:10px 14px;border-radius:10px;font-size:13px;font-weight:500;margin-bottom:14px;"></div>

                    <!-- Form 1: Edit Profile Details -->
                    <form id="tb-edit-profile-form">
                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:5px;">
                                Full Name <span style="color:#ef4444;">*</span>
                            </label>
                            <input id="tb-prof-fullname" type="text" value="${escapeHtml(fullName)}" required style="
                                width:100%;
                                box-sizing:border-box;
                                padding:10px 14px;
                                border:1px solid #cbd5e1;
                                border-radius:10px;
                                font-size:14px;
                                color:#0f172a;
                                outline:none;
                            ">
                        </div>

                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:5px;">
                                Contact Phone
                            </label>
                            <input id="tb-prof-phone" type="tel" value="${escapeHtml(phone)}" placeholder="+91 98765 43210" style="
                                width:100%;
                                box-sizing:border-box;
                                padding:10px 14px;
                                border:1px solid #cbd5e1;
                                border-radius:10px;
                                font-size:14px;
                                color:#0f172a;
                                outline:none;
                            ">
                        </div>

                        <div style="margin-bottom:20px;">
                            <label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:5px;">
                                Preferred Language
                            </label>
                            <select id="tb-prof-language" style="
                                width:100%;
                                box-sizing:border-box;
                                padding:10px 14px;
                                border:1px solid #cbd5e1;
                                border-radius:10px;
                                font-size:14px;
                                color:#0f172a;
                                background:#ffffff;
                                outline:none;
                            ">
                                <option value="English" ${language === "English" ? "selected" : ""}>English</option>
                                <option value="Hindi" ${language === "Hindi" ? "selected" : ""}>Hindi (हिंदी)</option>
                                <option value="Spanish" ${language === "Spanish" ? "selected" : ""}>Spanish (Español)</option>
                                <option value="French" ${language === "French" ? "selected" : ""}>French (Français)</option>
                                <option value="German" ${language === "German" ? "selected" : ""}>German (Deutsch)</option>
                                <option value="Japanese" ${language === "Japanese" ? "selected" : ""}>Japanese (日本語)</option>
                                <option value="Mandarin" ${language === "Mandarin" ? "selected" : ""}>Mandarin (中文)</option>
                                <option value="Arabic" ${language === "Arabic" ? "selected" : ""}>Arabic (العربية)</option>
                                <option value="Russian" ${language === "Russian" ? "selected" : ""}>Russian (Русский)</option>
                            </select>
                        </div>

                        <button id="tb-prof-save-btn" type="submit" style="
                            width:100%;
                            padding:12px;
                            border:none;
                            border-radius:10px;
                            background:#176B87;
                            color:#ffffff;
                            font-size:14px;
                            font-weight:600;
                            cursor:pointer;
                            transition:opacity 0.2s;
                        ">Save Profile Changes</button>
                    </form>

                    <!-- Form 2: Change Password -->
                    <form id="tb-change-pw-form" style="display:none;">
                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:5px;">
                                Current Password <span style="color:#ef4444;">*</span>
                            </label>
                            <div style="position:relative;display:flex;align-items:center;">
                                <input id="tb-curr-password" type="password" placeholder="Enter current password" required style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:10px 42px 10px 14px;
                                    border:1px solid #cbd5e1;
                                    border-radius:10px;
                                    font-size:14px;
                                    color:#0f172a;
                                    outline:none;
                                ">
                                <button type="button" class="tb-toggle-pw" data-target="tb-curr-password" style="
                                    position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:15px;opacity:0.6;
                                ">👁️</button>
                            </div>
                        </div>

                        <div style="margin-bottom:14px;">
                            <label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:5px;">
                                New Password <span style="color:#ef4444;">*</span> (min 6 characters)
                            </label>
                            <div style="position:relative;display:flex;align-items:center;">
                                <input id="tb-new-password" type="password" placeholder="Enter new password" minlength="6" required style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:10px 42px 10px 14px;
                                    border:1px solid #cbd5e1;
                                    border-radius:10px;
                                    font-size:14px;
                                    color:#0f172a;
                                    outline:none;
                                ">
                                <button type="button" class="tb-toggle-pw" data-target="tb-new-password" style="
                                    position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:15px;opacity:0.6;
                                ">👁️</button>
                            </div>
                        </div>

                        <div style="margin-bottom:20px;">
                            <label style="display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:5px;">
                                Confirm New Password <span style="color:#ef4444;">*</span>
                            </label>
                            <div style="position:relative;display:flex;align-items:center;">
                                <input id="tb-confirm-password" type="password" placeholder="Re-enter new password" minlength="6" required style="
                                    width:100%;
                                    box-sizing:border-box;
                                    padding:10px 42px 10px 14px;
                                    border:1px solid #cbd5e1;
                                    border-radius:10px;
                                    font-size:14px;
                                    color:#0f172a;
                                    outline:none;
                                ">
                                <button type="button" class="tb-toggle-pw" data-target="tb-confirm-password" style="
                                    position:absolute;right:10px;background:none;border:none;cursor:pointer;font-size:15px;opacity:0.6;
                                ">👁️</button>
                            </div>
                        </div>

                        <button id="tb-pw-save-btn" type="submit" style="
                            width:100%;
                            padding:12px;
                            border:none;
                            border-radius:10px;
                            background:#176B87;
                            color:#ffffff;
                            font-size:14px;
                            font-weight:600;
                            cursor:pointer;
                            transition:opacity 0.2s;
                        ">Update Password</button>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close handlers
        const closeBtn = document.getElementById("tb-profile-close");
        closeBtn.addEventListener("click", () => modal.remove());

        modal.addEventListener("click", (e) => {
            if (e.target === modal.firstElementChild) modal.remove();
        });

        // Copy UID button
        const copyBtn = document.getElementById("tb-copy-uid-btn");
        copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(touristUid).then(() => {
                copyBtn.textContent = "✓ Copied!";
                setTimeout(() => { copyBtn.textContent = "📋 Copy"; }, 2000);
            }).catch(() => {
                prompt("Tourist UID:", touristUid);
            });
        });

        // Tabs toggle
        const tabEdit = document.getElementById("tb-tab-edit-profile");
        const tabPw = document.getElementById("tb-tab-change-password");
        const formEdit = document.getElementById("tb-edit-profile-form");
        const formPw = document.getElementById("tb-change-pw-form");
        const alertBox = document.getElementById("tb-profile-alert");

        function showAlert(msg, isSuccess = false) {
            alertBox.style.display = "block";
            alertBox.textContent = msg;
            if (isSuccess) {
                alertBox.style.background = "#dcfce7";
                alertBox.style.color = "#166534";
                alertBox.style.border = "1px solid #bbf7d0";
            } else {
                alertBox.style.background = "#fee2e2";
                alertBox.style.color = "#991b1b";
                alertBox.style.border = "1px solid #fecaca";
            }
        }

        tabEdit.addEventListener("click", () => {
            tabEdit.style.background = "#176B87";
            tabEdit.style.color = "#ffffff";
            tabEdit.style.border = "none";
            tabPw.style.background = "#ffffff";
            tabPw.style.color = "#475569";
            tabPw.style.border = "1px solid #e2e8f0";
            formEdit.style.display = "block";
            formPw.style.display = "none";
            alertBox.style.display = "none";
        });

        tabPw.addEventListener("click", () => {
            tabPw.style.background = "#176B87";
            tabPw.style.color = "#ffffff";
            tabPw.style.border = "none";
            tabEdit.style.background = "#ffffff";
            tabEdit.style.color = "#475569";
            tabEdit.style.border = "1px solid #e2e8f0";
            formPw.style.display = "block";
            formEdit.style.display = "none";
            alertBox.style.display = "none";
        });

        // Password toggles
        modal.querySelectorAll(".tb-toggle-pw").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetId = btn.getAttribute("data-target");
                const target = document.getElementById(targetId);
                if (target) {
                    target.type = target.type === "password" ? "text" : "password";
                }
            });
        });

        // Submit Profile Edit
        formEdit.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById("tb-prof-save-btn");
            submitBtn.disabled = true;
            submitBtn.textContent = "Saving...";
            alertBox.style.display = "none";

            try {
                const payload = {
                    fullName: document.getElementById("tb-prof-fullname").value.trim(),
                    phone: document.getElementById("tb-prof-phone").value.trim(),
                    language: document.getElementById("tb-prof-language").value
                };

                const res = await fetch("/api/auth/profile", {
                    method: "PATCH",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to update profile.");

                saveSession({ user: data.user });
                updateAuthUI();
                showAlert("Profile updated successfully!", true);

                window.dispatchEvent(
                    new CustomEvent("travelbuddy-profile-updated", { detail: data.user })
                );
            } catch (err) {
                showAlert(err.message, false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Save Profile Changes";
            }
        });

        // Submit Change Password
        formPw.addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById("tb-pw-save-btn");
            const currentPassword = document.getElementById("tb-curr-password").value;
            const newPassword = document.getElementById("tb-new-password").value;
            const confirmPassword = document.getElementById("tb-confirm-password").value;

            if (newPassword !== confirmPassword) {
                showAlert("New password and confirm password do not match.", false);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = "Updating Password...";
            alertBox.style.display = "none";

            try {
                const res = await fetch("/api/auth/change-password", {
                    method: "POST",
                    headers: authHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || "Failed to change password.");

                showAlert("Password changed successfully!", true);
                formPw.reset();
            } catch (err) {
                showAlert(err.message, false);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = "Update Password";
            }
        });
    }

    function updateAuthUI() {
        const navRight = document.querySelector(".nav-right");
        if (!navRight) return;

        const old = document.getElementById("tb-auth-area");
        if (old) old.remove();

        const user = getUser();
        const area = document.createElement("div");
        area.id = "tb-auth-area";
        area.style.cssText = `
            display:flex;
            align-items:center;
            gap:8px;
            margin-left:6px;
        `;

        if (user) {
            area.innerHTML = `
                <button id="tb-profile-btn" type="button" style="
                    display:flex;
                    align-items:center;
                    gap:6px;
                    background:rgba(23,107,135,0.12);
                    border:1px solid rgba(23,107,135,0.3);
                    padding:6px 12px;
                    border-radius:20px;
                    cursor:pointer;
                    color:inherit;
                    font-size:13px;
                    font-weight:600;
                    transition:all 0.2s;
                " title="View and Edit Tourist Profile">
                    <span style="font-size:14px;">👤</span>
                    <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHtml(user.full_name || user.email.split("@")[0])}
                    </span>
                </button>

                <button id="tb-logout-btn" class="btn btn-small btn-outline" type="button" style="padding:6px 12px;">
                    Logout
                </button>
            `;

            navRight.appendChild(area);

            document.getElementById("tb-profile-btn").addEventListener("click", () => {
                showProfileModal();
            });

            document.getElementById("tb-logout-btn").addEventListener("click", () => {
                clearSession();
                updateAuthUI();
                window.location.reload();
            });
        } else {
            area.innerHTML = `
                <button id="tb-login-btn" class="btn btn-small" type="button">
                    Login
                </button>
            `;

            navRight.appendChild(area);

            document.getElementById("tb-login-btn").addEventListener("click", () => {
                showAuthModal("login");
            });
        }

        // Also add or update Mobile Drawer Profile Option
        updateMobileDrawerProfile(user);
    }

    function updateMobileDrawerProfile(user) {
        const drawerFooter = document.querySelector(".mobile-drawer-footer");
        if (!drawerFooter) return;

        const oldDrawerProfile = document.getElementById("tb-drawer-profile-btn");
        if (oldDrawerProfile) oldDrawerProfile.remove();

        if (user) {
            const drawerProfileBtn = document.createElement("button");
            drawerProfileBtn.id = "tb-drawer-profile-btn";
            drawerProfileBtn.type = "button";
            drawerProfileBtn.className = "btn";
            drawerProfileBtn.style.cssText = `
                width:100%;
                margin-bottom:8px;
                background:#176B87;
                color:#ffffff;
                display:flex;
                align-items:center;
                justify-content:center;
                gap:8px;
                padding:12px;
                border-radius:10px;
                font-weight:600;
                border:none;
                cursor:pointer;
            `;
            drawerProfileBtn.innerHTML = `<span>👤</span> My Profile (${escapeHtml(user.full_name || user.tourist_uid || "Tourist")})`;
            drawerProfileBtn.addEventListener("click", () => {
                document.body.classList.remove("mobile-nav-open");
                showProfileModal();
            });

            drawerFooter.insertBefore(drawerProfileBtn, drawerFooter.firstChild);
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function initMobileNavigation() {
        const toggleBtn = document.getElementById("mobile-nav-toggle");
        const backdrop = document.getElementById("mobile-nav-backdrop");
        const closeBtn = document.getElementById("mobile-drawer-close");
        const navLinks = document.querySelectorAll(".nav-links a, .mobile-drawer-footer a");

        function openNav() {
            document.body.classList.add("mobile-nav-open");
        }

        function closeNav() {
            document.body.classList.remove("mobile-nav-open");
        }

        function toggleNav(e) {
            if (e) e.stopPropagation();
            if (document.body.classList.contains("mobile-nav-open")) {
                closeNav();
            } else {
                openNav();
            }
        }

        if (toggleBtn) {
            toggleBtn.addEventListener("click", toggleNav);
        }

        if (backdrop) {
            backdrop.addEventListener("click", closeNav);
        }

        if (closeBtn) {
            closeBtn.addEventListener("click", closeNav);
        }

        navLinks.forEach(link => {
            link.addEventListener("click", () => {
                closeNav();
            });
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && document.body.classList.contains("mobile-nav-open")) {
                closeNav();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 1024 && document.body.classList.contains("mobile-nav-open")) {
                closeNav();
            }
        });
    }

    window.TravelBuddyAuth = {
        getToken,
        getUser,
        saveSession,
        clearSession,
        authHeaders,
        isLoggedIn,
        showAuthModal,
        showProfileModal,
        updateAuthUI
    };

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            updateAuthUI();
            initMobileNavigation();
        }
    );
})();
