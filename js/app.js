const video = document.getElementById("video");
const videoSelect = document.getElementById("videoSelect");
const ctx = document.getElementById("chart").getContext("2d");
const FPS = 30;
let chart;
let dataPoints = [];

const playheadPlugin = {
  id: "playhead",
  afterDatasetsDraw(chart) {
    const { ctx, scales: { x, y } } = chart;

    if (!video.currentTime) return;

    // Convert current video time to pixel on x-axis
    const xPixel = x.getPixelForValue(video.currentTime-1.0);

    ctx.save();
    ctx.fillStyle = "rgba(30,144,255)"; // solid blue with some transparency
    const lineWidth = 3; // width in pixels
    ctx.fillRect(xPixel - lineWidth/2, y.top, lineWidth, y.bottom - y.top);
    ctx.restore();
  }
};

// Fetch videos.json to populate dropdown
fetch("data/videos.json")
  .then(res => res.json())
  .then(list => {
    list.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.id;
      opt.textContent = item.name;
      videoSelect.appendChild(opt);
    });

    videoSelect.addEventListener("change", () => {
      const id = videoSelect.value;
      if (!id) return;
      const videoItem = list.find(v => v.id === id);
      loadVideoAndTxt(`data/${videoItem.video}`, `data/${videoItem.txt}`);
    });
  });

// Load video and TXT
function loadVideoAndTxt(videoPath, txtPath) {
  video.src = videoPath;

  fetch(txtPath)
    .then(r => r.ok ? r.text() : Promise.reject("TXT not found"))
    .then(txt => parseTxtAndDraw(txt))
    .catch(err => console.error(err));
}

// Parse TXT and draw chart
function parseTxtAndDraw(text) {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l !== "");

  if (lines.length < 2) return;

  const thresholdValue = parseFloat(lines[0]);
  const values = lines.slice(1).map(v => parseFloat(v)).filter(v => !isNaN(v));

  const stride = 16;
  let foffset = 0;
  dataPoints = values.map(v => {
    foffset += stride;
    return { x: foffset / FPS, y: v };
  });

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Anomaly Score",
          data: dataPoints,
          borderColor: "#22c55e",
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.2,
          fill: false
        },
        {
          label: "Threshold",
          data: [
            { x: dataPoints[0].x, y: thresholdValue },
            { x: dataPoints[dataPoints.length - 1].x, y: thresholdValue }
          ],
          borderColor: "red",
          borderWidth: 2,
          borderDash: [6, 6],
          pointRadius: 0,
          fill: false
        },
        {
          label: "Playhead",
          data: [{ x: 0, y: 0 }],    // initial position
          borderColor: "blue",       // optional outline
          backgroundColor: "rgba(30,144,255)",   // fill color
          pointStyle: 'rect',        // <-- makes the marker a rectangle
          rotation: 0,               // no rotation
          pointRadius: 6,            // width of the rectangle
          showLine: false,           // no line connecting points
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
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
        legend: { 
          labels: { color: "white"},
          display: true }
      },
      onClick: (evt) => {
        const xScale = chart.scales.x;
        const clickX = xScale.getValueForPixel(evt.offsetX);
        // Find the closest point in dataPoints
        let closest = dataPoints.reduce((prev, curr) =>
          Math.abs(curr.x - clickX) < Math.abs(prev.x - clickX) ? curr : prev
        );
        video.currentTime = closest.x;
      }
    },
    plugins: [playheadPlugin]
  });
}

// Sync playhead marker
video.addEventListener("timeupdate", () => {
  if (!chart || !dataPoints.length) return;

  const currentTime = video.currentTime-1.0;
  chart.data.datasets[2].data = [{ x: currentTime, y: 0 }];
  chart.update("none"); // fast update without animation
});

window.addEventListener("load", () => {
  const modal = document.getElementById("introModal");
  const okBtn = document.getElementById("modalOkBtn");

  okBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });
});

// video.addEventListener("timeupdate", () => {
//   if (!chart) return;
//   chart.update("none"); // redraw plugin without animating datasets
// });