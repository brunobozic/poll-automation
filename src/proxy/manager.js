const axios = require('axios');

class ProxyManager {
  constructor() {
    this.proxies = [];
    this.currentIndex = 0;
    this.blacklistedProxies = new Set();
  }

  // Load proxies from various sources
  async loadProxies(sources = []) {
    const allProxies = [];

    // Load from config file
    if (sources.includes('file')) {
      try {
        const fs = require('fs');
        const proxyList = fs.readFileSync('./proxies.txt', 'utf8')
          .split('\n')
          .filter(line => line.trim())
          .map(line => this.parseProxy(line.trim()));
        allProxies.push(...proxyList);
      } catch (error) {
        console.log('No proxy file found, continuing without file proxies');
      }
    }

    // Load from free proxy APIs (use with caution)
    if (sources.includes('free')) {
      try {
        const freeProxies = await this.fetchFreeProxies();
        allProxies.push(...freeProxies);
      } catch (error) {
        console.error('Failed to fetch free proxies:', error.message);
      }
    }

    // Load from premium proxy services (recommended)
    if (sources.includes('premium')) {
      const premiumProxies = this.loadPremiumProxies();
      allProxies.push(...premiumProxies);
    }

    this.proxies = allProxies.filter(proxy => !this.blacklistedProxies.has(proxy.id));
    console.log(`Loaded ${this.proxies.length} proxies`);
    
    return this.proxies;
  }

  parseProxy(proxyString) {
    // Format: ip:port:username:password or ip:port
    const parts = proxyString.split(':');
    
    if (parts.length >= 2) {
      return {
        id: proxyString,
        server: `http://${parts[0]}:${parts[1]}`,
        username: parts[2] || null,
        password: parts[3] || null,
        failures: 0,
        lastUsed: null
      };
    }
    return null;
  }

  async fetchFreeProxies() {
    // WARNING: Free proxies are unreliable and often compromised
    // Use only for testing
    try {
      const response = await axios.get('https://api.proxyscrape.com/v2/', {
        params: {
          request: 'get',
          protocol: 'http',
          timeout: 10000,
          country: 'all',
          ssl: 'all',
          anonymity: 'all'
        },
        timeout: 10000
      });

      return response.data
        .split('\n')
        .filter(line => line.trim())
        .map(proxy => ({
          id: proxy,
          server: `http://${proxy}`,
          username: null,
          password: null,
          failures: 0,
          lastUsed: null,
          type: 'free'
        }));
    } catch (error) {
      console.error('Failed to fetch free proxies:', error.message);
      return [];
    }
  }

  loadPremiumProxies() {
    // Add your premium proxy service credentials here
    // Examples: BrightData, Oxylabs, ProxyMesh, etc.
    return [
      {
        id: 'premium-1',
        server: 'http://premium-proxy1.com:8080',
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD,
        failures: 0,
        lastUsed: null,
        type: 'premium'
      }
      // Add more premium proxies
    ];
  }

  // Get next available proxy with rotation
  getNextProxy() {
    if (this.proxies.length === 0) {
      return null;
    }

    // Filter out failed proxies (more than 3 failures)
    const workingProxies = this.proxies.filter(proxy => proxy.failures < 3);
    
    if (workingProxies.length === 0) {
      // Reset failure counts if all proxies failed
      this.proxies.forEach(proxy => proxy.failures = 0);
      console.log('All proxies failed, resetting failure counts');
    }

    const availableProxies = workingProxies.length > 0 ? workingProxies : this.proxies;
    
    // Round-robin selection
    this.currentIndex = (this.currentIndex + 1) % availableProxies.length;
    const proxy = availableProxies[this.currentIndex];
    
    proxy.lastUsed = new Date();
    return proxy;
  }

  // Get proxy configuration for Playwright
  getProxyConfig(proxy) {
    if (!proxy) return null;

    const config = {
      server: proxy.server
    };

    if (proxy.username && proxy.password) {
      config.username = proxy.username;
      config.password = proxy.password;
    }

    return config;
  }

  // Test proxy connectivity
  async testProxy(proxy, timeout = 10000) {
    try {
      const proxyConfig = this.getProxyConfig(proxy);
      
      const response = await axios.get('http://httpbin.org/ip', {
        proxy: false, // We'll use a different method for testing
        timeout,
        httpsAgent: proxyConfig ? new (require('https-proxy-agent'))(proxy.server) : undefined
      });

      console.log(`Proxy ${proxy.id} working - IP: ${response.data.origin}`);
      return true;
    } catch (error) {
      console.error(`Proxy ${proxy.id} failed test:`, error.message);
      this.markProxyFailed(proxy);
      return false;
    }
  }

  // Mark proxy as failed
  markProxyFailed(proxy) {
    const proxyIndex = this.proxies.findIndex(p => p.id === proxy.id);
    if (proxyIndex !== -1) {
      this.proxies[proxyIndex].failures++;
      
      if (this.proxies[proxyIndex].failures >= 5) {
        this.blacklistedProxies.add(proxy.id);
        console.log(`Blacklisted proxy ${proxy.id} after 5 failures`);
      }
    }
  }

  // Get random proxy (for less predictable patterns)
  getRandomProxy() {
    const workingProxies = this.proxies.filter(proxy => proxy.failures < 3);
    if (workingProxies.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * workingProxies.length);
    const proxy = workingProxies[randomIndex];
    proxy.lastUsed = new Date();
    return proxy;
  }

  // Get proxy statistics
  getStats() {
    const total = this.proxies.length;
    const working = this.proxies.filter(p => p.failures < 3).length;
    const blacklisted = this.blacklistedProxies.size;

    return {
      total,
      working,
      failed: total - working,
      blacklisted,
      currentIndex: this.currentIndex
    };
  }

  // Reset all proxy failure counts
  resetFailures() {
    this.proxies.forEach(proxy => proxy.failures = 0);
    this.blacklistedProxies.clear();
    console.log('Reset all proxy failures');
  }
}

module.exports = ProxyManager;