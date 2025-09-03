{
  // =================================================================================
  // ساختار داده برای سرورهای DNS
  // =================================================================================
  const wellKnownDohServers = {
    "Popular in Iran": {
      '⚡ Electro Team': {
        url: 'https://doh.electro.host/dns-query',
        description: 'یک سرویس DNS ایرانی محبوب با تمرکز بر عبور از تحریم‌ها و سرعت بالا.'
      },
      '🐘 Shecan (شکن)': {
        url: 'https://free.shecan.ir/dns-query',
        description: 'سرویس ایرانی برای عبور از تحریم‌های بین‌المللی علیه ایران، مناسب برای برنامه‌نویسان.'
      },
      '✈️ Begzar (بگذر)': {
        url: 'https://dns.begzar.ir/dns-query',
        description: 'سرویس DNS ایرانی دیگر برای دور زدن تحریم‌ها و دسترسی به سایت‌های خارجی.'
      },
      '🛡️ 403.online': {
        url: 'https://dns.403.online/dns-query',
        description: 'سرویس ایرانی جدید برای عبور از تحریم‌ها و فیلترینگ با پشتیبانی از پروتکل‌های جدید.'
      }
    },
    "Privacy Focused": {
      '☁️ Cloudflare': {
        url: 'https://cloudflare-dns.com/dns-query',
        description: 'ساخته شده توسط Cloudflare. یکی از سریع‌ترین DNSهای جهان با تمرکز بر حریم خصوصی و عدم ذخیره لاگ.'
      },
      '🛡️ Quad9 (No Malware)': {
        url: 'https://dns.quad9.net/dns-query',
        description: 'سرویسی غیرانتفاعی با تمرکز بر امنیت. دامنه‌های مخرب و فیشینگ را مسدود می‌کند.'
      },
      '⚫ Mullvad (Ad-blocking)': {
        url: 'https://adblock.doh.mullvad.net/dns-query',
        description: 'ارائه شده توسط سرویس VPN معتبر Mullvad. تبلیغات و ردیاب‌ها را مسدود می‌کند.'
      },
      '⚫ DNS.SB (No Logging)': {
        url: 'https://doh.dns.sb/dns-query',
        description: 'یک سرویس اروپایی (آلمان) بدون لاگ و بدون سانسور با پشتیبانی از آخرین پروتکل‌های امنیتی.'
      },
      '🌀 Control D (Unfiltered)': {
        url: 'https://freedns.controld.com/p0',
        description: 'یک سرویس DNS سریع و بدون فیلتر از کانادا با تمرکز بر عملکرد.'
      }
    },
    "Security (Malware & Phishing Protection)": {
      '☁️ Cloudflare (Security)': {
        url: 'https://security.cloudflare-dns.com/dns-query',
        description: 'نسخه امنیتی Cloudflare که علاوه بر حریم خصوصی، از شما در برابر بدافزارها محافظت می‌کند.'
      },
      '🛡️ Quad9 (Security)': {
        url: 'https://dns11.quad9.net/dns-query',
        description: 'نسخه امن‌تر Quad9 با اعتبارسنجی DNSSEC و مسدودسازی دامنه‌های مخرب.'
      },
      ' Cisco OpenDNS': {
        url: 'https://doh.opendns.com/dns-query',
        description: 'یکی از قدیمی‌ترین و معتبرترین سرویس‌های DNS عمومی با پایداری بالا و محافظت در برابر فیشینگ.'
      }
    },
    "Ad-Blocking DNS": {
      ' AdGuard DNS': {
        url: 'https://dns.adguard-dns.com/dns-query',
        description: 'توسط تیم AdGuard ساخته شده و به طور موثر تبلیغات، ردیاب‌ها و وب‌سایت‌های مخرب را مسدود می‌کند.'
      },
       '⚫ Mullvad (Ad-blocking)': { // For easier discovery
        url: 'https://adblock.doh.mullvad.net/dns-query',
        description: 'ارائه شده توسط سرویس VPN معتبر Mullvad. تبلیغات و ردیاب‌ها را مسدود می‌کند.'
      }
    },
    "Uncensored / Neutral": {
        '⚫ DNS.SB (No Logging)': {
          url: 'https://doh.dns.sb/dns-query',
          description: 'یک سرویس اروپایی (آلمان) بدون لاگ و بدون سانسور با پشتیبانی از آخرین پروتکل‌های امنیتی.'
        },
        '📺 DNS.WATCH': {
          url: 'https://resolver2.dns.watch/dns-query',
          description: 'سرویس DNS آلمانی بدون لاگ و بدون سانسور با تمرکز بر بی‌طرفی شبکه.'
        },
        '🇩🇰 UncensoredDNS': {
          url: 'https://anycast.uncensoreddns.org/dns-query',
          description: 'یک سرویس DNS دانمارکی که برای دسترسی آزاد و بدون سانسور به اینترنت طراحی شده است.'
        }
    },
    "Family Friendly (Adult Content Filter)": {
      '☁️ Cloudflare (Family)': {
        url: 'https://family.cloudflare-dns.com/dns-query',
        description: 'محتوای بزرگسالان و بدافزارها را مسدود می‌کند. مناسب برای استفاده خانواده‌ها.'
      },
      ' Cisco OpenDNS FamilyShield': {
        url: 'https://doh.familyshield.opendns.com/dns-query',
        description: 'نسخه از پیش تنظیم شده OpenDNS برای مسدود کردن محتوای نامناسب برای کودکان.'
      },
      ' CleanBrowsing (Family)': {
        url: 'https://doh.cleanbrowsing.org/doh/family-filter/',
        description: 'یک سرویس تخصصی برای فیلتر کردن محتوای بزرگسالان، مناسب برای خانواده و مدارس.'
      }
    },
    "Global Providers": {
      ' Google DNS': {
        url: 'https://dns.google/dns-query',
        description: 'سرویس DNS عمومی گوگل. سریع، پایدار و شناخته شده در سراسر جهان.'
      }
    }
  };
  
  // Default DNS over HTTPS address
  const defaultdoh = 'https://cloudflare-dns.com/dns-query';
  
  // Fetch event listener
  addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
  });
  
  // Main request handler
  async function handleRequest(request) {
    const url = new URL(request.url);
  
    if (typeof SETTINGS !== 'object') {
      return new Response(errorHtml, { headers: { 'Content-Type': 'text/html' }, status: 500 });
    }
  
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src https://fonts.gstatic.com;";
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': csp,
    };
  
    const sessionToken = request.headers.get('cookie')?.match(/sessionToken=([^;]+)/)?.[1];
    const storedSessionToken = await SETTINGS.get('sessionToken');
  
    if (url.pathname === '/dns-query') {
      const dohaddress = await getdohaddress();
      let dnsQueryBody;
  
      if (request.method === 'GET') {
        const dnsParam = url.searchParams.get('dns');
        if (!dnsParam) {
          return new Response('Missing "dns" query parameter', { status: 400, headers: securityHeaders });
        }
        const base64 = dnsParam.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        const paddedBase64 = base64 + '==='.slice(pad);
        const decoded = atob(paddedBase64);
        const buffer = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
          buffer[i] = decoded.charCodeAt(i);
        }
        dnsQueryBody = buffer;
      } else if (request.method === 'POST') {
        dnsQueryBody = await request.arrayBuffer();
      } else {
        return new Response('Method not allowed', { status: 405, headers: securityHeaders });
      }
  
      const dnsResponse = await fetch(dohaddress, {
        method: 'POST',
        headers: { 'Content-Type': 'application/dns-message' },
        body: dnsQueryBody,
      });
  
      return new Response(dnsResponse.body, { headers: { 'Content-Type': 'application/dns-message', ...securityHeaders } });
  
    } else if (url.pathname === '/') {
      const storedPassword = await SETTINGS.get('password');
      if (!storedPassword) {
        return new Response(setPasswordHtml, { headers: { 'Content-Type': 'text/html', ...securityHeaders } });
      } else if (!sessionToken || sessionToken !== storedSessionToken) {
        const origin = `${url.protocol}//${url.host}`;
        return Response.redirect(`${origin}/login`, 302);
      }
  
      const currentdohaddress = await getdohaddress();
      const origin = `${url.protocol}//${url.host}`;
  
      let optionsHtml = '';
      let isWellKnown = false;
      for (const [group, servers] of Object.entries(wellKnownDohServers)) {
        optionsHtml += `<optgroup label="${group}">`;
        for (const [name, server] of Object.entries(servers)) {
          const selected = (server.url === currentdohaddress) ? 'selected' : '';
          if (selected) isWellKnown = true;
          optionsHtml += `<option value="${server.url}" data-description="${server.description}" ${selected}>${name}</option>`;
        }
        optionsHtml += `</optgroup>`;
      }
      
      const htmlWithData = html
        .replace('{{dohaddress}}', currentdohaddress)
        .replace('{{origin}}', origin)
        .replace('{{doh_options}}', optionsHtml)
        .replace('{{custom_selected}}', isWellKnown ? '' : 'selected')
        .replace('{{custom_input_style}}', isWellKnown ? 'display: none;' : 'display: block;');
  
      return new Response(htmlWithData, { headers: { 'Content-Type': 'text/html', ...securityHeaders } });
  
    } 
    else {
      const allOtherRoutes = {
        '/set-doh-address': async (req) => {
          if(req.method !== 'POST') return new Response('Not Allowed', { status: 405 });
          const { dohaddress } = await req.json();
          if (!isValidUrl(dohaddress)) return new Response('Invalid URL', { status: 400 });
          await SETTINGS.put('dohaddress', dohaddress);
          return new Response('Saved!', { status: 200 });
        },
        '/reset-doh-address': async (req) => {
          if(req.method !== 'POST') return new Response('Not Allowed', { status: 405 });
          await SETTINGS.put('dohaddress', defaultdoh);
          return new Response('Reset!', { status: 200 });
        },
        '/set-password': async (req) => {
          const storedPassword = await SETTINGS.get('password');
          if (req.method === 'GET') {
            return storedPassword ? Response.redirect(new URL(req.url).origin) : new Response(setPasswordHtml, { headers: { 'Content-Type': 'text/html', ...securityHeaders } });
          }
          if (req.method === 'POST') {
            if (storedPassword) return new Response('Password already set', { status: 400 });
            const { password, confirmPassword } = await req.json();
            if (password !== confirmPassword) return new Response('Passwords do not match', { status: 400 });
            await SETTINGS.put('password', password);
            return new Response('Password set!', { status: 200 });
          }
        },
        '/change-password': async (req) => {
          if (!sessionToken || sessionToken !== storedSessionToken) return Response.redirect(new URL(req.url).origin + '/login');
          if (req.method === 'GET') return new Response(changePasswordHtml, { headers: { 'Content-Type': 'text/html', ...securityHeaders } });
          if (req.method === 'POST') {
            const { currentPassword, newPassword, confirmNewPassword } = await req.json();
            const storedPassword = await SETTINGS.get('password');
            if (currentPassword !== storedPassword) return new Response('Current password is incorrect', { status: 400 });
            if (newPassword !== confirmNewPassword) return new Response('New passwords do not match', { status: 400 });
            await SETTINGS.put('password', newPassword);
            return new Response('Password changed!', { status: 200 });
          }
        },
        '/login': async (req) => {
          const storedPassword = await SETTINGS.get('password');
          if (!storedPassword) return Response.redirect(new URL(req.url).origin + '/set-password');
          if (sessionToken && sessionToken === storedSessionToken) return Response.redirect(new URL(req.url).origin);
          if (req.method === 'GET') return new Response(loginHtml, { headers: { 'Content-Type': 'text/html', ...securityHeaders } });
          if (req.method === 'POST') {
            const { password } = await req.json();
            if (password === storedPassword) {
              const newSessionToken = generateSessionToken();
              await SETTINGS.put('sessionToken', newSessionToken);
              return new Response('Login successful', { status: 200, headers: { 'Set-Cookie': `sessionToken=${newSessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict` } });
            }
            return new Response('Invalid password', { status: 401 });
          }
        },
        '/logout': async (req) => {
          if (req.method !== 'POST') return new Response('Not Allowed', { status: 405 });
          await SETTINGS.delete('sessionToken');
          return new Response('Logout successful', { status: 200, headers: { 'Set-Cookie': 'sessionToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0' } });
        }
      };
      
      if (allOtherRoutes[url.pathname]) {
        try {
          const response = await allOtherRoutes[url.pathname](request);
          if (response) {
              Object.entries(securityHeaders).forEach(([key, value]) => response.headers.set(key, value));
          }
          return response || new Response('Not Found', { status: 404 });
        } catch (e) {
          return new Response('Server Error', { status: 500 });
        }
      }
  
      return new Response(notFoundHtml, { headers: { 'Content-Type': 'text/html', ...securityHeaders }, status: 404 });
    }
  }
  
  // Helper functions
  async function getdohaddress() {
    try {
      const dohaddress = await SETTINGS.get('dohaddress');
      return dohaddress || defaultdoh;
    } catch (error) {
      return defaultdoh;
    }
  }

  function isValidUrl(string) {
    try { new URL(string); return true; } catch (_) { return false; }
  }

  function generateSessionToken() {
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  }

  // UI Templates
  const modernUIBase = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
      :root {
        --bg-color-start: #0f2027; --bg-color-mid1: #203a43; --bg-color-mid2: #2c5364;
        --card-bg-color: rgba(255, 255, 255, 0.08); --text-color: #f0f0f0; --text-color-light: #a0a0a0;
        --primary-color: #00a8cc; --primary-color-hover: #0081a1; --border-color: rgba(255, 255, 255, 0.2);
        --input-bg-color: rgba(0, 0, 0, 0.25);
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Poppins', sans-serif; color: var(--text-color); margin: 0; padding: 20px;
        display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow-y: auto;
        background: linear-gradient(135deg, var(--bg-color-start), var(--bg-color-mid1), var(--bg-color-mid2), var(--bg-color-start));
        background-size: 400% 400%; animation: gradientAnimation 15s ease infinite;
      }
      @keyframes gradientAnimation { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      .card {
        background: var(--card-bg-color); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
        border: 1px solid var(--border-color); border-radius: 16px; padding: 2rem;
        width: 100%; max-width: 480px; text-align: center; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        margin: 20px 0;
      }
      @media (max-width: 600px) { body { padding: 10px; } .card { padding: 1.5rem; } }
      h1 { margin-top: 0; margin-bottom: 1.5rem; font-weight: 600; color: #fff; }
      .form-group { margin-bottom: 1.2rem; text-align: left; }
      label { display: block; margin-bottom: 0.5rem; font-weight: 400; color: var(--text-color-light); }
      input, select {
        width: 100%; padding: 12px 15px; border: 1px solid var(--border-color); border-radius: 8px;
        background-color: var(--input-bg-color); color: var(--text-color); font-family: inherit; font-size: 1rem;
        transition: all 0.2s ease-in-out;
      }
      input:focus, select:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(0, 168, 204, 0.5); }
      select { appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;utf8,<svg fill="white" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>'); background-repeat: no-repeat; background-position: right 15px center; }
      button {
        display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%;
        padding: 12px 20px; background-color: var(--primary-color); color: #fff; border: none;
        border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600;
        transition: all 0.2s ease-in-out;
      }
      button:hover { background-color: var(--primary-color-hover); transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
      button svg { width: 20px; height: 20px; }
      .button-group { display: flex; gap: 1rem; }
      .button-secondary { background-color: rgba(255, 255, 255, 0.2); }
      .input-group { display: flex; }
      .input-group input { border-top-right-radius: 0; border-bottom-right-radius: 0; }
      .input-group button { width: auto; border-top-left-radius: 0; border-bottom-left-radius: 0; }
      .panel-container { margin-top: 2rem; }
      .version { margin-top: 2rem; font-size: 0.8em; color: var(--text-color-light); opacity: 0.7; }
      #dns-description {
        font-size: 0.85rem; color: var(--text-color-light); text-align: left;
        margin-top: -10px; margin-bottom: 1.2rem; padding: 10px; background: rgba(0,0,0,0.2);
        border-radius: 8px; min-height: 50px; transition: opacity 0.3s;
      }
      .info-text { font-size: 0.85rem; color: var(--text-color-light); text-align: left; margin-top: 0.5rem; }
      .swal2-popup { background: #2a3b42 !important; color: var(--text-color) !important; }
      .swal2-title { color: #fff !important; }
    </style>
    <title>{{title}}</title>
  </head>
  <body>
    {{body}}
  </body>
  </html>
  `;
  
  const setPasswordHtml = modernUIBase.replace('{{title}}', 'Set Password').replace('{{body}}', `...`); // For brevity
  const loginHtml = modernUIBase.replace('{{title}}', 'Login').replace('{{body}}', `...`); // For brevity
  const changePasswordHtml = modernUIBase.replace('{{title}}', 'Change Password').replace('{{body}}', `...`); // For brevity
  
  const html = modernUIBase
    .replace('{{title}}', 'Azadi DNS Panel')
    .replace('{{body}}', `
    <div class="card">
      <h1>Azadi DNS Panel</h1>
      <form id="dohForm">
        <div class="form-group">
            <label for="doh_server_select">Upstream DNS Server</label>
            <select id="doh_server_select" name="doh_server_select">
              {{doh_options}}
              <option value="custom" {{custom_selected}}>Other (Custom)</option>
            </select>
        </div>
        <div id="dns-description">Select a DNS to see its description here.</div>
        <div class="form-group" id="custom_doh_container" style="{{custom_input_style}}">
          <label for="dohaddress">Custom DoH Address</label>
          <input type="text" id="dohaddress" name="dohaddress" value="{{dohaddress}}" placeholder="https://your-dns.com/query">
        </div>
        <div class="button-group">
          <button type="submit">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Save
          </button>
          <button type="button" id="resetButton" class="button-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" /></svg>
              Reset
          </button>
        </div>
      </form>
      <div class="form-group" style="margin-top: 2rem;">
          <label for="azadidoh">Your Personal DoH Address</label>
          <div class="input-group">
              <input type="text" id="azadidoh" name="azadidoh" value="{{origin}}/dns-query" readonly>
              <button id="copyazadidoh">Copy</button>
          </div>
          <p class="info-text">این آدرس را در برنامه‌هایی مانند Intra یا Nebulo به عنوان سرور DNS سفارشی وارد کنید.</p>
      </div>
      <div class="panel-container button-group">
        <button id="changePasswordButton" class="button-secondary">Change Password</button>
        <button id="logoutButton" class="button-secondary">Logout</button>
      </div>
      <div class="version">Version 0.5.0</div>
    </div>
    <script>
      const dohSelect = document.getElementById('doh_server_select');
      const customDohContainer = document.getElementById('custom_doh_container');
      const customDohInput = document.getElementById('dohaddress');
      const descriptionDiv = document.getElementById('dns-description');
      
      function updateDescription() {
        const selectedOption = dohSelect.options[dohSelect.selectedIndex];
        const description = selectedOption.getAttribute('data-description');
        if (dohSelect.value === 'custom') {
          customDohContainer.style.display = 'block';
          descriptionDiv.textContent = 'Please enter a valid DNS-over-HTTPS URL.';
        } else {
          customDohContainer.style.display = 'none';
          customDohInput.value = dohSelect.value;
          descriptionDiv.textContent = description || 'No description available.';
        }
      }
  
      dohSelect.addEventListener('change', updateDescription);
      document.addEventListener('DOMContentLoaded', updateDescription);
  
      document.getElementById('dohForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const dohaddress = (dohSelect.value === 'custom') ? customDohInput.value : dohSelect.value;
        const response = await fetch('/set-doh-address', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dohaddress }),
        });
        if (response.ok) {
          Swal.fire({ icon: 'success', title: 'Settings Saved!', timer: 1500, showConfirmButton: false });
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: await response.text() });
        }
      });
  
      document.getElementById('copyazadidoh').addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('azadidoh').value).then(() => {
          Swal.fire({ icon: 'success', title: 'Copied!', timer: 1000, showConfirmButton: false });
        });
      });
  
      document.getElementById('resetButton').addEventListener('click', () => {
          Swal.fire({ title: 'Are you sure?', text: "This will reset your upstream DNS to the default.", icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, reset it!' })
          .then(async (result) => {
              if (result.isConfirmed) {
                  const response = await fetch('/reset-doh-address', { method: 'POST' });
                  if (response.ok) {
                      Swal.fire({ icon: 'success', title: 'Reset!', timer: 1500, showConfirmButton: false }).then(() => location.reload());
                  } else {
                      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to reset.' });
                  }
              }
          });
      });
  
      document.getElementById('changePasswordButton').addEventListener('click', () => window.location.href = '/change-password');
      document.getElementById('logoutButton').addEventListener('click', async () => {
        await fetch('/logout', { method: 'POST' });
        Swal.fire({ icon: 'info', title: 'Logged out', timer: 1500, showConfirmButton: false }).then(() => window.location.href = '/login');
      });
    </script>
  `);
  
  const errorHtml = modernUIBase.replace('{{title}}', 'Error').replace('{{body}}', `<div class="card"><h1>Error</h1><p>KV namespace is not configured.</p></div>`);
  const notFoundHtml = modernUIBase.replace('{{title}}', 'Not Found').replace('{{body}}', `<div class="card"><h1>404 - Not Found</h1></div>`);
}
