(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var themeButton = document.querySelector(".theme-toggle");
  var settingsButton = document.querySelector(".settings-trigger");
  var settingsPanel = document.querySelector(".settings-panel");
  var settingsClose = document.querySelector(".settings-close");
  var backdrop = document.querySelector(".drawer-backdrop");
  var menuButton = document.querySelector(".menu-toggle");
  var navigation = document.querySelector(".topbar-nav");
  var toastRegion = document.querySelector(".toast-region");
  var iconStyle = document.querySelector("#icon-style");
  var iconSize = document.querySelector("#icon-size");
  var iconColor = document.querySelector("#icon-color");
  var accentColor = document.querySelector("#accent-color");
  var resetButton = document.querySelector(".reset-settings");
  var storageKey = "glycemic-appearance";
  var defaultSettings = {
    iconStyle: "outline",
    iconSize: "medium",
    iconColor: "#6757e8",
    accentColor: "#6757e8"
  };
  var focusBeforeDrawer;

  function readSettings() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return Object.assign({}, defaultSettings, saved);
    } catch (error) {
      return Object.assign({}, defaultSettings);
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (error) {
      showToast("Settings could not be saved in this browser.");
    }
  }

  function applySettings(settings) {
    var validSizes = { small: "15px", medium: "18px", large: "22px" };
    var validStyles = ["outline", "solid", "duotone"];
    var safeStyle = validStyles.indexOf(settings.iconStyle) >= 0 ? settings.iconStyle : "outline";
    var safeSize = validSizes[settings.iconSize] || validSizes.medium;
    var safeIconColor = isHexColor(settings.iconColor) ? settings.iconColor : defaultSettings.iconColor;
    var safeAccentColor = isHexColor(settings.accentColor) ? settings.accentColor : defaultSettings.accentColor;

    body.dataset.iconStyle = safeStyle;
    root.style.setProperty("--icon-size", safeSize);
    root.style.setProperty("--icon-color", safeIconColor);
    root.style.setProperty("--accent", safeAccentColor);
    root.style.setProperty("--accent-strong", adjustColor(safeAccentColor, -18));

    iconStyle.value = safeStyle;
    iconSize.value = settings.iconSize in validSizes ? settings.iconSize : "medium";
    iconColor.value = safeIconColor;
    accentColor.value = safeAccentColor;
  }

  function isHexColor(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  }

  function adjustColor(hex, amount) {
    if (!isHexColor(hex)) return defaultSettings.accentColor;
    var value = parseInt(hex.slice(1), 16);
    var red = Math.max(0, Math.min(255, (value >> 16) + amount));
    var green = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
    var blue = Math.max(0, Math.min(255, (value & 255) + amount));
    return "#" + ((red << 16) | (green << 8) | blue).toString(16).padStart(6, "0");
  }

  function showToast(message) {
    if (!toastRegion) return;
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.setTimeout(function () {
      toast.classList.add("is-leaving");
      window.setTimeout(function () { toast.remove(); }, 220);
    }, 2400);
  }

  function setTheme(theme, persist) {
    root.dataset.theme = theme;
    themeButton.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    if (persist) {
      try {
        localStorage.setItem("glycemic-theme", theme);
        var url = new URL(window.location.href);
        if (url.searchParams.has("theme")) {
          url.searchParams.delete("theme");
          window.history.replaceState(null, "", url.pathname + url.search + url.hash);
        }
      } catch (error) {
        showToast("Theme preference could not be saved in this browser.");
      }
    }
  }

  function openSettings() {
    focusBeforeDrawer = document.activeElement;
    settingsPanel.inert = false;
    settingsPanel.setAttribute("aria-hidden", "false");
    settingsButton.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
    requestAnimationFrame(function () {
      backdrop.classList.add("is-visible");
      settingsPanel.classList.add("is-open");
      settingsPanel.focus();
    });
    document.body.classList.add("drawer-open");
  }

  function closeSettings() {
    settingsPanel.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
    settingsPanel.inert = true;
    settingsPanel.setAttribute("aria-hidden", "true");
    settingsButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("drawer-open");
    window.setTimeout(function () { backdrop.hidden = true; }, 320);
    if (focusBeforeDrawer) focusBeforeDrawer.focus();
  }

  function currentSettings() {
    return {
      iconStyle: iconStyle.value,
      iconSize: iconSize.value,
      iconColor: iconColor.value,
      accentColor: accentColor.value
    };
  }

  function updateAppearance() {
    var settings = currentSettings();
    applySettings(settings);
    saveSettings(settings);
    showToast("Appearance updated");
  }

  setTheme(root.dataset.theme === "dark" ? "dark" : "light", false);
  applySettings(readSettings());

  themeButton.addEventListener("click", function () {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
  });
  settingsButton.addEventListener("click", openSettings);
  settingsClose.addEventListener("click", closeSettings);
  backdrop.addEventListener("click", closeSettings);

  [iconStyle, iconSize].forEach(function (control) {
    control.addEventListener("change", updateAppearance);
  });
  [iconColor, accentColor].forEach(function (control) {
    control.addEventListener("input", updateAppearance);
  });

  resetButton.addEventListener("click", function () {
    applySettings(defaultSettings);
    saveSettings(defaultSettings);
    showToast("Appearance reset");
  });

  menuButton.addEventListener("click", function () {
    var isOpen = body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  });
  navigation.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      body.classList.remove("menu-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation menu");
    });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (settingsPanel.classList.contains("is-open")) closeSettings();
      body.classList.remove("menu-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
    if (event.key === "Tab" && settingsPanel.classList.contains("is-open")) {
      var focusable = settingsPanel.querySelectorAll("button:not([disabled]), select, input, [href], [tabindex]:not([tabindex='-1'])");
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === settingsPanel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === settingsPanel)) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  var form = document.querySelector(".predict-form");
  form.addEventListener("submit", function () {
    form.classList.add("is-submitting");
    form.querySelector(".submit-button span").textContent = "Calculating estimate…";
  });

  if ("IntersectionObserver" in window) {
    body.classList.add("motion-ready");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (element) { observer.observe(element); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (element) { element.classList.add("is-visible"); });
  }

  function renderIcons() {
    if (window.lucide) window.lucide.createIcons();
  }
  renderIcons();
  window.addEventListener("load", renderIcons, { once: true });

  if (document.querySelector(".result")) {
    document.querySelector(".result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}());
