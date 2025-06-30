/**
 * Test Server Management
 * 
 * Utilities for starting/stopping the API server during tests
 */

const path = require('path');
const { spawn } = require('child_process');
const APIClient = require('./api-client');

class TestServer {
    constructor(options = {}) {
        this.port = options.port || 3001; // Use different port for testing
        this.host = options.host || 'localhost';
        this.apiServerPath = options.apiServerPath || path.join(__dirname, '../../api-server.js');
        this.process = null;
        this.client = new APIClient(`http://${this.host}:${this.port}`);
        this.startupTimeout = options.startupTimeout || 30000;
    }
    
    async start() {
        if (this.process) {
            throw new Error('Server is already running');
        }
        
        console.log(`🚀 Starting test API server on ${this.host}:${this.port}...`);
        
        return new Promise((resolve, reject) => {
            // Set environment variables for test server
            const env = {
                ...process.env,
                PORT: this.port,
                HOST: this.host,
                NODE_ENV: 'test',
                DATABASE_PATH: global.testConfig?.testDatabase || './test-poll-automation.db'
            };
            
            // Spawn the API server process
            this.process = spawn('node', [this.apiServerPath], {
                env,
                stdio: ['pipe', 'pipe', 'pipe'],
                detached: false
            });
            
            let startupOutput = '';
            let errorOutput = '';
            let serverReady = false;
            
            // Handle server output
            this.process.stdout.on('data', (data) => {
                const output = data.toString();
                startupOutput += output;
                
                // Look for server ready indicators
                if (output.includes('Ready to accept requests') || 
                    output.includes(`Server running at`)) {
                    serverReady = true;
                }
                
                // Log server output in verbose mode
                if (process.env.VERBOSE_TESTS) {
                    console.log(`[SERVER] ${output.trim()}`);
                }
            });
            
            this.process.stderr.on('data', (data) => {
                const output = data.toString();
                errorOutput += output;
                
                if (process.env.VERBOSE_TESTS) {
                    console.error(`[SERVER ERROR] ${output.trim()}`);
                }
            });
            
            // Handle process exit
            this.process.on('exit', (code, signal) => {
                console.log(`📥 Server process exited with code ${code}, signal ${signal}`);
                this.process = null;
                
                if (!serverReady && code !== 0) {
                    reject(new Error(`Server failed to start. Exit code: ${code}\nOutput: ${startupOutput}\nError: ${errorOutput}`));
                }
            });
            
            // Handle process errors
            this.process.on('error', (error) => {
                console.error('❌ Server process error:', error);
                reject(error);
            });
            
            // Wait for server to be ready or timeout
            const startTime = Date.now();
            const checkReady = async () => {
                if (serverReady) {
                    try {
                        // Double-check by making a health request
                        await this.client.waitForServer(10, 500);
                        console.log('✅ Test API server is ready');
                        resolve();
                    } catch (error) {
                        reject(new Error(`Server started but health check failed: ${error.message}`));
                    }
                    return;
                }
                
                if (Date.now() - startTime > this.startupTimeout) {
                    this.stop();
                    reject(new Error(`Server startup timeout after ${this.startupTimeout}ms\nOutput: ${startupOutput}\nError: ${errorOutput}`));
                    return;
                }
                
                setTimeout(checkReady, 500);
            };
            
            checkReady();
        });
    }
    
    async stop() {
        if (!this.process) {
            return;
        }
        
        console.log('🛑 Stopping test API server...');
        
        return new Promise((resolve) => {
            const cleanup = () => {
                this.process = null;
                console.log('✅ Test API server stopped');
                resolve();
            };
            
            // Set a timeout for forceful termination
            const forceTimeout = setTimeout(() => {
                if (this.process) {
                    console.log('⚡ Force killing server process...');
                    this.process.kill('SIGKILL');
                    cleanup();
                }
            }, 5000);
            
            // Handle graceful shutdown
            this.process.once('exit', () => {
                clearTimeout(forceTimeout);
                cleanup();
            });
            
            // Send termination signal
            this.process.kill('SIGTERM');
        });
    }
    
    async restart() {
        await this.stop();
        await this.start();
    }
    
    isRunning() {
        return this.process !== null && !this.process.killed;
    }
    
    getClient() {
        return this.client;
    }
    
    async getServerLogs() {
        // This would require storing the logs during startup
        // For now, return a placeholder
        return {
            stdout: 'Server logs would be captured here',
            stderr: 'Server error logs would be captured here'
        };
    }
    
    async getServerStats() {
        if (!this.isRunning()) {
            throw new Error('Server is not running');
        }
        
        try {
            const response = await this.client.getSystemStatus();
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get server stats: ${error.message}`);
        }
    }
}

// Singleton instance for use in tests
let testServerInstance = null;

const getTestServer = (options = {}) => {
    if (!testServerInstance) {
        testServerInstance = new TestServer(options);
    }
    return testServerInstance;
};

const startTestServer = async (options = {}) => {
    const server = getTestServer(options);
    await server.start();
    return server;
};

const stopTestServer = async () => {
    if (testServerInstance) {
        await testServerInstance.stop();
        testServerInstance = null;
    }
};

module.exports = {
    TestServer,
    getTestServer,
    startTestServer,
    stopTestServer
};