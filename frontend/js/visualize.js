(function () {
  const COLORS = {
    Resolved: "#2ecc71",
    Pending: "#ffcb47",
    Total: "#00c9b7",
    Overdue: "#ff4438",
  };

  let allRows = [];
  let orgFilter = [];
  let unitFilter = [];

  const fromDateInput = document.getElementById("fromDate");
  const toDateInput = document.getElementById("toDate");
  const statusFilterSelect = document.getElementById("statusFilter");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const emptyState = document.getElementById("emptyState");
  const chartsWrap = document.getElementById("chartsWrap");

  const statTotal = document.getElementById("statTotal");
  const statResolved = document.getElementById("statResolved");
  const statPending = document.getElementById("statPending");
  const statOverdue = document.getElementById("statOverdue");
  const resolutionRateEl = document.getElementById("resolutionRate");

  createHierarchicalChecklistDropdown(
    document.getElementById("orgFilterField"),
    ORG_HIERARCHY,
    (sel) => {
      orgFilter = sel;
      render();
    },
  );
  createChecklistDropdown(
    document.getElementById("unitFilterField"),
    UNIT_OPTIONS,
    (sel) => {
      unitFilter = sel;
      render();
    },
  );

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
      return true;
    });
  }

  const gridColor = () =>
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "rgba(255,255,255,0.08)"
      : "#e2e8f0";
  const tickColor = () =>
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "#a6b0cf"
      : "#475569";

  let trendChart, unitChart, pieChart, orgChart;

  function baseScales() {
    return {
      x: {
        grid: { color: gridColor() },
        ticks: { color: tickColor(), font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: { color: tickColor(), precision: 0, font: { size: 11 } },
        grid: { color: gridColor() },
      },
    };
  }

  function initCharts() {
    trendChart = new Chart(document.getElementById("trendChart"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Total",
            data: [],
            borderColor: COLORS.Total,
            backgroundColor: COLORS.Total,
            tension: 0.3,
            pointRadius: 3,
          },
          {
            label: "Resolved",
            data: [],
            borderColor: COLORS.Resolved,
            backgroundColor: COLORS.Resolved,
            tension: 0.3,
            pointRadius: 3,
          },
          {
            label: "Pending",
            data: [],
            borderColor: COLORS.Pending,
            backgroundColor: COLORS.Pending,
            tension: 0.3,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: tickColor() } } },
        scales: baseScales(),
      },
    });

    unitChart = new Chart(document.getElementById("unitChart"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Resolved",
            data: [],
            backgroundColor: COLORS.Resolved,
            stack: "s",
          },
          {
            label: "Pending",
            data: [],
            backgroundColor: COLORS.Pending,
            stack: "s",
            borderRadius: { topLeft: 6, topRight: 6 },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: tickColor() } } },
        scales: baseScales(),
      },
    });

    pieChart = new Chart(document.getElementById("pieChart"), {
      type: "doughnut",
      data: {
        labels: ["Resolved", "Pending"],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: [COLORS.Resolved, COLORS.Pending],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: tickColor(), boxWidth: 10, font: { size: 11 } },
          },
        },
      },
    });

    orgChart = new Chart(document.getElementById("orgChart"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Resolved",
            data: [],
            backgroundColor: COLORS.Resolved,
            stack: "s",
          },
          {
            label: "Pending",
            data: [],
            backgroundColor: COLORS.Pending,
            stack: "s",
            borderRadius: { topLeft: 6, topRight: 6 },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: tickColor() } } },
        scales: {
          x: {
            grid: { color: gridColor() },
            ticks: {
              color: tickColor(),
              font: { size: 10 },
              maxRotation: 60,
              minRotation: 40,
            },
          },
          y: {
            beginAtZero: true,
            ticks: { color: tickColor(), precision: 0, font: { size: 11 } },
            grid: { color: gridColor() },
          },
        },
      },
    });
  }

  function render() {
    const filteredRows = getFilteredRows();

    if (filteredRows.length === 0) {
      emptyState.style.display = "block";
      chartsWrap.style.display = "none";
      return;
    }
    emptyState.style.display = "none";
    chartsWrap.style.display = "block";

    const total = filteredRows.length;
    const resolved = filteredRows.filter((r) => r.status === "Resolved").length;
    const pending = filteredRows.filter((r) => r.status === "Pending").length;
    const overdue = filteredRows.filter(isOverdue).length;

    statTotal.textContent = total;
    statResolved.textContent = resolved;
    statPending.textContent = pending;
    statOverdue.textContent = overdue;
    resolutionRateEl.textContent =
      total > 0 ? `${Math.round((resolved / total) * 100)}%` : "0%";

    const trendMap = {};
    filteredRows.forEach((row) => {
      const dateStr = toLocalDateString(new Date(row.createdAt));
      if (!trendMap[dateStr])
        trendMap[dateStr] = {
          date: dateStr,
          Resolved: 0,
          Pending: 0,
          Total: 0,
        };
      trendMap[dateStr][row.status] += 1;
      trendMap[dateStr].Total += 1;
    });
    const trendData = Object.values(trendMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    trendChart.data.labels = trendData.map((d) => d.date);
    trendChart.data.datasets[0].data = trendData.map((d) => d.Total);
    trendChart.data.datasets[1].data = trendData.map((d) => d.Resolved);
    trendChart.data.datasets[2].data = trendData.map((d) => d.Pending);
    trendChart.update();

    const unitMap = {};
    filteredRows.forEach((row) => {
      if (!unitMap[row.complainingUnit])
        unitMap[row.complainingUnit] = {
          name: row.complainingUnit,
          Resolved: 0,
          Pending: 0,
        };
      unitMap[row.complainingUnit][row.status] += 1;
    });
    const unitData = Object.values(unitMap).sort(
      (a, b) => b.Resolved + b.Pending - (a.Resolved + a.Pending),
    );

    unitChart.data.labels = unitData.map((d) => d.name);
    unitChart.data.datasets[0].data = unitData.map((d) => d.Resolved);
    unitChart.data.datasets[1].data = unitData.map((d) => d.Pending);
    unitChart.update();

    pieChart.data.datasets[0].data = [resolved, pending];
    pieChart.update();

    const orgMap = {};
    filteredRows.forEach((row) => {
      if (!orgMap[row.organizationName])
        orgMap[row.organizationName] = {
          name: row.organizationName,
          Resolved: 0,
          Pending: 0,
        };
      orgMap[row.organizationName][row.status] += 1;
    });
    const orgData = Object.values(orgMap).sort(
      (a, b) => b.Resolved + b.Pending - (a.Resolved + a.Pending),
    );

    orgChart.data.labels = orgData.map((d) => d.name);
    orgChart.data.datasets[0].data = orgData.map((d) => d.Resolved);
    orgChart.data.datasets[1].data = orgData.map((d) => d.Pending);
    orgChart.update();
  }

  async function loadRows() {
    try {
      allRows = await fetchGrievances();
      setSidebarStatus(true);
      updateNavBadges(allRows);
      render();
    } catch (err) {
      setSidebarStatus(false);
      toast.error("Failed to load data");
    }
  }

  [fromDateInput, toDateInput, statusFilterSelect].forEach((elm) =>
    elm.addEventListener("change", render),
  );

  clearFiltersBtn.addEventListener("click", () => {
    fromDateInput.value = "";
    toDateInput.value = "";
    statusFilterSelect.value = "";
    orgFilter = [];
    unitFilter = [];
    document
      .querySelectorAll(".dropdown-panel input[type=checkbox]")
      .forEach((cb) => (cb.checked = false));
    document
      .querySelectorAll(".dropdown-toggle .toggle-label")
      .forEach((l) => (l.textContent = "All"));
    render();
  });

  const themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      setTimeout(() => {
        [trendChart, unitChart, pieChart, orgChart].forEach(
          (c) => c && c.destroy(),
        );
        initCharts();
        render();
      }, 50);
    });
  }

  initCharts();
  loadRows();
})();
