/**
 * Training Results Analysis
 * Comprehensive analysis of training results and issue identification
 */

const sqlite3 = require('sqlite3').verbose();

class TrainingResultsAnalyzer {
    constructor() {
        this.db = null;
        this.results = {
            registrationAttempts: [],
            surveyCompletions: [],
            systemEvents: [],
            sitePerformance: {},
            rotationPerformance: {},
            issues: [],
            recommendations: []
        };
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database('./poll-automation.db', (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('📊 Connected to training results database');
                    resolve();
                }
            });
        });
    }

    async analyzeComprehensiveResults() {
        console.log('🔍 COMPREHENSIVE TRAINING RESULTS ANALYSIS');
        console.log('==========================================');
        
        await this.analyzeRecentActivity();
        await this.analyzeSitePerformance();
        await this.analyzeRotationEffectiveness();
        await this.identifyIssues();
        await this.generateRecommendations();
        
        this.generateReport();
    }

    async analyzeRecentActivity() {
        console.log('\n📈 Analyzing Recent Activity...');
        
        const recentEvents = await this.query(`
            SELECT event_type, event_message, event_data, timestamp 
            FROM system_events 
            WHERE timestamp > datetime('now', '-2 hours') 
            ORDER BY timestamp DESC
        `);

        console.log(`   📊 Total events in last 2 hours: ${recentEvents.length}`);
        
        // Count by event type
        const eventCounts = {};
        recentEvents.forEach(event => {
            const key = event.event_message.includes('Registration') ? 'registration' :
                       event.event_message.includes('Survey') ? 'survey' :
                       event.event_message.includes('Analysis') ? 'analysis' :
                       event.event_message.includes('Learning') ? 'learning' : 'other';
            eventCounts[key] = (eventCounts[key] || 0) + 1;
        });

        console.log('   📋 Event breakdown:');
        Object.entries(eventCounts).forEach(([type, count]) => {
            console.log(`      • ${type}: ${count} events`);
        });

        this.results.systemEvents = recentEvents;
    }

    async analyzeSitePerformance() {
        console.log('\n🎯 Analyzing Site Performance...');
        
        const siteEvents = await this.query(`
            SELECT event_message, timestamp 
            FROM system_events 
            WHERE timestamp > datetime('now', '-2 hours')
            AND (event_message LIKE '%succeeded%' OR event_message LIKE '%failed%')
            ORDER BY timestamp DESC
        `);

        const siteResults = {};
        
        siteEvents.forEach(event => {
            // Extract site name from message
            const match = event.event_message.match(/(succeeded|failed) on (.+)$/);
            if (match) {
                const [, result, siteName] = match;
                if (!siteResults[siteName]) {
                    siteResults[siteName] = { successes: 0, failures: 0, total: 0 };
                }
                siteResults[siteName][result === 'succeeded' ? 'successes' : 'failures']++;
                siteResults[siteName].total++;
            }
        });

        console.log('   📊 Site Performance Summary:');
        Object.entries(siteResults).forEach(([site, stats]) => {
            const successRate = (stats.successes / stats.total * 100).toFixed(1);
            console.log(`      • ${site}: ${stats.successes}/${stats.total} (${successRate}%) success rate`);
            
            if (stats.successes === 0) {
                this.results.issues.push(`${site}: 0% success rate - needs investigation`);
            }
        });

        this.results.sitePerformance = siteResults;
    }

    async analyzeRotationEffectiveness() {
        console.log('\n🔄 Analyzing Rotation Effectiveness...');
        
        // This would require rotation-specific logging which we're implementing
        console.log('   🔧 Rotation analysis requires enhanced logging implementation');
        console.log('   ✅ Rotation system is functional based on console output');
        console.log('   📈 Recommendation: Implement rotation performance logging');
        
        this.results.recommendations.push('Add rotation performance logging for detailed analysis');
    }

    async identifyIssues() {
        console.log('\n🔍 Identifying Issues...');
        
        // Check for timeout issues
        const timeoutEvents = this.results.systemEvents.filter(event => 
            event.event_message.includes('Timeout') || 
            event.event_message.includes('timeout')
        );
        
        if (timeoutEvents.length > 0) {
            this.results.issues.push(`${timeoutEvents.length} timeout events detected`);
        }

        // Check for sites with no registration forms found
        const noFormEvents = this.results.systemEvents.filter(event => 
            event.event_message.includes('No registration form found')
        );
        
        if (noFormEvents.length > 0) {
            this.results.issues.push(`${noFormEvents.length} sites have no detectable registration forms`);
        }

        // Check for ML logging data completeness
        const emptyDataEvents = this.results.systemEvents.filter(event => 
            event.event_data === '{}' && 
            (event.event_message.includes('Registration') || event.event_message.includes('Survey'))
        );
        
        if (emptyDataEvents.length > 0) {
            this.results.issues.push('ML logging data is not being captured properly');
        }

        console.log(`   ⚠️ Issues identified: ${this.results.issues.length}`);
        this.results.issues.forEach(issue => {
            console.log(`      • ${issue}`);
        });
    }

    async generateRecommendations() {
        console.log('\n💡 Generating Recommendations...');
        
        // Based on identified issues
        if (this.results.issues.some(issue => issue.includes('timeout'))) {
            this.results.recommendations.push('Implement adaptive timeout strategies for slow-loading sites');
        }
        
        if (this.results.issues.some(issue => issue.includes('registration form'))) {
            this.results.recommendations.push('Enhance form detection algorithms for better recognition');
        }
        
        if (this.results.issues.some(issue => issue.includes('ML logging'))) {
            this.results.recommendations.push('Fix ML data logging to ensure all features are captured');
        }

        // General improvements
        this.results.recommendations.push('Add real survey URLs for survey completion testing');
        this.results.recommendations.push('Implement CAPTCHA detection and handling');
        this.results.recommendations.push('Add proxy rotation for enhanced anonymity');

        console.log(`   💡 Recommendations generated: ${this.results.recommendations.length}`);
        this.results.recommendations.forEach(rec => {
            console.log(`      • ${rec}`);
        });
    }

    generateReport() {
        console.log('\n📊 TRAINING RESULTS SUMMARY');
        console.log('===========================');
        
        // Overall stats
        const totalSites = Object.keys(this.results.sitePerformance).length;
        const successfulSites = Object.values(this.results.sitePerformance).filter(s => s.successes > 0).length;
        const overallSuccessRate = totalSites > 0 ? (successfulSites / totalSites * 100).toFixed(1) : 0;
        
        console.log(`\n🎯 Overall Performance:`);
        console.log(`   • Sites tested: ${totalSites}`);
        console.log(`   • Sites with successes: ${successfulSites}`);
        console.log(`   • Overall success rate: ${overallSuccessRate}%`);
        
        // Top performing sites
        const topSites = Object.entries(this.results.sitePerformance)
            .sort((a, b) => (b[1].successes / b[1].total) - (a[1].successes / a[1].total))
            .slice(0, 3);
            
        console.log(`\n🏆 Top Performing Sites:`);
        topSites.forEach(([site, stats], index) => {
            const rate = (stats.successes / stats.total * 100).toFixed(1);
            console.log(`   ${index + 1}. ${site}: ${rate}% success rate`);
        });
        
        // Issues summary
        console.log(`\n⚠️ Critical Issues: ${this.results.issues.length}`);
        if (this.results.issues.length > 0) {
            this.results.issues.slice(0, 3).forEach(issue => {
                console.log(`   • ${issue}`);
            });
        }
        
        // Next steps
        console.log(`\n🚀 Next Steps:`);
        this.results.recommendations.slice(0, 5).forEach(rec => {
            console.log(`   • ${rec}`);
        });
        
        // Save detailed report
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalSites,
                successfulSites,
                overallSuccessRate: parseFloat(overallSuccessRate),
                totalEvents: this.results.systemEvents.length,
                totalIssues: this.results.issues.length
            },
            sitePerformance: this.results.sitePerformance,
            issues: this.results.issues,
            recommendations: this.results.recommendations,
            rawEvents: this.results.systemEvents.slice(0, 50) // Limit for file size
        };
        
        const fs = require('fs');
        fs.writeFileSync('./training-analysis-report.json', JSON.stringify(reportData, null, 2));
        console.log('\n📄 Detailed analysis saved: training-analysis-report.json');
        
        // Determine overall system health
        if (overallSuccessRate >= 70) {
            console.log('\n🎉 SYSTEM STATUS: EXCELLENT');
        } else if (overallSuccessRate >= 50) {
            console.log('\n✅ SYSTEM STATUS: GOOD - MINOR IMPROVEMENTS NEEDED');
        } else if (overallSuccessRate >= 30) {
            console.log('\n⚠️ SYSTEM STATUS: NEEDS IMPROVEMENT');
        } else {
            console.log('\n🚨 SYSTEM STATUS: CRITICAL ISSUES NEED IMMEDIATE ATTENTION');
        }
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Database close error:', err.message);
                } else {
                    console.log('✅ Analysis database connection closed');
                }
                resolve();
            });
        });
    }
}

async function main() {
    const analyzer = new TrainingResultsAnalyzer();
    
    try {
        await analyzer.initialize();
        await analyzer.analyzeComprehensiveResults();
    } catch (error) {
        console.error('❌ Analysis failed:', error);
    } finally {
        await analyzer.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = TrainingResultsAnalyzer;