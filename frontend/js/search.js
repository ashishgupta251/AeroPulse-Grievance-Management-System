function matchesSearch(row, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    row.organizationName,
    row.complainingUnit,
    row.logExtract,
    row.status,
    row.remarks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function bindSearchBox(inputEl, onChange) {
  if (!inputEl) return;
  let timer = null;
  inputEl.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => onChange(inputEl.value), 120);
  });
}
