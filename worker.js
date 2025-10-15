{
  "remarks": "-SinaHamidi (Privacy-Centric)  [dns1]",
  "log": {
    "loglevel": "warning",
    "dnsLog": false,
    "access": "none"
  },
  "policy": {
    "levels": {
      "0": {
        "uplinkOnly": 0,
        "downlinkOnly": 0
      }
    }
  },
  "dns": {
    "hosts": {
      "geosite:category-ads-all": "#3",
      "cloudflare-dns.com": "www.cloudflare.com",
      "dns.google": "www.google.com"
    },
    "servers": [
      {
        "address": "fakedns",
        "domains": [
          "domain:ir",
          "geosite:private",
          "geosite:ir",
          "domain:dynx.pro",
          "geosite:sanctioned",
          "geosite:telegram",
          "geosite:meta",
          "geosite:youtube",
          "geosite:twitter",
          "geosite:reddit",
          "geosite:twitch",
          "geosite:tiktok",
          "geosite:discord"
        ],
        "finalQuery": true
      },
      {
        "tag": "personal-doh",
        "address": "https://dns.fxsinahamidi.workers.dev/dns-query",
        "domains": [
          "geosite:telegram",
          "geosite:meta",
          "geosite:youtube",
          "geosite:twitter",
          "geosite:reddit",
          "geosite:twitch",
          "geosite:tiktok",
          "geosite:discord",
          "geosite:sanctioned"
        ],
        "timeoutMs": 4000,
        "finalQuery": true
      },
      {
        "address": "localhost",
        "domains": [
          "domain:ir",
          "geosite:private",
          "geosite:ir"
        ],
        "finalQuery": true
      }
    ],
    "queryStrategy": "UseSystem",
    "useSystemHosts": true
  },
  "inbounds": [
    {
      "tag": "dns-in",
      "listen": "127.0.0.1",
      "port": 10853,
      "protocol": "tunnel",
      "settings": {
        "address": "127.0.0.1",
        "port": 53,
        "network": "tcp,udp"
      },
      "streamSettings": {
        "sockopt": {
          "tcpKeepAliveInterval": 1,
          "tcpKeepAliveIdle": 46
        }
      }
    },
    {
      "tag": "socks-in",
      "listen": "127.0.0.1",
      "port": 10808,
      "protocol": "mixed",
      "sniffing": {
        "enabled": true,
        "destOverride": [
          "fakedns"
        ],
        "routeOnly": false
      },
      "settings": {
        "udp": true,
        "ip": "127.0.0.1"
      },
      "streamSettings": {
        "sockopt": {
          "tcpKeepAliveInterval": 1,
          "tcpKeepAliveIdle": 46
        }
      }
    }
  ],
  "outbounds": [
    {
      "tag": "block-out",
      "protocol": "block"
    },
    {
      "tag": "direct-out",
      "protocol": "direct"
    },
    {
      "tag": "dns-out",
      "protocol": "dns",
      "settings": {
        "nonIPQuery": "reject",
        "blockTypes": [
          0,
          65
        ]
      }
    },
    {
      "tag": "smart-fragment-out",
      "protocol": "freedom",
      "streamSettings": {
        "sockopt": {},
        "tlsSettings": {
          "fingerprint": "chrome"
        }
      },
      "settings": {
        "fragment": {
          "packets": "tlshello",
          "length": "10-100",
          "interval": "1-5"
        },
        "domainStrategy": "UseIPv4v6"
      }
    },
    {
      "tag": "udp-noises-out",
      "protocol": "direct",
      "settings": {
        "targetStrategy": "ForceIP",
        "noises": [
            {"type": "rand", "packet": "1250", "delay": "10", "applyTo": "ipv4"}, {"type": "rand", "packet": "1250", "delay": "10", "applyTo": "ipv4"},
            {"type": "rand", "packet": "1250", "delay": "10", "applyTo": "ipv4"}, {"type": "rand", "packet": "1250", "delay": "10", "applyTo": "ipv4"},
            {"type": "rand", "packet": "1250", "delay": "10", "applyTo": "ipv4"}, {"type": "rand", "packet": "1250", "delay": "10", "applyTo": "ipv4"},
            {"type": "rand", "packet": "1250", "delay": "10", "applyTo": "ipv4"}, {"type": "rand", "packet": "1250", "delay": "10", "applyTo": "ipv4"},
            {"type": "rand", "packet": "1230", "delay": "10", "applyTo": "ipv6"}, {"type": "rand", "packet": "1230", "delay": "10", "applyTo": "ipv6"},
            {"type": "rand", "packet": "1230", "delay": "10", "applyTo": "ipv6"}, {"type": "rand", "packet": "1230", "delay": "10", "applyTo": "ipv6"},
            {"type": "rand", "packet": "1230", "delay": "10", "applyTo": "ipv6"}, {"type": "rand", "packet": "1230", "delay": "10", "applyTo": "ipv6"},
            {"type": "rand", "packet": "1230", "delay": "10", "applyTo": "ipv6"}, {"type": "rand", "packet": "1230", "delay": "10", "applyTo": "ipv6"}
        ]
      }
    }
  ],
  "routing": {
    "domainStrategy": "IPOnDemand",
    "rules": [
      {
        "outboundTag": "block-out",
        "domain": [
          "geosite:category-ads-all"
        ]
      },
      {
        "outboundTag": "block-out",
        "ip": [
          "geoip:irgfw-block-injected-ips",
          "0.0.0.0",
          "::",
          "198.18.0.0/15",
          "fc00::/18"
        ]
      },
      {
        "outboundTag": "dns-out",
        "inboundTag": [
          "dns-in"
        ]
      },
      {
        "outboundTag": "dns-out",
        "inboundTag": [
          "socks-in"
        ],
        "port": 53
      },
      {
        "outboundTag": "smart-fragment-out",
        "inboundTag": [
          "personal-doh"
        ]
      },
      {
        "outboundTag": "direct-out",
        "domain": [
          "domain:ir",
          "geosite:private",
          "geosite:ir"
        ]
      },
      {
        "outboundTag": "direct-out",
        "ip": [
          "geoip:private",
          "geoip:ir"
        ]
      },
      {
        "outboundTag": "udp-noises-out",
        "network": "udp",
        "protocol": [
          "quic"
        ]
      },
      {
        "outboundTag": "udp-noises-out",
        "network": "udp",
        "port": "443,2053,2083,2087,2096,8443"
      },
      {
        "outboundTag": "direct-out",
        "network": "udp"
      },
      {
        "outboundTag": "smart-fragment-out",
        "network": "tcp"
      },
      {
        "outboundTag": "block-out",
        "network": "tcp,udp"
      }
    ]
  }
}
