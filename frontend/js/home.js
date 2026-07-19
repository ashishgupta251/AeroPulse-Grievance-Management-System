(function () {
  const EMPTY_FORM = {
    organizationName: "",
    complainingUnit: "",
    logExtract: "",
    status: "",
    remarks: "",
  };

  let rows = [];
  let editingId = null;
  let searchQuery = "";
  let expandedId = null;
  let sortKey = null;
  let sortDir = 1;
  let lastAddedId = null;
  let exitingIds = new Set();
  let statusFilter = null;

  const orgSelect = document.getElementById("f-org");
  const deptSelect = document.getElementById("f-dept");
  const deptField = document.getElementById("f-dept-field");
  const subunitSelect = document.getElementById("f-subunit");
  const subunitField = document.getElementById("f-subunit-field");
  const unitSelect = document.getElementById("f-unit");
  const logInput = document.getElementById("f-log");
  const statusSelect = document.getElementById("f-status");
  const remarksInput = document.getElementById("f-remarks");

  const submitBtn = document.getElementById("submitBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const formTitle = document.getElementById("formTitle");
  const tableBody = document.getElementById("tableBody");
  const rowCountHint = document.getElementById("rowCountHint");
  const searchInput = document.getElementById("searchInput");
  const fabAddBtn = document.getElementById("fabAddBtn");

  const downloadExcelBtn = document.getElementById("downloadExcelBtn");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");

  const statTotal = document.getElementById("statTotal");
  const statResolved = document.getElementById("statResolved");
  const statPending = document.getElementById("statPending");
  const statThisWeek = document.getElementById("statThisWeek");

  const navBadgePending = document.getElementById("navBadgePending");
  const sidebarClock = document.getElementById("sidebarClock");
  const activeFilterChip = document.getElementById("activeFilterChip");
  const activeFilterLabel = document.getElementById("activeFilterLabel");
  const clearFilterBtn = document.getElementById("clearFilterBtn");
  const formCard = document.getElementById("formCardHeader")
    ? document.getElementById("formCardHeader").closest(".card")
    : null;
  const formCollapseBtn = document.getElementById("formCollapseBtn");
  const formCardHeader = document.getElementById("formCardHeader");

  function populateSelect(select, options) {
    select.innerHTML =
      `<option value="">Select</option>` +
      options
        .map(
          (o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`,
        )
        .join("");
  }

  populateSelect(orgSelect, Object.keys(ORG_HIERARCHY));
  populateSelect(unitSelect, UNIT_OPTIONS);

  function resetDept() {
    deptSelect.innerHTML = `<option value="">Select</option>`;
    deptField.style.display = "none";
  }
  function resetSubunit() {
    subunitSelect.innerHTML = `<option value="">Select</option>`;
    subunitField.style.display = "none";
  }

  orgSelect.addEventListener("change", () => {
    resetDept();
    resetSubunit();
    const org = orgSelect.value;
    const val = ORG_HIERARCHY[org];

    if (!val) return;

    if (Array.isArray(val)) {
      populateSelect(subunitSelect, val);
      subunitField.style.display = "flex";
    } else {
      populateSelect(deptSelect, Object.keys(val));
      deptField.style.display = "flex";
    }
    refreshSubmitState();
  });

  deptSelect.addEventListener("change", () => {
    resetSubunit();
    const org = orgSelect.value;
    const dept = deptSelect.value;
    const val = ORG_HIERARCHY[org];
    if (val && !Array.isArray(val) && val[dept]) {
      populateSelect(subunitSelect, val[dept]);
      subunitField.style.display = "flex";
    }
    refreshSubmitState();
  });

  function getResolvedOrgName() {
    const org = orgSelect.value;
    if (!org) return "";
    const val = ORG_HIERARCHY[org];
    if (!val) return org;
    if (Array.isArray(val))
      return subunitSelect.value ? `${org} / ${subunitSelect.value}` : "";
    if (!deptSelect.value) return "";
    return subunitSelect.value
      ? `${org} / ${deptSelect.value} / ${subunitSelect.value}`
      : "";
  }

  function applyOrgNameToSelects(fullValue) {
    resetDept();
    resetSubunit();
    if (!fullValue) {
      orgSelect.value = "";
      return;
    }
    const parts = fullValue.split(" / ");
    const org = parts[0];
    orgSelect.value = org;
    const val = ORG_HIERARCHY[org];

    if (!val) return;

    if (Array.isArray(val)) {
      const sub = parts.slice(1).join(" / ");
      populateSelect(subunitSelect, val);
      subunitField.style.display = "flex";
      subunitSelect.value = sub;
    } else {
      const dept = parts[1];
      const sub = parts.slice(2).join(" / ");
      populateSelect(deptSelect, Object.keys(val));
      deptField.style.display = "flex";
      deptSelect.value = dept;
      if (val[dept]) {
        populateSelect(subunitSelect, val[dept]);
        subunitField.style.display = "flex";
        subunitSelect.value = sub;
      }
    }
  }

  function getFormValues() {
    return {
      organizationName: getResolvedOrgName(),
      complainingUnit: unitSelect.value,
      logExtract: logInput.value,
      status: statusSelect.value,
      remarks: remarksInput.value,
    };
  }

  function setFormValues(v) {
    applyOrgNameToSelects(v.organizationName || "");
    unitSelect.value = v.complainingUnit || "";
    logInput.value = v.logExtract || "";
    statusSelect.value = v.status || "";
    remarksInput.value = v.remarks || "";
  }

  function isFormComplete() {
    const v = getFormValues();
    return [
      "organizationName",
      "complainingUnit",
      "logExtract",
      "status",
    ].every((k) => v[k].trim() !== "");
  }

  function refreshSubmitState() {
    submitBtn.disabled = !isFormComplete();
  }

  [
    orgSelect,
    deptSelect,
    subunitSelect,
    unitSelect,
    logInput,
    statusSelect,
    remarksInput,
  ].forEach((elm) => elm.addEventListener("input", refreshSubmitState));
  [orgSelect, deptSelect, subunitSelect, unitSelect, statusSelect].forEach(
    (elm) => elm.addEventListener("change", refreshSubmitState),
  );

  function resetForm() {
    setFormValues(EMPTY_FORM);
    editingId = null;
    formTitle.textContent = "Add New Entry";
    submitBtn.textContent = "Add Data";
    cancelEditBtn.style.display = "none";
    refreshSubmitState();
  }

  cancelEditBtn.addEventListener("click", resetForm);

  async function loadRows() {
    renderSkeletonRows(tableBody, 9, 5);
    try {
      rows = await fetchGrievances();
      setSidebarStatus(true);
      render();
    } catch (err) {
      setSidebarStatus(false);
      toast.error("Failed to load data");
      tableBody.innerHTML = `<tr><td colspan="9" class="empty-state">Could not load data. Check your connection.</td></tr>`;
    }
  }

  function statusBadge(status) {
    if (status === "Resolved")
      return `<span class="badge badge-resolved"><span class="ping"></span>Resolved</span>`;
    return `<span class="badge badge-pending"><span class="ping"></span>Pending</span>`;
  }

  function getSortedRows(list) {
    if (!sortKey) return list;
    const copy = list.slice();
    copy.sort((a, b) => {
      let av = a[sortKey] || "";
      let bv = b[sortKey] || "";
      if (sortKey === "createdAt") {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
    return copy;
  }

  function updateSortHeaderUI() {
    document.querySelectorAll("th.sortable").forEach((th) => {
      const key = th.getAttribute("data-sort");
      const arrow = th.querySelector(".sort-arrow");
      if (key === sortKey) {
        th.classList.add("sort-active");
        arrow.textContent = sortDir === 1 ? "▾" : "▴";
      } else {
        th.classList.remove("sort-active");
        arrow.textContent = "▾";
      }
    });
  }

  document.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.getAttribute("data-sort");
      if (sortKey === key) {
        sortDir *= -1;
      } else {
        sortKey = key;
        sortDir = 1;
      }
      updateSortHeaderUI();
      render();
    });
  });

  function animateCount(elm, newValue) {
    const from = Number(elm.getAttribute("data-target")) || 0;
    const to = Number(newValue) || 0;
    elm.setAttribute("data-target", to);
    if (from === to) {
      elm.textContent = to;
      return;
    }
    elm.classList.remove("flap");
    void elm.offsetWidth;
    elm.classList.add("flap");
    const duration = 500;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      elm.textContent = Math.round(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function isThisWeek(row) {
    const t = new Date(row.createdAt).getTime();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return !isNaN(t) && t >= weekAgo;
  }

  function updateStatCardActiveUI() {
    document.querySelectorAll(".stat-card").forEach((card) => {
      const key = card.getAttribute("data-stat-filter");
      const isActive = statusFilter && key === statusFilter;
      card.classList.toggle("stat-active", !!isActive);
    });
    if (statusFilter && statusFilter !== "all") {
      activeFilterChip.style.display = "flex";
      activeFilterLabel.textContent =
        statusFilter === "ThisWeek"
          ? "Showing: This Week"
          : `Showing: ${statusFilter}`;
    } else {
      activeFilterChip.style.display = "none";
    }
  }

  function render() {
    let visibleRows = rows.filter((r) => matchesSearch(r, searchQuery));
    if (statusFilter && statusFilter !== "all") {
      visibleRows = visibleRows.filter((r) =>
        statusFilter === "ThisWeek" ? isThisWeek(r) : r.status === statusFilter,
      );
    }
    visibleRows = getSortedRows(visibleRows);

    const total = rows.length;
    const resolved = rows.filter((r) => r.status === "Resolved").length;
    const pending = rows.filter((r) => r.status === "Pending").length;
    const thisWeek = rows.filter(isThisWeek).length;
    animateCount(statTotal, total);
    animateCount(statResolved, resolved);
    animateCount(statPending, pending);
    animateCount(statThisWeek, thisWeek);
    updateStatCardActiveUI();

    updateNavBadges(rows);

    rowCountHint.textContent = searchQuery
      ? `${visibleRows.length} of ${total} entries match "${searchQuery}"`
      : `${visibleRows.length} ${visibleRows.length === 1 ? "entry" : "entries"} · click a row to expand`;

    downloadExcelBtn.disabled = rows.length === 0;
    downloadPdfBtn.disabled = rows.length === 0;

    if (visibleRows.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="9">
          <div class="empty-state">
            <div class="empty-icon-ring">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m6 10V7M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            </div>
            <p>${rows.length === 0 ? "No signals yet — use the form above to log a new entry." : "No entries match your search."}</p>
          </div>
        </td></tr>`;
      return;
    }

    tableBody.innerHTML = visibleRows
      .map((row, i) => {
        const d = new Date(row.createdAt);
        const validDate = !isNaN(d.getTime());
        const isExpanded = expandedId === row._id;
        const isNew = lastAddedId === row._id;
        const isExiting = exitingIds.has(row._id);

        const mainRow = `
        <tr class="data-row ${i % 2 === 1 ? "row-alt" : ""} ${isExpanded ? "expanded" : ""} ${isNew ? "row-enter" : ""} ${isExiting ? "row-exit" : ""}" data-row-id="${row._id}">
          <td class="mono" data-label="S.No"><span class="expand-caret">▸</span>${i + 1}</td>
          <td class="mono" data-label="Date">${validDate ? formatDateDDMMYYYY(d) : "—"}</td>
          <td class="mono col-time" data-label="Time">${validDate ? d.toLocaleTimeString() : "—"}</td>
          <td data-label="Organization">${escapeHtml(row.organizationName) || "—"}</td>
          <td data-label="ATS Unit">${escapeHtml(row.complainingUnit) || "—"}</td>
          <td class="cell-truncate col-log" data-label="Log Extract" title="${escapeHtml(row.logExtract)}">${escapeHtml(row.logExtract) || "—"}</td>
          <td data-label="Status">
            ${row.status ? statusBadge(row.status) : "—"}
            ${isNew ? `<span class="new-tag">NEW</span>` : ""}
          </td>
          <td class="cell-truncate col-remarks" data-label="Remarks" title="${escapeHtml(row.remarks)}">${escapeHtml(row.remarks) || "—"}</td>
          <td data-label="Actions">
            <div class="row-actions">
              <button class="row-action-btn edit" data-edit="${row._id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Edit
              </button>
              <button class="row-action-btn delete" data-delete="${row._id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                Delete
              </button>
            </div>
          </td>
        </tr>`;

        const detailRow = isExpanded
          ? `<tr class="detail-row"><td colspan="9">
              <div class="detail-grid">
                <div class="detail-block"><h4>Log Extract</h4><p>${escapeHtml(row.logExtract) || "—"}</p></div>
                <div class="detail-block"><h4>Remarks</h4><p>${escapeHtml(row.remarks) || "—"}</p></div>
              </div>
            </td></tr>`
          : "";

        return mainRow + detailRow;
      })
      .join("");

    tableBody.querySelectorAll("[data-edit]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        startEdit(btn.getAttribute("data-edit"));
      }),
    );
    tableBody.querySelectorAll("[data-delete]").forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleDelete(btn.getAttribute("data-delete"));
      }),
    );
    tableBody.querySelectorAll("tr.data-row").forEach((tr) =>
      tr.addEventListener("click", () => {
        const id = tr.getAttribute("data-row-id");
        expandedId = expandedId === id ? null : id;
        render();
      }),
    );
  }

  function startEdit(id) {
    const row = rows.find((r) => r._id === id);
    if (!row) return;
    editingId = id;
    setFormValues({
      organizationName: row.organizationName,
      complainingUnit: row.complainingUnit,
      logExtract: row.logExtract,
      status: row.status,
      remarks: row.remarks || "",
    });
    formTitle.textContent = "Edit Entry";
    submitBtn.textContent = "Update Data";
    cancelEditBtn.style.display = "inline-flex";
    refreshSubmitState();
    if (formCard && formCard.classList.contains("collapsed")) {
      formCard.classList.remove("collapsed");
      if (formCollapseBtn)
        formCollapseBtn.setAttribute("aria-expanded", "true");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const ok = await confirmModal({
      title: "Delete this entry?",
      desc: "This grievance record will be permanently removed.",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    exitingIds.add(id);
    render();

    setTimeout(async () => {
      try {
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        rows = rows.filter((r) => r._id !== id);
        exitingIds.delete(id);
        toast.success("Entry deleted");
        pushActivity("Entry deleted");
        if (editingId === id) resetForm();
        render();
      } catch (err) {
        exitingIds.delete(id);
        toast.error("Failed to delete");
        render();
      }
    }, 220);
  }

  function spawnResolveBurst() {
    const anchor = document.querySelector(".stat-card--resolved .stat-icon");
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const burst = document.createElement("div");
    burst.className = "resolve-burst";
    burst.style.left = `${rect.left + rect.width / 2 - 32}px`;
    burst.style.top = `${rect.top + rect.height / 2 - 32}px`;
    burst.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 700);
  }

  submitBtn.addEventListener("click", async () => {
    if (!isFormComplete()) return;
    const form = getFormValues();
    submitBtn.disabled = true;

    try {
      if (editingId) {
        const prevRow = rows.find((r) => r._id === editingId);
        const becameResolved =
          prevRow &&
          prevRow.status !== "Resolved" &&
          form.status === "Resolved";

        const res = await fetch(`${API_URL}/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const updated = await res.json();
        rows = rows.map((r) => (r._id === editingId ? updated : r));
        toast.success("Entry updated");
        pushActivity(`Entry updated · ${form.status || "Pending"}`);
        if (becameResolved) spawnResolveBurst();
      } else {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const created = await res.json();
        rows = [created, ...rows];
        toast.success("Entry added");
        pushActivity(
          `New entry added · ${form.organizationName || "Unknown org"}`,
        );
        lastAddedId = created._id;
        setTimeout(() => {
          if (lastAddedId === created._id) lastAddedId = null;
          render();
        }, 30000);
      }
      resetForm();
      render();
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      refreshSubmitState();
    }
  });

  downloadExcelBtn.addEventListener("click", () =>
    downloadExcel(rows, "aeropulse-grievance-data.xlsx", "Grievance Data"),
  );
  downloadPdfBtn.addEventListener("click", () =>
    downloadPdf(rows, "aeropulse-grievance-data.pdf", "Grievance Data"),
  );

  bindSearchBox(searchInput, (val) => {
    searchQuery = val;
    render();
  });

  function expandFormCard() {
    if (formCard && formCard.classList.contains("collapsed")) {
      formCard.classList.remove("collapsed");
      if (formCollapseBtn)
        formCollapseBtn.setAttribute("aria-expanded", "true");
    }
  }

  if (fabAddBtn) {
    fabAddBtn.addEventListener("click", () => {
      resetForm();
      expandFormCard();
      document
        .getElementById("formTitle")
        .scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => orgSelect.focus(), 350);
    });
  }

  const sidebarQuickAdd = document.getElementById("sidebarQuickAdd");
  if (sidebarQuickAdd) {
    sidebarQuickAdd.addEventListener("click", () => {
      resetForm();
      expandFormCard();
      document
        .getElementById("formTitle")
        .scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => orgSelect.focus(), 350);
    });
  }

  document.querySelectorAll(".stat-card[data-stat-filter]").forEach((card) => {
    const activate = () => {
      const key = card.getAttribute("data-stat-filter");
      statusFilter = statusFilter === key ? null : key;
      render();
    };
    card.addEventListener("click", activate);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
  });

  if (clearFilterBtn) {
    clearFilterBtn.addEventListener("click", () => {
      statusFilter = null;
      render();
    });
  }

  if (formCardHeader && formCard) {
    formCardHeader.addEventListener("click", (e) => {
      if (e.target.closest("#formCollapseBtn")) return;
      formCard.classList.toggle("collapsed");
      formCollapseBtn.setAttribute(
        "aria-expanded",
        !formCard.classList.contains("collapsed"),
      );
    });
  }
  if (formCollapseBtn && formCard) {
    formCollapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      formCard.classList.toggle("collapsed");
      formCollapseBtn.setAttribute(
        "aria-expanded",
        !formCard.classList.contains("collapsed"),
      );
    });
  }

  if (sidebarClock) {
    const updateClock = () => {
      sidebarClock.textContent = new Date().toLocaleString(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    };
    updateClock();
    setInterval(updateClock, 30000);
  }

  const OPTIONAL_COLUMNS = [
    { key: "time", label: "Time" },
    { key: "log", label: "Log Extract" },
    { key: "remarks", label: "Remarks" },
  ];
  const columnToggleContainer = document.getElementById("columnToggle");
  const tableWrap = document.querySelector(".table-wrap");

  function getHiddenCols() {
    try {
      return JSON.parse(
        sessionStorage.getItem("aeropulse-hidden-cols") || "[]",
      );
    } catch (e) {
      return [];
    }
  }
  function applyHiddenCols(hidden) {
    if (!tableWrap) return;
    OPTIONAL_COLUMNS.forEach(({ key }) =>
      tableWrap.classList.toggle(`hide-col-${key}`, hidden.includes(key)),
    );
  }

  function initColumnToggle() {
    if (!columnToggleContainer) return;
    let hidden = getHiddenCols();
    applyHiddenCols(hidden);

    const labelFor = () =>
      hidden.length === 0
        ? "Columns"
        : `Columns (${OPTIONAL_COLUMNS.length - hidden.length}/${OPTIONAL_COLUMNS.length})`;

    const wrap = document.createElement("div");
    wrap.className = "dropdown column-toggle-dropdown";
    wrap.innerHTML = `
      <button type="button" class="dropdown-toggle column-toggle-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"/></svg>
        <span class="toggle-label">${labelFor()}</span>
      </button>
      <div class="dropdown-panel">
        ${OPTIONAL_COLUMNS.map(
          (c) => `
          <label class="dropdown-option">
            <input type="checkbox" data-col="${c.key}" ${hidden.includes(c.key) ? "" : "checked"} />
            <span>${c.label}</span>
          </label>`,
        ).join("")}
      </div>`;
    columnToggleContainer.appendChild(wrap);

    const toggleBtn = wrap.querySelector(".dropdown-toggle");
    const panel = wrap.querySelector(".dropdown-panel");
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      panel.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) panel.classList.remove("open");
    });

    panel.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const key = cb.getAttribute("data-col");
        if (cb.checked) hidden = hidden.filter((k) => k !== key);
        else if (!hidden.includes(key)) hidden.push(key);
        sessionStorage.setItem("aeropulse-hidden-cols", JSON.stringify(hidden));
        applyHiddenCols(hidden);
        wrap.querySelector(".toggle-label").textContent = labelFor();
      });
    });
  }
  initColumnToggle();

  resetForm();
  loadRows();
})();