/**
 * Device Persistence Manager
 * Advanced system for maintaining persistent device identities across sessions and rotations
 * 
 * CRITICAL COMPONENT: Long-term identity consistency
 * Manages device lifecycle, rotation strategies, and persistence across different timeframes
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class DevicePersistenceManager {
    constructor(options = {}) {
        this.options = {
            persistenceMode: options.persistenceMode || 'hybrid', // memory, file, database, hybrid
            dataDirectory: options.dataDirectory || './data/devices',
            encryptionEnabled: options.encryptionEnabled !== false,
            encryptionKey: options.encryptionKey || process.env.DEVICE_ENCRYPTION_KEY,
            rotationStrategy: options.rotationStrategy || 'time_based', // time_based, usage_based, detection_based, adaptive
            maxDeviceAge: options.maxDeviceAge || 2592000000, // 30 days
            maxDeviceUsage: options.maxDeviceUsage || 1000, // max sessions per device
            rotationCooldown: options.rotationCooldown || 3600000, // 1 hour between rotations
            ...options
        };
        
        // Device management
        this.devicePool = new Map(); // deviceId -> device data
        this.activeDevices = new Map(); // sessionId -> deviceId
        this.deviceHistory = new Map(); // deviceId -> usage history
        this.retiredDevices = new Set(); // devices marked for retirement
        
        // Rotation management
        this.rotationQueue = new Map(); // scheduled rotations
        this.rotationHistory = [];
        this.emergencyRotations = [];
        
        // Persistence management
        this.pendingWrites = new Set();
        this.loadedDevices = new Set();
        this.deviceLocks = new Map(); // prevent concurrent modifications
        
        // Detection and learning
        this.detectionEvents = [];
        this.deviceFingerprints = new Map(); // device -> unique characteristics
        this.suspiciousPatterns = new Map();
        
        this.initialized = false;
    }
    
    /**
     * Initialize device persistence manager
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('💾 Initializing Device Persistence Manager...');
        
        // Ensure data directory exists
        await this.ensureDataDirectory();
        
        // Load existing device pool
        await this.loadDevicePool();
        
        // Initialize rotation strategies
        await this.initializeRotationStrategies();
        
        // Start background tasks
        this.startMaintenanceTasks();
        
        this.initialized = true;
        console.log('✅ Device Persistence Manager initialized');
    }
    
    /**
     * Get or create persistent device for session
     */
    async getDeviceForSession(sessionId, options = {}) {
        const {
            forceNew = false,
            preferredRegion = null,
            deviceType = 'desktop',
            inheritFrom = null,
            rotationReason = null
        } = options;
        
        console.log(`🎭 Getting device for session ${sessionId}${forceNew ? ' (force new)' : ''}`);
        
        // Check for existing assignment
        if (!forceNew && this.activeDevices.has(sessionId)) {
            const existingDeviceId = this.activeDevices.get(sessionId);
            const device = this.devicePool.get(existingDeviceId);
            
            if (device && this.isDeviceUsable(device)) {
                console.log(`♻️ Reusing existing device ${existingDeviceId} for session ${sessionId}`);
                return await this.updateDeviceUsage(existingDeviceId, sessionId);
            }
        }
        
        // Select or create new device
        const device = await this.selectOptimalDevice(sessionId, options);
        
        if (!device) {
            throw new Error('No suitable device available');
        }
        
        // Assign device to session
        this.activeDevices.set(sessionId, device.deviceId);
        
        // Update device usage
        await this.updateDeviceUsage(device.deviceId, sessionId);
        
        // Schedule persistence
        this.schedulePersistence(device.deviceId);
        
        console.log(`✅ Assigned device ${device.deviceId} to session ${sessionId}`);
        
        return device;
    }
    
    /**
     * Select optimal device from pool or create new one
     */
    async selectOptimalDevice(sessionId, options) {
        const { preferredRegion, deviceType, inheritFrom } = options;
        
        // Find candidate devices
        let candidates = Array.from(this.devicePool.values()).filter(device => 
            this.isDeviceUsable(device) && 
            device.profile.type === deviceType
        );
        
        // Filter by region if specified
        if (preferredRegion) {
            const regionCandidates = candidates.filter(d => d.location.region === preferredRegion);
            if (regionCandidates.length > 0) {
                candidates = regionCandidates;
            }
        }
        
        // Score and rank candidates
        const scoredCandidates = candidates.map(device => ({
            device,
            score: this.calculateDeviceScore(device, sessionId, options)
        }));
        
        // Sort by score
        scoredCandidates.sort((a, b) => b.score - a.score);
        
        // Select from top candidates with some randomization
        const topCandidates = scoredCandidates.slice(0, Math.min(5, scoredCandidates.length));
        
        if (topCandidates.length > 0) {
            const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
            return selected.device;
        }
        
        // No suitable device found, create new one
        return await this.createNewDevice(deviceType, preferredRegion);
    }
    
    /**
     * Calculate device selection score
     */
    calculateDeviceScore(device, sessionId, options) {
        let score = 0;
        
        // Age score (newer devices preferred, but not too new)
        const age = Date.now() - device.createdAt;
        const optimalAge = 86400000 * 7; // 1 week
        const ageDiff = Math.abs(age - optimalAge);
        score += Math.max(0, 50 - (ageDiff / optimalAge) * 50);
        
        // Usage frequency score (avoid overused devices)
        const usageFrequency = device.usage.sessionCount / Math.max(1, age / 86400000); // sessions per day
        score += Math.max(0, 30 - usageFrequency * 5);
        
        // Success rate score
        score += (device.metrics.successRate || 0.5) * 40;
        
        // Detection history penalty
        const recentDetections = this.getRecentDetections(device.deviceId);
        score -= recentDetections * 10;
        
        // Region match bonus
        if (options.preferredRegion && device.location.region === options.preferredRegion) {
            score += 20;
        }
        
        // Cooldown penalty
        const lastUsed = device.usage.lastSession;
        if (lastUsed && (Date.now() - lastUsed) < this.options.rotationCooldown) {
            score -= 15;
        }
        
        // Health score
        score += device.health.score * 25;
        
        return Math.max(0, score);
    }
    
    /**
     * Create new persistent device
     */
    async createNewDevice(deviceType, preferredRegion) {
        const deviceId = this.generateDeviceId();
        
        console.log(`🔧 Creating new persistent device: ${deviceId} (${deviceType})`);
        
        const device = {
            deviceId,
            createdAt: Date.now(),
            lastUsed: null,
            
            // Device profile
            profile: await this.generateDeviceProfile(deviceType, preferredRegion),
            
            // Location and network
            location: await this.generateDeviceLocation(preferredRegion),
            network: await this.generateNetworkProfile(),
            
            // Browser and fingerprint
            browser: await this.generateBrowserProfile(deviceType),
            fingerprint: await this.generateDeviceFingerprint(deviceId, deviceType),
            
            // Persistence data
            persistentData: {
                cookies: new Map(),
                localStorage: new Map(),
                sessionStorage: new Map(),
                indexedDB: new Map(),
                webSQL: new Map(),
                fileSystem: new Map()
            },
            
            // Usage tracking
            usage: {
                sessionCount: 0,
                totalTime: 0,
                lastSession: null,
                dailyUsage: {},
                weeklyUsage: {},
                monthlyUsage: {}
            },
            
            // Health and metrics
            health: {
                score: 1.0,
                lastCheck: Date.now(),
                issues: [],
                uptime: 1.0
            },
            
            metrics: {
                successRate: null,
                detectionRate: 0,
                performanceScore: 1.0,
                reliabilityScore: 1.0
            },
            
            // Rotation information
            rotation: {
                strategy: this.options.rotationStrategy,
                scheduledAt: null,
                reason: null,
                generation: 1
            },
            
            // Security and detection
            security: {
                compromised: false,
                suspiciousActivity: false,
                detectionEvents: [],
                lastDetection: null
            }
        };
        
        // Store device fingerprint for tracking
        this.deviceFingerprints.set(deviceId, this.extractDeviceFingerprint(device));
        
        // Add to device pool
        this.devicePool.set(deviceId, device);
        
        // Initialize device history
        this.deviceHistory.set(deviceId, {
            events: [],
            sessions: [],
            rotations: [],
            detections: []
        });
        
        // Schedule persistence
        this.schedulePersistence(deviceId);
        
        console.log(`✅ Created device ${deviceId} with profile: ${device.profile.brand} ${device.profile.model}`);
        
        return device;
    }
    
    /**
     * Rotate device for session
     */
    async rotateDevice(sessionId, reason = 'scheduled') {
        console.log(`🔄 Rotating device for session ${sessionId} - Reason: ${reason}`);
        
        const currentDeviceId = this.activeDevices.get(sessionId);
        if (!currentDeviceId) {
            throw new Error('No active device found for session');
        }
        
        const currentDevice = this.devicePool.get(currentDeviceId);
        
        // Get new device
        const newDevice = await this.selectOptimalDevice(sessionId, {
            forceNew: reason === 'detection' || reason === 'security_breach',
            preferredRegion: currentDevice?.location?.region,
            deviceType: currentDevice?.profile?.type || 'desktop',
            rotationReason: reason
        });
        
        if (!newDevice) {
            console.warn(`⚠️ No suitable replacement device found for session ${sessionId}`);
            return currentDevice;
        }
        
        // Update assignments
        this.activeDevices.set(sessionId, newDevice.deviceId);
        
        // Log rotation event
        this.logRotationEvent(sessionId, currentDeviceId, newDevice.deviceId, reason);
        
        // Handle current device based on rotation reason
        await this.handleDeviceAfterRotation(currentDevice, reason);
        
        console.log(`✅ Device rotated for session ${sessionId}: ${currentDeviceId} -> ${newDevice.deviceId}`);
        
        return newDevice;
    }
    
    /**
     * Handle device state after rotation
     */
    async handleDeviceAfterRotation(device, reason) {
        switch (reason) {
            case 'detection':
            case 'security_breach':
                // Mark device as compromised
                device.security.compromised = true;
                device.security.lastDetection = Date.now();
                this.retiredDevices.add(device.deviceId);
                console.log(`🚨 Device ${device.deviceId} marked as compromised and retired`);
                break;
                
            case 'age_limit':
            case 'usage_limit':
                // Retire device gracefully
                this.retiredDevices.add(device.deviceId);
                console.log(`🎯 Device ${device.deviceId} retired due to ${reason}`);
                break;
                
            case 'scheduled':
            case 'optimization':
                // Device remains available for future use
                device.rotation.lastRotation = Date.now();
                console.log(`♻️ Device ${device.deviceId} available for reuse`);
                break;
        }
        
        this.schedulePersistence(device.deviceId);
    }
    
    /**
     * Update device usage statistics
     */
    async updateDeviceUsage(deviceId, sessionId) {
        const device = this.devicePool.get(deviceId);
        if (!device) {
            throw new Error(`Device ${deviceId} not found`);
        }
        
        const now = Date.now();
        const today = new Date().toISOString().split('T')[0];
        
        // Update usage counters
        device.usage.sessionCount++;
        device.usage.lastSession = now;
        device.lastUsed = now;
        
        // Update daily usage
        if (!device.usage.dailyUsage[today]) {
            device.usage.dailyUsage[today] = 0;
        }
        device.usage.dailyUsage[today]++;
        
        // Log usage event
        const history = this.deviceHistory.get(deviceId);
        if (history) {
            history.sessions.push({
                sessionId,
                timestamp: now,
                duration: null // Will be updated when session ends
            });
        }
        
        // Check for rotation triggers
        await this.checkRotationTriggers(device);
        
        return device;
    }
    
    /**
     * Check if device needs rotation
     */
    async checkRotationTriggers(device) {
        // Age-based rotation
        if (Date.now() - device.createdAt > this.options.maxDeviceAge) {
            await this.scheduleRotation(device.deviceId, 'age_limit');
            return;
        }
        
        // Usage-based rotation
        if (device.usage.sessionCount >= this.options.maxDeviceUsage) {
            await this.scheduleRotation(device.deviceId, 'usage_limit');
            return;
        }
        
        // Detection-based rotation
        const recentDetections = this.getRecentDetections(device.deviceId);
        if (recentDetections >= 3) {
            await this.scheduleRotation(device.deviceId, 'detection_pattern');
            return;
        }
        
        // Health-based rotation
        if (device.health.score < 0.3) {
            await this.scheduleRotation(device.deviceId, 'health_degraded');
            return;
        }
        
        // Adaptive rotation based on success patterns
        if (this.shouldRotateAdaptively(device)) {
            await this.scheduleRotation(device.deviceId, 'adaptive_optimization');
        }
    }
    
    /**
     * Persist device data to storage
     */
    async persistDevice(deviceId) {
        const device = this.devicePool.get(deviceId);
        if (!device) {
            throw new Error(`Device ${deviceId} not found`);
        }
        
        try {
            // Acquire device lock
            if (this.deviceLocks.has(deviceId)) {
                console.log(`⏳ Device ${deviceId} is locked, skipping persistence`);
                return;
            }
            
            this.deviceLocks.set(deviceId, Date.now());
            
            const deviceData = {
                ...device,
                persistentData: {
                    cookies: Array.from(device.persistentData.cookies.entries()),
                    localStorage: Array.from(device.persistentData.localStorage.entries()),
                    sessionStorage: Array.from(device.persistentData.sessionStorage.entries()),
                    indexedDB: Array.from(device.persistentData.indexedDB.entries()),
                    webSQL: Array.from(device.persistentData.webSQL.entries()),
                    fileSystem: Array.from(device.persistentData.fileSystem.entries())
                }
            };
            
            // Encrypt if enabled
            let serializedData = JSON.stringify(deviceData, null, 2);
            if (this.options.encryptionEnabled) {
                serializedData = this.encryptData(serializedData);
            }
            
            // Write to file
            const deviceFile = path.join(this.options.dataDirectory, `${deviceId}.json`);
            await fs.writeFile(deviceFile, serializedData);
            
            console.log(`💾 Device ${deviceId} persisted successfully`);
            
        } catch (error) {
            console.error(`❌ Failed to persist device ${deviceId}: ${error.message}`);
            throw error;
        } finally {
            // Release device lock
            this.deviceLocks.delete(deviceId);
        }
    }
    
    /**
     * Load device from storage
     */
    async loadDevice(deviceId) {
        try {
            const deviceFile = path.join(this.options.dataDirectory, `${deviceId}.json`);
            
            // Check if file exists
            try {
                await fs.access(deviceFile);
            } catch {
                return null; // Device file doesn't exist
            }
            
            let deviceData = await fs.readFile(deviceFile, 'utf8');
            
            // Decrypt if encrypted
            if (this.options.encryptionEnabled) {
                deviceData = this.decryptData(deviceData);
            }
            
            const device = JSON.parse(deviceData);
            
            // Restore Map objects
            device.persistentData = {
                cookies: new Map(device.persistentData.cookies),
                localStorage: new Map(device.persistentData.localStorage),
                sessionStorage: new Map(device.persistentData.sessionStorage),
                indexedDB: new Map(device.persistentData.indexedDB),
                webSQL: new Map(device.persistentData.webSQL),
                fileSystem: new Map(device.persistentData.fileSystem)
            };
            
            console.log(`📂 Device ${deviceId} loaded from storage`);
            
            return device;
            
        } catch (error) {
            console.error(`❌ Failed to load device ${deviceId}: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Get device persistence statistics
     */
    getStats() {
        const totalDevices = this.devicePool.size;
        const activeDevices = this.activeDevices.size;
        const retiredDevices = this.retiredDevices.size;
        const rotationEvents = this.rotationHistory.length;
        const detectionEvents = this.detectionEvents.length;
        
        // Calculate device health distribution
        const healthDistribution = {
            excellent: 0, // 0.9-1.0
            good: 0,      // 0.7-0.9
            fair: 0,      // 0.5-0.7
            poor: 0       // 0.0-0.5
        };
        
        for (const device of this.devicePool.values()) {
            const score = device.health.score;
            if (score >= 0.9) healthDistribution.excellent++;
            else if (score >= 0.7) healthDistribution.good++;
            else if (score >= 0.5) healthDistribution.fair++;
            else healthDistribution.poor++;
        }
        
        // Calculate average device age
        const now = Date.now();
        let totalAge = 0;
        for (const device of this.devicePool.values()) {
            totalAge += now - device.createdAt;
        }
        const avgDeviceAge = totalDevices > 0 ? totalAge / totalDevices : 0;
        
        return {
            totalDevices,
            activeDevices,
            retiredDevices,
            rotationEvents,
            detectionEvents,
            avgDeviceAge: Math.floor(avgDeviceAge / 86400000) + ' days',
            healthDistribution,
            rotationStrategy: this.options.rotationStrategy,
            persistenceMode: this.options.persistenceMode,
            encryptionEnabled: this.options.encryptionEnabled,
            recentRotations: this.rotationHistory.slice(-10),
            deviceTypes: this.getDeviceTypeDistribution()
        };
    }
    
    // Helper methods
    
    generateDeviceId() {
        return `dev_${crypto.randomBytes(16).toString('hex')}`;
    }
    
    isDeviceUsable(device) {
        return !this.retiredDevices.has(device.deviceId) && 
               !device.security.compromised && 
               device.health.score > 0.2;
    }
    
    getRecentDetections(deviceId) {
        const recentTime = Date.now() - 3600000; // Last hour
        return this.detectionEvents.filter(event => 
            event.deviceId === deviceId && event.timestamp > recentTime
        ).length;
    }
    
    shouldRotateAdaptively(device) {
        // Implement adaptive rotation logic based on patterns
        return false; // Placeholder
    }
    
    async scheduleRotation(deviceId, reason) {
        this.rotationQueue.set(deviceId, {
            deviceId,
            reason,
            scheduledAt: Date.now(),
            priority: this.getRotationPriority(reason)
        });
        
        console.log(`📅 Scheduled rotation for device ${deviceId} - Reason: ${reason}`);
    }
    
    getRotationPriority(reason) {
        const priorities = {
            'detection_pattern': 1,
            'security_breach': 1,
            'health_degraded': 2,
            'usage_limit': 3,
            'age_limit': 4,
            'adaptive_optimization': 5
        };
        return priorities[reason] || 5;
    }
    
    logRotationEvent(sessionId, oldDeviceId, newDeviceId, reason) {
        this.rotationHistory.push({
            sessionId,
            timestamp: Date.now(),
            reason,
            oldDeviceId,
            newDeviceId
        });
    }
    
    extractDeviceFingerprint(device) {
        return {
            browser: device.browser.name,
            version: device.browser.version,
            platform: device.profile.platform,
            screen: device.browser.screen,
            timezone: device.location.timezone
        };
    }
    
    encryptData(data) {
        if (!this.options.encryptionKey) return data;
        
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, this.options.encryptionKey);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return JSON.stringify({
            encrypted,
            iv: iv.toString('hex'),
            algorithm
        });
    }
    
    decryptData(encryptedData) {
        if (!this.options.encryptionKey) return encryptedData;
        
        try {
            const { encrypted, iv, algorithm } = JSON.parse(encryptedData);
            const decipher = crypto.createDecipher(algorithm, this.options.encryptionKey);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch {
            // Fallback to unencrypted data
            return encryptedData;
        }
    }
    
    getDeviceTypeDistribution() {
        const distribution = {};
        for (const device of this.devicePool.values()) {
            const type = device.profile.type;
            distribution[type] = (distribution[type] || 0) + 1;
        }
        return distribution;
    }
    
    // Placeholder implementations for complex methods
    async generateDeviceProfile(deviceType, preferredRegion) { return { type: deviceType, brand: 'Generic', model: 'Device' }; }
    async generateDeviceLocation(preferredRegion) { return { region: preferredRegion || 'US', country: 'United States' }; }
    async generateNetworkProfile() { return { type: 'wifi', carrier: null }; }
    async generateBrowserProfile(deviceType) { return { name: 'Chrome', version: '120.0.0.0' }; }
    async generateDeviceFingerprint(deviceId, deviceType) { return { id: deviceId, type: deviceType }; }
    
    async ensureDataDirectory() {
        try {
            await fs.mkdir(this.options.dataDirectory, { recursive: true });
        } catch (error) {
            console.warn(`Warning: Could not create data directory: ${error.message}`);
        }
    }
    
    async loadDevicePool() {
        console.log('📚 Loading existing device pool...');
        // Implementation for loading devices from storage
    }
    
    async initializeRotationStrategies() {
        console.log('🔄 Initializing rotation strategies...');
        // Implementation for rotation strategy setup
    }
    
    startMaintenanceTasks() {
        // Periodic device maintenance
        setInterval(() => {
            this.performDeviceMaintenance().catch(console.error);
        }, 300000); // Every 5 minutes
        
        // Persistence task
        setInterval(() => {
            this.processPersistenceQueue().catch(console.error);
        }, 60000); // Every minute
    }
    
    schedulePersistence(deviceId) {
        this.pendingWrites.add(deviceId);
    }
    
    async performDeviceMaintenance() {
        console.log('🔧 Performing device maintenance...');
        // Implementation for device health checks and cleanup
    }
    
    async processPersistenceQueue() {
        if (this.pendingWrites.size === 0) return;
        
        console.log(`💾 Processing persistence queue: ${this.pendingWrites.size} devices`);
        
        for (const deviceId of this.pendingWrites) {
            try {
                await this.persistDevice(deviceId);
            } catch (error) {
                console.error(`Failed to persist device ${deviceId}: ${error.message}`);
            }
        }
        
        this.pendingWrites.clear();
    }
}

module.exports = DevicePersistenceManager;