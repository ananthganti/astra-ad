const videoSelect = document.getElementById("videoSelect");
const video = document.getElementById('video');
const ctx = overlay.getContext('2d');

let videoIndex = [];

fetch("data/videos.json")
  .then(res => res.json())
  .then(list => {
    videoIndex = list;
    populateDropdown();
  });

function populateDropdown() {
  videoIndex.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    videoSelect.appendChild(opt);
  });
}

// Resize overlay to match video
function resizeOverlay() {
  overlay.width = video.clientWidth;
  overlay.height = video.clientHeight;
}
video.addEventListener('loadedmetadata', resizeOverlay);
window.addEventListener('resize', resizeOverlay);

// Chart.js setup
const chartCtx = document.getElementById('chart').getContext('2d');
const chart = new Chart(chartCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'TXT values',
      data: [],
      borderWidth: 2,
      tension: 0.25,
      borderColor: 'rgba(34,197,94,1)',
      backgroundColor: 'rgba(34,197,94,0.3)',
      fill: true
    }]
  },
  options: {
    animation: false,
    responsive: true,
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Time (s)', color: '#ffffff' },
        ticks: { color:'#ffffff', stepSize: 2 },
        grid: {display: true, drawTicks: true, tickLength: 6, color: 'rgba(255,255,255,0.15)', lineWidth: 1}
      },
      y: {
        title: { display: true, text: 'Value', color: '#ffffff' },
        ticks: { color: '#ffffff', stepSize: 30},
        grid:  { display: true, drawTicks: true, tickLength: 6, color: 'rgba(255,255,255,0.15)', lineWidth: 1}
      }
    },
    plugins: {
      legend: { labels: { color: '#ffffff' } }
    }
  },
  // plugins: [horizontalLinePlugin]
});

videoSelect.addEventListener("change", () => {
  const id = videoSelect.value;
  if (!id) return;
  console.log("HI VENKADAAAAAA")
  const item = videoIndex.find(v => v.id === id);

  loadVideoAndTxt(
    `data/${item.video}`,
    `data/${item.txt}`
  );
});

function loadVideoAndTxt(videoPath, txtPath) {
  // Load video
  video.src = videoPath;

  // Load TXT file
  fetch(txtPath)
    .then(r => {
      if (!r.ok) throw new Error("TXT file not found");
      return r.text();
    })
    .then(text => {
      parseTxtAndDraw(text);
    })
    .catch(err => {
      console.error(err);
    });
}

function parseTxtAndDraw(text) {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l !== '');

  if (lines.length < 2) {
    console.warn("TXT file has no data");
    return;
  }

  // First line = threshold
  const thresholdValue = parseFloat(lines[0]);

  // Remaining lines = anomaly values
  const values = lines
    .slice(1)
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));

  const fps = 30;
  const stride = 16;

  let foffset = 0;
  const dataPoints = values.map(v => {
    foffset += stride;
    return {
      x: foffset / fps, // seconds
      y: v
    };
  });

  // Clear previous chart
  chart.data.datasets = [];

  const dataDataset = {
    label: 'Anomaly Score',
    data: dataPoints,
    borderColor: '#22c55e',
    borderWidth: 2,
    pointRadius: 2,
    tension: 0.2
  };

  const thresholdDataset = {
    label: 'Max Value In Normal',
    data: [
      { x: dataPoints[0].x, y: thresholdValue },
      { x: dataPoints[dataPoints.length - 1].x, y: thresholdValue }
    ],
    borderColor: 'red',
    borderWidth: 2,
    borderDash: [6, 6],
    pointRadius: 0
  };

  chart.data.datasets.push(dataDataset, thresholdDataset);
  chart.update();
}
