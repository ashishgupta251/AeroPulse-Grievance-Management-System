const API_URL = "/api/grievances";
const AUTH_API_URL = "/api/auth/login";
const LOGO_PATH = "assets/aai-logo.jpg";

const ORG_HIERARCHY = {
  AAI: {
    ATM: [
      "Operations",
      "Training Cell",
      "SQMS",
      "INDRA Automation",
      "RNFC",
      "Roaster & Leave Management",
      "ACDM",
      "Store",
      "General",
      "Administration",
    ].sort((a, b) => a.localeCompare(b)),
    CNS: [
      "GNSS",
      "ILS / LPDME",
      "ILS / LLZ",
      "ILS / GP",
      "VOR",
      "ASMGCS",
      "Automation",
      "HPDME",
      "Nav and Status Indicator",
      "ADSB",
      "(Hotline/Intercom/DSC/STD)",
      "VCCS",
      "VHF / 121.625",
      "VHF / 125.25",
      "VHF / 119.75",
      "VHF / 120.225",
      "VHF / 127.575",
      "VHF / 121.5",
      "VHF / 124.3",
      "VHF / 125.975",
      "(Broadband/LAN/Internet)",
      "ATIS",
      "Desktop",
      "Printers",
      "Radar-MSSR",
      "Radar-Primary",
      "Store",
    ].sort((a, b) => a.localeCompare(b)),
  },
  Adani: [
    "Electrical",
    "Civil",
    "AOCC",
    "AOCC / Bay Management",
    "Apron Control",
    "Apron Control / Laser Interference",
    "General Admin",
    "IT",
  ].sort((a, b) => a.localeCompare(b)),
  CISF: null,
  BCAS: null,
  IMD: null,
};

const ORG_OPTIONS = Object.entries(ORG_HIERARCHY)
  .flatMap(([org, val]) => {
    if (val === null) return [org];
    if (Array.isArray(val)) return val.map((sub) => `${org} / ${sub}`);
    return Object.entries(val).flatMap(([dept, subs]) =>
      subs.map((sub) => `${org} / ${dept} / ${sub}`),
    );
  })
  .sort((a, b) => a.localeCompare(b));

const UNIT_OPTIONS = [
  "TWR-A",
  "SMC-D",
  "TWR-D",
  "APP(P)",
  "APP(S)",
  "ACC(P)",
  "ACC(S)",
  "ACC(A)",
].sort((a, b) => a.localeCompare(b));

const STATUS_OPTIONS = ["Resolved", "Pending"];

function formatDateDDMMYYYY(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadImageAsBase64(url) {
  return fetch(url)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    );
}

async function fetchGrievances() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Failed to load data");
  return res.json();
}

function rowsToExportData(rows) {
  return rows.map((r, i) => {
    const d = new Date(r.createdAt);
    return {
      "S.No": i + 1,
      Date: formatDateDDMMYYYY(d),
      Time: d.toLocaleTimeString(),
      "Organization Name": r.organizationName,
      "ATS Unit": r.complainingUnit,
      "Log Extracts": r.logExtract,
      Status: r.status,
      Remarks: r.remarks,
    };
  });
}

async function downloadExcel(rows, filename, sheetName) {
  const data = rowsToExportData(rows);
  const headers = Object.keys(data[0] || {});
  const wrapCols = new Set(["Log Extracts", "Remarks"]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AeroPulse";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName || "Grievance Data", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  if (headers.length) {
    worksheet.mergeCells(1, 1, 1, headers.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `AeroPulse — ${sheetName || "Grievance Data"} (AAI, Jaipur International Airport)`;
    titleCell.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF14203F" },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    worksheet.getRow(1).height = 26;
  }

  const headerRow = worksheet.getRow(2);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8940C" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  });
  headerRow.height = 20;

  data.forEach((rowData, idx) => {
    const excelRow = worksheet.getRow(idx + 3);
    headers.forEach((h, i) => {
      const cell = excelRow.getCell(i + 1);
      cell.value = rowData[h];
      cell.alignment = { vertical: "top", wrapText: wrapCols.has(h) };
      cell.border = {
        bottom: { style: "hairline", color: { argb: "FFE5E7EB" } },
      };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF6F7F9" },
        };
      }
    });

    const statusColIdx = headers.indexOf("Status") + 1;
    if (statusColIdx > 0) {
      const statusCell = excelRow.getCell(statusColIdx);
      if (rowData["Status"] === "Resolved") {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDCFCE7" },
        };
        statusCell.font = { color: { argb: "FF166534" }, bold: true };
      } else if (rowData["Status"] === "Pending") {
        statusCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF3C7" },
        };
        statusCell.font = { color: { argb: "FF92400E" }, bold: true };
      }
    }
  });

  headers.forEach((h, i) => {
    const longest = data.reduce(
      (max, r) => Math.max(max, String(r[h] ?? "").length),
      h.length,
    );
    worksheet.getColumn(i + 1).width = Math.min(Math.max(longest + 2, 10), 45);
  });

  if (headers.length) {
    worksheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: 2, column: headers.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "Aeropulse-Grievance-Data.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PDF_BRAND_NAVY = [20, 32, 63];
const PDF_BRAND_AMBER = [232, 148, 12];
const PDF_ZEBRA = [246, 247, 249];
const PDF_STATUS_COLORS = {
  Resolved: { fill: [220, 252, 231], text: [22, 101, 52] },
  Pending: { fill: [254, 243, 199], text: [146, 64, 14] },
};

async function downloadPdf(rows, filename, title) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const reportTitle = title || "Grievance Data";
  const generatedOn = new Date().toLocaleString();

  doc.setFillColor(...PDF_BRAND_NAVY);
  doc.rect(0, 0, pageWidth, 26, "F");

  try {
    const logoBase64 = await loadImageAsBase64(LOGO_PATH);
    const logoSize = 16;
    doc.addImage(logoBase64, "JPEG", 10, 5, logoSize, logoSize);
  } catch (err) {
    console.log("Could not load logo for PDF", err);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(
    `AeroPulse — ${reportTitle} (AAI, Jaipur International Airport)`,
    pageWidth / 2,
    15,
    { align: "center" },
  );
  doc.setFont(undefined, "normal");

  doc.autoTable({
    startY: 32,
    head: [
      [
        "S.No",
        "Date",
        "Time",
        "Organization Name",
        "ATS Unit",
        "Log Extract",
        "Status",
        "Remarks",
      ],
    ],
    body: rows.map((r, i) => {
      const d = new Date(r.createdAt);
      return [
        i + 1,
        formatDateDDMMYYYY(d),
        d.toLocaleTimeString(),
        r.organizationName,
        r.complainingUnit,
        r.logExtract,
        r.status,
        r.remarks,
      ];
    }),
    styles: {
      fontSize: 8,
      cellPadding: 3,
      valign: "top",
      lineColor: [229, 231, 235],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: PDF_BRAND_AMBER,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    alternateRowStyles: { fillColor: PDF_ZEBRA },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: 18 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22 },
      5: { cellWidth: "auto" },
      6: { cellWidth: 20, halign: "center" },
      7: { cellWidth: "auto" },
      8: { cellWidth: 20 },
      9: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 6) {
        const colors = PDF_STATUS_COLORS[data.cell.raw];
        if (colors) {
          data.cell.styles.fillColor = colors.fill;
          data.cell.styles.textColor = colors.text;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated: ${generatedOn}`, 10, pageHeight - 8);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
        pageWidth - 10,
        pageHeight - 8,
        { align: "right" },
      );
    },
  });

  doc.save(filename || "Aeropulse-Grievance-Data.pdf");
}

const SIDEBAR_NAV_ITEMS = [
  {
    page: "home",
    href: "home.html",
    label: "Home",
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />`,
    badge: true,
  },
  {
    page: "retrieve",
    href: "retrieve.html",
    label: "Data Retrieve",
    icon: `<circle cx="11" cy="11" r="7" /><path stroke-linecap="round" d="M21 21l-4.3-4.3" />`,
  },
  {
    page: "visualize",
    href: "visualize.html",
    label: "Data Visualize",
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 19V5m5 14V9m5 10V13m5 6V7" />`,
  },
];

function buildSidebarHTML(activePage) {
  const navLinksHtml = SIDEBAR_NAV_ITEMS.map((item) => {
    const isActive = item.page === activePage;
    const classes = isActive ? "sidebar-link active" : "sidebar-link";
    const internalAttr = isActive ? "" : " data-nav-internal";
    const badgeHtml = item.badge
      ? `
            <span
              class="nav-badge nav-badge--pending"
              id="navBadgePending"
              title="Pending entries"
              style="display: none"
              >0</span
            >`
      : "";
    return `
          <a
            href="${item.href}"
            class="${classes}"${internalAttr}
            data-tooltip="${item.label}"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              ${item.icon}
            </svg>
            <span class="label">${item.label}</span>${badgeHtml}
          </a>`;
  }).join("");

  return `
        <div class="sidebar-ambient"></div>
        <div class="sidebar-brand">
          <div class="brand-logo-badge">
            <img src="assets/aai-logo.jpg" alt="AAI" />
          </div>
          <div class="brand-text">
            <strong>AeroPulse</strong>
            <span>Grievance System</span>
          </div>
        </div>

        <div class="sidebar-welcome">
          <div class="welcome-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div class="welcome-copy">
            <p class="welcome-eyebrow">Welcome back</p>
            <p class="welcome-name">Admin <span class="wave">👋</span></p>
            <p class="welcome-time" id="sidebarClock">—</p>
          </div>
        </div>

        <nav class="sidebar-nav">
          <p class="sidebar-section-label">Menu</p>${navLinksHtml}

          <p class="sidebar-section-label">Quick Actions</p>
          <button
            type="button"
            class="sidebar-link sidebar-quick-add"
            id="sidebarQuickAdd"
            data-tooltip="Add Entry"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span class="label">Add Entry</span>
          </button>
        </nav>
        <div class="sidebar-foot">
          <p class="sidebar-meta">AeroPulse v1.0 · AAI Jaipur</p>
          <button
            class="sidebar-link"
            data-logout
            style="width: 100%; border: none; background: none"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 5v1a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5a2 2 0 012 2v1"
              />
            </svg>
            <span class="label">Logout</span>
          </button>
          <button class="sidebar-collapse-btn">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span class="label">Collapse</span>
          </button>
        </div>`;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function")
      node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null || c === undefined) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
