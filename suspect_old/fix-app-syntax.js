#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 FIXING APP.JS SYNTAX ERRORS');
console.log('===============================');

let content = fs.readFileSync('./app.js', 'utf8');

// Remove all broken bind patterns
const brokenPatterns = [
    /\.bind\(this\)\)/g,
    /\}\.\bind\(this\)/g,
    /\{\w+\}\.bind\(this\)/g,
    /\(.*\)\.bind\(this\)\.bind\(this\)/g
];

brokenPatterns.forEach((pattern, i) => {
    const matches = content.match(pattern);
    if (matches) {
        console.log(`Found ${matches.length} broken pattern ${i + 1}: ${pattern}`);
    }
});

// Fix specific broken patterns
content = content.replace(/\.bind\(this\)\)/g, ')');
content = content.replace(/\}\.bind\(this\)/g, '}');
content = content.replace(/\{\w+\}\.bind\(this\)/g, function(match) {
    return match.replace('.bind(this)', '');
});

// Remove double binds
content = content.replace(/\.bind\(this\)\.bind\(this\)/g, '.bind(this)');

// Remove any remaining malformed binds inside object literals
content = content.replace(/(\{[^}]*)\}\.bind\(this\)/g, '$1}');

fs.writeFileSync('./app.js', content);

// Test syntax
try {
    require('./app.js');
    console.log('✅ Syntax errors fixed - app loads successfully');
} catch (error) {
    console.log('❌ Still has syntax errors:', error.message);
}