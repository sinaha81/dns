

const UPSTREAM_DNS_PROVIDERS = [
  { name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query", weight: 25, category: "عمومی و سریع", description: "تمرکز بر سرعت و حریم خصوصی، بدون ذخیره لاگ." },
  { name: "Google", url: "https://dns.google/dns-query", weight: 20, category: "عمومی و سریع", description: "پایداری و سرعت بالا در سراسر جهان." },
  { name: "Quad9", url: "https://dns.quad9.net/dns-query", weight: 20, category: "عمومی و سریع", description: "مسدودسازی دامنه‌های مخرب، فیشینگ و بدافزارها برای افزایش امنیت." },
  { name: "OpenDNS", url: "https://doh.opendns.com/dns-query", weight: 10, category: "عمومی و سریع", description: "یکی از قدیمی‌ترین و پایدارترین سرویس‌های DNS عمومی." },
  { name: "DNS4EU", url: "https://dns.dns4.eu/dns-query", weight: 15, category: "عمومی و سریع", description: "سرویس DNS عمومی اروپایی با تمرکز بر حریم خصوصی و امنیت." },
  { name: "AdGuard", url: "https://dns.adguard-dns.com/dns-query", weight: 15, category: "مسدودکننده تبلیغات", description: "مسدودسازی موثر تبلیغات، ردیاب‌ها و سایت‌های مخرب." }
];

const DNS_CACHE_TTL = 300;
const REQUEST_TIMEOUT = 10000;
const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW = 60000;
const rateLimitMap = new Map();

// --- EVENT LISTENER ---

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// --- MAIN REQUEST HANDLER ---

async function handleRequest(request) {
  const url = new URL(request.url);
  
  if (url.pathname === '/apple') {
    return generateAppleProfile(request.url);
  }
  
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  if (!checkRateLimit(clientIP)) {
    return new Response('Rate limit exceeded. Please try again later.', {
      status: 429,
      headers: { 'Content-Type': 'text/plain', 'Retry-After': '60' }
    });
  }
  
  if (url.pathname === '/dns-query') {
      if (request.method === 'OPTIONS') {
        return handleOptions();
      }
      try {
        let dnsResponse;
        if (request.method === 'GET') {
          dnsResponse = await handleGetRequest(url);
        } else if (request.method === 'POST') {
          dnsResponse = await handlePostRequest(request);
        } else {
          return new Response('Method not allowed', { status: 405, headers: { 'Allow': 'GET, POST, OPTIONS' } });
        }
        return new Response(dnsResponse.body, {
          status: dnsResponse.status,
          headers: {
            'Content-Type': 'application/dns-message',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': `public, max-age=${DNS_CACHE_TTL}`,
            'X-Content-Type-Options': 'nosniff',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
          }
        });
      } catch (error) {
        return new Response('DNS query failed: ' + error.message, { status: 500, headers: { 'Content-Type': 'text/plain' } });
      }
  }

  const csp = "default-src 'self' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;";
  return new Response(getHomePage(request.url), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': csp
    }
  });
}

// --- DOH CORE LOGIC ---

function selectProvider(providers) {
  const totalWeight = providers.reduce((sum, provider) => sum + provider.weight, 0);
  let random = Math.random() * totalWeight;
  for (const provider of providers) {
    if (random < provider.weight) return provider;
    random -= provider.weight;
  }
  return providers[0];
}

async function handleGetRequest(url) {
  const dnsParam = url.searchParams.get('dns');
  if (!dnsParam) throw new Error('Missing dns parameter');
  if (!isValidBase64Url(dnsParam)) throw new Error('Invalid dns parameter format');
  
  const providersToTry = [selectProvider(UPSTREAM_DNS_PROVIDERS), ...UPSTREAM_DNS_PROVIDERS.filter(p => p.url !== selectProvider(UPSTREAM_DNS_PROVIDERS).url)];
  for (const provider of providersToTry) {
    try {
      const upstreamUrl = new URL(provider.url);
      upstreamUrl.searchParams.set('dns', dnsParam);
      url.searchParams.forEach((value, key) => {
        if (key !== 'dns') upstreamUrl.searchParams.set(key, value);
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/dns-message', 'User-Agent': 'DoH-Proxy-Worker/1.0' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (response.ok) return response;
    } catch (error) {
      console.error(`Failed to fetch from ${provider.name}: ${error.message}`);
      continue;
    }
  }
  throw new Error('All upstream DNS servers failed');
}

async function handlePostRequest(request) {
  const contentType = request.headers.get('Content-Type');
  if (contentType !== 'application/dns-message') throw new Error('Invalid Content-Type. Expected application/dns-message');
  
  const body = await request.arrayBuffer();
  if (body.byteLength === 0 || body.byteLength > 512) throw new Error('Invalid DNS message size');
  
  const providersToTry = [selectProvider(UPSTREAM_DNS_PROVIDERS), ...UPSTREAM_DNS_PROVIDERS.filter(p => p.url !== selectProvider(UPSTREAM_DNS_PROVIDERS).url)];
  for (const provider of providersToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/dns-message', 'Accept': 'application/dns-message', 'User-Agent': 'DoH-Proxy-Worker/1.0' },
        body: body,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (response.ok) return response;
    } catch (error) {
      console.error(`Failed to fetch from ${provider.name}: ${error.message}`);
      continue;
    }
  }
  throw new Error('All upstream DNS servers failed');
}

function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// --- UTILITY FUNCTIONS ---

function generateAppleProfile(requestUrl) {
  const baseUrl = new URL(requestUrl);
  const dohUrl = `${baseUrl.protocol}//${baseUrl.hostname}/dns-query`;
  const hostname = baseUrl.hostname;
  
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  const uuid3 = crypto.randomUUID();
  
  const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>DNSSettings</key>
            <dict>
                <key>DNSProtocol</key>
                <string>HTTPS</string>
                <key>ServerURL</key>
                <string>${dohUrl}</string>
            </dict>
            <key>PayloadDescription</key>
            <string>Configures device to use Anonymous DoH Proxy</string>
            <key>PayloadDisplayName</key>
            <string>Anonymous DoH Proxy</string>
            <key>PayloadIdentifier</key>
            <string>com.cloudflare.${uuid2}.dnsSettings.managed</string>
            <key>PayloadType</key>
            <string>com.apple.dnsSettings.managed</string>
            <key>PayloadUUID</key>
            <string>${uuid3}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>ProhibitDisablement</key>
            <false/>
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>This profile enables encrypted DNS (DNS over HTTPS) on iOS, iPadOS, and macOS devices using your personal DoH Proxy.</string>
    <key>PayloadDisplayName</key>
    <string>Anonymous DoH Proxy - ${hostname}</string>
    <key>PayloadIdentifier</key>
    <string>com.cloudflare.${uuid1}</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>${uuid1}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>`;

  return new Response(mobileconfig, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-apple-aspen-config; charset=utf-8',
      'Content-Disposition': `attachment; filename="doh-proxy-${hostname}.mobileconfig"`,
      'Cache-Control': 'no-cache'
    }
  });
}

function checkRateLimit(clientIP) {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIP);
  if (!clientData) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (now > clientData.resetTime) {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (clientData.count >= RATE_LIMIT_REQUESTS) {
    return false;
  }
  clientData.count++;
  return true;
}

function isValidBase64Url(str) {
  return /^[A-Za-z0-9_-]+$/.test(str);
}

// --- HTML PAGE GENERATOR ---

function getHomePage(requestUrl) {
  const fullDohUrl = new URL('/dns-query', requestUrl).href;
  const appleProfileUrl = new URL('/apple', requestUrl).href;
  
  let dnsListHtml = UPSTREAM_DNS_PROVIDERS.map(provider => `
    <div class="dns-item">
      <div class="dns-name">${provider.name}</div>
      <div class="dns-desc">${provider.description}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DoH Proxy - کنترل پنل</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        :root {
            --bg-deep-space: #010409;
            --bg-card: rgba(22, 27, 34, 0.65);
            --border-color: rgba(255, 255, 255, 0.1);
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --accent-primary: #58a6ff;
            --accent-hover: #79c0ff;
            --accent-secondary: #1f6feb;
            --warn-color: #f7b948;
            --warn-bg: rgba(247, 185, 72, 0.1);
            --warn-border: rgba(247, 185, 72, 0.4);
            --input-bg: rgba(13, 17, 23, 0.7);
        }
        *, *::before, *::after { box-sizing: border-box; }
        body {
            font-family: 'Vazirmatn', sans-serif;
            background-color: var(--bg-deep-space);
            color: var(--text-primary);
            margin: 0;
            display: flex;
            justify-content: center;
            padding: 2rem 1rem;
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
        }
        body::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(145deg, rgba(31, 111, 235, 0.2), rgba(88, 166, 255, 0), rgba(1, 4, 9, 1)),
                        linear-gradient(225deg, rgba(88, 166, 255, 0.2), rgba(1, 4, 9, 1));
            background-size: 200% 200%;
            animation: aurora-bg 15s ease infinite;
            z-index: -1;
        }
        @keyframes aurora-bg {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .container { max-width: 800px; width: 100%; }
        .header { text-align: center; margin-bottom: 2.5rem; }
        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 0.5rem;
        }
        .status {
            display: inline-flex; align-items: center; gap: 0.5rem; background-color: rgba(35, 134, 54, 0.15);
            color: #3fb950; padding: 0.4rem 0.8rem; border-radius: 99px; font-size: 0.9rem;
            font-weight: 500; border: 1px solid rgba(35, 134, 54, 0.3);
        }
        .status::before { content: ''; width: 8px; height: 8px; background-color: #3fb950; border-radius: 50%; box-shadow: 0 0 8px #3fb950; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        
        .card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-bottom: 1.5rem;
            overflow: hidden;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.37);
        }
        details { transition: all 0.2s ease-out; }
        details[open] summary { border-bottom: 1px solid var(--border-color); }
        summary {
            padding: 1.25rem 1.5rem; font-size: 1.2rem; font-weight: 600; cursor: pointer;
            display: flex; justify-content: space-between; align-items: center;
            transition: background-color 0.2s;
        }
        summary:hover { background-color: rgba(139, 148, 158, 0.1); }
        summary::after {
            content: '+'; font-size: 1.8rem; font-weight: 400; color: var(--text-secondary);
            transition: transform 0.2s ease-in-out;
        }
        details[open] summary::after { transform: rotate(45deg); }
        .card-content { padding: 1.5rem; }
        .card-content p { color: var(--text-secondary); line-height: 1.7; margin-top: 0; }
        .card-content p code {
            background-color: var(--input-bg); padding: 0.2em 0.4em; margin: 0;
            font-size: 85%; border-radius: 6px; font-family: monospace; color: var(--accent-primary);
        }

        .url-box {
            display: flex; align-items: stretch; background-color: var(--input-bg);
            border: 1px solid var(--border-color); border-radius: 6px; font-family: monospace;
            direction: ltr; margin-bottom: 1rem;
        }
        .url-text { flex-grow: 1; padding: 0.75rem; color: var(--accent-primary); overflow-x: auto; white-space: nowrap; }
        .copy-btn {
            background-color: var(--accent-secondary); color: #fff; border: none; padding: 0 1rem;
            cursor: pointer; transition: background-color 0.2s; display: flex; align-items: center;
            gap: 0.5rem; font-family: 'Vazirmatn', sans-serif;
        }
        .copy-btn:hover { background-color: var(--accent-hover); }
        
        .code-box { position: relative; }
        .code-box pre {
            background-color: rgba(13, 17, 23, 0.8); border: 1px solid var(--border-color); border-radius: 6px;
            padding: 1rem; font-family: monospace; font-size: 0.9em; max-height: 280px;
            overflow: auto; white-space: pre-wrap; word-wrap: break-word; color: var(--text-primary);
        }
        .code-box .copy-btn { position: absolute; top: 0.75rem; left: 0.75rem; z-index: 10; padding: 0.5rem 0.8rem; }
        
        .settings-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.25rem; margin-top: 1.5rem;
        }
        .setting-item label {
            display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-secondary); font-weight: 500;
        }
        .setting-item input, .setting-item select {
            width: 100%; background-color: var(--input-bg); border: 1px solid var(--border-color);
            color: var(--text-primary); padding: 0.6rem 0.8rem; border-radius: 6px; font-family: monospace;
            font-size: 0.9rem; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .setting-item select { font-family: 'Vazirmatn', sans-serif; }
        .setting-item input:focus, .setting-item select:focus {
            outline: none; border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.2);
        }
        
        .dns-list { display: flex; flex-direction: column; gap: 1rem; }
        .dns-item {
            display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem 1rem;
            padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);
        }
        .dns-item:last-child { border-bottom: none; padding-bottom: 0; }
        .dns-name { font-weight: 600; }
        .dns-desc { font-size: 0.9rem; color: var(--text-secondary); text-align: left; }

        .warning-box {
            padding: 1rem; border-radius: 6px; display: flex; align-items: flex-start; gap: 0.75rem;
            background-color: var(--warn-bg); border: 1px solid var(--warn-border);
            border-left: 4px solid var(--warn-color);
        }
        .warning-box p { margin: 0; color: var(--warn-color); font-weight: 500; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>کنترل پنل DoH</h1>
            <div class="status">سرویس فعال است</div>
        </header>

        <details class="card" open>
            <summary>   </summary>
            <div class="card-content">
                <p>برای استفاده، یکی از کانفیگ‌های زیر را کپی کرده و به صورت دستی در کلاینت V2Ray خود (مانند v2rayNG) با استفاده از گزینه <code>Import config from Clipboard</code> وارد کنید. تنظیمات زیر بر روی تمام کانفیگ‌ها اعمال می‌شوند.</p>
                <div class="url-box">
                    <span class="url-text" id="dohUrl">${fullDohUrl}</span>
                    <button class="copy-btn" onclick="copyToClipboard('dohUrl', 'آدرس سرویس')">کپی</button>
                </div>
                <div class="settings-grid">
                    <div class="setting-item">
                        <label for="server-name">Server Name (SNI)</label>
                        <input type="text" id="server-name" value="www.mci.ir" oninput="updateAllConfigs()">
                    </div>
                     <div class="setting-item">
                        <label for="fingerprint-select">TLS Fingerprint</label>
                        <select id="fingerprint-select" onchange="updateAllConfigs()">
                            <option value="chrome">Chrome (Default)</option>
                            <option value="firefox">Firefox</option>
                            <option value="safari">Safari</option>
                            <option value="ios">iOS</option>
                            <option value="android">Android</option>
                            <option value="random">Random</option>
                            <option value="randomized">Randomized</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label for="frag-packets">Fragment Packets</label>
                        <input type="text" id="frag-packets" value="1-1" oninput="updateAllConfigs()">
                    </div>
                    <div class="setting-item">
                        <label for="frag-length">Fragment Length</label>
                        <input type="text" id="frag-length" value="10-20" oninput="updateAllConfigs()">
                    </div>
                    <div class="setting-item">
                        <label for="frag-interval">Fragment Interval</label>
                        <input type="text" id="frag-interval" value="5-10" oninput="updateAllConfigs()">
                    </div>
                </div>
            </div>
        </details>
        
        <details class="card">
            <summary>۱. کانفیگ Fix Fragment</summary>
            <div class="card-content">
                <p>این کانفیگ پایه از تنظیمات سراسری بالا برای Fragment استفاده می‌کند. آن را کپی و در کلاینت خود وارد کنید.</p>
                <div class="code-box">
                    <button class="copy-btn" onclick="copyToClipboard('fixFragmentConfig', 'کانفیگ Fix Fragment')">کپی</button>
                    <pre id="fixFragmentConfig"></pre>
                </div>
            </div>
        </details>

        <details class="card" open>
            <summary>۲. کانفیگ Best Fragment (پیشرفته)</summary>
            <div class="card-content">
                <p>این کانفیگ از چندین قانون fragment مختلف استفاده کرده و به صورت خودکار بهترین مورد را از طریق تست پینگ انتخاب می‌کند. SNI و Fingerprint این کانفیگ از تنظیمات سراسری بالا پیروی می‌کنند.</p>
                <div class="code-box">
                    <button class="copy-btn" onclick="copyToClipboard('bestFragmentConfig', 'کانفیگ Best Fragment')">کپی</button>
                    <pre id="bestFragmentConfig"></pre>
                </div>
            </div>
        </details>

        <details class="card" open>
            <summary>۳. کانفیگ بدون Fragment</summary>
            <div class="card-content">
                <p>این کانفیگ برای شبکه‌هایی مناسب است که نیازی به تکه‌تکه کردن بسته‌ها (fragmentation) ندارند. SNI و Fingerprint این کانفیگ نیز از تنظیمات سراسری بالا پیروی می‌کنند.</p>
                <div class="code-box">
                    <button class="copy-btn" onclick="copyToClipboard('noFragmentConfig', 'کانفیگ No Fragment')">کپی</button>
                    <pre id="noFragmentConfig"></pre>
                </div>
            </div>
        </details>

        <details class="card" open>
            <summary>سرورهای DNS استفاده شده</summary>
            <div class="card-content">
                <div class="dns-list">${dnsListHtml}</div>
            </div>
        </details>

        <div class="warning-box">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="min-width: 24px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <p><strong>توجه:</strong> این سرویس فقط DNS را رمزنگاری می‌کند و جایگزین VPN برای عبور از فیلترینگ نیست.</p>
        </div>
    </div>

    <script>
        function copyToClipboard(elementId, title) {
            const element = document.getElementById(elementId);
            const text = element.tagName.toLowerCase() === 'pre' ? element.textContent : element.innerText;
            
            navigator.clipboard.writeText(text).then(() => {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: title + ' کپی شد.',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                    background: '#161b22',
                    color: '#e6edf3',
                    iconColor: '#3fb950'
                });
            }).catch(err => {
                 Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'خطا در کپی کردن!',
                    showConfirmButton: false,
                    timer: 2500,
                    timerProgressBar: true,
                    background: '#161b22',
                    color: '#e6edf3',
                    iconColor: '#f85149'
                });
            });
        }
        
        function updateAllConfigs() {
            // Read all values from the global settings panel
            const serverName = document.getElementById('server-name').value;
            const fingerprint = document.getElementById('fingerprint-select').value;
            const fragPackets = document.getElementById('frag-packets').value;
            const fragLength = document.getElementById('frag-length').value;
            const fragInterval = document.getElementById('frag-interval').value;
            const fullDohUrl = document.getElementById('dohUrl').innerText;

            // --- Template for shared parts of the configs ---
            const baseDns = {
                "unexpectedIPs": ["geoip:cn", "10.10.34.34", "10.10.34.35", "10.10.34.36"],
                "hosts": {"geosite:category-ads-all": "#3", "cloudflare-dns.com": "www.cloudflare.com", "dns.google": "www.google.com"},
                "servers": [
                  {"address": "fakedns", "domains": ["domain:ir", "geosite:private", "geosite:ir", "domain:dynx.pro", "geosite:sanctioned", "geosite:telegram", "geosite:meta", "geosite:youtube", "geosite:twitter", "geosite:reddit", "geosite:twitch", "geosite:tiktok", "geosite:discord"], "finalQuery": true},
                  {"tag": "personal-doh", "address": fullDohUrl, "domains": ["geosite:telegram", "geosite:meta", "geosite:youtube", "geosite:twitter", "geosite:reddit", "geosite:twitch", "geosite:tiktok", "geosite:discord", "geosite:sanctioned"], "timeoutMs": 4000, "finalQuery": true},
                  {"address": "localhost", "domains": ["domain:ir", "geosite:private", "geosite:ir"], "finalQuery": true}
                ],
                "queryStrategy": "UseSystem", "useSystemHosts": true
            };
            const baseInbounds = [
                {"tag": "dns-in", "listen": "127.0.0.1", "port": 10853, "protocol": "tunnel", "settings": {"address": "127.0.0.1", "port": 53, "network": "tcp,udp"}, "streamSettings": {"sockopt": {"tcpKeepAliveInterval": 1, "tcpKeepAliveIdle": 46}}},
                {"tag": "socks-in", "listen": "127.0.0.1", "port": 10808, "protocol": "mixed", "sniffing": {"enabled": true, "destOverride": ["fakedns"], "routeOnly": false}, "settings": {"udp": true, "ip": "127.0.0.1"}, "streamSettings": {"sockopt": {"tcpKeepAliveInterval": 1, "tcpKeepAliveIdle": 46}}}
            ];

            // 1. Update Fix Fragment Config
            const fixFragmentConfig = {
              "remarks": "fix-fragment-personal-doh",
              "log": {"loglevel": "warning"}, "policy": {"levels": {"0": {}}},
              "dns": baseDns, "inbounds": baseInbounds,
              "outbounds": [
                {"tag": "block-out", "protocol": "block"},
                {"tag": "direct-out", "protocol": "direct", "streamSettings": {"sockopt": {"domainStrategy": "ForceIP", "happyEyeballs": {"tryDelayMs": 100, "prioritizeIPv6": true}}}},
                {"tag": "dns-out", "protocol": "dns", "settings": {"nonIPQuery": "reject", "blockTypes": [0, 65]}},
                {"tag": "fragment-out", "protocol": "freedom", "streamSettings": {"sockopt": {"happyEyeballs": {"tryDelayMs": 200}}, "tlsSettings": {"serverName": serverName, "alpn": ["h3", "h2", "http/1.1"], "fingerprint": fingerprint}}, "settings": {"fragment": {"packets": fragPackets, "length": fragLength, "interval": fragInterval}, "domainStrategy": "UseIPv4v6"}},
                {"tag": "udp-noises-out", "protocol": "direct", "settings": {"targetStrategy": "ForceIP", "noises": [{"type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv4"}, {"type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv6"}]}}
              ],
              "routing": {
                "domainStrategy": "IPOnDemand",
                "rules": [
                  {"outboundTag": "block-out", "port": 0}, {"outboundTag": "block-out", "domain": ["geosite:category-ads-all"]},
                  {"outboundTag": "block-out", "ip": ["geoip:irgfw-block-injected-ips", "0.0.0.0", "::", "198.18.0.0/15", "fc00::/18"]},
                  {"outboundTag": "dns-out", "inboundTag": ["dns-in"]}, {"outboundTag": "dns-out", "inboundTag": ["socks-in"], "port": 53},
                  {"outboundTag": "fragment-out", "inboundTag": ["personal-doh"]},
                  {"outboundTag": "direct-out", "domain": ["domain:ir", "geosite:private", "geosite:ir"]},
                  {"outboundTag": "direct-out", "ip": ["geoip:private", "geoip:ir"]},
                  {"outboundTag": "udp-noises-out", "network": "udp", "protocol": ["quic"]},
                  {"outboundTag": "udp-noises-out", "network": "udp", "port": "443,2053,2083,2087,2096,8443"},
                  {"outboundTag": "direct-out", "network": "udp"},
                  {"outboundTag": "fragment-out", "network": "tcp", "protocol": ["tls"]},
                  {"outboundTag": "fragment-out", "network": "tcp", "port": "80,443,8080,8443,2052,2053,2082,2083,2086,2087,2095,2096"},
                  {"outboundTag": "fragment-out", "network": "tcp"},
                  {"outboundTag": "block-out", "network": "tcp,udp"}
                ]
              }
            };
            document.getElementById('fixFragmentConfig').textContent = JSON.stringify(fixFragmentConfig, null, 2);

            // 2. Update Best Fragment Config
            const bestFragmentConfig = {
              "remarks": "best-fragment-personal-doh",
              "log": {"loglevel": "warning"}, "policy": {"levels": {"0": {}}},
              "dns": baseDns, "inbounds": baseInbounds,
              "observatory": {"subjectSelector": ["probe-"], "probeUrl": "https://www.gstatic.com/generate_204", "probeInterval": "30s"},
              "outbounds": [
                {"tag": "block-out", "protocol": "block"}, {"tag": "dns-out", "protocol": "dns"},
                {"tag": "direct-out", "protocol": "direct", "streamSettings": {"sockopt": {"domainStrategy": "ForceIP", "happyEyeballs": {"tryDelayMs": 100}}}},
                {"tag": "udp-noises-out", "protocol": "direct", "settings": {"targetStrategy": "ForceIP", "noises": [{"type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv4"}, {"type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv6"}]}},
                ...[
                    {p:"tlshello",l:"5-15",i:"5-10"}, {p:"1-1",l:"10-20",i:"5-10"}, {p:"1-1",l:"20-40",i:"10-15"},
                    {p:"1-1",l:"40-60",i:"10-20"}, {p:"1-2",l:"1-10",i:"1-5"}, {p:"1-3",l:"30-50",i:"10-15"},
                    {p:"tlshello",l:"10-25",i:"10-20"}, {p:"1-1",l:"80-100",i:"20-30"}, {p:"1-1",l:"100-200",i:"1-1"}
                ].map((frag, idx) => (
                    {"tag": \`frag-rule-\${idx + 1}\`, "protocol": "freedom", "settings": {"fragment": {"packets": frag.p, "length": frag.l, "interval": frag.i}}}
                )),
                ...Array.from({length: 9}, (_, i) => i + 1).map(i => (
                    {"tag": \`probe-\${i}\`, "protocol": "freedom", "settings": {"domainStrategy": "UseIPv4v6"}, "streamSettings": {"sockopt": {"dialerProxy": \`frag-rule-\${i}\`}, "tlsSettings": {"serverName": serverName, "alpn": ["h3", "h2", "http/1.1"], "fingerprint": fingerprint}}}
                ))
              ],
              "routing": {
                "domainStrategy": "IPOnDemand",
                "balancers": [{"tag": "auto-balancer", "selector": ["probe-"], "strategy": {"type": "leastPing"}}],
                "rules": [
                  {"type": "field", "outboundTag": "block-out", "port": 0},
                  {"type": "field", "outboundTag": "block-out", "domain": ["geosite:category-ads-all"]},
                  {"type": "field", "outboundTag": "block-out", "ip": ["geoip:irgfw-block-injected-ips", "0.0.0.0", "::", "198.18.0.0/15", "fc00::/18"]},
                  {"type": "field", "outboundTag": "dns-out", "inboundTag": ["dns-in"]},
                  {"type": "field", "outboundTag": "dns-out", "inboundTag": ["socks-in"], "port": 53},
                  {"type": "field", "outboundTag": "direct-out", "domain": ["domain:ir", "geosite:private", "geosite:ir"]},
                  {"type": "field", "outboundTag": "direct-out", "ip": ["geoip:private", "geoip:ir"]},
                  {"type": "field", "outboundTag": "udp-noises-out", "network": "udp", "protocol": ["quic"]},
                  {"type": "field", "outboundTag": "udp-noises-out", "network": "udp", "port": "443,2053,2083,2087,2096,8443"},
                  {"type": "field", "outboundTag": "direct-out", "network": "udp"},
                  {"type": "field", "balancerTag": "auto-balancer", "inboundTag": ["personal-doh"]},
                  {"type": "field", "balancerTag": "auto-balancer", "network": "tcp", "protocol": ["tls"]},
                  {"type": "field", "balancerTag": "auto-balancer", "network": "tcp", "port": "80,443,8080,8443,2052,2053,2082,2083,2086,2087,2095,2096"},
                  {"type": "field", "balancerTag": "auto-balancer", "network": "tcp"},
                  {"type": "field", "outboundTag": "block-out", "network": "tcp,udp"}
                ]
              }
            };
            document.getElementById('bestFragmentConfig').textContent = JSON.stringify(bestFragmentConfig, null, 2);

            // 3. Update No Fragment Config
            const noFragmentConfig = {
              "remarks": "no-fragment-personal-doh",
              "log": {"loglevel": "warning"}, "policy": {"levels": {"0": {}}},
              "dns": baseDns, "inbounds": baseInbounds,
              "outbounds": [
                {"tag": "block-out", "protocol": "block"},
                {"tag": "direct-out", "protocol": "direct", "streamSettings": {"sockopt": {"domainStrategy": "ForceIP", "happyEyeballs": {"tryDelayMs": 100}}}},
                {"tag": "dns-out", "protocol": "dns", "settings": {"nonIPQuery": "reject", "blockTypes": [0, 65]}},
                {"tag": "proxy-out", "protocol": "freedom", "streamSettings": {"sockopt": {"happyEyeballs": {"tryDelayMs": 200}}, "tlsSettings": {"serverName": serverName, "alpn": ["h3", "h2", "http/1.1"], "fingerprint": fingerprint}}, "settings": {"domainStrategy": "UseIPv4v6"}},
                {"tag": "udp-noises-out", "protocol": "direct", "settings": {"targetStrategy": "ForceIP", "noises": [{"type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv4"}, {"type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv6"}]}}
              ],
              "routing": {
                "domainStrategy": "IPOnDemand",
                "rules": [
                  {"outboundTag": "block-out", "port": 0}, {"outboundTag": "block-out", "domain": ["geosite:category-ads-all"]},
                  {"outboundTag": "block-out", "ip": ["geoip:irgfw-block-injected-ips", "0.0.0.0", "::", "198.18.0.0/15", "fc00::/18"]},
                  {"outboundTag": "dns-out", "inboundTag": ["dns-in"]}, {"outboundTag": "dns-out", "inboundTag": ["socks-in"], "port": 53},
                  {"outboundTag": "proxy-out", "inboundTag": ["personal-doh"]},
                  {"outboundTag": "direct-out", "domain": ["domain:ir", "geosite:private", "geosite:ir"]},
                  {"outboundTag": "direct-out", "ip": ["geoip:private", "geoip:ir"]},
                  {"outboundTag": "udp-noises-out", "network": "udp", "protocol": ["quic"]},
                  {"outboundTag": "udp-noises-out", "network": "udp", "port": "443,2053,2083,2087,2096,8443"},
                  {"outboundTag": "direct-out", "network": "udp"},
                  {"outboundTag": "proxy-out", "network": "tcp", "protocol": ["tls"]},
                  {"outboundTag": "proxy-out", "network": "tcp", "port": "80,443,8080,8443,2052,2053,2082,2083,2086,2087,2095,2096"},
                  {"outboundTag": "proxy-out", "network": "tcp"},
                  {"outboundTag": "block-out", "network": "tcp,udp"}
                ]
              }
            };
            document.getElementById('noFragmentConfig').textContent = JSON.stringify(noFragmentConfig, null, 2);
        }

        document.addEventListener('DOMContentLoaded', function() {
            updateAllConfigs();
        });
    </script>
</body>
</html>`;
}
