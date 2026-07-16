const ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
};

function ensureToastStack() {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

function showToast(message, type = "info") {
  const stack = ensureToastStack();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `${ICONS[type] || ICONS.info}<span class="toast-msg"></span>`;
  toast.querySelector(".toast-msg").textContent = message;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 220);
  }, 3200);
}

const toast = {
  success: (msg) => showToast(msg, "success"),
  error: (msg) => showToast(msg, "error"),
  info: (msg) => showToast(msg, "info"),
};

function ensureModalRoot() {
  let overlay = document.querySelector(".modal-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <h3 class="modal-title">Delete this entry?</h3>
        <p class="modal-desc">This action can't be undone.</p>
        <div class="modal-actions">
          <button class="btn btn-ghost modal-cancel">Cancel</button>
          <button class="btn btn-danger modal-confirm" style="background:var(--overdue-red);color:#fff;">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  return overlay;
}

function confirmModal({
  title = "Are you sure?",
  desc = "This action can't be undone.",
  confirmLabel = "Delete",
} = {}) {
  const overlay = ensureModalRoot();
  overlay.querySelector(".modal-title").textContent = title;
  overlay.querySelector(".modal-desc").textContent = desc;
  overlay.querySelector(".modal-confirm").textContent = confirmLabel;

  return new Promise((resolve) => {
    overlay.classList.add("open");

    const cleanup = (result) => {
      overlay.classList.remove("open");
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onOverlay);
      document.removeEventListener("keydown", onKey);
      resolve(result);
    };

    const confirmBtn = overlay.querySelector(".modal-confirm");
    const cancelBtn = overlay.querySelector(".modal-cancel");

    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onOverlay = (e) => {
      if (e.target === overlay) cleanup(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") cleanup(false);
    };

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("click", onOverlay);
    document.addEventListener("keydown", onKey);
  });
}

function applyStoredTheme() {
  const theme = sessionStorage.getItem("aeropulse-theme") || "light";
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

function toggleTheme() {
  const current =
    document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  sessionStorage.setItem("aeropulse-theme", next);
  updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
  const btn = document.querySelector("[data-theme-toggle]");
  if (!btn) return;
  const theme = document.documentElement.getAttribute("data-theme");
  btn.innerHTML =
    theme === "dark"
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.02 0l-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`;
}

function initSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  const collapseBtn = sidebar.querySelector(".sidebar-collapse-btn");
  const stored =
    sessionStorage.getItem("aeropulse-sidebar-collapsed") === "true";
  if (stored) sidebar.classList.add("collapsed");

  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      sessionStorage.setItem(
        "aeropulse-sidebar-collapsed",
        sidebar.classList.contains("collapsed"),
      );
    });
  }

  let backdrop = document.querySelector(".sidebar-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);
  }

  const closeMobileNav = () => {
    sidebar.classList.remove("mobile-open");
    backdrop.classList.remove("show");
  };

  const mobileToggle = document.querySelector("[data-mobile-nav-toggle]");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", () => {
      const willOpen = !sidebar.classList.contains("mobile-open");
      sidebar.classList.toggle("mobile-open", willOpen);
      backdrop.classList.toggle("show", willOpen);
    });
  }

  backdrop.addEventListener("click", closeMobileNav);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileNav();
  });
  sidebar
    .querySelectorAll(".sidebar-link")
    .forEach((link) => link.addEventListener("click", closeMobileNav));
}

function createChecklistDropdown(container, options, onChange) {
  const selected = [];

  const wrap = document.createElement("div");
  wrap.className = "dropdown";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "dropdown-toggle";
  toggle.innerHTML = `<span class="toggle-label">All</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;

  const panel = document.createElement("div");
  panel.className = "dropdown-panel";
  panel.innerHTML = options
    .map(
      (opt, idx) => `
      <label class="dropdown-option">
        <input type="checkbox" data-idx="${idx}" />
        <span>${escapeHtml(opt)}</span>
      </label>`,
    )
    .join("");

  wrap.appendChild(toggle);
  wrap.appendChild(panel);
  container.appendChild(wrap);

  const updateLabel = () => {
    toggle.querySelector(".toggle-label").textContent =
      selected.length === 0 ? "All" : `${selected.length} selected`;
  };

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !panel.classList.contains("open");
    closeOtherDropdownPanels(panel);
    panel.classList.toggle("open", willOpen);
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) panel.classList.remove("open");
  });

  panel.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const val = options[Number(cb.getAttribute("data-idx"))];
      const pos = selected.indexOf(val);
      if (cb.checked && pos === -1) selected.push(val);
      if (!cb.checked && pos !== -1) selected.splice(pos, 1);
      updateLabel();
      onChange(selected.slice());
    });
  });

  return {
    clear() {
      selected.length = 0;
      panel
        .querySelectorAll("input[type=checkbox]")
        .forEach((cb) => (cb.checked = false));
      updateLabel();
    },
    setSelected(values) {
      selected.length = 0;
      (values || []).forEach((v) => selected.push(v));
      panel.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        const val = options[Number(cb.getAttribute("data-idx"))];
        cb.checked = selected.includes(val);
      });
      updateLabel();
      return selected.slice();
    },
  };
}

function closeOtherDropdownPanels(exceptPanel) {
  document.querySelectorAll(".dropdown-panel.open").forEach((p) => {
    if (p !== exceptPanel) p.classList.remove("open");
  });
}

function createHierarchicalChecklistDropdown(container, hierarchy, onChange) {
  const selected = [];

  const wrap = document.createElement("div");
  wrap.className = "dropdown";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "dropdown-toggle";
  toggle.innerHTML = `<span class="toggle-label">All</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>`;

  const panel = document.createElement("div");
  panel.className = "dropdown-panel dropdown-panel--tree";

  const leafRow = (value, label, level) => `
      <label class="dropdown-option tree-leaf" style="padding-left:${12 + level * 16}px">
        <input type="checkbox" data-value="${escapeHtml(value)}" />
        <span>${escapeHtml(label)}</span>
      </label>`;

  const groupHeader = (label, groupKey, level) => `
      <div class="tree-group-header collapsed" data-tree-toggle="${escapeHtml(groupKey)}" style="padding-left:${level * 16}px">
        <button type="button" class="tree-toggle" tabindex="-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/></svg>
        </button>
        <span class="tree-group-label">${escapeHtml(label)}</span>
      </div>`;

  let html = "";
  Object.entries(hierarchy).forEach(([org, val]) => {
    if (val === null) {
      html += leafRow(org, org, 0);
    } else if (Array.isArray(val)) {
      html += groupHeader(org, org, 0);
      html += `<div class="tree-children collapsed" data-tree-children="${org}">`;
      val.forEach((sub) => {
        html += leafRow(`${org} / ${sub}`, sub, 1);
      });
      html += `</div>`;
    } else {
      html += groupHeader(org, org, 0);
      html += `<div class="tree-children collapsed" data-tree-children="${org}">`;
      Object.entries(val).forEach(([dept, subs]) => {
        const groupKey = `${org}__${dept}`;
        html += groupHeader(dept, groupKey, 1);
        html += `<div class="tree-children collapsed" data-tree-children="${groupKey}">`;
        subs.forEach((sub) => {
          html += leafRow(`${org} / ${dept} / ${sub}`, sub, 2);
        });
        html += `</div>`;
      });
      html += `</div>`;
    }
  });
  panel.innerHTML = html;

  wrap.appendChild(toggle);
  wrap.appendChild(panel);
  container.appendChild(wrap);

  const updateLabel = () => {
    toggle.querySelector(".toggle-label").textContent =
      selected.length === 0 ? "All" : `${selected.length} selected`;
  };

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !panel.classList.contains("open");
    closeOtherDropdownPanels(panel);
    panel.classList.toggle("open", willOpen);
  });

  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) panel.classList.remove("open");
  });

  panel.querySelectorAll("[data-tree-toggle]").forEach((header) => {
    header.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = header.getAttribute("data-tree-toggle");
      const childrenEl = panel.querySelector(`[data-tree-children="${key}"]`);
      if (!childrenEl) return;
      const collapsed = childrenEl.classList.toggle("collapsed");
      header.classList.toggle("collapsed", collapsed);
    });
  });

  panel.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const val = cb.getAttribute("data-value");
      const pos = selected.indexOf(val);
      if (cb.checked && pos === -1) selected.push(val);
      if (!cb.checked && pos !== -1) selected.splice(pos, 1);
      updateLabel();
      onChange(selected.slice());
    });
  });

  return {
    clear() {
      selected.length = 0;
      panel
        .querySelectorAll("input[type=checkbox]")
        .forEach((cb) => (cb.checked = false));
      updateLabel();
    },
  };
}

function renderSkeletonRows(tbody, columns, rows = 5) {
  tbody.innerHTML = "";
  for (let i = 0; i < rows; i++) {
    const tr = document.createElement("tr");
    tr.className = "skeleton-row";
    let cells = "";
    for (let c = 0; c < columns; c++) {
      const w = 40 + Math.round(Math.random() * 50);
      cells += `<td><div class="skeleton-bar" style="width:${w}%"></div></td>`;
    }
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  }
}

function setSidebarStatus(ok) {
  const pill = document.getElementById("sidebarStatus");
  if (!pill) return;
  const label = pill.querySelector(".status-label");
  if (ok) {
    pill.setAttribute("data-state", "ok");
    if (label) label.textContent = "Systems Nominal";
  } else {
    pill.setAttribute("data-state", "down");
    if (label) label.textContent = "Connection Lost";
  }
}

function startStatusHeartbeat() {
  const pill = document.getElementById("sidebarStatus");
  if (!pill) return;
  setInterval(async () => {
    try {
      const res = await fetch(API_URL, { method: "GET" });
      setSidebarStatus(res.ok);
    } catch (err) {
      setSidebarStatus(false);
    }
  }, 45000);
}

function updateNavBadges(rows) {
  if (!Array.isArray(rows)) return;
  const pending = rows.filter((r) => r.status === "Pending").length;
  const total = rows.length;
  const overdue = rows.filter(
    (r) => typeof isOverdue === "function" && isOverdue(r),
  ).length;

  const setBadge = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (value > 0) {
      el.style.display = "inline-flex";
      el.textContent = value;
    } else {
      el.style.display = "none";
    }
  };
  setBadge("navBadgePending", pending);
  setBadge("navBadgeTotal", total);
  setBadge("navBadgeOverdue", overdue);
}

const ACTIVITY_KEY = "aeropulse-activity-log";

function getActivityLog() {
  try {
    return JSON.parse(sessionStorage.getItem(ACTIVITY_KEY) || "[]");
  } catch (err) {
    return [];
  }
}

function pushActivity(text) {
  const log = getActivityLog();
  log.unshift({ text, time: Date.now() });
  sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(log.slice(0, 5)));
  renderActivityFeed();
}

function timeAgo(ts) {
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderActivityFeed() {
  const wrap = document.getElementById("sidebarActivity");
  const list = document.getElementById("activityList");
  if (!wrap || !list) return;
  const log = getActivityLog();
  if (log.length === 0) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "block";
  list.innerHTML = log
    .map(
      (item) => `
      <li>
        <span class="activity-dot"></span>
        <span class="activity-text">${escapeHtml(item.text)}</span>
        <span class="activity-time">${timeAgo(item.time)}</span>
      </li>`,
    )
    .join("");
}

function initResizableSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const handle = document.getElementById("sidebarResizeHandle");
  if (!sidebar || !handle) return;

  const stored = sessionStorage.getItem("aeropulse-sidebar-width");
  if (stored) {
    document.documentElement.style.setProperty("--sidebar-w", `${stored}px`);
  }

  let dragging = false;
  let startX = 0;
  let startWidth = 0;

  handle.addEventListener("mousedown", (e) => {
    if (sidebar.classList.contains("collapsed")) return;
    dragging = true;
    startX = e.clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    handle.classList.add("dragging");
    document.body.style.userSelect = "none";
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const next = Math.min(
      340,
      Math.max(200, startWidth + (e.clientX - startX)),
    );
    document.documentElement.style.setProperty("--sidebar-w", `${next}px`);
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    document.body.style.userSelect = "";
    const width = Math.round(sidebar.getBoundingClientRect().width);
    sessionStorage.setItem("aeropulse-sidebar-width", width);
  });
}

function initNavPing() {
  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      const rect = link.getBoundingClientRect();
      const ping = document.createElement("span");
      ping.className = "nav-ping";
      const size = Math.max(rect.width, rect.height) * 1.4;
      ping.style.width = `${size}px`;
      ping.style.height = `${size}px`;
      ping.style.left = `${e.clientX - rect.left - size / 2}px`;
      ping.style.top = `${e.clientY - rect.top - size / 2}px`;
      link.appendChild(ping);
      setTimeout(() => ping.remove(), 500);
    });
  });
}

function ensureShortcutsModalRoot() {
  let overlay = document.querySelector(".shortcuts-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "modal-overlay shortcuts-overlay";
    overlay.innerHTML = `
      <div class="modal-box shortcuts-box">
        <h3 class="modal-title">Keyboard Shortcuts</h3>
        <ul class="shortcuts-list">
          <li><kbd>/</kbd><span>Focus search</span></li>
          <li><kbd>N</kbd><span>New entry</span></li>
          <li><kbd>H</kbd><span>Go to Home</span></li>
          <li><kbd>R</kbd><span>Go to Data Retrieve</span></li>
          <li><kbd>V</kbd><span>Go to Data Visualize</span></li>
          <li><kbd>?</kbd><span>Toggle this panel</span></li>
        </ul>
        <div class="modal-actions">
          <button class="btn btn-ghost shortcuts-close">Close</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  return overlay;
}

function isTypingContext(target) {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function initKeyboardShortcuts() {
  const shortcutsBtn = document.getElementById("sidebarShortcutsBtn");
  const overlay = ensureShortcutsModalRoot();

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (isTypingContext(document.activeElement)) {
      if (e.key === "Escape") document.activeElement.blur();
      return;
    }

    if (e.key === "/") {
      const search = document.getElementById("searchInput");
      if (search) {
        e.preventDefault();
        search.focus();
      }
    } else if (e.key === "n" || e.key === "N") {
      const quickAdd =
        document.getElementById("sidebarQuickAdd") ||
        document.getElementById("fabAddBtn");
      if (quickAdd) {
        e.preventDefault();
        quickAdd.click();
      }
    } else if (e.key === "h" || e.key === "H") {
      window.location.href = "home.html";
    } else if (e.key === "r" || e.key === "R") {
      sessionStorage.setItem("cameFromHome", "true");
      window.location.href = "retrieve.html";
    } else if (e.key === "v" || e.key === "V") {
      sessionStorage.setItem("cameFromHome", "true");
      window.location.href = "visualize.html";
    } else if (e.key === "?") {
      overlay.classList.toggle("open");
    } else if (e.key === "Escape") {
      overlay.classList.remove("open");
    }
  });

  if (shortcutsBtn) {
    shortcutsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      overlay.classList.add("open");
    });
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
  const closeBtn = overlay.querySelector(".shortcuts-close");
  if (closeBtn)
    closeBtn.addEventListener("click", () => overlay.classList.remove("open"));
}

document.addEventListener("DOMContentLoaded", () => {
  applyStoredTheme();
  updateThemeToggleIcon();
  initSidebar();
  initResizableSidebar();
  initNavPing();
  initKeyboardShortcuts();
  renderActivityFeed();
  setInterval(renderActivityFeed, 30000);
  startStatusHeartbeat();

  const themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  const logoutBtn = document.querySelector("[data-logout]");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("cameFromLogin");
      sessionStorage.removeItem("cameFromHome");
      window.location.href = "index.html";
    });
  }

  document.querySelectorAll("[data-nav-internal]").forEach((link) => {
    link.addEventListener("click", () =>
      sessionStorage.setItem("cameFromHome", "true"),
    );
  });
});