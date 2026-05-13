// ========================================
// Theme Switching Functionality
// ========================================

function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  const themeToggle = document.getElementById("theme-toggle");

  // Set initial theme
  setTheme(savedTheme);

  // Theme toggle button click event
  themeToggle.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  });
}

function setTheme(theme) {
  const themeToggle = document.getElementById("theme-toggle");
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  // Update icon
  if (theme === "light") {
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    themeToggle.classList.add("light");
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.classList.remove("light");
  }
}

// Initialize theme on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTheme);
} else {
  initializeTheme();
}

// ========================================
// Original Script
// ========================================

let selectedFile = null;

// UI Elements
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("fileElem");
const previewImg = document.getElementById("image-preview");
const scanline = document.getElementById("scanline");
const iconWrapper = document.getElementById("upload-icon-wrapper");
const textMain = document.getElementById("upload-text-main");
const textSub = document.getElementById("upload-text-sub");

const predictBtn = document.getElementById("predict-btn");
const btnText = document.getElementById("btn-text");
const loader = document.getElementById("loader");

const predDisplay = document.getElementById("pred-display");
const confCircle = document.getElementById("conf-circle");
const confText = document.getElementById("result-conf");
const resultClass = document.getElementById("result-class");
const topPredsContainer = document.getElementById("top-preds-container");

// Greyscale Preview
const greyscaleCard = document.getElementById("greyscale-card");
const greyscalePreview = document.getElementById("greyscale-preview");

// Event Listeners
dropArea.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
document.getElementById("reset-btn").addEventListener("click", resetSystem);
predictBtn.addEventListener("click", executeInference);

// Drag & Drop
["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
  dropArea.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});

["dragenter", "dragover"].forEach((evt) => {
  dropArea.addEventListener(evt, () => dropArea.classList.add("dragover"));
});

["dragleave", "drop"].forEach((evt) => {
  dropArea.addEventListener(evt, () => dropArea.classList.remove("dragover"));
});

dropArea.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));

// Functions
function handleFiles(files) {
  if (files.length > 0 && files[0].type.startsWith("image/")) {
    selectedFile = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewImg.classList.remove("hidden");
      iconWrapper.style.opacity = "0";
      textMain.style.opacity = "0";
      textSub.style.opacity = "0";

      predictBtn.disabled = false;
      btnText.innerText = "INITIALIZE INFERENCE";
      btnText.style.color = "#fff";
    };
    reader.readAsDataURL(selectedFile);
  }
}

function resetSystem() {
  selectedFile = null;
  fileInput.value = "";
  previewImg.classList.add("hidden");
  scanline.classList.add("hidden");

  iconWrapper.style.opacity = "1";
  textMain.style.opacity = "1";
  textSub.style.opacity = "1";

  predictBtn.disabled = true;
  btnText.innerText = "WAITING FOR INPUT...";

  predDisplay.classList.add("blur-overlay");
  confCircle.style.strokeDashoffset = 440;
  confText.innerHTML = '0<span style="font-size:1.5rem">%</span>';
  resultClass.innerText = "AWAITING";
  topPredsContainer.innerHTML = "";

  greyscaleCard.classList.add("hidden");
  greyscalePreview.src = "";
}

async function executeInference() {
  if (!selectedFile) return;

  btnText.innerText = "PROCESSING TENSOR...";
  loader.classList.remove("hidden");
  predictBtn.disabled = true;
  scanline.classList.remove("hidden");

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const response = await fetch("/predict", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (response.ok && data.status === "success") {
      renderResults(data);
    } else {
      alert("SYSTEM ERROR: " + (data.error || "Unknown failure"));
      resetSystem();
    }
  } catch (err) {
    alert("CONNECTION LOST: Engine Offline.");
    resetSystem();
  } finally {
    loader.classList.add("hidden");
    scanline.classList.add("hidden");
    if (selectedFile) {
      btnText.innerText = "RE-RUN INFERENCE";
      predictBtn.disabled = false;
    }
  }
}

function renderResults(data) {
  const { prediction, telemetry } = data;

  predDisplay.classList.remove("blur-overlay");

  // Show greyscale preview
  if (data.greyscale_preview) {
    greyscalePreview.src = "data:image/png;base64," + data.greyscale_preview;
    greyscaleCard.classList.remove("hidden");
  }
  // Main Result
  resultClass.innerText = prediction.class;

  // Remove any special styling for unknown items
  resultClass.classList.remove("not-defined");

  // Animate Chart
  const confInt = Math.round(prediction.confidence * 100);
  animateValue(confText, 0, confInt, 1500);

  // 440 is the circumference of r=70
  const offset = 440 - (confInt / 100) * 440;
  setTimeout(() => (confCircle.style.strokeDashoffset = offset), 100);

  // Render Probabilities List
  topPredsContainer.innerHTML = "";
  const sorted = Object.entries(prediction.all_probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  sorted.forEach(([name, prob]) => {
    const pInt = Math.round(prob * 100);
    const item = document.createElement("div");
    item.className = "detail-item";
    item.innerHTML = `
            <div class="detail-header">
                <span class="detail-name">${name}</span>
                <span class="detail-prob">${pInt}%</span>
            </div>
            <div class="detail-bar-bg">
                <div class="detail-bar-fill" style="width: 0%"></div>
            </div>
        `;
    topPredsContainer.appendChild(item);

    // Trigger bar animation
    setTimeout(() => {
      item.querySelector(".detail-bar-fill").style.width = pInt + "%";
    }, 300);
  });
}

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const current = Math.floor(progress * (end - start) + start);
    obj.innerHTML = current + '<span style="font-size:1.5rem">%</span>';
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}
