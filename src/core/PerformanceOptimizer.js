/**
 * Performance Optimizer
 * Manages resources, memory, and performance across the application
 */

class PerformanceOptimizer {
    constructor(config = {}) {
        this.config = {
            memoryThreshold: config.memoryThreshold || 500 * 1024 * 1024, // 500MB
            cpuThreshold: config.cpuThreshold || 80, // 80%
            gcInterval: config.gcInterval || 60000, // 1 minute
            resourcePoolSize: config.resourcePoolSize || 10,
            cacheMaxSize: config.cacheMaxSize || 1000,
            cacheMaxAge: config.cacheMaxAge || 300000, // 5 minutes
            ...config
        };
        
        // Resource pools
        this.browserPool = new ResourcePool('browser', this.config.resourcePoolSize);
        this.pagePool = new ResourcePool('page', this.config.resourcePoolSize * 2);
        
        // Memory and performance tracking
        this.performanceMetrics = {
            startTime: Date.now(),
            memoryUsage: [],
            cpuUsage: [],
            operationCounts: new Map(),
            errorCounts: new Map(),
            gcEvents: 0
        };
        
        // Caching system
        this.cache = new Map();
        this.cacheMetadata = new Map();
        
        // Timers
        this.gcTimer = null;
        this.monitoringTimer = null;
        this.cleanupTimer = null;
        
        this.initialized = false;
    }
    
    /**
     * Initialize performance optimizer
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('⚡ Initializing Performance Optimizer...');
        
        // Start garbage collection monitoring
        this.startGarbageCollection();
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
        
        // Start cache cleanup
        this.startCacheCleanup();
        
        // Setup memory warnings
        this.setupMemoryWarnings();
        
        this.initialized = true;
        console.log('✅ Performance Optimizer initialized');
    }
    
    /**
     * Start garbage collection monitoring
     */
    startGarbageCollection() {
        if (global.gc) {
            this.gcTimer = setInterval(() => {
                const memBefore = process.memoryUsage();
                
                if (memBefore.heapUsed > this.config.memoryThreshold) {
                    console.log('🧹 Running garbage collection...');
                    global.gc();
                    this.performanceMetrics.gcEvents++;
                    
                    const memAfter = process.memoryUsage();
                    const freed = memBefore.heapUsed - memAfter.heapUsed;
                    console.log(`💾 Freed ${(freed / 1024 / 1024).toFixed(2)}MB memory`);
                }
            }, this.config.gcInterval);
        } else {
            console.log('⚠️ Garbage collection not available (run with --expose-gc)');
        }
    }
    
    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        this.monitoringTimer = setInterval(() => {
            const memory = process.memoryUsage();
            const cpu = process.cpuUsage();
            
            this.performanceMetrics.memoryUsage.push({
                timestamp: Date.now(),
                heapUsed: memory.heapUsed,
                heapTotal: memory.heapTotal,
                external: memory.external,
                rss: memory.rss
            });
            
            this.performanceMetrics.cpuUsage.push({
                timestamp: Date.now(),
                user: cpu.user,
                system: cpu.system
            });
            
            // Keep only last 100 entries
            if (this.performanceMetrics.memoryUsage.length > 100) {
                this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-50);
            }
            
            if (this.performanceMetrics.cpuUsage.length > 100) {
                this.performanceMetrics.cpuUsage = this.performanceMetrics.cpuUsage.slice(-50);
            }
            
            // Check thresholds
            this.checkPerformanceThresholds(memory, cpu);
            
        }, 10000); // Every 10 seconds
    }
    
    /**
     * Start cache cleanup
     */
    startCacheCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanupCache();
        }, 30000); // Every 30 seconds
    }
    
    /**
     * Setup memory warnings
     */
    setupMemoryWarnings() {
        process.on('warning', (warning) => {
            if (warning.name === 'MaxListenersExceededWarning') {
                console.log('⚠️ Memory leak warning: Too many event listeners');
            }
        });
    }
    
    /**
     * Check performance thresholds
     */
    checkPerformanceThresholds(memory, cpu) {
        // Memory threshold check
        if (memory.heapUsed > this.config.memoryThreshold) {
            console.log(`⚠️ Memory usage high: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
            this.triggerMemoryOptimization();
        }
        
        // CPU usage calculation and threshold check would go here
        // (Node.js CPU usage is cumulative, so this requires more complex calculation)
    }
    
    /**
     * Trigger memory optimization
     */
    async triggerMemoryOptimization() {
        console.log('🔧 Triggering memory optimization...');
        
        // Clear caches
        const cacheCleared = this.clearCache();
        
        // Close idle browser pages
        const pagesCleared = await this.pagePool.cleanup();
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        console.log(`✅ Memory optimization complete: ${cacheCleared} cache entries, ${pagesCleared} pages cleared`);
    }
    
    /**
     * Cache management
     */
    set(key, value, ttl = this.config.cacheMaxAge) {
        // Check cache size limit
        if (this.cache.size >= this.config.cacheMaxSize) {
            this.evictOldestCache();
        }
        
        this.cache.set(key, value);
        this.cacheMetadata.set(key, {
            timestamp: Date.now(),
            ttl: ttl,
            hits: 0,
            size: this.estimateSize(value)
        });
    }
    
    get(key) {
        if (!this.cache.has(key)) {
            return null;
        }
        
        const metadata = this.cacheMetadata.get(key);
        
        // Check if expired
        if (Date.now() - metadata.timestamp > metadata.ttl) {
            this.cache.delete(key);
            this.cacheMetadata.delete(key);
            return null;
        }
        
        // Update hit count
        metadata.hits++;
        
        return this.cache.get(key);
    }
    
    /**
     * Estimate object size for memory tracking
     */
    estimateSize(obj) {
        if (obj === null || obj === undefined) return 0;
        if (typeof obj === 'string') return obj.length * 2; // Rough estimate
        if (typeof obj === 'number') return 8;
        if (typeof obj === 'boolean') return 4;
        if (Array.isArray(obj)) {
            return obj.reduce((sum, item) => sum + this.estimateSize(item), 0);
        }
        if (typeof obj === 'object') {
            return Object.values(obj).reduce((sum, value) => sum + this.estimateSize(value), 0);
        }
        return 100; // Default estimate
    }
    
    /**
     * Evict oldest cache entry
     */
    evictOldestCache() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, metadata] of this.cacheMetadata) {
            if (metadata.timestamp < oldestTime) {
                oldestTime = metadata.timestamp;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.cacheMetadata.delete(oldestKey);
        }
    }
    
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, metadata] of this.cacheMetadata) {
            if (now - metadata.timestamp > metadata.ttl) {
                this.cache.delete(key);
                this.cacheMetadata.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
        }
        
        return cleaned;
    }
    
    /**
     * Clear all cache
     */
    clearCache() {
        const size = this.cache.size;
        this.cache.clear();
        this.cacheMetadata.clear();
        return size;
    }
    
    /**
     * Track operation performance
     */
    trackOperation(operationName, duration) {
        if (!this.performanceMetrics.operationCounts.has(operationName)) {
            this.performanceMetrics.operationCounts.set(operationName, {
                count: 0,
                totalDuration: 0,
                avgDuration: 0,
                minDuration: Infinity,
                maxDuration: 0
            });
        }
        
        const stats = this.performanceMetrics.operationCounts.get(operationName);
        stats.count++;
        stats.totalDuration += duration;
        stats.avgDuration = stats.totalDuration / stats.count;
        stats.minDuration = Math.min(stats.minDuration, duration);
        stats.maxDuration = Math.max(stats.maxDuration, duration);
    }
    
    /**
     * Performance measurement decorator
     */
    measurePerformance(operationName) {
        return (target, propertyName, descriptor) => {
            const method = descriptor.value;
            
            descriptor.value = async function (...args) {
                const start = process.hrtime.bigint();
                
                try {
                    const result = await method.apply(this, args);
                    return result;
                } finally {
                    const end = process.hrtime.bigint();
                    const duration = Number(end - start) / 1000000; // Convert to milliseconds
                    this.trackOperation(operationName, duration);
                }
            };
            
            return descriptor;
        };
    }
    
    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const now = Date.now();
        const uptime = now - this.performanceMetrics.startTime;
        
        // Current memory usage
        const currentMemory = process.memoryUsage();
        
        // Calculate average memory usage
        const avgMemory = this.performanceMetrics.memoryUsage.length > 0 ?
            this.performanceMetrics.memoryUsage.reduce((sum, m) => sum + m.heapUsed, 0) / this.performanceMetrics.memoryUsage.length :
            currentMemory.heapUsed;
        
        // Cache statistics
        const cacheStats = {
            size: this.cache.size,
            totalHits: Array.from(this.cacheMetadata.values()).reduce((sum, m) => sum + m.hits, 0),
            totalSize: Array.from(this.cacheMetadata.values()).reduce((sum, m) => sum + m.size, 0)
        };
        
        // Operation statistics
        const operationStats = {};
        for (const [name, stats] of this.performanceMetrics.operationCounts) {
            operationStats[name] = {
                count: stats.count,
                avgDuration: Math.round(stats.avgDuration * 100) / 100,
                minDuration: Math.round(stats.minDuration * 100) / 100,
                maxDuration: Math.round(stats.maxDuration * 100) / 100
            };
        }
        
        return {
            uptime: uptime,
            memory: {
                current: currentMemory,
                average: Math.round(avgMemory),
                threshold: this.config.memoryThreshold,
                samples: this.performanceMetrics.memoryUsage.length
            },
            cache: cacheStats,
            operations: operationStats,
            resourcePools: {
                browser: this.browserPool.getStats(),
                page: this.pagePool.getStats()
            },
            gcEvents: this.performanceMetrics.gcEvents
        };
    }
    
    /**
     * Get health status
     */
    getHealth() {
        const memory = process.memoryUsage();
        const memoryHealthy = memory.heapUsed < this.config.memoryThreshold;
        
        return {
            status: memoryHealthy ? 'healthy' : 'warning',
            message: memoryHealthy ? 'Performance within normal limits' : 'High memory usage detected',
            details: {
                memoryUsage: `${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
                memoryThreshold: `${(this.config.memoryThreshold / 1024 / 1024).toFixed(2)}MB`,
                cacheSize: this.cache.size,
                uptime: Date.now() - this.performanceMetrics.startTime
            }
        };
    }
    
    /**
     * Shutdown and cleanup
     */
    async shutdown() {
        console.log('🧹 Shutting down Performance Optimizer...');
        
        // Clear timers
        if (this.gcTimer) clearInterval(this.gcTimer);
        if (this.monitoringTimer) clearInterval(this.monitoringTimer);
        if (this.cleanupTimer) clearInterval(this.cleanupTimer);
        
        // Clear caches
        this.clearCache();
        
        // Cleanup resource pools
        await this.browserPool.cleanup();
        await this.pagePool.cleanup();
        
        // Final garbage collection
        if (global.gc) {
            global.gc();
        }
        
        console.log('✅ Performance Optimizer shutdown complete');
    }
}

/**
 * Resource Pool for managing browser instances and pages
 */
class ResourcePool {
    constructor(type, maxSize) {
        this.type = type;
        this.maxSize = maxSize;
        this.pool = [];
        this.inUse = new Set();
        this.created = 0;
        this.destroyed = 0;
    }
    
    async acquire() {
        if (this.pool.length > 0) {
            const resource = this.pool.pop();
            this.inUse.add(resource);
            return resource;
        }
        
        if (this.inUse.size < this.maxSize) {
            const resource = await this.createResource();
            this.inUse.add(resource);
            this.created++;
            return resource;
        }
        
        throw new Error(`Resource pool exhausted for ${this.type}`);
    }
    
    release(resource) {
        if (this.inUse.has(resource)) {
            this.inUse.delete(resource);
            
            if (this.pool.length < this.maxSize / 2) {
                this.pool.push(resource);
            } else {
                this.destroyResource(resource);
            }
        }
    }
    
    async createResource() {
        // This would be overridden by specific resource types
        return {};
    }
    
    async destroyResource(resource) {
        if (resource.close) {
            await resource.close();
        }
        this.destroyed++;
    }
    
    async cleanup() {
        let cleaned = 0;
        
        // Clean pool
        while (this.pool.length > 0) {
            const resource = this.pool.pop();
            await this.destroyResource(resource);
            cleaned++;
        }
        
        // Clean in-use resources (force cleanup)
        for (const resource of this.inUse) {
            await this.destroyResource(resource);
            cleaned++;
        }
        
        this.inUse.clear();
        return cleaned;
    }
    
    getStats() {
        return {
            type: this.type,
            poolSize: this.pool.length,
            inUse: this.inUse.size,
            maxSize: this.maxSize,
            created: this.created,
            destroyed: this.destroyed
        };
    }
}

module.exports = PerformanceOptimizer;