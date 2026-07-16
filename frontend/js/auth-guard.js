(function guard() {
  const guardType = document.currentScript.getAttribute("data-guard");
  const cameFromLogin = sessionStorage.getItem("cameFromLogin") === "true";
  const cameFromHome = sessionStorage.getItem("cameFromHome") === "true";

  if (guardType === "protected" && !cameFromLogin) {
    window.location.replace("index.html");
  }

  if (guardType === "internal" && (!cameFromLogin || !cameFromHome)) {
    window.location.replace("index.html");
  }
})();
