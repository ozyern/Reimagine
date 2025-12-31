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
  }catch(e){}

  openBtn.addEventListener('click', ()=>{
    if(!urlIn.value) return;
    window.open(urlIn.value, '_blank');
  });

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
});

// Test multiple SourceForge mirrors and download from the fastest
async function downloadWithMirrorTesting(fileUrl, filename, statusEl) {
  statusEl.textContent = 'Fetching SourceForge mirrors...';
  statusEl.style.color = 'rgba(255,255,255,0.78)';

  try {
    // Common SourceForge mirrors
    const mirrors = [
      'https://downloads.sourceforge.net',
      'https://cfhcable.dl.sourceforge.net',
      'https://deac-riga.dl.sourceforge.net',
      'https://iweb.dl.sourceforge.net',
      'https://phoenixnap.dl.sourceforge.net',
      'https://versaweb.dl.sourceforge.net',
      'https://managedway.dl.sourceforge.net'
    ];

    // Extract the path after sourceforge.net
    const urlObj = new URL(fileUrl);
    const path = urlObj.pathname;

    // Test each mirror by downloading 2MB
    statusEl.textContent = `Testing ${mirrors.length} mirrors (2MB each)...`;
    const testSize = 2 * 1024 * 1024; // 2MB
    const results = [];

    for (let i = 0; i < mirrors.length; i++) {
      const mirror = mirrors[i];
      const testUrl = mirror + path;
      
      statusEl.textContent = `Testing mirror ${i + 1}/${mirrors.length}: ${mirror.split('//')[1].split('.')[0]}...`;
      
      try {
        const startTime = performance.now();
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: { 'Range': `bytes=0-${testSize - 1}` }
        });
        
        if (!response.ok) throw new Error('Mirror unavailable');
        
        // Read the response to measure actual speed
        await response.blob();
        const endTime = performance.now();
        const duration = endTime - startTime;
        const speed = (testSize / 1024 / 1024) / (duration / 1000); // MB/s
        
        results.push({ mirror, testUrl, speed, duration });
        console.log(`Mirror ${mirror}: ${speed.toFixed(2)} MB/s`);
      } catch (err) {
        console.warn(`Mirror ${mirror} failed:`, err.message);
      }
    }

    if (results.length === 0) {
      throw new Error('All mirrors failed. Opening original URL in new tab...');
    }

    // Sort by speed (fastest first)
    results.sort((a, b) => b.speed - a.speed);
    const fastest = results[0];

    statusEl.textContent = `Fastest mirror: ${fastest.mirror.split('//')[1].split('.')[0]} (${fastest.speed.toFixed(2)} MB/s). Starting download...`;
    statusEl.style.color = '#ff6fa3';

    // Download from fastest mirror
    setTimeout(async () => {
      try {
        statusEl.textContent = `Downloading from fastest mirror (${fastest.speed.toFixed(2)} MB/s)...`;
        const resp = await fetch(fastest.testUrl);
        if(!resp.ok) throw new Error('Download failed: '+resp.status);
        const blob = await resp.blob();
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        statusEl.textContent = `Download complete from ${fastest.mirror.split('//')[1].split('.')[0]} (${fastest.speed.toFixed(2)} MB/s)`;
        statusEl.style.color = '#4ade80';
      } catch(err) {
        console.error(err);
        statusEl.textContent = 'Download failed: '+err.message+". Opening URL in new tab...";
        statusEl.style.color = '#ff6fa3';
        window.open(fileUrl, '_blank');
      }
    }, 800);

  } catch(err) {
    console.error(err);
    statusEl.textContent = err.message || 'Mirror testing failed. Opening URL in new tab...';
    statusEl.style.color = '#ff6fa3';
    window.open(fileUrl, '_blank');
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
