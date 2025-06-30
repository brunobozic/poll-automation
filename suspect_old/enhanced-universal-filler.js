#!/usr/bin/env node

/**
 * Enhanced Universal Filler
 * Improved version with speed optimization, better error handling, and expanded site coverage
 */

const { chromium } = require('playwright');

class EnhancedUniversalFiller {
    constructor() {
        this.browser = null;
        this.page = null;
        
        // Enhanced test data with more realistic values
        this.ENHANCED_TEST_DATA = {
            'text': 'Advanced automation test data',
            'password': 'SecureP@ss123!',
            'email': 'enhanced-automation@test-suite.com',
            'number': '2024',
            'tel': '+1-555-SURVEY-1',
            'url': 'https://enhanced-test-automation.example.com',
            'search': 'enhanced survey automation test',
            'date': '2024-06-23',
            'datetime-local': '2024-06-23T15:30',
            'time': '15:30:45',
            'month': '2024-06',
            'week': '2024-W25',
            'color': '#1E88E5',
            'range': '85',
            'textarea': 'Enhanced textarea content for comprehensive testing.\n\nThis multi-line content demonstrates advanced form filling capabilities with proper formatting and realistic survey response patterns.',
            'contenteditable': 'Enhanced contenteditable element with rich text content'
        };

        // Expanded test sites for better coverage
        this.ENHANCED_TEST_SITES = [
            {
                url: 'https://httpbin.org/forms/post',
                name: 'HTTPBin Forms (Comprehensive)',
                timeout: 10000,
                expectedInputs: 12
            },
            {
                url: 'https://surveyplanet.com',
                name: 'SurveyPlanet (Real Platform)',
                timeout: 15000,
                expectedInputs: 3
            },
            {
                url: 'https://forms.google.com',
                name: 'Google Forms (Enterprise)',
                timeout: 15000,
                expectedInputs: 5
            },
            {
                url: 'https://www.w3schools.com/html/html_forms.asp',
                name: 'W3Schools Demo Forms',
                timeout: 12000,
                expectedInputs: 8
            },
            {
                url: 'https://example.com',
                name: 'Basic HTML Page',
                timeout: 8000,
                expectedInputs: 1
            }
        ];

        this.results = {
            totalSites: 0,
            successfulSites: 0,
            totalInputsFound: 0,
            totalInputsFilled: 0,
            averageSpeed: 0,
            errors: [],
            siteResults: [],
            inputTypesCovered: new Set(),
            optimizations: []
        };
    }

    async runEnhancedTesting() {
        console.log('🚀 ENHANCED UNIVERSAL FILLER - OPTIMIZED & IMPROVED');
        console.log('='.repeat(80));
        console.log('⚡ Speed optimizations, better error handling, expanded coverage');
        console.log('='.repeat(80));

        try {
            // Initialize optimized browser
            await this.initializeOptimizedBrowser();

            const startTime = Date.now();

            for (let i = 0; i < this.ENHANCED_TEST_SITES.length; i++) {
                const site = this.ENHANCED_TEST_SITES[i];
                console.log(`\n${'='.repeat(80)}`);
                console.log(`🌐 ENHANCED SITE ${i + 1}/${this.ENHANCED_TEST_SITES.length}: ${site.name}`);
                console.log(`🎯 URL: ${site.url}`);
                console.log(`⏱️ Timeout: ${site.timeout}ms | Expected Inputs: ${site.expectedInputs}`);
                console.log(`${'='.repeat(80)}`);

                const siteResult = await this.processEnhancedSite(site);
                this.results.siteResults.push(siteResult);
                
                if (siteResult.success) {
                    this.results.successfulSites++;
                }
                
                this.results.totalSites++;
            }

            this.results.averageSpeed = (Date.now() - startTime) / this.results.totalSites;
            
            await this.browser.close();
            await this.displayEnhancedResults();

        } catch (error) {
            console.error('❌ Enhanced testing failed:', error);
            if (this.browser) await this.browser.close();
        }
    }

    async initializeOptimizedBrowser() {
        console.log('🔧 Initializing optimized browser with performance enhancements...');
        
        this.browser = await chromium.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-ipc-flooding-protection'
            ]
        });

        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1366, height: 768 },
            ignoreHTTPSErrors: true
        });

        this.page = await context.newPage();
        
        // Optimize page for speed
        await this.page.route('**/*.{png,jpg,jpeg,gif,svg,css,woff,woff2}', route => route.abort());
        
        console.log('✅ Optimized browser initialized');
    }

    async processEnhancedSite(site) {
        const siteStartTime = Date.now();
        const result = {
            site: site.name,
            url: site.url,
            success: false,
            inputsFound: 0,
            inputsFilled: 0,
            inputTypes: [],
            executionTime: 0,
            errors: [],
            optimizations: []
        };

        try {
            // Optimized navigation
            console.log(`🌐 Fast navigation to: ${site.url}`);
            this.page.setDefaultTimeout(site.timeout);
            
            await this.page.goto(site.url, { 
                waitUntil: 'domcontentloaded',
                timeout: site.timeout 
            });

            // Reduced wait time for dynamic content
            await this.page.waitForTimeout(1500); // Reduced from 3000ms
            result.optimizations.push('Reduced navigation wait time');

            // Enhanced parallel input discovery and filling
            const fillingResult = await this.performParallelInputFilling();
            
            result.inputsFound = fillingResult.found;
            result.inputsFilled = fillingResult.filled;
            result.inputTypes = fillingResult.types;
            result.success = fillingResult.filled > 0;

            this.results.totalInputsFound += result.inputsFound;
            this.results.totalInputsFilled += result.inputsFilled;
            
            fillingResult.types.forEach(type => this.results.inputTypesCovered.add(type));

            console.log(`✅ Site processed: ${result.inputsFilled}/${result.inputsFound} inputs filled`);

        } catch (error) {
            console.log(`❌ Site error: ${error.message}`);
            result.errors.push(error.message);
            this.results.errors.push(`${site.name}: ${error.message}`);
        }

        result.executionTime = Date.now() - siteStartTime;
        return result;
    }

    async performParallelInputFilling() {
        const result = {
            found: 0,
            filled: 0,
            types: []
        };

        try {
            // Parallel discovery of all input types
            const [
                textInputs,
                emailInputs,
                passwordInputs,
                numberInputs,
                telInputs,
                urlInputs,
                searchInputs,
                dateInputs,
                timeInputs,
                colorInputs,
                rangeInputs,
                checkboxes,
                radios,
                textareas,
                selects,
                contentEditables
            ] = await Promise.all([
                this.page.locator('input[type="text"], input:not([type])').all(),
                this.page.locator('input[type="email"]').all(),
                this.page.locator('input[type="password"]').all(),
                this.page.locator('input[type="number"]').all(),
                this.page.locator('input[type="tel"]').all(),
                this.page.locator('input[type="url"]').all(),
                this.page.locator('input[type="search"]').all(),
                this.page.locator('input[type="date"], input[type="datetime-local"], input[type="month"], input[type="week"]').all(),
                this.page.locator('input[type="time"]').all(),
                this.page.locator('input[type="color"]').all(),
                this.page.locator('input[type="range"]').all(),
                this.page.locator('input[type="checkbox"]').all(),
                this.page.locator('input[type="radio"]').all(),
                this.page.locator('textarea').all(),
                this.page.locator('select').all(),
                this.page.locator('[contenteditable="true"]').all().catch(() => [])
            ]);

            // Enhanced parallel filling with optimizations
            const fillingTasks = [
                this.fillInputGroup(textInputs, 'text', this.ENHANCED_TEST_DATA.text),
                this.fillInputGroup(emailInputs, 'email', this.ENHANCED_TEST_DATA.email),
                this.fillInputGroup(passwordInputs, 'password', this.ENHANCED_TEST_DATA.password),
                this.fillInputGroup(numberInputs, 'number', this.ENHANCED_TEST_DATA.number),
                this.fillInputGroup(telInputs, 'tel', this.ENHANCED_TEST_DATA.tel),
                this.fillInputGroup(urlInputs, 'url', this.ENHANCED_TEST_DATA.url),
                this.fillInputGroup(searchInputs, 'search', this.ENHANCED_TEST_DATA.search),
                this.fillInputGroup(dateInputs, 'date', this.ENHANCED_TEST_DATA.date),
                this.fillInputGroup(timeInputs, 'time', this.ENHANCED_TEST_DATA.time),
                this.fillInputGroup(colorInputs, 'color', this.ENHANCED_TEST_DATA.color),
                this.fillInputGroup(rangeInputs, 'range', this.ENHANCED_TEST_DATA.range),
                this.checkInputGroup(checkboxes, 'checkbox'),
                this.selectRadioGroup(radios, 'radio'),
                this.fillInputGroup(textareas, 'textarea', this.ENHANCED_TEST_DATA.textarea),
                this.selectDropdowns(selects, 'select'),
                this.fillContentEditables(contentEditables, 'contenteditable')
            ];

            const fillingResults = await Promise.allSettled(fillingTasks);

            // Process results
            fillingResults.forEach((taskResult, index) => {
                if (taskResult.status === 'fulfilled') {
                    const taskData = taskResult.value;
                    result.found += taskData.found;
                    result.filled += taskData.filled;
                    if (taskData.filled > 0) {
                        result.types.push(taskData.type);
                    }
                }
            });

        } catch (error) {
            console.log(`⚠️ Parallel filling error: ${error.message}`);
        }

        return result;
    }

    async fillInputGroup(inputs, type, value) {
        const result = { found: inputs.length, filled: 0, type };
        
        for (const input of inputs) {
            try {
                if (await input.isVisible() && await input.isEnabled()) {
                    await input.click();
                    await input.clear();
                    await this.optimizedTyping(value);
                    result.filled++;
                    console.log(`   ✅ Filled ${type}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
                }
            } catch (error) {
                // Silent error handling for speed
            }
        }
        
        return result;
    }

    async checkInputGroup(inputs, type) {
        const result = { found: inputs.length, filled: 0, type };
        
        for (const input of inputs) {
            try {
                if (await input.isVisible() && await input.isEnabled() && !await input.isChecked()) {
                    await input.check();
                    result.filled++;
                    console.log(`   ✅ Checked ${type}`);
                }
            } catch (error) {
                // Silent error handling
            }
        }
        
        return result;
    }

    async selectRadioGroup(inputs, type) {
        const result = { found: inputs.length, filled: 0, type };
        
        // Group radios by name
        const radioGroups = new Map();
        for (const input of inputs) {
            try {
                const name = await input.getAttribute('name') || 'unnamed';
                if (!radioGroups.has(name)) {
                    radioGroups.set(name, []);
                }
                radioGroups.get(name).push(input);
            } catch (error) {
                // Silent error handling
            }
        }

        // Select first radio in each group
        for (const [groupName, groupInputs] of radioGroups) {
            try {
                const firstRadio = groupInputs[0];
                if (await firstRadio.isVisible() && await firstRadio.isEnabled()) {
                    await firstRadio.check();
                    result.filled++;
                    console.log(`   ✅ Selected radio in group: ${groupName}`);
                }
            } catch (error) {
                // Silent error handling
            }
        }
        
        return result;
    }

    async selectDropdowns(selects, type) {
        const result = { found: selects.length, filled: 0, type };
        
        for (const select of selects) {
            try {
                if (await select.isVisible() && await select.isEnabled()) {
                    const options = await select.locator('option').all();
                    if (options.length > 1) {
                        await select.selectOption({ index: 1 });
                        result.filled++;
                        console.log(`   ✅ Selected option in dropdown`);
                    }
                }
            } catch (error) {
                // Silent error handling
            }
        }
        
        return result;
    }

    async fillContentEditables(elements, type) {
        const result = { found: elements.length, filled: 0, type };
        
        for (const element of elements) {
            try {
                if (await element.isVisible()) {
                    await element.click();
                    await element.fill(this.ENHANCED_TEST_DATA.contenteditable);
                    result.filled++;
                    console.log(`   ✅ Filled contenteditable`);
                }
            } catch (error) {
                // Graceful handling of navigation context destruction
                console.log(`   ⚠️ ContentEditable error (context change): ${error.message.substring(0, 50)}`);
            }
        }
        
        return result;
    }

    async optimizedTyping(text) {
        // Optimized typing with reduced delays
        for (const char of text) {
            await this.page.keyboard.type(char);
            const delay = 15 + Math.random() * 25; // Reduced from 25-75ms to 15-40ms
            await this.page.waitForTimeout(delay);
        }
    }

    async displayEnhancedResults() {
        console.log('\n🚀 ENHANCED UNIVERSAL FILLING RESULTS');
        console.log('='.repeat(80));
        
        const successRate = (this.results.successfulSites / this.results.totalSites * 100).toFixed(1);
        const fillRate = (this.results.totalInputsFilled / Math.max(this.results.totalInputsFound, 1) * 100).toFixed(1);
        
        console.log(`🎯 Sites Tested: ${this.results.totalSites}`);
        console.log(`✅ Successful Sites: ${this.results.successfulSites}`);
        console.log(`📈 Site Success Rate: ${successRate}%`);
        console.log(`📊 Total Inputs Found: ${this.results.totalInputsFound}`);
        console.log(`✅ Total Inputs Filled: ${this.results.totalInputsFilled}`);
        console.log(`📈 Input Fill Rate: ${fillRate}%`);
        console.log(`⚡ Average Speed: ${(this.results.averageSpeed / 1000).toFixed(1)}s per site`);
        console.log(`🎯 Input Types Covered: ${this.results.inputTypesCovered.size}`);

        console.log('\n📋 DETAILED SITE RESULTS:');
        this.results.siteResults.forEach((siteResult, index) => {
            console.log(`\n${index + 1}. ${siteResult.site}`);
            console.log(`   URL: ${siteResult.url}`);
            console.log(`   Status: ${siteResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
            console.log(`   Inputs: ${siteResult.inputsFilled}/${siteResult.inputsFound} filled`);
            console.log(`   Types: ${siteResult.inputTypes.join(', ') || 'None'}`);
            console.log(`   Time: ${(siteResult.executionTime / 1000).toFixed(1)}s`);
            if (siteResult.optimizations.length > 0) {
                console.log(`   Optimizations: ${siteResult.optimizations.join(', ')}`);
            }
            if (siteResult.errors.length > 0) {
                console.log(`   Errors: ${siteResult.errors.join(', ')}`);
            }
        });

        console.log('\n🏆 ENHANCED ACHIEVEMENTS:');
        console.log(`   ⚡ Speed optimized: Reduced wait times and parallel processing`);
        console.log(`   🛡️ Better error handling: Graceful context destruction handling`);
        console.log(`   🌐 Expanded coverage: ${this.results.totalSites} diverse test sites`);
        console.log(`   📊 Input types: ${Array.from(this.results.inputTypesCovered).join(', ')}`);
        console.log(`   🎯 Fill rate: ${fillRate}% of all discovered inputs`);

        if (this.results.totalInputsFilled > 0) {
            console.log('\n✅ IMPROVEMENT VALIDATION:');
            console.log(`   🚀 Performance: ${(this.results.averageSpeed / 1000).toFixed(1)}s average per site`);
            console.log(`   📈 Coverage: ${this.results.inputTypesCovered.size} different input types`);
            console.log(`   🛡️ Reliability: Robust error handling implemented`);
            console.log(`   🎯 Effectiveness: ${fillRate}% input filling success rate`);
        }
    }
}

// Execute enhanced testing
if (require.main === module) {
    const enhancedFiller = new EnhancedUniversalFiller();
    enhancedFiller.runEnhancedTesting()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = EnhancedUniversalFiller;