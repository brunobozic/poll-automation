#!/usr/bin/env node

/**
 * Live Survey Discovery Tool
 * 
 * This script helps find actual live surveys instead of demo/example pages.
 * It searches for active survey links on major survey platforms.
 */

const { chromium } = require('playwright');

class LiveSurveyFinder {
    constructor() {
        this.browser = null;
        this.foundSurveys = [];
    }

    async findLiveSurveys() {
        console.log('🔍 Searching for Live Surveys\n');
        
        try {
            this.browser = await chromium.launch({ 
                headless: false,
                slowMo: 500
            });
            
            // Different strategies to find live surveys
            const searchStrategies = [
                {
                    name: 'SurveyPlanet Public Surveys',
                    method: () => this.searchSurveyPlanet()
                },
                {
                    name: 'Google Forms Search',
                    method: () => this.searchGoogleForms()
                },
                {
                    name: 'TypeForm Public Examples',
                    method: () => this.searchTypeForm()
                },
                {
                    name: 'University Research Surveys',
                    method: () => this.searchAcademicSurveys()
                }
            ];
            
            for (const strategy of searchStrategies) {
                console.log(`🎯 Trying: ${strategy.name}`);
                try {
                    await strategy.method();
                } catch (error) {
                    console.error(`⚠️ ${strategy.name} failed:`, error.message);
                }
                console.log();
            }
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Survey discovery failed:', error);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
    
    async searchSurveyPlanet() {
        const page = await this.browser.newPage();
        
        try {
            // Try to find publicly accessible surveys
            await page.goto('https://surveyplanet.com', { waitUntil: 'networkidle' });
            
            // Look for any links that might lead to live surveys
            const surveyLinks = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="/survey/"], a[href*="/s/"], a[href*="/poll/"]'));
                return links.map(link => ({
                    url: link.href,
                    text: link.textContent?.trim(),
                    isExternal: link.href.includes('surveyplanet.com')
                })).filter(link => link.url && link.url.length > 30);
            });
            
            console.log(`   Found ${surveyLinks.length} potential survey links`);
            
            // Test a few of these links to see if they contain actual questions
            for (const link of surveyLinks.slice(0, 3)) {
                const hasQuestions = await this.testSurveyLink(link.url);
                if (hasQuestions) {
                    this.foundSurveys.push({
                        platform: 'SurveyPlanet',
                        url: link.url,
                        title: link.text,
                        verified: true
                    });
                    console.log(`   ✅ Live survey found: ${link.url}`);
                }
            }
            
        } catch (error) {
            console.error('   SurveyPlanet search error:', error.message);
        } finally {
            await page.close();
        }
    }
    
    async searchGoogleForms() {
        const page = await this.browser.newPage();
        
        try {
            // Search for public Google Forms
            await page.goto('https://www.google.com/search?q=site:docs.google.com/forms "survey" OR "questionnaire" OR "feedback"');
            await page.waitForTimeout(2000);
            
            const formLinks = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="docs.google.com/forms"]'));
                return links.map(link => link.href).filter(url => url.includes('/viewform'));
            });
            
            console.log(`   Found ${formLinks.length} Google Form links`);
            
            // Test a few forms
            for (const formUrl of formLinks.slice(0, 2)) {
                const hasQuestions = await this.testSurveyLink(formUrl);
                if (hasQuestions) {
                    this.foundSurveys.push({
                        platform: 'Google Forms',
                        url: formUrl,
                        title: 'Google Form Survey',
                        verified: true
                    });
                    console.log(`   ✅ Live Google Form found: ${formUrl}`);
                }
            }
            
        } catch (error) {
            console.error('   Google Forms search error:', error.message);
        } finally {
            await page.close();
        }
    }
    
    async searchTypeForm() {
        const page = await this.browser.newPage();
        
        try {
            // Look for TypeForm examples or public forms
            await page.goto('https://www.typeform.com/examples/');
            await page.waitForTimeout(2000);
            
            const typeformLinks = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href*="typeform.com/to/"]'));
                return links.map(link => link.href);
            });
            
            console.log(`   Found ${typeformLinks.length} TypeForm links`);
            
            for (const formUrl of typeformLinks.slice(0, 2)) {
                const hasQuestions = await this.testSurveyLink(formUrl);
                if (hasQuestions) {
                    this.foundSurveys.push({
                        platform: 'TypeForm',
                        url: formUrl,
                        title: 'TypeForm Survey',
                        verified: true
                    });
                    console.log(`   ✅ Live TypeForm found: ${formUrl}`);
                }
            }
            
        } catch (error) {
            console.error('   TypeForm search error:', error.message);
        } finally {
            await page.close();
        }
    }
    
    async searchAcademicSurveys() {
        console.log('   Checking for academic research surveys...');
        
        // Common URLs for academic surveys (these are often public)
        const academicSurveys = [
            'https://universityofcalifornia.co1.qualtrics.com/jfe/form/SV_example',
            'https://stanforduniversity.qualtrics.com/jfe/form/SV_example'
            // Note: These are examples - would need to find actual public academic surveys
        ];
        
        console.log('   Academic survey search requires manual verification of public research studies');
    }
    
    async testSurveyLink(url) {
        const page = await this.browser.newPage();
        
        try {
            console.log(`      Testing: ${url.substring(0, 60)}...`);
            
            await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(2000);
            
            // Check if page contains actual form elements
            const hasFormElements = await page.evaluate(() => {
                const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"], select, textarea');
                const questions = document.querySelectorAll('.question, [class*="question"], .field, fieldset');
                const hasQuestionText = /what|how|when|where|why|rate|select|choose|please/i.test(document.body.innerText);
                
                return {
                    inputCount: inputs.length,
                    questionCount: questions.length,
                    hasQuestionText: hasQuestionText,
                    isLikely: inputs.length > 0 && (questions.length > 0 || hasQuestionText)
                };
            });
            
            console.log(`      Inputs: ${hasFormElements.inputCount}, Questions: ${hasFormElements.questionCount}, Likely Survey: ${hasFormElements.isLikely}`);
            
            return hasFormElements.isLikely;
            
        } catch (error) {
            console.log(`      ❌ Failed to test: ${error.message}`);
            return false;
        } finally {
            await page.close();
        }
    }
    
    printResults() {
        console.log('\n📊 LIVE SURVEY DISCOVERY RESULTS\n');
        console.log('=' .repeat(60));
        
        if (this.foundSurveys.length === 0) {
            console.log('❌ No verified live surveys found.');
            console.log('\n💡 RECOMMENDATIONS:');
            console.log('1. Look for research study participation links on university websites');
            console.log('2. Check social media for shared survey links');
            console.log('3. Search for customer feedback surveys from companies');
            console.log('4. Use survey platform search features to find public surveys');
            console.log('\n🎯 TESTING ALTERNATIVES:');
            console.log('1. Create your own test surveys on free platforms');
            console.log('2. Use survey platform demo accounts');
            console.log('3. Test against local HTML survey forms');
        } else {
            console.log(`✅ Found ${this.foundSurveys.length} verified live surveys:\n`);
            
            this.foundSurveys.forEach((survey, i) => {
                console.log(`${i+1}. ${survey.platform}`);
                console.log(`   URL: ${survey.url}`);
                console.log(`   Title: ${survey.title}`);
                console.log(`   Status: ${survey.verified ? '✅ Verified' : '⚠️ Needs Testing'}\n`);
            });
            
            console.log('💡 You can now test your automation against these live surveys!');
        }
        
        console.log('\n⚠️  IMPORTANT ETHICAL NOTES:');
        console.log('- Only test on surveys you have permission to use');
        console.log('- Respect rate limits and terms of service');
        console.log('- Consider creating your own test surveys for development');
        console.log('- Be mindful of survey owners\' intentions and data');
    }
}

// Run the survey finder
if (require.main === module) {
    const finder = new LiveSurveyFinder();
    finder.findLiveSurveys().catch(console.error);
}

module.exports = LiveSurveyFinder;