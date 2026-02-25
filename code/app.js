// ===============================
// SariX – Complete app.js
// ===============================

(function (app) {
    // -------------------------------
    // Globals
    // -------------------------------
    let accessToken = null;
    let syncToken = null;
    let base = "https://matrix.org";
    let userId = null;
    let currentRoom = null;
    let joinedRooms = {};

    // -------------------------------
    // Helpers
    // -------------------------------
    function resolveBase() {
        const input = document.getElementById("HomeServer");
        base = input && input.value.trim() !== "" ? input.value.trim() : "https://matrix.org";
        if (base.endsWith("/")) base = base.slice(0, -1);
    }

    function saveSession() {
        localStorage.setItem("sariX_base", base);
        localStorage.setItem("sariX_access_token", accessToken);
        localStorage.setItem("sariX_sync_token", syncToken);
        localStorage.setItem("sariX_user_id", userId);
        localStorage.setItem("sariX_rooms", JSON.stringify(joinedRooms));
    }

    function loadSession() {
        const savedBase = localStorage.getItem("sariX_base");
        const savedToken = localStorage.getItem("sariX_access_token");
        const savedSync = localStorage.getItem("sariX_sync_token");
        const savedUser = localStorage.getItem("sariX_user_id");
        const savedRooms = localStorage.getItem("sariX_rooms");

        if (savedBase) base = savedBase;
        if (savedToken) accessToken = savedToken;
        if (savedSync) syncToken = savedSync;
        if (savedUser) userId = savedUser;
        if (savedRooms) joinedRooms = JSON.parse(savedRooms);
    }

    function showView(id) {
        document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
        document.getElementById(id).classList.add("active");
    }

    function getRoomDisplayName(room) {
        if (room.summary && room.summary.name) return room.summary.name;
        if (room.canonical_alias) return room.canonical_alias;
        return room.room_id ? room.room_id.split(":")[0] : "Room";
    }

    function renderRooms() {
        const roomsList = document.getElementById("roomsList");
        roomsList.innerHTML = "";

        Object.keys(joinedRooms).forEach(roomId => {
            const room = joinedRooms[roomId];
            const displayName = getRoomDisplayName(room);

            const div = document.createElement("div");
            div.className = "navItem";
            div.textContent = displayName;
            div.onclick = () => openRoom(roomId, displayName);
            roomsList.appendChild(div);
        });
    }

    function renderMessages(roomId) {
        const timeline = joinedRooms?.[roomId]?.timeline?.events || [];
        const messagesDiv = document.getElementById("messages");
        messagesDiv.innerHTML = "";

        timeline.slice(-30).forEach(ev => {
            if (ev.type === "m.room.message") {
                const senderName = ev.sender.startsWith("@") ? ev.sender.split(":")[0] : ev.sender;
                const msgDiv = document.createElement("div");
                msgDiv.textContent = (ev.sender === userId ? "Me: " : senderName + ": ") + ev.content.body;
                messagesDiv.appendChild(msgDiv);
            }
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    async function openRoom(roomId, displayName) {
        currentRoom = roomId;
        document.getElementById("chatTitle").textContent = displayName;
        renderMessages(roomId);
        showView("viewChat");
    }

    async function refreshRoom() {
        await syncMatrix();
        if (currentRoom) renderMessages(currentRoom);
    }

    // -------------------------------
    // Matrix API
    // -------------------------------
    async function loginMatrix(user, pass) {
        resolveBase();

        const res = await fetch(`${base}/_matrix/client/v3/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "m.login.password",
                identifier: { type: "m.id.user", user },
                password: pass
            })
        });

        if (!res.ok) throw new Error("Login failed");

        const data = await res.json();
        accessToken = data.access_token;
        userId = data.user_id;
        syncToken = null; // reset on login
        saveSession();
        await syncMatrix(); // initial sync
        return data;
    }

    async function syncMatrix() {
        let url = `${base}/_matrix/client/v3/sync?timeout=0`;
        if (syncToken) url += `&since=${syncToken}`;

        const res = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
        if (!res.ok) throw new Error("Sync failed");

        const data = await res.json();
        syncToken = data.next_batch;

        // Save joined rooms
        joinedRooms = { ...joinedRooms, ...(data.rooms?.join || {}) };
        saveSession();
        return data;
    }

    async function sendMessage(roomId, text) {
        if (!text.trim()) return;
        const txn = Date.now();

        await fetch(`${base}/_matrix/client/v3/rooms/${roomId}/send/m.room.message/${txn}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
            body: JSON.stringify({ msgtype: "m.text", body: text })
        });
    }

    // -------------------------------
    // UI Event Listeners
    // -------------------------------
    document.getElementById("loginBtn")?.addEventListener("click", async () => {
        const user = document.getElementById("username").value;
        const pass = document.getElementById("password").value;
        try {
            await loginMatrix(user, pass);
            renderRooms();
            showView("viewRooms");
        } catch (e) {
            alert("Login failed: " + e.message);
        }
    });

    document.getElementById("refreshRooms")?.addEventListener("click", renderRooms);
    document.getElementById("backToRooms")?.addEventListener("click", () => showView("viewRooms"));
    document.getElementById("sendBtn")?.addEventListener("click", async () => {
        const msgInput = document.getElementById("msgInput");
        await sendMessage(currentRoom, msgInput.value);
        msgInput.value = "";
        refreshRoom();
    });

    // -------------------------------
    // Load previous session
    // -------------------------------
    loadSession();
    if (accessToken) {
        renderRooms();
        showView("viewRooms");
    }

    // -------------------------------
    // KaiOS Key Handling
    // -------------------------------
    const keyOverlay = document.getElementById('keyOverlay');
    let overlayTimeout;
    document.addEventListener('keydown', e => {
        keyOverlay.style.display = 'block';
        keyOverlay.innerHTML += '<span>' + e.key + '</span>';
        clearTimeout(overlayTimeout);
        overlayTimeout = setTimeout(() => {
            keyOverlay.innerHTML = '';
            keyOverlay.style.display = 'none';
        }, 500);
    });

    document.addEventListener('keyup', e => {
        switch(e.key){
            case 'Backspace': e.preventDefault(); app.keyCallback?.back(); break;
            case 'Enter': app.keyCallback?.enter(); break;
            case 'SoftLeft': app.keyCallback?.softLeft(); break;
            case 'SoftRight': app.keyCallback?.softRight(); break;
            case 'ArrowUp': app.keyCallback?.dUp(); break;
            case 'ArrowDown': app.keyCallback?.dDown(); break;
            case 'ArrowLeft': app.keyCallback?.dLeft(); break;
            case 'ArrowRight': app.keyCallback?.dRight(); break;
        }
    });

    // -------------------------------
    // Responsive KaiAds Banner
    // -------------------------------
    const adContainer = document.getElementById('ad-container');
    let adVisibleTimeout;
    function showAdSmooth() {
        adContainer.style.opacity = '0';
        adContainer.style.display = 'flex';
        setTimeout(() => { adContainer.style.transition = 'opacity 0.3s'; adContainer.style.opacity = '1'; }, 50);
        clearTimeout(adVisibleTimeout);
        adVisibleTimeout = setTimeout(() => hideAdSmooth(), 8000);
    }
    function hideAdSmooth() {
        adContainer.style.opacity = '0';
        setTimeout(() => adContainer.style.display = 'none', 300);
    }

    document.addEventListener("DOMContentLoaded", () => {
        try {
            getKaiAd({
                publisher: '795e22ff-9fa3-410f-a2b2-1fcb0762cbd1',
                app: 'SariX',
                test: 0,
                h: 60,
                w: 224,
                container: adContainer,
                onerror: err => console.error('KaiAds error:', err),
                onready: ad => {
                    ad.call('display', { tabindex: 50, navClass: 'navItem', display: 'block' });
                    ad.on('display', showAdSmooth);
                    ad.on('close', hideAdSmooth);
                    ad.on('click', () => console.log('Ad clicked'));
                }
            });
        } catch(e) {
            console.log('KaiAds not available', e);
            adContainer.innerText = 'KaiAds not available';
        }
    });

    return app;

})(window.MyKaiOSApp = window.MyKaiOSApp || {});