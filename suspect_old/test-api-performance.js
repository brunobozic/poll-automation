#!/usr/bin/env node

/**
 * WORKFLOW AUTOMATION API PERFORMANCE TESTS
 * 
 * Tests performance, concurrency, and stress limits of the API
 */

const axios = require('axios');
const chalk = require('chalk');

const API_BASE = 'http://localhost:3000';

class PerformanceTester {
    constructor() {
        this.results = {
            responseTimes: [],
            concurrencyResults: [],
            stressTestResults: []
        };
    }

    async measureResponseTime(name, requestFn) {
        console.log(chalk.blue(`\n⏱️ Measuring: ${name}`));
        
        const times = [];
        const iterations = 3;
        
        for (let i = 0; i < iterations; i++) {
            try {
                const startTime = Date.now();
                await requestFn();
                const duration = Date.now() - startTime;
                times.push(duration);
                console.log(`   Iteration ${i + 1}: ${duration}ms`);
            } catch (error) {
                console.log(`   Iteration ${i + 1}: ERROR - ${error.message}`);
                times.push(null);
            }
        }
        
        const validTimes = times.filter(t => t !== null);
        if (validTimes.length > 0) {
            const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
            const min = Math.min(...validTimes);
            const max = Math.max(...validTimes);
            
            console.log(chalk.green(`   ✅ Average: ${avg.toFixed(1)}ms, Min: ${min}ms, Max: ${max}ms`));
            
            this.results.responseTimes.push({
                name,
                average: avg,
                min,
                max,
                iterations: validTimes.length
            });
        } else {
            console.log(chalk.red(`   ❌ All iterations failed`));
        }
    }

    async testConcurrency(name, requestFn, concurrentCount = 3) {
        console.log(chalk.blue(`\n🔄 Concurrency Test: ${name} (${concurrentCount} concurrent)`));
        
        const startTime = Date.now();
        const promises = Array(concurrentCount).fill().map((_, i) => 
            requestFn().catch(error => ({ error: error.message, index: i }))
        );
        
        const results = await Promise.allSettled(promises);
        const duration = Date.now() - startTime;
        
        const successful = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
        const failed = results.filter(r => r.status === 'rejected' || r.value?.error).length;
        
        console.log(`   📊 Results: ${successful} successful, ${failed} failed`);
        console.log(`   ⏱️ Total time: ${duration}ms`);
        console.log(`   📈 Throughput: ${(concurrentCount / duration * 1000).toFixed(2)} requests/second`);
        
        this.results.concurrencyResults.push({
            name,
            concurrentCount,
            successful,
            failed,
            duration,
            throughput: concurrentCount / duration * 1000
        });
        
        return { successful, failed, duration };
    }

    async stressTest(name, requestFn, maxRequests = 10) {
        console.log(chalk.blue(`\n💪 Stress Test: ${name} (up to ${maxRequests} requests)`));
        
        let successfulRequests = 0;
        let failedRequests = 0;
        const startTime = Date.now();
        
        for (let i = 1; i <= maxRequests; i++) {
            try {
                const reqStart = Date.now();
                await requestFn();
                const reqDuration = Date.now() - reqStart;
                successfulRequests++;
                console.log(`   Request ${i}: SUCCESS (${reqDuration}ms)`);
            } catch (error) {
                failedRequests++;
                console.log(`   Request ${i}: FAILED (${error.message})`);
            }
            
            // Small delay to avoid overwhelming
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const totalDuration = Date.now() - startTime;
        console.log(`   📊 Final: ${successfulRequests} successful, ${failedRequests} failed`);
        console.log(`   ⏱️ Total time: ${totalDuration}ms`);
        
        this.results.stressTestResults.push({
            name,
            maxRequests,
            successful: successfulRequests,
            failed: failedRequests,
            duration: totalDuration
        });
    }

    async runPerformanceTests() {
        console.log(chalk.cyan.bold('\n🚀 WORKFLOW API PERFORMANCE TESTS'));
        console.log('===================================');

        // 1. Response Time Tests
        console.log(chalk.yellow('\n📈 RESPONSE TIME TESTS'));
        console.log('======================');

        await this.measureResponseTime('Health Check', async () => {
            const response = await axios.get(`${API_BASE}/health`, { timeout: 10000 });
            if (response.status !== 200) throw new Error('Health check failed');
        });

        await this.measureResponseTime('Create Single Email', async () => {
            const response = await axios.post(`${API_BASE}/api/workflow/create-emails`, {
                count: 1,
                providers: ['auto']
            }, { timeout: 30000 });
            if (response.status !== 200) throw new Error('Email creation failed');
        });

        await this.measureResponseTime('Create Personas', async () => {
            const response = await axios.post(`${API_BASE}/api/workflow/create-personas`, {
                emails: ['test@example.com'],
                personaTypes: ['auto']
            }, { timeout: 30000 });
            if (response.status !== 200) throw new Error('Persona creation failed');
        });

        // 2. Concurrency Tests
        console.log(chalk.yellow('\n🔄 CONCURRENCY TESTS'));
        console.log('====================');

        await this.testConcurrency('Concurrent Health Checks', async () => {
            const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
            if (response.status !== 200) throw new Error('Health check failed');
        }, 5);

        await this.testConcurrency('Concurrent Email Creation', async () => {
            const response = await axios.post(`${API_BASE}/api/workflow/create-emails`, {
                count: 1,
                providers: ['auto']
            }, { timeout: 30000 });
            if (response.status !== 200) throw new Error('Email creation failed');
        }, 3);

        await this.testConcurrency('Concurrent Persona Creation', async () => {
            const response = await axios.post(`${API_BASE}/api/workflow/create-personas`, {
                emails: ['test@example.com'],
                personaTypes: ['auto']
            }, { timeout: 30000 });
            if (response.status !== 200) throw new Error('Persona creation failed');
        }, 2);

        // 3. Stress Tests
        console.log(chalk.yellow('\n💪 STRESS TESTS'));
        console.log('================');

        await this.stressTest('Health Check Stress', async () => {
            const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
            if (response.status !== 200) throw new Error('Health check failed');
        }, 15);

        await this.stressTest('Email Creation Stress', async () => {
            const response = await axios.post(`${API_BASE}/api/workflow/create-emails`, {
                count: 1,
                providers: ['auto']
            }, { timeout: 30000 });
            if (response.status !== 200) throw new Error('Email creation failed');
        }, 5);

        // 4. Resource Limit Tests
        console.log(chalk.yellow('\n🎯 RESOURCE LIMIT TESTS'));
        console.log('=======================');

        await this.testResourceLimits();

        // 5. Generate Report
        this.generatePerformanceReport();
    }

    async testResourceLimits() {
        console.log(chalk.blue('\n📊 Testing Resource Limits'));

        // Test large email count
        try {
            console.log('   Testing large email count (100)...');
            const response = await axios.post(`${API_BASE}/api/workflow/create-emails`, {
                count: 100
            }, { timeout: 60000 });
            
            if (response.status === 400) {
                console.log('   ✅ Correctly rejected large count');
            } else if (response.status === 200) {
                console.log(`   ⚠️ Accepted large count (created: ${response.data.results?.created || 0})`);
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('   ✅ Correctly rejected large count');
            } else if (error.code === 'ECONNABORTED') {
                console.log('   ⏱️ Request timed out (expected for large count)');
            } else {
                console.log(`   ❌ Unexpected error: ${error.message}`);
            }
        }

        // Test request payload size
        try {
            console.log('   Testing large payload size...');
            const largeEmailList = Array(1000).fill().map((_, i) => `test${i}@example.com`);
            const response = await axios.post(`${API_BASE}/api/workflow/create-personas`, {
                emails: largeEmailList,
                personaTypes: ['auto']
            }, { timeout: 30000 });
            
            if (response.status === 400) {
                console.log('   ✅ Correctly rejected large payload');
            } else if (response.status === 200) {
                console.log('   ⚠️ Accepted large payload');
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('   ✅ Correctly rejected large payload');
            } else if (error.response && error.response.status === 413) {
                console.log('   ✅ Correctly rejected payload too large');
            } else {
                console.log(`   ⚠️ Payload test error: ${error.message}`);
            }
        }
    }

    generatePerformanceReport() {
        console.log(chalk.cyan.bold('\n📊 PERFORMANCE REPORT'));
        console.log('======================');

        // Response Time Report
        if (this.results.responseTimes.length > 0) {
            console.log(chalk.yellow('\n⏱️ Response Times:'));
            this.results.responseTimes.forEach(result => {
                console.log(`   ${result.name}:`);
                console.log(`     Average: ${result.average.toFixed(1)}ms`);
                console.log(`     Range: ${result.min}ms - ${result.max}ms`);
                
                // Performance assessment
                let assessment = 'Unknown';
                if (result.name.includes('Health')) {
                    assessment = result.average < 500 ? 'Excellent' : 
                               result.average < 1000 ? 'Good' : 'Slow';
                } else if (result.name.includes('Email')) {
                    assessment = result.average < 5000 ? 'Excellent' : 
                               result.average < 15000 ? 'Good' : 'Slow';
                } else {
                    assessment = result.average < 10000 ? 'Good' : 'Slow';
                }
                console.log(`     Assessment: ${assessment}`);
            });
        }

        // Concurrency Report
        if (this.results.concurrencyResults.length > 0) {
            console.log(chalk.yellow('\n🔄 Concurrency Results:'));
            this.results.concurrencyResults.forEach(result => {
                const successRate = (result.successful / result.concurrentCount * 100).toFixed(1);
                console.log(`   ${result.name}:`);
                console.log(`     Success Rate: ${successRate}% (${result.successful}/${result.concurrentCount})`);
                console.log(`     Throughput: ${result.throughput.toFixed(2)} req/sec`);
            });
        }

        // Stress Test Report
        if (this.results.stressTestResults.length > 0) {
            console.log(chalk.yellow('\n💪 Stress Test Results:'));
            this.results.stressTestResults.forEach(result => {
                const successRate = (result.successful / result.maxRequests * 100).toFixed(1);
                console.log(`   ${result.name}:`);
                console.log(`     Success Rate: ${successRate}% (${result.successful}/${result.maxRequests})`);
                console.log(`     Duration: ${result.duration}ms`);
            });
        }

        // Overall Assessment
        console.log(chalk.cyan('\n🎯 OVERALL ASSESSMENT:'));
        
        const avgResponseTime = this.results.responseTimes.length > 0 ?
            this.results.responseTimes.reduce((sum, r) => sum + r.average, 0) / this.results.responseTimes.length :
            0;
            
        const avgConcurrencySuccess = this.results.concurrencyResults.length > 0 ?
            this.results.concurrencyResults.reduce((sum, r) => sum + (r.successful / r.concurrentCount), 0) / this.results.concurrencyResults.length * 100 :
            0;

        console.log(`📈 Average Response Time: ${avgResponseTime.toFixed(1)}ms`);
        console.log(`🔄 Average Concurrency Success: ${avgConcurrencySuccess.toFixed(1)}%`);
        
        if (avgResponseTime < 5000 && avgConcurrencySuccess > 80) {
            console.log(chalk.green('✅ PERFORMANCE: EXCELLENT'));
        } else if (avgResponseTime < 10000 && avgConcurrencySuccess > 60) {
            console.log(chalk.yellow('⚠️ PERFORMANCE: GOOD'));
        } else {
            console.log(chalk.red('❌ PERFORMANCE: NEEDS IMPROVEMENT'));
        }
        
        console.log(`\n💡 Recommendations:`);
        if (avgResponseTime > 10000) {
            console.log(`   • Consider optimizing slow endpoints (>10s response time)`);
        }
        if (avgConcurrencySuccess < 80) {
            console.log(`   • Improve concurrency handling (current: ${avgConcurrencySuccess.toFixed(1)}%)`);
        }
        console.log(`   • Monitor resource usage during peak loads`);
        console.log(`   • Consider implementing rate limiting if not present`);
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new PerformanceTester();
    
    console.log(`🌐 Testing API at: ${API_BASE}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    
    tester.runPerformanceTests().catch(error => {
        console.error(chalk.red('\n💥 Performance test execution failed:'), error.message);
        process.exit(1);
    });
}

module.exports = PerformanceTester;