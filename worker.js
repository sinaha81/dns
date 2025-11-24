/**
 * 🚀 Ultimate DoH Proxy Worker - Ultra Master Edition (Solid Static UI)
 * Features: High Performance Load Balancing, AdBlock Support, IP Geolocation, Real-time Tester, V2Ray Config Generator
 * Updates: ZERO Animations (Except BG), No Status Tooltip, Responsive Fixes
 */

// 1. لیست جامع و دسته‌بندی شده DNSها
const UPSTREAM_DNS_PROVIDERS = [
  // --- عمومی و پرسرعت (Tier 1) ---
  { name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query", weight: 30, category: "Fastest", color: "#f38020", description: "سریع‌ترین در جهان، حریم خصوصی بالا" },
  { name: "Google", url: "https://dns.google/dns-query", weight: 20, category: "Stable", color: "#4285f4", description: "پایداری و آپتایم ۱۰۰٪" },
  { name: "Quad9", url: "https://dns.quad9.net/dns-query", weight: 15, category: "Security", color: "#5865F2", description: "مسدودسازی بدافزارها و فیشینگ" },
  
  // --- ضد تبلیغات و ردیاب (AdBlock) ---
  { name: "AdGuard", url: "https://dns.adguard-dns.com/dns-query", weight: 15, category: "AdBlock", color: "#68bc71", description: "حذف تبلیغات در سطح DNS" },
  { name: "ControlD", url: "https://freedns.controld.com/p2", weight: 10, category: "Anti-Malware", color: "#ff4d4d", description: "فیلتر تبلیغات و بدافزار" },
  
  // --- حریم خصوصی (Privacy) ---
  { name: "Mullvad", url: "https://adblock.dns.mullvad.net/dns-query", weight: 10, category: "Privacy", color: "#f1c40f", description: "بدون لاگ، تمرکز بر امنیت" }
];

const DNS_CACHE_TTL = 300; // 5 Minutes
const REQUEST_TIMEOUT = 8000;
const RATE_LIMIT_REQUESTS = 150;
const RATE_LIMIT_WINDOW = 60000;
const rateLimitMap = new Map();

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate Limiting Check
  if (!checkRateLimit(clientIP)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
    });
  }

  // Routes
  switch (url.pathname) {
    case '/apple':
      return generateAppleProfile(request.url);
    case '/ip-info':
      return handleIpInfo(url);
    case '/dns-query':
      return handleDnsQuery(request);
    default:
      return new Response(getHomePage(request.url), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self' https://cdn.jsdelivr.net http://ip-api.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https: http:;"
        }
      });
  }
}

// --- Logic Functions ---

async function handleDnsQuery(request) {
  if (request.method === 'OPTIONS') return handleOptions();
  
  try {
    const url = new URL(request.url);
    const dnsParam = url.searchParams.get('dns');
    const nameParam = url.searchParams.get('name'); // Support for JSON/Browser calls
    
    // Mode 1: JSON DNS (Browser/Test Tool)
    if (nameParam || request.headers.get('Accept')?.includes('application/dns-json')) {
        return await handleJsonDns(url.searchParams);
    }

    // Mode 2: Standard DoH (Binary)
    if (request.method === 'GET' && dnsParam && isValidBase64Url(dnsParam)) {
        return await proxyDnsRequest(url, 'GET', null, dnsParam);
    } else if (request.method === 'POST') {
        const body = await request.arrayBuffer();
        return await proxyDnsRequest(url, 'POST', body, null);
    }
    
    return new Response('Invalid DNS Request', { status: 400 });

  } catch (error) {
    return new Response('DNS Error: ' + error.message, { status: 500 });
  }
}

async function handleIpInfo(url) {
    const ip = url.searchParams.get('ip');
    if (!ip) return new Response('{"error":"No IP"}', { status: 400 });
    try {
        const res = await fetch(`http://ip-api.com/json/${ip}?lang=fa&fields=status,message,country,city,isp,query,as`);
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    } catch (e) {
        return new Response('{"error":"API Fail"}', { status: 500 });
    }
}

async function handleJsonDns(params) {
    // For JSON testing, we prefer Cloudflare as it has the best JSON API support
    const target = new URL("https://cloudflare-dns.com/dns-query");
    params.forEach((v, k) => target.searchParams.set(k, v));
    target.searchParams.set('ct', 'application/dns-json');
    
    const res = await fetch(target.toString(), { headers: { 'Accept': 'application/dns-json' } });
    return new Response(res.body, {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

function selectProvider(providers) {
  const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * totalWeight;
  for (const p of providers) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return providers[0];
}

async function proxyDnsRequest(originalUrl, method, body, dnsParam) {
    // Load Balancing Strategy
    const providers = [selectProvider(UPSTREAM_DNS_PROVIDERS), ...UPSTREAM_DNS_PROVIDERS];
    
    for (const provider of providers) {
        try {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
            
            let fetchUrl = provider.url;
            let options = {
                method: method,
                headers: { 'User-Agent': 'DoH-Worker/2.0' },
                signal: controller.signal
            };

            if (method === 'GET') {
                const u = new URL(provider.url);
                u.searchParams.set('dns', dnsParam);
                fetchUrl = u.toString();
                options.headers['Accept'] = 'application/dns-message';
            } else {
                options.headers['Content-Type'] = 'application/dns-message';
                options.body = body;
            }

            const response = await fetch(fetchUrl, options);
            if (response.ok) {
                return new Response(response.body, {
                    status: response.status,
                    headers: {
                        'Content-Type': 'application/dns-message',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': `public, max-age=${DNS_CACHE_TTL}`
                    }
                });
            }
        } catch (e) { continue; }
    }
    throw new Error('All upstreams failed');
}

// --- Utilities ---
function handleOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': '*' } });
}
function checkRateLimit(ip) {
  const now = Date.now();
  const data = rateLimitMap.get(ip) || { count: 0, reset: now + RATE_LIMIT_WINDOW };
  if (now > data.reset) { data.count = 0; data.reset = now + RATE_LIMIT_WINDOW; }
  data.count++;
  rateLimitMap.set(ip, data);
  return data.count <= RATE_LIMIT_REQUESTS;
}
function isValidBase64Url(s) { return /^[A-Za-z0-9_-]+$/.test(s); }

function generateAppleProfile(reqUrl) {
    const url = new URL(reqUrl);
    const doh = `https://${url.hostname}/dns-query`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>PayloadContent</key><array><dict><key>DNSSettings</key><dict><key>DNSProtocol</key><string>HTTPS</string><key>ServerURL</key><string>${doh}</string></dict><key>PayloadDescription</key><string>Encrypted DNS Proxy</string><key>PayloadDisplayName</key><string>DoH Proxy</string><key>PayloadIdentifier</key><string>com.cloudflare.doh</string><key>PayloadType</key><string>com.apple.dnsSettings.managed</string><key>PayloadUUID</key><string>${crypto.randomUUID()}</string><key>PayloadVersion</key><integer>1</integer><key>ProhibitDisablement</key><false/></dict></array><key>PayloadDisplayName</key><string>DoH - ${url.hostname}</string><key>PayloadIdentifier</key><string>com.cloudflare.loader</string><key>PayloadType</key><string>Configuration</string><key>PayloadUUID</key><string>${crypto.randomUUID()}</string><key>PayloadVersion</key><integer>1</integer></dict></plist>`;
    return new Response(xml, { headers: { 'Content-Type': 'application/x-apple-aspen-config', 'Content-Disposition': 'attachment; filename="dns.mobileconfig"' } });
}

// --- UI/UX ---
function getHomePage(requestUrl) {
  const fullDohUrl = new URL('/dns-query', requestUrl).href;
  const providersHtml = UPSTREAM_DNS_PROVIDERS.map(p => `
    <div class="provider-card" data-tooltip="${p.description}">
      <div class="p-header" style="border-left: 3px solid ${p.color}">
        <span class="p-name">${p.name}</span>
        <span class="p-badge" style="background:${p.color}20; color:${p.color}">${p.category}</span>
      </div>
      <p class="p-desc">${p.description}</p>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ultimate DoH Panel</title>
    <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        :root {
            --bg-main: #0b0e14;
            --bg-glass: rgba(22, 27, 34, 0.8);
            --primary: #58a6ff;
            --secondary: #1f6feb;
            --accent: #bc8cff;
            --text-main: #c9d1d9;
            --text-muted: #8b949e;
            --border: rgba(240, 246, 252, 0.1);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; outline: none; }
        /* NO TRANSITIONS/ANIMATIONS for elements */
        * { transition: none !important; }
        
        body {
            font-family: 'Vazirmatn', sans-serif;
            background-color: var(--bg-main);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            padding: 2rem 1rem;
            position: relative;
            overflow-x: hidden;
        }
        /* Aurora Background Animation (The ONLY allowed animation) */
        body::before {
            content: ''; position: fixed; top: -50%; left: -50%; width: 200%; height: 200%;
            background: radial-gradient(circle at center, rgba(88, 166, 255, 0.15), transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(188, 140, 255, 0.1), transparent 30%);
            animation: aurora 20s infinite linear; z-index: -1; pointer-events: none;
        }
        @keyframes aurora { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .container { width: 100%; max-width: 900px; display: flex; flex-direction: column; gap: 1.5rem; }
        
        /* Header */
        .header { text-align: center; padding: 2rem 0; position: relative; }
        .header h1 { font-size: 2.5rem; font-weight: 800; background: linear-gradient(135deg, #fff, var(--primary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem; }
        
        /* Status Badge - NO Tooltip here */
        .status-badge { background: rgba(53, 219, 105, 0.1); color: #3fb950; padding: 0.4rem 1rem; border-radius: 2rem; font-size: 0.9rem; font-weight: 600; border: 1px solid rgba(53, 219, 105, 0.2); display: inline-flex; align-items: center; gap: 0.5rem; cursor: default; }
        .status-badge::before { content: ''; width: 8px; height: 8px; background: #3fb950; border-radius: 50%; box-shadow: 0 0 5px #3fb950; }

        /* Card System */
        .card { background: var(--bg-glass); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        summary { padding: 1.5rem; cursor: pointer; font-weight: 700; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center; list-style: none; background: rgba(255,255,255,0.01); }
        
        /* Interaction - Instant change, NO Animation */
        summary:hover { background: rgba(255,255,255,0.03); transform: none !important; }
        
        summary::after { content: '+'; font-size: 1.5rem; color: var(--text-muted); }
        details[open] summary::after { transform: rotate(45deg); color: var(--primary); }
        details[open] summary { border-bottom: 1px solid var(--border); }
        .card-body { padding: 1.5rem; }

        /* Tooltips - Instant Display */
        [data-tooltip] { position: relative; }
        [data-tooltip]:hover::before {
            content: attr(data-tooltip);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(-8px);
            background: rgba(31, 111, 235, 0.95);
            color: white;
            padding: 0.5rem 0.8rem;
            border-radius: 6px;
            font-size: 0.8rem;
            white-space: nowrap;
            z-index: 100;
            /* No Opacity Transition - Instant */
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            font-weight: 500;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        [data-tooltip]:hover::after {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(-4px);
            border: 6px solid transparent;
            border-top-color: rgba(31, 111, 235, 0.95);
        }

        /* Controls & Inputs */
        .control-group { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem; }
        .input-wrapper { display: flex; flex-direction: column; gap: 0.5rem; }
        label { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; cursor: help; }
        input, select { background: rgba(13, 17, 23, 0.6); border: 1px solid var(--border); padding: 0.8rem; border-radius: 8px; color: #fff; font-family: inherit; }
        input:focus, select:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.15); }

        /* Copy & Action Buttons */
        .url-row { display: flex; gap: 0.5rem; background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 10px; border: 1px solid var(--border); align-items: center; flex-wrap: wrap; }
        .url-text { flex: 1; font-family: monospace; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 0.5rem; direction: ltr; }
        .btn { border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .btn-primary { background: var(--secondary); color: white; }
        .btn-primary:hover { background: var(--primary); }
        .btn-copy { background: rgba(255,255,255,0.1); color: var(--text-main); }
        .btn-copy:hover { background: rgba(255,255,255,0.15); }

        /* Code Blocks Wrapper & Copy Button */
        .config-wrapper { position: relative; direction: ltr; }
        .config-copy-btn { 
            position: absolute; 
            top: 10px; 
            right: 30px; 
            z-index: 10;
            background: linear-gradient(135deg, var(--secondary), var(--primary));
            box-shadow: 0 4px 15px rgba(31, 111, 235, 0.4);
            border: 1px solid rgba(255,255,255,0.2);
            backdrop-filter: blur(4px);
            color: white;
        }
        .config-copy-btn:hover {
            box-shadow: 0 6px 20px rgba(31, 111, 235, 0.6);
            filter: brightness(1.1);
        }
        
        pre { background: #0d1117; padding: 3.5rem 1rem 1rem 1rem; border-radius: 10px; overflow-x: auto; color: #a5d6ff; font-family: 'Fira Code', monospace; font-size: 0.9rem; border: 1px solid var(--border); max-height: 400px; text-align: left; }
        
        /* Provider Grid */
        .provider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem; }
        .provider-card { background: rgba(255,255,255,0.03); border-radius: 10px; padding: 1rem; border: 1px solid var(--border); cursor: help; }
        .provider-card:hover { background: rgba(255,255,255,0.05); border-color: var(--primary); }
        .p-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding-left: 0.8rem; }
        .p-name { font-weight: 700; color: #fff; }
        .p-badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
        .p-desc { font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; }

        /* Guide Boxes */
        .info-box { background: rgba(88, 166, 255, 0.1); border-left: 4px solid var(--primary); padding: 1rem; border-radius: 6px; margin: 1rem 0; font-size: 0.9rem; line-height: 1.7; }
        .warn-box { background: rgba(247, 185, 72, 0.1); border-left: 4px solid #f7b948; padding: 1rem; border-radius: 6px; margin: 1rem 0; font-size: 0.9rem; line-height: 1.7; color: #f7b948; }
        .warn-box strong { color: #fff; }

        /* Tester Tool */
        .tester-result { margin-top: 1rem; display: none; }
        
        @media (max-width: 600px) { 
            .header h1 { font-size: 2rem; } 
            .url-row { flex-direction: column; align-items: stretch; gap: 10px; }
            .url-text { 
                text-align: center; 
                padding: 0.5rem 0; 
                white-space: normal !important; 
                word-break: break-all !important;
                font-size: 0.85rem;
            }
            .btn { width: 100%; }
            [data-tooltip]:hover::before { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>DoH Proxy Ultimate</h1>
            <!-- Tooltip REMOVED -->
            <div class="status-badge">سیستم فعال و رمزنگاری شده</div>
        </header>

        <!-- بخش تست آنلاین -->
        <details class="card">
            <summary data-tooltip="برای اطمینان از صحت عملکرد DNS کلیک کنید">⚡ ابزار تست در لحظه (Live Tester)</summary>
            <div class="card-body">
                <p style="color:var(--text-muted); margin-bottom:1rem;">بررسی عملکرد DNS و دریافت موقعیت جغرافیایی IP خروجی.</p>
                <div class="url-row">
                    <input type="text" id="test-domain" value="www.google.com" style="border:none; background:transparent; width:100%; color:#fff;" placeholder="آدرس دامنه..." data-tooltip="دامنه مورد نظر برای تست (مثلاً google.com)">
                    <button class="btn btn-primary" onclick="runTest()" data-tooltip="شروع عملیات تست DNS">شروع تست</button>
                </div>
                <div id="test-output" class="tester-result">
                    <pre id="test-json" style="padding: 1rem;">در حال پردازش...</pre>
                </div>
            </div>
        </details>

        <!-- تنظیمات اصلی -->
        <details class="card" open>
            <summary data-tooltip="تنظیمات هسته و آدرس اتصال">⚙️ تنظیمات و متغیرها</summary>
            <div class="card-body">
                
                <div class="info-box">
                    <strong>📌 راهنمای اتصال دستی:</strong><br>
                    ۱. برای مرورگر <strong>Chrome/Firefox</strong>: به بخش <code>Settings > Privacy > Secure DNS</code> بروید و این آدرس را وارد کنید.<br>
                    ۲. برای اندروید: از برنامه <strong>Intra</strong> در بخش <code>DoH Server</code> این آدرس را قرار دهید.
                </div>

                <div class="url-row" style="margin-bottom:1.5rem;">
                    <span id="dohUrl" class="url-text" data-tooltip="آدرس سرور DoH شما">${fullDohUrl}</span>
                    <button class="btn btn-copy" onclick="copyText('dohUrl')" data-tooltip="کپی آدرس در حافظه موقت">کپی آدرس</button>
                </div>
                
                <div class="control-group">
                    <div class="input-wrapper">
                        <label data-tooltip="تغییر اثر انگشت TLS برای عبور از فایروال">TLS Fingerprint (همه کانفیگ‌ها)</label>
                        <select id="fp-select" onchange="updateConfigs()" data-tooltip="پیشنهاد: Randomized">
                            <option value="randomized" selected>Randomized (توصیه شده)</option>
                            <option value="chrome">Chrome</option>
                            <option value="ios">iOS</option>
                            <option value="firefox">Firefox</option>
                        </select>
                    </div>
                    <div class="input-wrapper">
                        <label data-tooltip="فاصله زمانی بین تست‌های پینگ (ثانیه)">Probe Interval (Best Frag Only)</label>
                        <input type="text" id="probe-int" value="20s" oninput="updateConfigs()" data-tooltip="مثال: 20s">
                    </div>
                    <div class="input-wrapper">
                        <label data-tooltip="تعداد بسته‌های تکه شده">Frag Packets (Fix Frag Only)</label>
                        <input type="text" id="frag-pac" value="2-3" oninput="updateConfigs()" data-tooltip="مثال: 2-3">
                    </div>
                    <div class="input-wrapper">
                        <label data-tooltip="طول هر تکه (بایت)">Frag Length (Fix Frag Only)</label>
                        <input type="text" id="frag-len" value="10-30" oninput="updateConfigs()" data-tooltip="مثال: 10-30">
                    </div>
                    <div class="input-wrapper">
                        <label data-tooltip="فاصله زمانی ارسال تکه‌ها (میلی‌ثانیه)">Frag Interval (Fix Frag Only)</label>
                        <input type="text" id="frag-inv" value="5-15" oninput="updateConfigs()" data-tooltip="مثال: 5-15">
                    </div>
                </div>
            </div>
        </details>

        <!-- راهنمای کانفیگ‌ها -->
        <div class="warn-box">
             ⚠️ <strong>نکات حیاتی برای عملکرد صحیح:</strong><br>
             ۱. حتماً از <strong>V2RayN نسخه 1.10.23</strong> به بالا یا کلاینت‌های سازگار با Fragment استفاده کنید.<br>
             ۲. فایل‌های <strong>GeoIP</strong> و <strong>GeoSite</strong> (مخصوص ایران) در برنامه را حتماً آپدیت کنید.<br>
             ۳. این کانفیگ‌ها جهت رفع اختلالات شدید DNS طراحی شده‌اند.
        </div>

        <!-- کانفیگ‌ها - ALL have tooltips -->
        <details class="card">
            <summary data-tooltip="تنظیمات دستی تکه‌تکه کردن بسته‌ها">📄 کانفیگ ۱: Fix Fragment</summary>
            <div class="card-body">
                <div class="config-wrapper">
                    <button class="btn btn-primary config-copy-btn" onclick="copyText('conf-fix')" data-tooltip="کپی کانفیگ Fix Fragment">کپی کانفیگ</button>
                    <pre id="conf-fix"></pre>
                </div>
            </div>
        </details>

        <details class="card">
            <summary data-tooltip="انتخاب هوشمند بهترین روش فرگمنت">📄 کانفیگ ۲: Best Fragment (هوشمند)</summary>
            <div class="card-body">
                <div class="config-wrapper">
                    <button class="btn btn-primary config-copy-btn" onclick="copyText('conf-best')" data-tooltip="کپی کانفیگ Best Fragment">کپی کانفیگ</button>
                    <pre id="conf-best"></pre>
                </div>
            </div>
        </details>

        <details class="card">
            <summary data-tooltip="حالت استاندارد بدون فرگمنت">📄 کانفیگ ۳: No Fragment (ساده)</summary>
            <div class="card-body">
                <div class="config-wrapper">
                    <button class="btn btn-primary config-copy-btn" onclick="copyText('conf-no')" data-tooltip="کپی کانفیگ No Fragment">کپی کانفیگ</button>
                    <pre id="conf-no"></pre>
                </div>
            </div>
        </details>

        <!-- لیست DNS -->
        <details class="card" open>
            <summary data-tooltip="مشاهده سرورهای فعال در شبکه توزیع">🌐 شبکه توزیع DNS (Load Balancing)</summary>
            <div class="card-body">
                <p style="color:var(--text-muted);">درخواست‌های شما جهت افزایش سرعت و پایداری بین سرورهای زیر تقسیم می‌شوند:</p>
                <div class="provider-grid">
                    ${providersHtml}
                </div>
            </div>
        </details>
    </div>

    <script>
        // --- Core Functions ---
        
        async function runTest() {
            const domain = document.getElementById('test-domain').value;
            const output = document.getElementById('test-output');
            const pre = document.getElementById('test-json');
            
            if(!domain) return Swal.fire({
                icon: 'error',
                title: 'خطا',
                text: 'لطفا آدرس دامنه را وارد کنید!',
                background: '#161b22',
                color: '#fff'
            });
            
            output.style.display = 'block';
            pre.innerHTML = '<span style="color:var(--accent)">⏳ در حال ارسال درخواست به شبکه...</span>';
            
            try {
                // 1. DNS Query
                const dohUrl = document.getElementById('dohUrl').innerText;
                const target = new URL(dohUrl);
                target.searchParams.set('name', domain);
                target.searchParams.set('type', 'A');
                
                const res = await fetch(target.toString(), { headers: { 'Accept': 'application/dns-json' } });
                const data = await res.json();
                
                // 2. GeoIP Lookup (if IP found)
                if(data.Answer && data.Answer.length > 0) {
                    const ip = data.Answer.find(r => r.type === 1)?.data;
                    if(ip) {
                        try {
                            pre.innerHTML += '<br><span style="color:var(--primary)">📍 در حال شناسایی موقعیت IP...</span>';
                            const geoRes = await fetch('/ip-info?ip=' + ip);
                            data.GeoLocation = await geoRes.json();
                        } catch(e) {}
                    }
                }
                
                pre.textContent = JSON.stringify(data, null, 2);
            } catch(e) {
                pre.innerHTML = '<span style="color:#ff4d4d">❌ خطا در ارتباط: ' + e.message + '</span>';
            }
        }

        function copyText(id) {
            const text = document.getElementById(id).innerText;
            navigator.clipboard.writeText(text).then(() => {
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                    background: '#1f6feb',
                    color: '#fff',
                    iconColor: '#fff'
                });
                Toast.fire({ icon: 'success', title: 'با موفقیت کپی شد!' });
            });
        }

        function updateConfigs() {
            const fullUrl = document.getElementById('dohUrl').innerText;
            const fp = document.getElementById('fp-select').value;
            const pInt = document.getElementById('probe-int').value;
            const fPac = document.getElementById('frag-pac').value;
            const fLen = document.getElementById('frag-len').value;
            const fInv = document.getElementById('frag-inv').value;
            
            const commonDomains = ["www.google.com", "www.bing.com", "www.yahoo.com"];
            const serverName = commonDomains[Math.floor(Math.random() * commonDomains.length)];

            // 1. FIX FRAGMENT
            const fixConf = {
              "remarks": "fix-fragment-personal-doh",
              "log": { "loglevel": "none" },
              "policy": { "levels": { "0": { "connIdle": 300, "downlinkOnly": 1, "handshake": 4, "uplinkOnly": 1, "bufferSize": 100000 } }, "system": { "statsOutboundUplink": true, "statsOutboundDownlink": true } },
              "fakedns": [ { "ipPool": "198.18.0.0/15", "poolSize": 65000 } ],
              "dns": {
                "unexpectedIPs": [ "geoip:cn", "10.10.34.34", "10.10.34.35", "10.10.34.36" ],
                "hosts": { "geosite:category-ads-all": "#3", "geosite:category-ads-ir": "#3", "cloudflare-dns.com": [ "172.67.73.38", "104.19.155.92", "172.67.73.163", "104.18.155.42", "104.16.124.175", "104.16.248.249", "104.16.249.249", "104.26.13.8" ], "domain:youtube.com": [ "google.com" ], "dns.google": "www.google.com" },
                "servers": [
                  { "address": "fakedns", "domains": [ "domain:ir", "geosite:private", "geosite:ir", "domain:dynx.pro", "geosite:sanctioned", "geosite:telegram", "geosite:meta", "geosite:youtube", "geosite:twitter", "geosite:reddit", "geosite:twitch", "geosite:tiktok", "geosite:discord" ], "finalQuery": true },
                  { "tag": "personal-doh", "address": fullUrl, "domains": [ "geosite:telegram", "geosite:meta", "geosite:youtube", "geosite:twitter", "geosite:reddit", "geosite:twitch", "geosite:tiktok", "geosite:discord", "geosite:sanctioned" ], "timeoutMs": 4000, "finalQuery": true },
                  { "address": "localhost", "domains": [ "domain:ir", "geosite:private", "geosite:ir" ], "finalQuery": true }
                ],
                "queryStrategy": "UseSystem", "useSystemHosts": true
              },
              "inbounds": [
                { "tag": "dns-in", "listen": "127.0.0.1", "port": 10853, "protocol": "tunnel", "settings": { "address": "127.0.0.1", "port": 53, "network": "tcp,udp" }, "streamSettings": { "sockopt": { "tcpKeepAliveInterval": 1, "tcpKeepAliveIdle": 30 } } },
                { "tag": "socks-in", "listen": "127.0.0.1", "port": 10808, "protocol": "mixed", "sniffing": { "enabled": true, "destOverride": [ "fakedns", "http", "tls" ], "routeOnly": true }, "settings": { "udp": true, "ip": "127.0.0.1" }, "streamSettings": { "sockopt": { "tcpKeepAliveInterval": 1, "tcpKeepAliveIdle": 30 } } },
                { "tag": "http-in", "listen": "127.0.0.1", "port": 10809, "protocol": "http", "sniffing": { "enabled": true, "destOverride": [ "http", "tls" ] }, "settings": { "userLevel": 0 } }
              ],
              "outbounds": [
                { "tag": "block-out", "protocol": "block" },
                { "tag": "dns-out", "protocol": "dns" },
                { "tag": "direct-out", "protocol": "direct", "streamSettings": { "sockopt": { "tcpFastOpen": true, "domainStrategy": "ForceIP", "happyEyeballs": { "tryDelayMs": 250, "prioritizeIPv6": true, "interleave": 2, "maxConcurrentTry": 4 } } } },
                { "tag": "udp-noises-out", "protocol": "direct", "settings": { "targetStrategy": "ForceIP", "noises": [ { "type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv4" }, { "type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv6" } ] } },
                { "tag": "proxy-out", "protocol": "freedom", "settings": { "domainStrategy": "UseIPv4v6", "fragment": { "packets": fPac, "length": fLen, "interval": fInv } }, "streamSettings": { "sockopt": { "tcpNoDelay": true, "tcpKeepAliveIdle": 30 }, "tlsSettings": { "serverName": serverName, "alpn": [ "h2", "http/1.1" ], "fingerprint": fp } } }
              ],
              "routing": { "domainStrategy": "IPOnDemand", "rules": [ { "type": "field", "outboundTag": "block-out", "port": 0, "domain": [ "geosite:category-ads-all" ], "ip": [ "geoip:irgfw-block-injected-ips", "0.0.0.0", "::", "198.18.0.0/15", "fc00::/18" ] }, { "type": "field", "outboundTag": "dns-out", "inboundTag": [ "dns-in" ] }, { "type": "field", "outboundTag": "dns-out", "inboundTag": [ "socks-in", "http-in" ], "port": 53 }, { "type": "field", "outboundTag": "direct-out", "domain": [ "domain:ir", "geosite:private", "geosite:ir" ], "ip": [ "geoip:private", "geoip:ir" ] }, { "type": "field", "outboundTag": "block-out", "network": "udp", "port": "443", "domain": [ "geosite:youtube", "geosite:google" ] }, { "type": "field", "outboundTag": "udp-noises-out", "network": "udp", "protocol": [ "quic" ] }, { "type": "field", "outboundTag": "udp-noises-out", "network": "udp", "port": "443,2053,2083,2087,2096,8443" }, { "type": "field", "outboundTag": "direct-out", "network": "udp" }, { "type": "field", "outboundTag": "proxy-out", "inboundTag": [ "personal-doh" ] }, { "type": "field", "outboundTag": "proxy-out", "network": "tcp", "protocol": [ "tls" ] }, { "type": "field", "outboundTag": "proxy-out", "network": "tcp", "port": "80,443,8080,8443,2052,2053,2082,2083,2086,2087,2095,2096" }, { "type": "field", "outboundTag": "proxy-out", "network": "tcp" }, { "type": "field", "outboundTag": "block-out", "network": "tcp,udp" } ] }
            };

            // 2. BEST FRAGMENT
            const bestConf = {
              "remarks": "best-fragment-personal-doh",
              "log": { "loglevel": "none" },
              "policy": { "levels": { "0": { "connIdle": 300, "downlinkOnly": 1, "handshake": 4, "uplinkOnly": 1, "bufferSize": 100000 } }, "system": { "statsOutboundUplink": true, "statsOutboundDownlink": true } },
              "fakedns": [ { "ipPool": "198.18.0.0/15", "poolSize": 65000 } ],
              "dns": fixConf.dns, // Same DNS logic
              "inbounds": fixConf.inbounds,
              "observatory": { "subjectSelector": [ "probe-" ], "probeUrl": "https://www.gstatic.com/generate_204", "probeInterval": pInt },
              "outbounds": [
                { "tag": "block-out", "protocol": "block" },
                { "tag": "dns-out", "protocol": "dns" },
                { "tag": "direct-out", "protocol": "direct", "streamSettings": { "sockopt": { "tcpFastOpen": true, "domainStrategy": "ForceIP", "happyEyeballs": { "tryDelayMs": 250, "prioritizeIPv6": true, "interleave": 2, "maxConcurrentTry": 4 } } } },
                { "tag": "udp-noises-out", "protocol": "direct", "settings": { "targetStrategy": "ForceIP", "noises": [ { "type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv4" }, { "type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv6" } ] } },
                { "tag": "frag-standard", "protocol": "freedom", "settings": { "fragment": { "packets": "1-1", "length": "10-20", "interval": "5-10" } }, "streamSettings": { "sockopt": { "tcpNoDelay": true, "tcpKeepAliveIdle": 30 } } },
                { "tag": "frag-macro", "protocol": "freedom", "settings": { "fragment": { "packets": "1-1", "length": "40-60", "interval": "10-15" } }, "streamSettings": { "sockopt": { "tcpNoDelay": true, "tcpKeepAliveIdle": 30 } } },
                { "tag": "frag-large", "protocol": "freedom", "settings": { "fragment": { "packets": "1-1", "length": "100-200", "interval": "1-1" } }, "streamSettings": { "sockopt": { "tcpNoDelay": true, "tcpKeepAliveIdle": 30 } } },
                { "tag": "frag-mixed", "protocol": "freedom", "settings": { "fragment": { "packets": "2-3", "length": "10-30", "interval": "5-15" } }, "streamSettings": { "sockopt": { "tcpNoDelay": true, "tcpKeepAliveIdle": 30 } } },
                { "tag": "frag-micro", "protocol": "freedom", "settings": { "fragment": { "packets": "1-3", "length": "3-5", "interval": "4-8" } }, "streamSettings": { "sockopt": { "tcpNoDelay": true, "tcpKeepAliveIdle": 30 } } },
                { "tag": "frag-heavy", "protocol": "freedom", "settings": { "fragment": { "packets": "1-1", "length": "80-100", "interval": "20-30" } }, "streamSettings": { "sockopt": { "tcpNoDelay": true, "tcpKeepAliveIdle": 30 } } },
                { "tag": "probe-standard", "protocol": "freedom", "settings": { "domainStrategy": "UseIPv4v6" }, "streamSettings": { "sockopt": { "dialerProxy": "frag-standard", "tcpNoDelay": true, "tcpKeepAliveIdle": 30 }, "tlsSettings": { "serverName": serverName, "alpn": [ "h2", "http/1.1" ], "fingerprint": fp } } },
                { "tag": "probe-macro", "protocol": "freedom", "settings": { "domainStrategy": "UseIPv4v6" }, "streamSettings": { "sockopt": { "dialerProxy": "frag-macro", "tcpNoDelay": true, "tcpKeepAliveIdle": 30 }, "tlsSettings": { "serverName": serverName, "alpn": [ "h2", "http/1.1" ], "fingerprint": fp } } },
                { "tag": "probe-large", "protocol": "freedom", "settings": { "domainStrategy": "UseIPv4v6" }, "streamSettings": { "sockopt": { "dialerProxy": "frag-large", "tcpNoDelay": true, "tcpKeepAliveIdle": 30 }, "tlsSettings": { "serverName": serverName, "alpn": [ "h2", "http/1.1" ], "fingerprint": fp } } },
                { "tag": "probe-mixed", "protocol": "freedom", "settings": { "domainStrategy": "UseIPv4v6" }, "streamSettings": { "sockopt": { "dialerProxy": "frag-mixed", "tcpNoDelay": true, "tcpKeepAliveIdle": 30 }, "tlsSettings": { "serverName": serverName, "alpn": [ "h2", "http/1.1" ], "fingerprint": fp } } },
                { "tag": "probe-micro", "protocol": "freedom", "settings": { "domainStrategy": "UseIPv4v6" }, "streamSettings": { "sockopt": { "dialerProxy": "frag-micro", "tcpNoDelay": true, "tcpKeepAliveIdle": 30 }, "tlsSettings": { "serverName": serverName, "alpn": [ "h2", "http/1.1" ], "fingerprint": fp } } },
                { "tag": "probe-heavy", "protocol": "freedom", "settings": { "domainStrategy": "UseIPv4v6" }, "streamSettings": { "sockopt": { "dialerProxy": "frag-heavy", "tcpNoDelay": true, "tcpKeepAliveIdle": 30 }, "tlsSettings": { "serverName": serverName, "alpn": [ "h2", "http/1.1" ], "fingerprint": fp } } }
              ],
              "routing": {
                "domainStrategy": "IPOnDemand",
                "balancers": [ { "tag": "auto-balancer", "selector": [ "probe-" ], "strategy": { "type": "leastPing" } } ],
                "rules": [
                  // Base Rules from fix-fragment
                  ...fixConf.routing.rules.slice(0, 8),
                  { "type": "field", "balancerTag": "auto-balancer", "inboundTag": [ "personal-doh" ] },
                  { "type": "field", "balancerTag": "auto-balancer", "network": "tcp", "protocol": [ "tls" ] },
                  { "type": "field", "balancerTag": "auto-balancer", "network": "tcp", "port": "80,443,8080,8443,2052,2053,2082,2083,2086,2087,2095,2096" },
                  { "type": "field", "balancerTag": "auto-balancer", "network": "tcp" },
                  { "type": "field", "outboundTag": "block-out", "network": "tcp,udp" }
                ]
              }
            };

            // 3. NO FRAGMENT
            const noConf = {
              "remarks": "no-fragment-personal-doh",
              "log": { "loglevel": "none" },
              "policy": fixConf.policy,
              "fakedns": fixConf.fakedns,
              "dns": fixConf.dns,
              "inbounds": fixConf.inbounds,
              "outbounds": [
                { "tag": "block-out", "protocol": "block" },
                { "tag": "dns-out", "protocol": "dns" },
                { "tag": "direct-out", "protocol": "direct", "streamSettings": { "sockopt": { "tcpFastOpen": true, "domainStrategy": "ForceIP", "happyEyeballs": { "tryDelayMs": 250, "prioritizeIPv6": true, "interleave": 2, "maxConcurrentTry": 4 } } } },
                { "tag": "udp-noises-out", "protocol": "direct", "settings": { "targetStrategy": "ForceIP", "noises": [ { "type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv4" }, { "type": "rand", "packet": "1220-1250", "delay": "10-20", "applyTo": "ipv6" } ] } },
                { "tag": "proxy-out", "protocol": "freedom", "settings": { "domainStrategy": "UseIPv4v6" }, "streamSettings": { "sockopt": { "tcpNoDelay": true, "tcpKeepAliveIdle": 30 }, "tlsSettings": { "serverName": serverName, "alpn": [ "h2", "http/1.1" ], "fingerprint": fp } } }
              ],
              "routing": fixConf.routing
            };

            // Display
            document.getElementById('conf-fix').textContent = JSON.stringify(fixConf, null, 2);
            document.getElementById('conf-best').textContent = JSON.stringify(bestConf, null, 2);
            document.getElementById('conf-no').textContent = JSON.stringify(noConf, null, 2);
        }

        document.addEventListener('DOMContentLoaded', updateConfigs);
    </script>
</body>
</html>`;
 }
