// Advanced client-side downloader with mirror speed testing
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('idmForm');
  const urlIn = document.getElementById('fileUrl');
  const nameIn = document.getElementById('fileName');
  const status = document.getElementById('status');
  const openBtn = document.getElementById('openBtn');

  // Prefill from query params (used by roms links)
  try{
    const p = new URLSearchParams(location.search);
    if(p.get('url')) urlIn.value = decodeURIComponent(p.get('url'));
    if(p.get('name')) nameIn.value = decodeURIComponent(p.get('name'));
    
    // Auto-start download if URL is provided
    if(p.get('url') && form){
      setTimeout(() => {
        form.dispatchEvent(new Event('submit'));
      }, 500);
    }
  }catch(e){}

  if(openBtn){
    openBtn.addEventListener('click', ()=>{
      if(!urlIn.value) return;
      window.open(urlIn.value, '_blank');
    });
  }

  if(form){
    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      const fileUrl = urlIn.value.trim();
      if(!fileUrl){ status.textContent = 'Please provide a URL.'; return; }
      
      // Only allow downloads from SourceForge (coloxy project specifically)
      const allowedDomain = 'sourceforge.net';
      try{
        const urlObj = new URL(fileUrl);
        if(!urlObj.hostname.includes('sourceforge.net') || !urlObj.pathname.includes('coloxy')){
          status.textContent = 'Error: Downloads are only allowed from https://sourceforge.net/projects/coloxy';
          status.style.color = '#ff6fa3';
          return;
        }
      }catch(err){
        status.textContent = 'Error: Invalid URL';
        status.style.color = '#ff6fa3';
        return;
      }
      
      const filename = nameIn.value.trim() || fileUrl.split('/').pop() || 'download.bin';
      
      // Test SourceForge mirrors and download from fastest
      await downloadWithMirrorTesting(fileUrl, filename, status);
    });
  }
});

// Test SourceForge mirrors and download from fastest
async function downloadWithMirrorTesting(fileUrl, filename, statusEl) {
  statusEl.textContent = 'Testing SourceForge mirrors...';
  statusEl.style.color = '#ff6fa3';

  try {
    // Extract the path after sourceforge.net
    const urlObj = new URL(fileUrl);
    const path = urlObj.pathname;

    // Common SourceForge mirrors
    const mirrors = [
      { name: 'PhoenixNAP', url: 'https://phoenixnap.dl.sourceforge.net' },
      { name: 'CFHCable', url: 'https://cfhcable.dl.sourceforge.net' },
      { name: 'Versaweb', url: 'https://versaweb.dl.sourceforge.net' },
      { name: 'iWeb', url: 'https://iweb.dl.sourceforge.net' },
      { name: 'DEAC-Riga', url: 'https://deac-riga.dl.sourceforge.net' },
      { name: 'ManagedWay', url: 'https://managedway.dl.sourceforge.net' },
      { name: 'Downloads', url: 'https://downloads.sourceforge.net' }
    ];

    statusEl.textContent = `Testing ${mirrors.length} mirrors (2MB each)...`;
    const results = [];
    const testSize = 2 * 1024 * 1024; // 2MB test

    // Test mirrors in parallel with timeout
    const testPromises = mirrors.map(async (mirror, index) => {
      const testUrl = mirror.url + path;
      statusEl.textContent = `Testing ${mirror.name}... (${index + 1}/${mirrors.length})`;
      
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 sec timeout
        
        const startTime = performance.now();
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: { 'Range': `bytes=0-${testSize - 1}` },
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        if (!response.ok) throw new Error('Failed');
        
        // Read response to measure real speed
        const blob = await response.blob();
        const endTime = performance.now();
        const duration = endTime - startTime;
        const speed = (blob.size / 1024 / 1024) / (duration / 1000); // MB/s
        
        console.log(`${mirror.name}: ${speed.toFixed(2)} MB/s (${duration.toFixed(0)}ms)`);
        return { mirror: mirror.name, url: testUrl, speed, duration };
      } catch (err) {
        console.warn(`${mirror.name} failed:`, err.message);
        return null;
      }
    });

    // Wait for all tests to complete
    const testResults = await Promise.all(testPromises);
    const validResults = testResults.filter(r => r !== null);

    if (validResults.length === 0) {
      // Use PhoenixNAP as fallback
      const fallbackUrl = 'https://phoenixnap.dl.sourceforge.net' + path;
      statusEl.textContent = 'Using PhoenixNAP mirror (fallback)...';
      statusEl.style.color = '#ff6fa3';
      
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = fallbackUrl;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        statusEl.textContent = `Download started from PhoenixNAP`;
        statusEl.style.color = '#4ade80';
      }, 300);
      return;
    }

    // Sort by speed (fastest first)
    validResults.sort((a, b) => b.speed - a.speed);
    const fastest = validResults[0];

    statusEl.textContent = `Fastest: ${fastest.mirror} (${fastest.speed.toFixed(2)} MB/s). Downloading...`;
    statusEl.style.color = '#4ade80';

    // Download from fastest mirror
    setTimeout(() => {
      statusEl.textContent = `Downloading from ${fastest.mirror} (${fastest.speed.toFixed(2)} MB/s)...`;
      statusEl.style.color = '#4ade80';
      
      // Open in new tab to trigger browser download
      const a = document.createElement('a');
      a.href = fastest.url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      statusEl.textContent = `Download started from ${fastest.mirror} (${fastest.speed.toFixed(2)} MB/s) - Check browser downloads`;
      statusEl.style.color = '#4ade80';
    }, 300);

  } catch(err) {
    console.error(err);
    // Ultimate fallback
    const urlObj = new URL(fileUrl);
    const fallbackUrl = 'https://phoenixnap.dl.sourceforge.net' + urlObj.pathname;
    
    statusEl.textContent = 'Starting download...';
    statusEl.style.color = '#4ade80';
    
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = fallbackUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      statusEl.textContent = 'Download started - Check browser downloads';
      statusEl.style.color = '#4ade80';
    }, 300);
  }
}

// Fallback simple download (for manual form submissions)
async function downloadWithProgress(url, filename, statusEl) {
  try {
    statusEl.textContent = 'Starting download...';
    statusEl.style.color = '#4ade80';
    
    // Open in new tab - most reliable for SourceForge
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    statusEl.textContent = 'Download started - Check your browser downloads';
    statusEl.style.color = '#4ade80';

  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Download failed: ' + err.message;
    statusEl.style.color = '#ff6fa3';
  }
}

// Global helper so device pages can trigger IDM-styled downloads directly
window.startIDMDownload = function (fileUrl, suggestedName) {
  if (!fileUrl) return;

  const allowedDomain = 'sourceforge.net';
  try {
    const urlObj = new URL(fileUrl);
    if (!urlObj.hostname.includes(allowedDomain) || !urlObj.pathname.includes('coloxy')) {
      alert('Downloads are only allowed from https://sourceforge.net/projects/coloxy');
      return;
    }
  } catch (err) {
    alert('Invalid download URL');
    return;
  }

  // Prefer the provided filename, else derive from URL
  const filename = suggestedName || decodeURIComponent(fileUrl.split('/').pop() || 'download.bin');

  // Redirect to IDM page with URL and filename as query params
  window.location.href = `idm.html?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(filename)}`;
};
