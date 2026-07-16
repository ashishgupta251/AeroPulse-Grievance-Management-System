(function () {
  let allRows = [];
  let orgFilter = [];
  let unitFilter = [];
  let searchQuery = "";

  const fromDateInput = document.getElementById("fromDate");
  const toDateInput = document.getElementById("toDate");
  const statusFilterSelect = document.getElementById("statusFilter");
  const tableBody = document.getElementById("tableBody");
  const rowCountHint = document.getElementById("rowCountHint");
  const searchInput = document.getElementById("searchInput");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");

  const downloadExcelBtn = document.getElementById("downloadExcelBtn");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");

  const orgDropdown = createHierarchicalChecklistDropdown(
    document.getElementById("orgFilterField"),
    ORG_HIERARCHY,
    (sel) => {
      orgFilter = sel;
      render();
    },
  );
  const unitDropdown = createChecklistDropdown(
    document.getElementById("unitFilterField"),
    UNIT_OPTIONS,
    (sel) => {
      unitFilter = sel;
      render();
    },
  );

  function statusBadge(status) {
    if (status === "Resolved")
      return `<span class="badge badge-resolved"><span class="ping"></span>Resolved</span>`;
    return `<span class="badge badge-pending"><span class="ping"></span>Pending</span>`;
  }

  function getFilteredRows() {
    return allRows.filter((row) => {
      const createdLocalStr = toLocalDateString(new Date(row.createdAt));
      if (fromDateInput.value && createdLocalStr < fromDateInput.value)
        return false;
      if (toDateInput.value && createdLocalStr > toDateInput.value)
        return false;
      if (orgFilter.length > 0 && !orgFilter.includes(row.organizationName))
        return false;
      if (unitFilter.length > 0 && !unitFilter.includes(row.complainingUnit))
        return false;
      if (statusFilterSelect.value && row.status !== statusFilterSelect.value)
        return false;
      if (!matchesSearch(row, searchQuery)) return false;
      return true;
    });
  }

  function render() {
    const filteredRows = getFilteredRows();

    rowCountHint.textContent = `${filteredRows.length} of ${allRows.length} entries`;
    downloadExcelBtn.disabled = filteredRows.length === 0;
    downloadPdfBtn.disabled = filteredRows.length === 0;

    if (filteredRows.length === 0) {
      tableBody.innerHTML = `
        <tr><td colspan="10">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/></svg>
            <p>No matching data. Try adjusting your filters.</p>
          </div>
        </td></tr>`;
      return;
    }

    tableBody.innerHTML = filteredRows
      .map((row, i) => {
        const d = new Date(row.createdAt);
        const validDate = !isNaN(d.getTime());
        const overdue = isOverdue(row);
        return `
        <tr class="${overdue ? "row-overdue" : ""}">
          <td class="mono">${i + 1}</td>
          <td class="mono">${validDate ? formatDateDDMMYYYY(d) : "—"}</td>
          <td class="mono">${validDate ? d.toLocaleTimeString() : "—"}</td>
          <td>${escapeHtml(row.organizationName) || "—"}</td>
          <td>${escapeHtml(row.complainingUnit) || "—"}</td>
          <td class="cell-truncate" title="${escapeHtml(row.logExtract)}">${escapeHtml(row.logExtract) || "—"}</td>
          <td>
            ${row.status ? statusBadge(row.status) : "—"}
            ${overdue ? `<div class="overdue-flag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/></svg>Overdue</div>` : ""}
          </td>
          <td class="cell-truncate" title="${escapeHtml(row.response)}">${escapeHtml(row.response) || "—"}</td>
          <td class="mono">${row.pdc ? formatDateDDMMYYYY(new Date(row.pdc)) : "—"}</td>
          <td class="cell-truncate" title="${escapeHtml(row.remarks)}">${escapeHtml(row.remarks) || "—"}</td>
        </tr>`;
      })
      .join("");
  }

  async function loadRows() {
    renderSkeletonRows(tableBody, 10, 5);
    try {
      allRows = await fetchGrievances();
      setSidebarStatus(true);
      updateNavBadges(allRows);
      render();
    } catch (err) {
      setSidebarStatus(false);
      toast.error("Failed to load data");
      tableBody.innerHTML = `<tr><td colspan="10" class="empty-state">Could not load data. Check your connection.</td></tr>`;
    }
  }

  [fromDateInput, toDateInput, statusFilterSelect].forEach((elm) =>
    elm.addEventListener("change", render),
  );

  clearFiltersBtn.addEventListener("click", () => {
    fromDateInput.value = "";
    toDateInput.value = "";
    statusFilterSelect.value = "";
    orgDropdown.clear();
    unitDropdown.clear();
    orgFilter = [];
    unitFilter = [];
    searchInput.value = "";
    searchQuery = "";
    render();
  });

  bindSearchBox(searchInput, (val) => {
    searchQuery = val;
    render();
  });

  downloadExcelBtn.addEventListener("click", () =>
    downloadExcel(
      getFilteredRows(),
      "aeropulse-grievance-filtered.xlsx",
      "Filtered Data",
    ),
  );
  downloadPdfBtn.addEventListener("click", () =>
    downloadPdf(
      getFilteredRows(),
      "aeropulse-grievance-filtered.pdf",
      "Filtered Data",
    ),
  );

  loadRows();
})();
