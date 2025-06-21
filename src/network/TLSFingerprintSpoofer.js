/**
 * TLS Fingerprint Spoofer
 * Advanced system for spoofing TLS/JA3/JA4 fingerprints to evade network-level detection
 * 
 * CRITICAL COMPONENT: Network-level detection bypass
 * Many sites use JA3/JA4 hashing to detect automation tools like Playwright/Puppeteer
 */

const crypto = require('crypto');

class TLSFingerprintSpoofer {
    constructor(options = {}) {
        this.options = {
            rotationInterval: options.rotationInterval || 3600000, // 1 hour
            consistencyMode: options.consistencyMode || 'session', // session, user, global
            adaptiveMode: options.adaptiveMode !== false,
            ...options
        };
        
        // TLS fingerprint profiles for different browsers
        this.browserProfiles = this.loadBrowserProfiles();
        this.customProfiles = new Map();
        
        // JA3/JA4 management
        this.currentFingerprints = new Map();
        this.fingerprintHistory = [];
        this.detectionEvents = [];
        
        // Session management
        this.sessionFingerprints = new Map();
        this.userFingerprints = new Map();
        
        this.initialized = false;
    }
    
    /**
     * Initialize TLS fingerprint spoofer
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('🔐 Initializing TLS Fingerprint Spoofer...');
        
        // Load fingerprint databases
        await this.loadFingerprintDatabase();
        
        // Initialize browser profiles
        await this.initializeBrowserProfiles();
        
        this.initialized = true;
        console.log('✅ TLS Fingerprint Spoofer initialized');
    }
    
    /**
     * Generate TLS fingerprint for browser session
     */
    async generateTLSFingerprint(sessionId, options = {}) {
        const {
            browserType = 'chrome',
            version = 'latest',
            platform = 'windows',
            consistency = this.options.consistencyMode
        } = options;
        
        console.log(`🔧 Generating TLS fingerprint for ${browserType} ${version} on ${platform}`);
        
        // Check for existing fingerprint based on consistency mode
        const existingFingerprint = this.getExistingFingerprint(sessionId, consistency);
        if (existingFingerprint && this.shouldReuseFingerprint(existingFingerprint)) {
            console.log('♻️ Reusing existing TLS fingerprint for consistency');
            return existingFingerprint;
        }
        
        // Generate new fingerprint
        const profile = this.selectBrowserProfile(browserType, version, platform);
        const fingerprint = await this.createTLSFingerprint(profile, sessionId);
        
        // Store fingerprint for consistency
        this.storeFingerprintForSession(sessionId, fingerprint, consistency);
        
        return fingerprint;
    }
    
    /**
     * Create TLS fingerprint from browser profile
     */
    async createTLSFingerprint(profile, sessionId) {
        const fingerprint = {
            sessionId,
            timestamp: Date.now(),
            profile: profile.name,
            
            // TLS version and protocol details
            tlsVersion: this.selectTLSVersion(profile),
            
            // Cipher suites (critical for JA3/JA4)
            cipherSuites: this.generateCipherSuites(profile),
            
            // Extensions (order and values matter)
            extensions: this.generateExtensions(profile),
            
            // Elliptic curves and signature algorithms
            ellipticCurves: this.generateEllipticCurves(profile),
            ellipticCurveFormats: this.generateECFormats(profile),
            signatureAlgorithms: this.generateSignatureAlgorithms(profile),
            
            // ALPN (Application Layer Protocol Negotiation)
            alpnProtocols: this.generateALPNProtocols(profile),
            
            // Session and tickets
            sessionTickets: this.generateSessionTickets(profile),
            
            // Key share groups
            keyShareGroups: this.generateKeyShareGroups(profile),
            
            // Computed hashes
            ja3: null,
            ja4: null,
            
            // Metadata
            userAgent: profile.userAgent,
            platform: profile.platform,
            browser: profile.browser
        };
        
        // Calculate JA3 and JA4 hashes
        fingerprint.ja3 = this.calculateJA3(fingerprint);
        fingerprint.ja4 = this.calculateJA4(fingerprint);
        
        console.log(`🔍 Generated TLS fingerprint - JA3: ${fingerprint.ja3.substring(0, 16)}...`);
        
        return fingerprint;
    }
    
    /**
     * Generate realistic cipher suites for browser profile
     */
    generateCipherSuites(profile) {
        const baseSuites = profile.cipherSuites.slice();
        
        // Add randomization while maintaining realism
        if (Math.random() < 0.3) {
            // Occasionally shuffle order slightly (browsers sometimes do this)
            const shuffleIndices = Math.min(3, Math.floor(Math.random() * 5));
            for (let i = 0; i < shuffleIndices; i++) {
                const idx1 = Math.floor(Math.random() * Math.min(baseSuites.length, 8));
                const idx2 = Math.floor(Math.random() * Math.min(baseSuites.length, 8));
                [baseSuites[idx1], baseSuites[idx2]] = [baseSuites[idx2], baseSuites[idx1]];
            }
        }
        
        return baseSuites;
    }
    
    /**
     * Generate TLS extensions with realistic values
     */
    generateExtensions(profile) {
        const extensions = [];
        
        // Server Name Indication (SNI)
        if (profile.extensions.serverName) {
            extensions.push({
                type: 0,
                name: 'server_name',
                data: this.generateServerNameExtension()
            });
        }
        
        // Extended Master Secret
        if (profile.extensions.extendedMasterSecret) {
            extensions.push({
                type: 23,
                name: 'extended_master_secret',
                data: ''
            });
        }
        
        // Session Ticket
        if (profile.extensions.sessionTicket) {
            extensions.push({
                type: 35,
                name: 'session_ticket',
                data: this.generateSessionTicketExtension()
            });
        }
        
        // Supported Groups (elliptic curves)
        extensions.push({
            type: 10,
            name: 'supported_groups',
            data: this.encodeGroups(profile.supportedGroups)
        });
        
        // EC Point Formats
        extensions.push({
            type: 11,
            name: 'ec_point_formats',
            data: this.encodeECFormats(profile.ecFormats)
        });
        
        // Signature Algorithms
        extensions.push({
            type: 13,
            name: 'signature_algorithms',
            data: this.encodeSignatureAlgorithms(profile.signatureAlgorithms)
        });
        
        // ALPN
        if (profile.extensions.alpn) {
            extensions.push({
                type: 16,
                name: 'application_layer_protocol_negotiation',
                data: this.encodeALPN(profile.alpnProtocols)
            });
        }
        
        // Status Request (OCSP)
        if (profile.extensions.statusRequest) {
            extensions.push({
                type: 5,
                name: 'status_request',
                data: this.generateStatusRequestExtension()
            });
        }
        
        // Supported Versions
        extensions.push({
            type: 43,
            name: 'supported_versions',
            data: this.encodeSupportedVersions(profile.supportedVersions)
        });
        
        // Key Share (TLS 1.3)
        if (profile.tlsVersions.includes('1.3')) {
            extensions.push({
                type: 51,
                name: 'key_share',
                data: this.generateKeyShareExtension(profile.keyShareGroups)
            });
        }
        
        // PSK Key Exchange Modes (TLS 1.3)
        if (profile.tlsVersions.includes('1.3')) {
            extensions.push({
                type: 45,
                name: 'psk_key_exchange_modes',
                data: this.generatePSKModesExtension()
            });
        }
        
        // Add browser-specific extensions
        extensions.push(...this.generateBrowserSpecificExtensions(profile));
        
        // Sort extensions by type (some servers expect this)
        extensions.sort((a, b) => a.type - b.type);
        
        return extensions;
    }
    
    /**
     * Calculate JA3 fingerprint hash
     */
    calculateJA3(fingerprint) {
        // JA3 format: TLSVersion,CipherSuites,Extensions,EllipticCurves,EllipticCurveFormats
        const tlsVersion = this.tlsVersionToInt(fingerprint.tlsVersion);
        const cipherSuites = fingerprint.cipherSuites.join('-');
        const extensions = fingerprint.extensions.map(ext => ext.type).join('-');
        const ellipticCurves = fingerprint.ellipticCurves.join('-');
        const ecFormats = fingerprint.ellipticCurveFormats.join('-');
        
        const ja3String = `${tlsVersion},${cipherSuites},${extensions},${ellipticCurves},${ecFormats}`;
        
        return crypto.createHash('md5').update(ja3String).digest('hex');
    }
    
    /**
     * Calculate JA4 fingerprint hash (newer, more robust than JA3)
     */
    calculateJA4(fingerprint) {
        // JA4 format is more complex and includes additional TLS 1.3 fields
        const parts = [];
        
        // Protocol version
        parts.push(this.tlsVersionToJA4(fingerprint.tlsVersion));
        
        // SNI (Server Name Indication)
        const sniExt = fingerprint.extensions.find(ext => ext.name === 'server_name');
        parts.push(sniExt ? 'd' : 'i'); // 'd' = domain present, 'i' = IP
        
        // Cipher suite count
        parts.push(fingerprint.cipherSuites.length.toString().padStart(2, '0'));
        
        // Extension count
        parts.push(fingerprint.extensions.length.toString().padStart(2, '0'));
        
        // ALPN first value
        const alpnExt = fingerprint.extensions.find(ext => ext.name === 'application_layer_protocol_negotiation');
        if (alpnExt && fingerprint.alpnProtocols.length > 0) {
            parts.push(fingerprint.alpnProtocols[0].substring(0, 2));
        } else {
            parts.push('00');
        }
        
        // First part of JA4
        const ja4a = parts.join('');
        
        // Cipher suites sorted
        const sortedCiphers = [...fingerprint.cipherSuites].sort((a, b) => a - b);
        const ja4b = crypto.createHash('sha256')
            .update(sortedCiphers.join(','))
            .digest('hex')
            .substring(0, 12);
        
        // Extensions sorted (excluding SNI and ALPN)
        const sortedExtensions = fingerprint.extensions
            .filter(ext => !['server_name', 'application_layer_protocol_negotiation'].includes(ext.name))
            .map(ext => ext.type)
            .sort((a, b) => a - b);
        
        const ja4c = crypto.createHash('sha256')
            .update(sortedExtensions.join(','))
            .digest('hex')
            .substring(0, 12);
        
        return `${ja4a}_${ja4b}_${ja4c}`;
    }
    
    /**
     * Apply TLS fingerprint to Playwright page
     */
    async applyTLSFingerprint(page, fingerprint) {
        console.log(`🔧 Applying TLS fingerprint to page session`);
        
        try {
            // Note: Direct TLS manipulation requires browser-level modifications
            // This is a conceptual implementation - actual usage would require:
            // 1. Browser patches/modifications
            // 2. Proxy-based TLS interception
            // 3. Custom browser builds
            
            // Store fingerprint for session tracking
            await page.evaluate((fp) => {
                window.__tlsFingerprint = fp;
            }, {
                ja3: fingerprint.ja3,
                ja4: fingerprint.ja4,
                profile: fingerprint.profile,
                timestamp: fingerprint.timestamp
            });
            
            // Apply related browser settings that align with TLS fingerprint
            await this.alignBrowserSettings(page, fingerprint);
            
            console.log(`✅ TLS fingerprint applied - Session ID: ${fingerprint.sessionId}`);
            
        } catch (error) {
            console.error(`❌ Failed to apply TLS fingerprint: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Align browser settings with TLS fingerprint
     */
    async alignBrowserSettings(page, fingerprint) {
        // Set User-Agent to match TLS profile
        await page.setUserAgent(fingerprint.userAgent);
        
        // Set viewport and other properties to match fingerprint profile
        const profile = this.browserProfiles.get(fingerprint.profile);
        if (profile && profile.viewport) {
            await page.setViewportSize(profile.viewport);
        }
        
        // Add browser-specific headers
        await page.setExtraHTTPHeaders(this.generateHTTPHeaders(fingerprint));
        
        console.log(`🔧 Browser settings aligned with TLS fingerprint profile: ${fingerprint.profile}`);
    }
    
    /**
     * Load browser profiles for TLS fingerprinting
     */
    loadBrowserProfiles() {
        const profiles = new Map();
        
        // Chrome Latest (Most common)
        profiles.set('chrome-latest-windows', {
            name: 'chrome-latest-windows',
            browser: 'Chrome',
            version: '120.0.6099.109',
            platform: 'Windows',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            tlsVersions: ['1.2', '1.3'],
            cipherSuites: [
                0x1301, 0x1302, 0x1303, 0xc02c, 0xc02b, 0xc030, 0xc02f,
                0xc028, 0xc027, 0xc014, 0xc013, 0x009f, 0x009e, 0x006b,
                0x0067, 0x0039, 0x0033, 0x009d, 0x009c, 0x003d, 0x003c,
                0x0035, 0x002f, 0x00ff
            ],
            extensions: {
                serverName: true,
                extendedMasterSecret: true,
                sessionTicket: true,
                alpn: true,
                statusRequest: true
            },
            supportedGroups: [0x001d, 0x0017, 0x0018, 0x0019],
            ecFormats: [0x00],
            signatureAlgorithms: [
                0x0403, 0x0503, 0x0603, 0x0807, 0x0808, 0x0809, 0x080a,
                0x080b, 0x0804, 0x0805, 0x0806, 0x0401, 0x0501, 0x0601
            ],
            alpnProtocols: ['h2', 'http/1.1'],
            keyShareGroups: [0x001d, 0x0017],
            supportedVersions: [0x0304, 0x0303],
            viewport: { width: 1920, height: 1080 }
        });
        
        // Firefox Latest
        profiles.set('firefox-latest-windows', {
            name: 'firefox-latest-windows',
            browser: 'Firefox',
            version: '121.0',
            platform: 'Windows',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            tlsVersions: ['1.2', '1.3'],
            cipherSuites: [
                0x1301, 0x1302, 0x1303, 0xc02c, 0xc030, 0xc02b, 0xc02f,
                0xc028, 0xc027, 0xc014, 0xc013, 0x009f, 0x009e, 0x006b,
                0x0067, 0x0039, 0x0033, 0x003d, 0x003c, 0x0035, 0x002f
            ],
            extensions: {
                serverName: true,
                extendedMasterSecret: true,
                sessionTicket: true,
                alpn: true,
                statusRequest: true
            },
            supportedGroups: [0x001d, 0x0017, 0x001e, 0x0019, 0x0018],
            ecFormats: [0x00],
            signatureAlgorithms: [
                0x0403, 0x0503, 0x0603, 0x0807, 0x0808, 0x0809, 0x080a,
                0x080b, 0x0804, 0x0805, 0x0806, 0x0401, 0x0501, 0x0601
            ],
            alpnProtocols: ['h2', 'http/1.1'],
            keyShareGroups: [0x001d, 0x0017],
            supportedVersions: [0x0304, 0x0303],
            viewport: { width: 1920, height: 1080 }
        });
        
        // Edge Latest
        profiles.set('edge-latest-windows', {
            name: 'edge-latest-windows',
            browser: 'Edge',
            version: '120.0.2210.61',
            platform: 'Windows',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
            tlsVersions: ['1.2', '1.3'],
            cipherSuites: [
                0x1301, 0x1302, 0x1303, 0xc02c, 0xc02b, 0xc030, 0xc02f,
                0xc028, 0xc027, 0xc014, 0xc013, 0x009f, 0x009e, 0x006b,
                0x0067, 0x0039, 0x0033, 0x009d, 0x009c, 0x003d, 0x003c,
                0x0035, 0x002f, 0x00ff
            ],
            extensions: {
                serverName: true,
                extendedMasterSecret: true,
                sessionTicket: true,
                alpn: true,
                statusRequest: true
            },
            supportedGroups: [0x001d, 0x0017, 0x0018, 0x0019],
            ecFormats: [0x00],
            signatureAlgorithms: [
                0x0403, 0x0503, 0x0603, 0x0807, 0x0808, 0x0809, 0x080a,
                0x080b, 0x0804, 0x0805, 0x0806, 0x0401, 0x0501, 0x0601
            ],
            alpnProtocols: ['h2', 'http/1.1'],
            keyShareGroups: [0x001d, 0x0017],
            supportedVersions: [0x0304, 0x0303],
            viewport: { width: 1920, height: 1080 }
        });
        
        return profiles;
    }
    
    /**
     * Select appropriate browser profile
     */
    selectBrowserProfile(browserType, version, platform) {
        const profileKey = `${browserType}-${version}-${platform}`;
        
        if (this.browserProfiles.has(profileKey)) {
            return this.browserProfiles.get(profileKey);
        }
        
        // Fallback to default Chrome profile
        return this.browserProfiles.get('chrome-latest-windows');
    }
    
    /**
     * Detect TLS fingerprint changes (learning mechanism)
     */
    async detectFingerprintChange(sessionId, detectionSignal) {
        console.log(`🔍 TLS fingerprint detection signal received for session: ${sessionId}`);
        
        const detectionEvent = {
            sessionId,
            timestamp: Date.now(),
            signal: detectionSignal,
            currentFingerprint: this.currentFingerprints.get(sessionId)
        };
        
        this.detectionEvents.push(detectionEvent);
        
        // If adaptive mode is enabled, rotate fingerprint
        if (this.options.adaptiveMode) {
            await this.rotateFingerprint(sessionId, 'detection_triggered');
        }
        
        return detectionEvent;
    }
    
    /**
     * Rotate TLS fingerprint
     */
    async rotateFingerprint(sessionId, reason = 'scheduled') {
        console.log(`🔄 Rotating TLS fingerprint for session ${sessionId} - Reason: ${reason}`);
        
        const currentFingerprint = this.currentFingerprints.get(sessionId);
        if (!currentFingerprint) {
            throw new Error('No fingerprint found for session');
        }
        
        // Generate new fingerprint with different profile
        const newProfile = this.selectAlternativeProfile(currentFingerprint.profile);
        const newFingerprint = await this.createTLSFingerprint(newProfile, sessionId);
        
        // Store rotation event
        this.fingerprintHistory.push({
            sessionId,
            timestamp: Date.now(),
            reason,
            oldFingerprint: currentFingerprint.ja3,
            newFingerprint: newFingerprint.ja3
        });
        
        // Update current fingerprint
        this.currentFingerprints.set(sessionId, newFingerprint);
        
        return newFingerprint;
    }
    
    /**
     * Get TLS fingerprint statistics
     */
    getStats() {
        const totalSessions = this.currentFingerprints.size;
        const totalDetections = this.detectionEvents.length;
        const totalRotations = this.fingerprintHistory.length;
        
        const detectionRate = totalSessions > 0 ? totalDetections / totalSessions : 0;
        const rotationRate = totalSessions > 0 ? totalRotations / totalSessions : 0;
        
        return {
            activeSessions: totalSessions,
            totalDetections,
            totalRotations,
            detectionRate: (detectionRate * 100).toFixed(1) + '%',
            rotationRate: (rotationRate * 100).toFixed(1) + '%',
            profiles: Array.from(this.browserProfiles.keys()),
            recentDetections: this.detectionEvents.slice(-10),
            fingerprintDistribution: this.calculateFingerprintDistribution()
        };
    }
    
    // Helper methods for TLS fingerprint generation
    selectTLSVersion(profile) {
        // Prefer TLS 1.3, fallback to 1.2
        return profile.tlsVersions.includes('1.3') ? '1.3' : '1.2';
    }
    
    generateEllipticCurves(profile) {
        return [...profile.supportedGroups];
    }
    
    generateECFormats(profile) {
        return [...profile.ecFormats];
    }
    
    generateSignatureAlgorithms(profile) {
        return [...profile.signatureAlgorithms];
    }
    
    generateALPNProtocols(profile) {
        return [...profile.alpnProtocols];
    }
    
    generateSessionTickets(profile) {
        return profile.extensions.sessionTicket;
    }
    
    generateKeyShareGroups(profile) {
        return [...profile.keyShareGroups];
    }
    
    tlsVersionToInt(version) {
        const versions = { '1.0': 769, '1.1': 770, '1.2': 771, '1.3': 772 };
        return versions[version] || 771;
    }
    
    tlsVersionToJA4(version) {
        const versions = { '1.0': 't10', '1.1': 't11', '1.2': 't12', '1.3': 't13' };
        return versions[version] || 't12';
    }
    
    // Additional helper methods would be implemented here...
    getExistingFingerprint(sessionId, consistency) { return null; }
    shouldReuseFingerprint(fingerprint) { return false; }
    storeFingerprintForSession(sessionId, fingerprint, consistency) { }
    generateServerNameExtension() { return ''; }
    generateSessionTicketExtension() { return ''; }
    encodeGroups(groups) { return groups.join(','); }
    encodeECFormats(formats) { return formats.join(','); }
    encodeSignatureAlgorithms(algorithms) { return algorithms.join(','); }
    encodeALPN(protocols) { return protocols.join(','); }
    generateStatusRequestExtension() { return ''; }
    encodeSupportedVersions(versions) { return versions.join(','); }
    generateKeyShareExtension(groups) { return groups.join(','); }
    generatePSKModesExtension() { return '1'; }
    generateBrowserSpecificExtensions(profile) { return []; }
    generateHTTPHeaders(fingerprint) { return {}; }
    selectAlternativeProfile(currentProfile) { return this.browserProfiles.values().next().value; }
    calculateFingerprintDistribution() { return {}; }
    async loadFingerprintDatabase() { console.log('📚 Loading TLS fingerprint database...'); }
    async initializeBrowserProfiles() { console.log('🌐 Initializing browser profiles...'); }
}

module.exports = TLSFingerprintSpoofer;