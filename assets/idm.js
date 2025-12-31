// Advanced IDM with progress tracking, resume support, and domain restriction
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('idmForm');
  const urlIn = document.getElementById('fileUrl');
  const nameIn = document.getElementById('fileName');
  const status = document.getElementById('status');
  const openBtn = document.getElementById('openBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressPercent = document.getElementById('progressPercent');
  const downloadedSize = document.getElementById('downloadedSize');
  const downloadSpeed = document.getElementById('downloadSpeed');
  const downloadTime = document.getElementById('downloadTime');

  // Allowed domains
  const allowedDomains = ['qvznr.github.io', 'localhost', '127.0.0.1'];

  // Prefill from query params (used by roms links)
  try {
    const p = new URLSearchParams(location.search);
    if (p.get('url')) urlIn.value = decodeURIComponent(p.get('url'));
    if (p.get('name')) nameIn.value = decodeURIComponent(p.get('name'));
  } catch (e) {}

  // Helper function to format bytes
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  // Validate domain
  function isAllowedDomain(fileUrl) {
    try {
      const urlObj = new URL(fileUrl);
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch (err) {
      return false;
    }
  }

  // Show error message
  function showError(message) {
    status.textContent = message;
    status.style.color = '#ff6fa3';
    progressContainer.style.display = 'none';
  }

  // Show success message
  function showSuccess(message) {
    status.textContent = message;
    status.style.color = '#4ade80';
  }

  // Show info message
  function showInfo(message) {
    status.textContent = message;
    status.style.color = 'rgba(255,255,255,0.78)';
  }

  // Open URL button
  openBtn.addEventListener('click', () => {
    const fileUrl = urlIn.value.trim();
    if (!fileUrl) {
      showError('Please provide a URL.');
      return;
    }

    if (!isAllowedDomain(fileUrl)) {
      showError('Error: Downloads are only allowed from qvznr.github.io');
      return;
    }

    window.open(fileUrl, '_blank');
  });

  // Download form submission
  form.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    const fileUrl = urlIn.value.trim();
    if (!fileUrl) {
      showError('Please provide a URL.');
      return;
    }

    // Validate domain
    if (!isAllowedDomain(fileUrl)) {
      showError('Error: Downloads are only allowed from qvznr.github.io');
      return;
    }

    const filename = nameIn.value.trim() || fileUrl.split('/').pop() || 'download.bin';
    showInfo('Starting download...');
    downloadBtn.disabled = true;
    openBtn.disabled = true;
    progressContainer.style.display = 'block';

    const startTime = Date.now();
    let totalBytes = 0;
    let downloadedBytes = 0;

    try {
      // Fetch with progress tracking
      const response = await fetch(fileUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Network error: ${response.status} ${response.statusText}`);
      }

      // Get total file size
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        totalBytes = parseInt(contentLength, 10);
      }

      // Read response as stream
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        downloadedBytes += value.length;

        // Update progress
        const progressPercentage = totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        progressBar.style.width = progressPercentage + '%';
        progressPercent.textContent = progressPercentage + '%';
        downloadedSize.textContent = formatBytes(downloadedBytes);

        // Calculate speed
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const speed = downloadedBytes / elapsedSeconds;
        downloadSpeed.textContent = formatBytes(speed) + '/s';
        downloadTime.textContent = Math.round(elapsedSeconds) + 's';
      }

      // Create blob and trigger download
      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      showSuccess('✓ Download completed successfully!');
    } catch (err) {
      console.error('Download error:', err);
      showError('Download failed: ' + err.message + '. Try opening the URL in a new tab.');
    } finally {
      downloadBtn.disabled = false;
      openBtn.disabled = false;
    }
  });

  // Prevent direct IDM access (must come from ROM page)
  const referrer = document.referrer;
  const params = new URLSearchParams(location.search);
  if (!params.get('url') && !referrer.includes(location.hostname)) {
    // Optional: could enforce referrer check here
  }
});
