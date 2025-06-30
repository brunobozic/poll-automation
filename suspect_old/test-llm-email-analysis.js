#!/usr/bin/env node

/**
 * TEST LLM EMAIL ANALYSIS
 * Quick test of the LLM email analysis system
 */

const { chromium } = require('playwright');
const LLMEmailAnalyzer = require('./src/email/llm-email-analyzer');

async function testLLMEmailAnalysis() {
    console.log('🧠 TESTING LLM EMAIL ANALYSIS');
    console.log('==============================');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    const analyzer = new LLMEmailAnalyzer({ debugMode: true });

    try {
        // Test TempMail analysis
        console.log('\n1️⃣ Testing LLM analysis on TempMail...');
        await page.goto('https://temp-mail.org', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const analysis = await analyzer.analyzeEmailPage(page, 'TempMail');
        
        console.log('\n📊 LLM ANALYSIS RESULT:');
        console.log('========================');
        console.log(`Email Found: ${analysis.emailFound}`);
        console.log(`Method: ${analysis.retrievalMethod}`);
        console.log(`Primary Selector: ${analysis.primarySelector}`);
        console.log(`Confidence: ${analysis.confidence}`);
        console.log(`Instructions: ${analysis.instructions}`);
        console.log(`Reasoning: ${analysis.reasoning}`);

        // Try to retrieve email using analysis
        console.log('\n2️⃣ Testing email retrieval with LLM analysis...');
        const result = await analyzer.retrieveEmailUsingAnalysis(page, analysis, 'TempMail');
        
        if (result.success) {
            console.log(`✅ SUCCESS: Email retrieved: ${result.email}`);
            console.log(`Method used: ${result.method}`);
        } else {
            console.log(`❌ FAILED: ${result.error}`);
        }

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    } finally {
        await browser.close();
    }

    console.log('\n🏁 LLM Email Analysis Test Complete');
}

testLLMEmailAnalysis().catch(console.error);