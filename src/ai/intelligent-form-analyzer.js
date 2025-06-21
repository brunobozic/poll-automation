/**
 * Intelligent Form Analyzer
 * Uses AI/LLM and computer vision to understand any form
 * Adaptive to changing layouts, field names, and requirements
 */

class IntelligentFormAnalyzer {
    constructor(contentAI) {
        this.contentAI = contentAI;
        this.formMemory = new Map(); // Remember forms we've seen
        this.fieldPatterns = new Map(); // Learn field patterns
    }

    /**
     * Analyze a form using AI and computer vision
     */
    async analyzeForm(page, siteName) {
        console.log('🧠 AI-powered form analysis starting...');
        
        try {
            // Wait for dynamic forms to load first
            console.log('⏳ Waiting for dynamic forms to load...');
            await page.waitForTimeout(3000);
            
            try {
                await page.waitForSelector('input', { timeout: 10000 });
                console.log('✅ Input fields detected');
            } catch (e) {
                console.log('⚠️ No input fields detected, proceeding anyway');
            }
            
            // Get HTML source for LLM analysis
            const htmlSource = await page.content();
            
            // Use LLM to analyze HTML and find form elements
            const aiAnalysis = await this.analyzeHTMLWithAI(htmlSource, siteName, page.url());
            
            // Fallback: also get form data using traditional method
            const formData = await this.extractFormDataFromHTML(page);
            
            // Store in memory for future use
            this.storeFormPattern(siteName, formData, aiAnalysis);
            
            return {
                success: true,
                fields: aiAnalysis.fields || [],
                checkboxes: aiAnalysis.checkboxes || [],
                strategy: aiAnalysis.strategy || 'standard',
                confidence: aiAnalysis.confidence || 0.8,
                formData: formData
            };
            
        } catch (error) {
            console.error(`❌ AI form analysis failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                fields: [],
                checkboxes: []
            };
        }
    }

    /**
     * Analyze HTML source with AI to find form elements and their selectors
     */
    async analyzeHTMLWithAI(htmlSource, siteName, url) {
        console.log('🤖 Using LLM to analyze HTML source for form elements...');
        
        // Clean and focus the HTML on form-related content
        const formRelevantHTML = this.extractFormRelevantHTML(htmlSource);
        
        const htmlAnalysisPrompt = `
You are an expert at analyzing HTML and identifying form elements for automation.

SITE: ${siteName}
URL: ${url}

Analyze this HTML source and identify ALL form elements that appear to be part of a registration/signup form.

HTML SOURCE (form-relevant sections):
${formRelevantHTML}

Your task:
1. Find ALL input fields (text, email, password, etc.)
2. Find ALL checkboxes 
3. Find ALL textareas and select elements
4. Provide EXACT selectors that Playwright can use

For each element, determine:
- Purpose (email, firstName, lastName, password, confirmEmail, terms, etc.)
- Best selector strategy (id, name, type, etc.)
- Whether it's required for registration

Return JSON in this exact format:
{
  "analysis": "brief description of what this form appears to be for",
  "confidence": 0.0-1.0,
  "fields": [
    {
      "purpose": "email|firstName|lastName|password|confirmEmail|phone|company|other",
      "selector": "exact CSS selector for Playwright",
      "type": "text|email|password|tel|etc",
      "required": true/false,
      "reasoning": "why you identified this field this way"
    }
  ],
  "checkboxes": [
    {
      "purpose": "terms|newsletter|marketing|privacy|other", 
      "selector": "exact CSS selector for Playwright",
      "action": "check|uncheck",
      "reasoning": "why this checkbox should be handled this way"
    }
  ],
  "submitButton": {
    "selector": "exact CSS selector for submit button",
    "text": "button text"
  }
}

Focus on:
- Using ID selectors when available (#elementId)
- Using name selectors when IDs aren't available ([name="elementName"])
- Being specific to avoid selecting wrong elements
- Identifying the most reliable selector for each field`;

        try {
            const response = await this.contentAI.analyzeAndRespond({
                question: htmlAnalysisPrompt,
                type: 'html_analysis'
            }, `html_analysis_${siteName}`);

            // Parse response
            let analysis;
            try {
                analysis = typeof response === 'string' ? JSON.parse(response) : response;
                console.log(`🧠 LLM HTML Analysis completed with ${analysis.confidence || 0.5} confidence`);
                console.log(`📝 Found ${analysis.fields?.length || 0} fields and ${analysis.checkboxes?.length || 0} checkboxes`);
                
                // If LLM found no fields, use fallback
                if (!analysis.fields || analysis.fields.length === 0) {
                    console.log('⚠️ LLM found no fields, using HTML fallback analysis');
                    return this.createHTMLFallbackAnalysis(formRelevantHTML);
                }
                
                return analysis;
            } catch (e) {
                console.log(`⚠️ LLM response parsing failed, using fallback`);
                return this.createHTMLFallbackAnalysis(formRelevantHTML);
            }

        } catch (error) {
            console.error(`❌ LLM HTML analysis failed: ${error.message}`);
            return this.createHTMLFallbackAnalysis(formRelevantHTML);
        }
    }

    /**
     * Extract form-relevant HTML sections to reduce token usage
     */
    extractFormRelevantHTML(htmlSource) {
        // Remove script tags, style tags, and comments to reduce noise
        let cleanHTML = htmlSource
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Try to find form sections
        const formMatches = cleanHTML.match(/<form[^>]*>[\s\S]*?<\/form>/gi);
        if (formMatches && formMatches.length > 0) {
            return formMatches.join('\n\n');
        }

        // If no form tags, look for input fields and surrounding context
        const inputRegex = /<[^>]*(?:input|textarea|select|button)[^>]*>/gi;
        const inputs = cleanHTML.match(inputRegex) || [];
        
        if (inputs.length > 0) {
            // Return the inputs plus some surrounding context
            return inputs.join('\n') + '\n\n' + cleanHTML.substring(0, 2000);
        }

        // Return first 3000 characters as fallback
        return cleanHTML.substring(0, 3000);
    }

    /**
     * Create fallback analysis when LLM fails on HTML
     */
    createHTMLFallbackAnalysis(htmlSource) {
        console.log('🔄 Creating HTML fallback analysis...');
        
        // Extract form elements using regex as fallback
        const inputRegex = /<input[^>]*>/gi;
        const inputs = htmlSource.match(inputRegex) || [];
        
        const fields = [];
        const checkboxes = [];
        
        console.log(`📋 Processing ${inputs.length} input elements...`);
        
        inputs.forEach((inputHTML, index) => {
            const typeMatch = inputHTML.match(/type=["']([^"']+)["']/i);
            const nameMatch = inputHTML.match(/name=["']([^"']+)["']/i);
            const idMatch = inputHTML.match(/id=["']([^"']+)["']/i);
            const styleMatch = inputHTML.match(/style=["']([^"']+)["']/i);
            
            const type = typeMatch ? typeMatch[1] : 'text';
            const name = nameMatch ? nameMatch[1] : '';
            const id = idMatch ? idMatch[1] : '';
            const style = styleMatch ? styleMatch[1] : '';
            
            // Skip hidden fields
            if (style.includes('display:none') || style.includes('display: none')) {
                console.log(`   ⏭️ Skipping hidden field: ${inputHTML.substring(0, 50)}...`);
                return;
            }
            
            // Create selector (prefer ID)
            let selector = '';
            if (id) {
                selector = `#${id}`;
            } else if (name) {
                selector = `[name="${name}"]`;
            } else {
                selector = `input[type="${type}"]:nth-of-type(${index + 1})`;
            }
            
            // Determine purpose with better pattern matching
            let purpose = 'unknown';
            const text = `${name} ${id}`.toLowerCase();
            
            if (text.includes('email') && text.includes('verify')) {
                purpose = 'confirmEmail';
            } else if (text.includes('email')) {
                purpose = 'email';
            } else if (text.includes('name') && !text.includes('user')) {
                purpose = 'firstName';
            } else if (text.includes('pass')) {
                purpose = 'password';
            } else if (text.includes('terms') || text.includes('accept')) {
                purpose = 'terms';
            }
            
            if (type === 'checkbox') {
                const checkboxPurpose = text.includes('term') || text.includes('accept') ? 'terms' : 'other';
                checkboxes.push({
                    purpose: checkboxPurpose,
                    selector: selector,
                    action: 'check',
                    reasoning: `HTML fallback - identified checkbox: ${name || id || 'unnamed'}`
                });
                console.log(`   ☑️ Found checkbox: ${checkboxPurpose} (${selector})`);
            } else {
                fields.push({
                    purpose: purpose,
                    selector: selector,
                    type: type,
                    required: inputHTML.includes('required'),
                    reasoning: `HTML fallback - identified ${type} field: ${name || id || 'unnamed'}`
                });
                console.log(`   📝 Found field: ${purpose} (${selector})`);
            }
        });
        
        console.log(`✅ HTML fallback analysis completed: ${fields.length} fields, ${checkboxes.length} checkboxes`);
        
        return {
            analysis: 'Fallback HTML regex analysis',
            confidence: 0.7, // Higher confidence since we know this works
            fields: fields,
            checkboxes: checkboxes,
            submitButton: {
                selector: 'button[type="submit"], input[type="submit"]',
                text: 'Submit'
            }
        };
    }

    /**
     * Extract comprehensive form data from the page (backup method)
     */
    async extractFormDataFromHTML(page) {
        // Wait for dynamic forms to load (many modern sites use JavaScript)
        console.log('⏳ Waiting for dynamic forms to load...');
        await page.waitForTimeout(3000);
        
        try {
            await page.waitForSelector('input', { timeout: 10000 });
            console.log('✅ Input fields detected');
        } catch (e) {
            console.log('⚠️ No input fields detected, proceeding anyway');
        }
        
        return await page.evaluate(() => {
            const formData = {
                url: window.location.href,
                title: document.title,
                forms: [],
                allFields: [],
                pageText: document.body.innerText.substring(0, 3000),
                metadata: {
                    timestamp: Date.now(),
                    language: document.documentElement.lang || 'en'
                }
            };

            // Analyze all forms
            document.querySelectorAll('form').forEach((form, formIndex) => {
                const formInfo = {
                    index: formIndex,
                    action: form.action || '',
                    method: form.method || 'GET',
                    fields: []
                };

                // Get all form fields
                const fields = form.querySelectorAll('input, textarea, select');
                fields.forEach((field, fieldIndex) => {
                    const fieldInfo = analyzeField(field, fieldIndex, form);
                    formInfo.fields.push(fieldInfo);
                    formData.allFields.push(fieldInfo);
                });

                formData.forms.push(formInfo);
            });

            // Also get fields outside forms (some sites don't use form tags)
            const allInputs = document.querySelectorAll('input, textarea, select');
            allInputs.forEach((field, index) => {
                if (!field.closest('form')) {
                    const fieldInfo = analyzeField(field, index, null);
                    formData.allFields.push(fieldInfo);
                }
            });

            return formData;

            // Helper function to analyze individual fields
            function analyzeField(field, index, parentForm) {
                const rect = field.getBoundingClientRect();
                const styles = window.getComputedStyle(field);
                
                return {
                    index: index,
                    type: field.type || field.tagName.toLowerCase(),
                    name: field.name || '',
                    id: field.id || '',
                    className: field.className || '',
                    placeholder: field.placeholder || '',
                    value: field.value || '',
                    required: field.required,
                    disabled: field.disabled,
                    visible: field.offsetParent !== null,
                    
                    // Visual properties
                    position: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    },
                    
                    // Context analysis
                    labelText: findFieldLabel(field),
                    nearbyText: getNearbyText(field),
                    parentForm: parentForm ? {
                        action: parentForm.action,
                        method: parentForm.method
                    } : null,
                    
                    // Validation info
                    validationMessage: field.validationMessage || '',
                    pattern: field.pattern || '',
                    minLength: field.minLength || null,
                    maxLength: field.maxLength || null,
                    
                    // Computed styles (for visibility detection)
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity
                };
            }

            // Helper function to find field labels
            function findFieldLabel(field) {
                let labelText = '';
                
                // Method 1: Direct label association
                if (field.id) {
                    const label = document.querySelector(`label[for="${field.id}"]`);
                    if (label) {
                        labelText = label.textContent.trim();
                    }
                }
                
                // Method 2: Parent label
                if (!labelText) {
                    const parentLabel = field.closest('label');
                    if (parentLabel) {
                        labelText = parentLabel.textContent.trim();
                    }
                }
                
                // Method 3: Previous sibling
                if (!labelText && field.previousElementSibling) {
                    const prev = field.previousElementSibling;
                    if (prev.tagName === 'LABEL' || prev.textContent.trim().length < 100) {
                        labelText = prev.textContent.trim();
                    }
                }
                
                // Method 4: Parent container text
                if (!labelText) {
                    const parent = field.parentElement;
                    if (parent) {
                        const parentText = parent.textContent.trim();
                        const fieldText = field.outerHTML;
                        labelText = parentText.replace(fieldText, '').trim();
                        if (labelText.length > 100) labelText = ''; // Too long, probably not a label
                    }
                }
                
                return labelText.substring(0, 200); // Limit length
            }

            // Helper function to get nearby text context
            function getNearbyText(field) {
                const nearby = [];
                const rect = field.getBoundingClientRect();
                
                // Find text elements near this field
                const allElements = document.querySelectorAll('*');
                allElements.forEach(el => {
                    if (el.textContent && el.textContent.trim() && el !== field) {
                        const elRect = el.getBoundingClientRect();
                        const distance = Math.sqrt(
                            Math.pow(rect.x - elRect.x, 2) + 
                            Math.pow(rect.y - elRect.y, 2)
                        );
                        
                        if (distance < 200 && el.textContent.trim().length < 100) {
                            nearby.push({
                                text: el.textContent.trim(),
                                distance: distance,
                                tag: el.tagName
                            });
                        }
                    }
                });
                
                // Sort by distance and return closest
                return nearby
                    .sort((a, b) => a.distance - b.distance)
                    .slice(0, 5)
                    .map(item => item.text);
            }
        });
    }

    /**
     * Use AI to understand what each field is for
     */
    async analyzeWithAI(formData, siteName) {
        const analysisPrompt = `
You are an expert at understanding web forms. Analyze this registration form and determine what each field is for.

SITE: ${siteName}
FORM URL: ${formData.url}
PAGE TITLE: ${formData.title}

FORM FIELDS:
${formData.allFields.map((field, i) => `
Field ${i + 1}:
- Type: ${field.type}
- Name: ${field.name}
- ID: ${field.id}
- Placeholder: "${field.placeholder}"
- Label: "${field.labelText}"
- Nearby text: ${field.nearbyText.join(', ')}
- Required: ${field.required}
- Visible: ${field.visible}
`).join('\n')}

PAGE CONTEXT: ${formData.pageText.substring(0, 1000)}

For each field, determine:
1. What type of information it's asking for
2. What value should be provided
3. How important it is for form submission

Return JSON in this format:
{
  "analysis": "brief description of what this form is for",
  "strategy": "registration|survey|contact|other",
  "confidence": 0.0-1.0,
  "fields": [
    {
      "fieldIndex": 0,
      "purpose": "email|firstName|lastName|password|confirmPassword|phone|company|age|gender|address|etc",
      "importance": "required|optional|hidden",
      "suggestedValue": "what to put in this field",
      "reasoning": "why you think this field is for this purpose"
    }
  ],
  "checkboxes": [
    {
      "fieldIndex": 1,
      "purpose": "terms|newsletter|marketing|etc",
      "action": "check|uncheck|ignore",
      "reasoning": "why this checkbox should be handled this way"
    }
  ],
  "additionalNotes": "any special considerations for this form"
}
`;

        try {
            const response = await this.contentAI.analyzeAndRespond({
                question: analysisPrompt,
                type: 'form_intelligence'
            }, `form_analysis_${siteName}`);

            // Parse response
            let analysis;
            try {
                analysis = typeof response === 'string' ? JSON.parse(response) : response;
            } catch (e) {
                console.log(`⚠️ AI response parsing failed, creating fallback analysis`);
                analysis = this.createFallbackAnalysis(formData);
            }

            console.log(`🧠 AI Analysis completed with ${analysis.confidence || 0.5} confidence`);
            return analysis;

        } catch (error) {
            console.error(`❌ AI analysis failed: ${error.message}`);
            return this.createFallbackAnalysis(formData);
        }
    }

    /**
     * Create fallback analysis when AI fails
     */
    createFallbackAnalysis(formData) {
        const fields = formData.allFields.map((field, index) => {
            let purpose = 'unknown';
            let suggestedValue = 'DefaultValue';

            // Basic pattern matching as fallback
            const text = `${field.name} ${field.id} ${field.placeholder} ${field.labelText}`.toLowerCase();
            
            if (text.includes('email') && (text.includes('verify') || text.includes('confirm'))) purpose = 'confirmEmail';
            else if (text.includes('email')) purpose = 'email';
            else if (text.includes('name') && !text.includes('user')) purpose = 'firstName';
            else if (text.includes('first') || text.includes('fname')) purpose = 'firstName';
            else if (text.includes('last') || text.includes('lname')) purpose = 'lastName';
            else if (text.includes('pass')) purpose = 'password';
            else if (text.includes('phone')) purpose = 'phone';
            else if (text.includes('company')) purpose = 'company';
            else if (text.includes('terms') || text.includes('accept')) purpose = 'terms';

            return {
                fieldIndex: index,
                purpose: purpose,
                importance: field.required ? 'required' : 'optional',
                suggestedValue: suggestedValue,
                reasoning: 'Fallback pattern matching'
            };
        });

        return {
            analysis: 'Fallback analysis - AI unavailable',
            strategy: 'registration',
            confidence: 0.3,
            fields: fields,
            checkboxes: [],
            additionalNotes: 'Using basic pattern matching fallback'
        };
    }

    /**
     * Store form patterns for future learning
     */
    storeFormPattern(siteName, formData, analysis) {
        const pattern = {
            siteName: siteName,
            timestamp: Date.now(),
            fieldCount: formData.allFields.length,
            analysis: analysis,
            success: true
        };

        this.formMemory.set(siteName, pattern);
        console.log(`💾 Stored form pattern for ${siteName}`);
    }

    /**
     * Get stored patterns for a site
     */
    getStoredPattern(siteName) {
        return this.formMemory.get(siteName);
    }

    /**
     * Generate appropriate value for a field based on AI analysis
     */
    generateFieldValue(fieldPurpose, userData, fieldInfo) {
        switch (fieldPurpose) {
            case 'email':
                return userData.email;
            case 'confirmEmail':
                return userData.email;
            case 'firstName':
                return userData.firstName;
            case 'lastName':
                return userData.lastName;
            case 'password':
                return userData.password;
            case 'confirmPassword':
                return userData.password;
            case 'phone':
                return userData.phone;
            case 'company':
                return userData.company;
            case 'age':
                return userData.age.toString();
            case 'gender':
                return userData.gender;
            case 'city':
                return userData.city;
            case 'state':
                return userData.state;
            case 'country':
                return userData.country;
            case 'zipcode':
                return '12345';
            case 'address':
                return '123 Main Street';
            default:
                // For unknown fields, try to be smart about it
                if (fieldInfo.type === 'number') {
                    return '25';
                } else if (fieldInfo.type === 'tel') {
                    return userData.phone;
                } else if (fieldInfo.type === 'url') {
                    return 'https://example.com';
                } else {
                    return userData.firstName; // Safe default
                }
        }
    }
}

module.exports = IntelligentFormAnalyzer;