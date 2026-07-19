(function () {
  const COLORS = {
    Resolved: "#10b981",
    Pending: "#f59e0b",
    Total: "#6366f1",
    ThisWeek: "#ec4899",
    LastWeek: "#94a3b8",
  };
  const DOW_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#f43f5e",
  ];

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
  const statThisWeek = document.getElementById("statThisWeek");
  const statCardWeek = document.getElementById("statCardWeek");
  const resolutionRateEl = document.getElementById("resolutionRate");

  let weekFilterActive = false;

  function isThisWeek(row) {
    const t = new Date(row.createdAt).getTime();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return !isNaN(t) && t >= weekAgo;
  }

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
      if (weekFilterActive && !isThisWeek(row)) return false;
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
      ? "rgba(255,255,255,0.06)"
      : "#eef1f6";
  const tickColor = () =>
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "#a6b0cf"
      : "#475569";

  function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function makeVGradient(ctx, chartArea, colorHex, topAlpha, bottomAlpha) {
    const gradient = ctx.createLinearGradient(
      0,
      chartArea.top,
      0,
      chartArea.bottom,
    );
    gradient.addColorStop(0, hexToRgba(colorHex, topAlpha));
    gradient.addColorStop(1, hexToRgba(colorHex, bottomAlpha));
    return gradient;
  }

  function tooltipStyle() {
    return {
      backgroundColor:
        document.documentElement.getAttribute("data-theme") === "dark"
          ? "#1e2330"
          : "#14161d",
      titleFont: { size: 12, weight: "600" },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 10,
      displayColors: true,
      boxPadding: 4,
    };
  }

  function pointerCursor(evt, elements, chart) {
    chart.canvas.style.cursor = elements.length ? "pointer" : "default";
  }

  function lighten(hex, amt) {
    const h = hex.replace("#", "");
    const bigint = parseInt(h, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    r = Math.min(255, Math.round(r + (255 - r) * amt));
    g = Math.min(255, Math.round(g + (255 - g) * amt));
    b = Math.min(255, Math.round(b + (255 - b) * amt));
    return `rgb(${r}, ${g}, ${b})`;
  }

  let trendChart, unitChart, pieChart, orgChart;
  let weekCompareChart, dowChart, orgRateChart;

  function baseScales() {
    return {
      x: {
        grid: { color: gridColor(), display: false },
        ticks: { color: tickColor(), font: { size: 11.5, weight: "500" } },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: tickColor(),
          precision: 0,
          font: { size: 11.5, weight: "500" },
          padding: 8,
        },
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
            backgroundColor: (c) => {
              const { ctx, chartArea } = c.chart;
              if (!chartArea) return hexToRgba(COLORS.Total, 0.2);
              return makeVGradient(ctx, chartArea, COLORS.Total, 0.28, 0.01);
            },
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 7,
            pointBackgroundColor: COLORS.Total,
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
          },
          {
            label: "Resolved",
            data: [],
            borderColor: COLORS.Resolved,
            backgroundColor: hexToRgba(COLORS.Resolved, 0.08),
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: COLORS.Resolved,
            pointBorderColor: "#fff",
            pointBorderWidth: 1.5,
          },
          {
            label: "Pending",
            data: [],
            borderColor: COLORS.Pending,
            backgroundColor: hexToRgba(COLORS.Pending, 0.08),
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: COLORS.Pending,
            pointBorderColor: "#fff",
            pointBorderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        onHover: pointerCursor,
        plugins: {
          legend: {
            labels: {
              color: tickColor(),
              usePointStyle: true,
              pointStyle: "circle",
              font: { size: 12, weight: "600" },
              padding: 18,
            },
          },
          tooltip: tooltipStyle(),
        },
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
            hoverBackgroundColor: lighten(COLORS.Resolved, 0.2),
            stack: "s",
            borderRadius: { topLeft: 0, topRight: 0 },
            maxBarThickness: 46,
          },
          {
            label: "Pending",
            data: [],
            backgroundColor: COLORS.Pending,
            hoverBackgroundColor: lighten(COLORS.Pending, 0.2),
            stack: "s",
            borderRadius: { topLeft: 8, topRight: 8 },
            maxBarThickness: 46,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        onHover: pointerCursor,
        plugins: {
          legend: {
            labels: {
              color: tickColor(),
              usePointStyle: true,
              pointStyle: "rectRounded",
              font: { size: 12, weight: "600" },
              padding: 16,
            },
          },
          tooltip: tooltipStyle(),
        },
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
            borderWidth: 3,
            borderColor:
              document.documentElement.getAttribute("data-theme") === "dark"
                ? "#161a22"
                : "#ffffff",
            hoverOffset: 10,
            spacing: 3,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        animation: { animateRotate: true, animateScale: true },
        onHover: (evt, elements, chart) => {
          pointerCursor(evt, elements, chart);
          const data = chart.data.datasets[0].data;
          const totalVal = data[0] + data[1];
          if (elements.length && totalVal > 0) {
            const idx = elements[0].index;
            const pct = Math.round((data[idx] / totalVal) * 100);
            resolutionRateEl.textContent = `${pct}%`;
            resolutionRateEl.parentElement.querySelector(
              ".rate-label",
            ).textContent = chart.data.labels[idx].toLowerCase();
          } else {
            const pct = totalVal > 0 ? Math.round((data[0] / totalVal) * 100) : 0;
            resolutionRateEl.textContent = `${pct}%`;
            resolutionRateEl.parentElement.querySelector(
              ".rate-label",
            ).textContent = "resolved";
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: tickColor(),
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 10,
              font: { size: 12, weight: "600" },
              padding: 14,
            },
          },
          tooltip: tooltipStyle(),
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
            hoverBackgroundColor: lighten(COLORS.Resolved, 0.2),
            stack: "s",
            maxBarThickness: 40,
          },
          {
            label: "Pending",
            data: [],
            backgroundColor: COLORS.Pending,
            hoverBackgroundColor: lighten(COLORS.Pending, 0.2),
            stack: "s",
            borderRadius: { topLeft: 8, topRight: 8 },
            maxBarThickness: 40,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        onHover: pointerCursor,
        plugins: {
          legend: {
            labels: {
              color: tickColor(),
              usePointStyle: true,
              pointStyle: "rectRounded",
              font: { size: 12, weight: "600" },
              padding: 16,
            },
          },
          tooltip: tooltipStyle(),
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: tickColor(),
              font: { size: 10.5, weight: "500" },
              maxRotation: 60,
              minRotation: 40,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: tickColor(),
              precision: 0,
              font: { size: 11.5, weight: "500" },
            },
            grid: { color: gridColor() },
          },
        },
      },
    });

    weekCompareChart = new Chart(document.getElementById("weekCompareChart"), {
      type: "bar",
      data: {
        labels: ["Last 7 Days", "This 7 Days"],
        datasets: [
          {
            label: "Entries",
            data: [0, 0],
            backgroundColor: (c) => {
              const { ctx, chartArea } = c.chart;
              if (!chartArea)
                return [
                  hexToRgba(COLORS.LastWeek, 0.7),
                  hexToRgba(COLORS.ThisWeek, 0.9),
                ];
              return c.dataIndex === 1
                ? makeVGradient(ctx, chartArea, COLORS.ThisWeek, 1, 0.55)
                : makeVGradient(ctx, chartArea, COLORS.LastWeek, 0.85, 0.4);
            },
            borderRadius: 14,
            maxBarThickness: 90,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onHover: pointerCursor,
        plugins: {
          legend: { display: false },
          tooltip: tooltipStyle(),
        },
        scales: baseScales(),
      },
    });

    dowChart = new Chart(document.getElementById("dowChart"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Entries",
            data: [],
            backgroundColor: DOW_COLORS.map((c) => hexToRgba(c, 0.85)),
            hoverBackgroundColor: DOW_COLORS,
            borderRadius: 10,
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onHover: pointerCursor,
        plugins: {
          legend: { display: false },
          tooltip: tooltipStyle(),
        },
        scales: baseScales(),
      },
    });

    orgRateChart = new Chart(document.getElementById("orgRateChart"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Resolution Rate %",
            data: [],
            backgroundColor: (c) => {
              const { ctx, chartArea } = c.chart;
              if (!chartArea) return hexToRgba(COLORS.Total, 0.85);
              const gradient = ctx.createLinearGradient(
                chartArea.left,
                0,
                chartArea.right,
                0,
              );
              gradient.addColorStop(0, hexToRgba(COLORS.Total, 0.55));
              gradient.addColorStop(1, hexToRgba(COLORS.Resolved, 0.95));
              return gradient;
            },
            borderRadius: { topRight: 10, bottomRight: 10 },
            maxBarThickness: 30,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        onHover: pointerCursor,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipStyle(),
            callbacks: {
              label: (ctx) => `${ctx.parsed.x}% resolved`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: tickColor(),
              font: { size: 11.5, weight: "500" },
              callback: (v) => v + "%",
            },
            grid: { color: gridColor() },
          },
          y: {
            ticks: { color: tickColor(), font: { size: 11, weight: "500" } },
            grid: { display: false },
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

    statTotal.textContent = total;
    statResolved.textContent = resolved;
    statPending.textContent = pending;
    statThisWeek.textContent = allRows.filter(isThisWeek).length;
    resolutionRateEl.textContent =
      total > 0 ? `${Math.round((resolved / total) * 100)}%` : "0%";
    if (statCardWeek)
      statCardWeek.classList.toggle("stat-active", weekFilterActive);

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

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const thisWeekCount = filteredRows.filter(
      (r) => now - new Date(r.createdAt).getTime() <= 7 * oneDay,
    ).length;
    const lastWeekCount = filteredRows.filter((r) => {
      const age = now - new Date(r.createdAt).getTime();
      return age > 7 * oneDay && age <= 14 * oneDay;
    }).length;
    weekCompareChart.data.datasets[0].data = [lastWeekCount, thisWeekCount];
    weekCompareChart.update();

    const dowNames = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ];
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    filteredRows.forEach((row) => {
      const d = new Date(row.createdAt);
      if (!isNaN(d.getTime())) dowCounts[d.getDay()] += 1;
    });
    dowChart.data.labels = dowNames;
    dowChart.data.datasets[0].data = dowCounts;
    dowChart.update();

    const orgRateData = orgData
      .map((d) => ({
        name: d.name,
        rate:
          d.Resolved + d.Pending > 0
            ? Math.round((d.Resolved / (d.Resolved + d.Pending)) * 100)
            : 0,
      }))
      .sort((a, b) => b.rate - a.rate);
    orgRateChart.data.labels = orgRateData.map((d) => d.name);
    orgRateChart.data.datasets[0].data = orgRateData.map((d) => d.rate);
    orgRateChart.update();
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

  if (statCardWeek) {
    statCardWeek.addEventListener("click", () => {
      weekFilterActive = !weekFilterActive;
      render();
    });
  }

  clearFiltersBtn.addEventListener("click", () => {
    fromDateInput.value = "";
    toDateInput.value = "";
    statusFilterSelect.value = "";
    orgFilter = [];
    unitFilter = [];
    weekFilterActive = false;
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
        [
          trendChart,
          unitChart,
          pieChart,
          orgChart,
          weekCompareChart,
          dowChart,
          orgRateChart,
        ].forEach((c) => c && c.destroy());
        initCharts();
        render();
      }, 50);
    });
  }

  if (typeof Chart === "undefined") {
    if (emptyState) {
      emptyState.style.display = "block";
      emptyState.querySelector("p").textContent =
        "Charting library failed to load. Please refresh the page.";
    }
    if (chartsWrap) chartsWrap.style.display = "none";
    return;
  }

  initCharts();
  loadRows();
})();