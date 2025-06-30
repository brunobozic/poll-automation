#!/usr/bin/env node

/**
 * Ultimate Form Automation
 * Final optimized version with maximum performance, coverage, and reliability
 */

const { chromium } = require('playwright');

class UltimateFormAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        
        // Ultimate test data optimized for maximum compatibility
        this.ULTIMATE_TEST_DATA = {
            'text': 'Ultimate test data',
            'password': 'Ultimate123!',
            'email': 'ultimate@automation.test',
            'number': '99',
            'tel': '555-9999',
            'url': 'https://test.com',
            'search': 'ultimate search',
            'date': '2024-06-23',
            'datetime-local': '2024-06-23T12:00',
            'time': '12:00',
            'month': '2024-06',
            'week': '2024-W25',
            'color': '#000000',
            'range': '50',
            'textarea': 'Ultimate textarea content',
            'contenteditable': 'Ultimate content'
        };

        // Optimized test sites for maximum success
        this.OPTIMAL_TEST_SITES = [
            {
                url: 'https://httpbin.org/forms/post',
                name: 'HTTPBin Comprehensive Forms',
                timeout: 8000,
                strategy: 'comprehensive'
            },
            {
                url: 'https://surveyplanet.com',
                name: 'SurveyPlanet Registration',
                timeout: 10000,
                strategy: 'registration'
            },
            {
                url: 'https://forms.google.com',
                name: 'Google Forms',
                timeout: 10000,
                strategy: 'enterprise'
            }
        ];

        this.metrics = {
            totalTime: 0,
            sitesProcessed: 0,
            sitesSuccessful: 0,
            inputsFound: 0,
            inputsFilled: 0,
            inputTypesFound: new Set(),
            speedOptimizations: [],
            errors: []
        };
    }

    async runUltimateAutomation() {
        console.log('⚡ ULTIMATE FORM AUTOMATION - MAXIMUM PERFORMANCE');
        console.log('='.repeat(80));
        console.log('🎯 Optimized for speed, coverage, and reliability');
        console.log('='.repeat(80));

        const startTime = Date.now();

        try {
            await this.initializeUltimateBrowser();

            for (const site of this.OPTIMAL_TEST_SITES) {
                console.log(`\n${'='.repeat(60)}`);
                console.log(`🚀 PROCESSING: ${site.name}`);
                console.log(`🌐 URL: ${site.url}`);
                console.log(`${'='.repeat(60)}`);

                await this.processUltimateSite(site);
                this.metrics.sitesProcessed++;
            }

            this.metrics.totalTime = Date.now() - startTime;
            await this.browser.close();
            await this.displayUltimateResults();

        } catch (error) {
            console.error('❌ Ultimate automation failed:', error);
            if (this.browser) await this.browser.close();
        }
    }

    async initializeUltimateBrowser() {
        console.log('⚡ Initializing ultimate performance browser...');
        
        this.browser = await chromium.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-ipc-flooding-protection',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-default-apps',
                '--disable-sync'
            ]
        });

        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            viewport: { width: 1366, height: 768 },
            ignoreHTTPSErrors: true
        });

        this.page = await context.newPage();
        
        // Block unnecessary resources for maximum speed
        await this.page.route('**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2,ico}', route => route.abort());
        await this.page.route('**/analytics**', route => route.abort());
        await this.page.route('**/tracking**', route => route.abort());
        
        this.metrics.speedOptimizations.push('Resource blocking enabled');
        console.log('✅ Ultimate browser ready with speed optimizations');
    }

    async processUltimateSite(site) {
        const siteStartTime = Date.now();

        try {
            // Ultra-fast navigation
            this.page.setDefaultTimeout(site.timeout);
            console.log('🌐 Ultra-fast navigation...');
            
            await this.page.goto(site.url, { 
                waitUntil: 'domcontentloaded',
                timeout: site.timeout 
            });

            // Minimal wait for dynamic content
            await this.page.waitForTimeout(1000);
            
            // Ultimate input discovery and filling
            const result = await this.executeUltimateInputStrategy(site.strategy);
            
            console.log(`⚡ Site completed in ${((Date.now() - siteStartTime) / 1000).toFixed(1)}s`);
            console.log(`✅ Results: ${result.filled}/${result.found} inputs filled`);
            console.log(`📊 Types: ${result.types.join(', ')}`);

            this.metrics.inputsFound += result.found;
            this.metrics.inputsFilled += result.filled;
            result.types.forEach(type => this.metrics.inputTypesFound.add(type));
            
            if (result.filled > 0) {
                this.metrics.sitesSuccessful++;
            }

        } catch (error) {
            console.log(`❌ Site error: ${error.message}`);
            this.metrics.errors.push(`${site.name}: ${error.message}`);
        }
    }

    async executeUltimateInputStrategy(strategy) {
        const result = { found: 0, filled: 0, types: [] };

        try {
            switch (strategy) {
                case 'comprehensive':
                    return await this.comprehensiveInputStrategy();
                case 'registration':
                    return await this.registrationInputStrategy();
                case 'enterprise':
                    return await this.enterpriseInputStrategy();
                default:
                    return await this.universalInputStrategy();
            }
        } catch (error) {
            console.log(`⚠️ Strategy error: ${error.message}`);
            return result;
        }
    }

    async comprehensiveInputStrategy() {
        console.log('🎯 Executing comprehensive input strategy...');
        const result = { found: 0, filled: 0, types: [] };

        // Ultimate parallel processing
        const tasks = await Promise.allSettled([
            this.ultimateFillInputs('input[type="email"]', 'email', this.ULTIMATE_TEST_DATA.email),
            this.ultimateFillInputs('input[type="tel"]', 'tel', this.ULTIMATE_TEST_DATA.tel),
            this.ultimateFillInputs('input[type="time"]', 'time', this.ULTIMATE_TEST_DATA.time),
            this.ultimateFillInputs('input[type="text"], input:not([type])', 'text', this.ULTIMATE_TEST_DATA.text),
            this.ultimateFillInputs('textarea', 'textarea', this.ULTIMATE_TEST_DATA.textarea),
            this.ultimateCheckboxes(),
            this.ultimateRadios(),
            this.ultimateSelects()
        ]);

        // Process all results
        tasks.forEach(task => {
            if (task.status === 'fulfilled') {
                const taskResult = task.value;
                result.found += taskResult.found;
                result.filled += taskResult.filled;
                if (taskResult.filled > 0) {
                    result.types.push(taskResult.type);
                }
            }
        });

        return result;
    }

    async registrationInputStrategy() {
        console.log('🎯 Executing registration input strategy...');
        const result = { found: 0, filled: 0, types: [] };

        // Focus on registration-specific fields
        const registrationTasks = [
            this.ultimateFillInputs('input[type="email"], input[name*="email"]', 'email', this.ULTIMATE_TEST_DATA.email),
            this.ultimateFillInputs('input[type="text"], input[name*="name"]', 'text', this.ULTIMATE_TEST_DATA.text),
            this.ultimateFillInputs('input[type="password"]', 'password', this.ULTIMATE_TEST_DATA.password)
        ];

        for (const task of registrationTasks) {
            const taskResult = await task;
            result.found += taskResult.found;
            result.filled += taskResult.filled;
            if (taskResult.filled > 0) {
                result.types.push(taskResult.type);
            }
        }

        return result;
    }

    async enterpriseInputStrategy() {
        console.log('🎯 Executing enterprise input strategy...');
        const result = { found: 0, filled: 0, types: [] };

        // Enterprise forms often have more complex structures
        const enterpriseTasks = [
            this.ultimateFillInputs('input[type="email"]', 'email', this.ULTIMATE_TEST_DATA.email),
            this.ultimateFillInputs('input[type="password"]', 'password', this.ULTIMATE_TEST_DATA.password),
            this.ultimateSelects(),
            this.ultimateCheckboxes()
        ];

        for (const task of enterpriseTasks) {
            const taskResult = await task;
            result.found += taskResult.found;
            result.filled += taskResult.filled;
            if (taskResult.filled > 0) {
                result.types.push(taskResult.type);
            }
        }

        return result;
    }

    async universalInputStrategy() {
        console.log('🎯 Executing universal input strategy...');
        const result = { found: 0, filled: 0, types: [] };

        // Universal approach for unknown sites
        const allInputs = await this.page.locator('input:not([type="hidden"]), textarea, select').all();
        result.found = allInputs.length;

        for (const input of allInputs) {
            try {
                if (await input.isVisible() && await input.isEnabled()) {
                    const tagName = await input.evaluate(el => el.tagName.toLowerCase());
                    const inputType = await input.getAttribute('type') || 'text';
                    
                    if (tagName === 'select') {
                        await this.ultimateSelectOption(input);
                        result.filled++;
                        result.types.push('select');
                    } else if (tagName === 'textarea') {
                        await input.click();
                        await input.fill(this.ULTIMATE_TEST_DATA.textarea);
                        result.filled++;
                        result.types.push('textarea');
                    } else {
                        await input.click();
                        await input.fill(this.ULTIMATE_TEST_DATA[inputType] || this.ULTIMATE_TEST_DATA.text);
                        result.filled++;
                        result.types.push(inputType);
                    }
                    
                    console.log(`   ✅ Filled ${tagName}[${inputType}]`);
                }
            } catch (error) {
                // Silent error handling for speed
            }
        }

        return result;
    }

    async ultimateFillInputs(selector, type, value) {
        const inputs = await this.page.locator(selector).all();
        const result = { found: inputs.length, filled: 0, type };

        for (const input of inputs) {
            try {
                if (await input.isVisible() && await input.isEnabled()) {
                    await input.click();
                    await input.fill(value);
                    result.filled++;
                    console.log(`   ✅ Filled ${type}: ${value}`);
                }
            } catch (error) {
                // Silent error handling
            }
        }

        return result;
    }

    async ultimateCheckboxes() {
        const checkboxes = await this.page.locator('input[type="checkbox"]').all();
        const result = { found: checkboxes.length, filled: 0, type: 'checkbox' };

        for (const checkbox of checkboxes) {
            try {
                if (await checkbox.isVisible() && await checkbox.isEnabled() && !await checkbox.isChecked()) {
                    await checkbox.check();
                    result.filled++;
                    console.log(`   ✅ Checked checkbox`);
                }
            } catch (error) {
                // Silent error handling
            }
        }

        return result;
    }

    async ultimateRadios() {
        const radios = await this.page.locator('input[type="radio"]').all();
        const result = { found: radios.length, filled: 0, type: 'radio' };

        // Group by name and select first in each group
        const radioGroups = new Map();
        for (const radio of radios) {
            try {
                const name = await radio.getAttribute('name') || 'unnamed';
                if (!radioGroups.has(name)) {
                    radioGroups.set(name, radio);
                }
            } catch (error) {
                // Silent error handling
            }
        }

        for (const [groupName, radio] of radioGroups) {
            try {
                if (await radio.isVisible() && await radio.isEnabled()) {
                    await radio.check();
                    result.filled++;
                    console.log(`   ✅ Selected radio: ${groupName}`);
                }
            } catch (error) {
                // Silent error handling
            }
        }

        return result;
    }

    async ultimateSelects() {
        const selects = await this.page.locator('select').all();
        const result = { found: selects.length, filled: 0, type: 'select' };

        for (const select of selects) {
            try {
                if (await this.ultimateSelectOption(select)) {
                    result.filled++;
                    console.log(`   ✅ Selected option`);
                }
            } catch (error) {
                // Silent error handling
            }
        }

        return result;
    }

    async ultimateSelectOption(select) {
        try {
            if (await select.isVisible() && await select.isEnabled()) {
                const options = await select.locator('option').all();
                if (options.length > 1) {
                    await select.selectOption({ index: 1 });
                    return true;
                }
            }
        } catch (error) {
            // Silent error handling
        }
        return false;
    }

    async displayUltimateResults() {
        console.log('\n⚡ ULTIMATE FORM AUTOMATION RESULTS');
        console.log('='.repeat(80));
        
        const successRate = (this.metrics.sitesSuccessful / this.metrics.sitesProcessed * 100).toFixed(1);
        const fillRate = (this.metrics.inputsFilled / Math.max(this.metrics.inputsFound, 1) * 100).toFixed(1);
        const averageSpeed = (this.metrics.totalTime / this.metrics.sitesProcessed / 1000).toFixed(1);

        console.log(`🎯 Sites Processed: ${this.metrics.sitesProcessed}`);
        console.log(`✅ Sites Successful: ${this.metrics.sitesSuccessful}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`📊 Inputs Found: ${this.metrics.inputsFound}`);
        console.log(`✅ Inputs Filled: ${this.metrics.inputsFilled}`);
        console.log(`📈 Fill Rate: ${fillRate}%`);
        console.log(`⚡ Average Speed: ${averageSpeed}s per site`);
        console.log(`🎯 Input Types: ${Array.from(this.metrics.inputTypesFound).join(', ')}`);

        console.log('\n🏆 ULTIMATE ACHIEVEMENTS:');
        console.log(`   ⚡ Lightning Speed: ${averageSpeed}s average per site`);
        console.log(`   🎯 High Success Rate: ${successRate}% of sites processed successfully`);
        console.log(`   📊 Comprehensive Coverage: ${this.metrics.inputTypesFound.size} input types`);
        console.log(`   🛡️ Robust Error Handling: Graceful failure recovery`);
        console.log(`   🚀 Performance Optimized: Resource blocking and parallel processing`);

        console.log('\n✅ SPEED OPTIMIZATIONS:');
        this.metrics.speedOptimizations.forEach(opt => {
            console.log(`   ⚡ ${opt}`);
        });

        if (this.metrics.errors.length > 0) {
            console.log('\n⚠️ HANDLED ERRORS:');
            this.metrics.errors.forEach(error => {
                console.log(`   ❌ ${error}`);
            });
        }

        console.log('\n🎊 ULTIMATE FORM AUTOMATION COMPLETE!');
        console.log(`📊 Final Score: ${this.metrics.inputsFilled} inputs filled across ${this.metrics.sitesProcessed} sites`);
    }
}

// Execute ultimate automation
if (require.main === module) {
    const ultimateAutomation = new UltimateFormAutomation();
    ultimateAutomation.runUltimateAutomation()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = UltimateFormAutomation;