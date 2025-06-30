/**
 * Fix Missing SQLite3 Imports
 * Adds missing sqlite3 imports to all database-related files
 */

const fs = require('fs');
const path = require('path');

class SQLite3ImportFixer {
    constructor() {
        this.fixedFiles = [];
        this.errors = [];
    }

    async fixAllImports() {
        console.log('🔧 Fixing missing sqlite3 imports...');
        
        // Find all JavaScript files that might need sqlite3
        const filesToCheck = [
            'src/services/page-analysis-logger.js',
            'src/database/*.js',
            'src/services/*.js'
        ];
        
        const jsFiles = await this.findJavaScriptFiles();
        
        for (const file of jsFiles) {
            try {
                await this.fixFileIfNeeded(file);
            } catch (error) {
                this.errors.push({ file, error: error.message });
            }
        }
        
        this.generateReport();
    }

    async findJavaScriptFiles() {
        const files = [];
        
        // Check specific directories
        const dirsToCheck = [
            'src/database',
            'src/services'
        ];
        
        for (const dir of dirsToCheck) {
            if (fs.existsSync(dir)) {
                const dirFiles = fs.readdirSync(dir)
                    .filter(file => file.endsWith('.js'))
                    .map(file => path.join(dir, file));
                files.push(...dirFiles);
            }
        }
        
        return files;
    }

    async fixFileIfNeeded(filePath) {
        if (!fs.existsSync(filePath)) return;
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if file uses sqlite3 but doesn't import it
        const usesSqlite3 = content.includes('new sqlite3.Database') || 
                           content.includes('sqlite3.Database') ||
                           content.includes('sqlite3.OPEN_');
        
        const hasImport = content.includes("require('sqlite3')") ||
                         content.includes('require("sqlite3")');
        
        if (usesSqlite3 && !hasImport) {
            console.log(`🔧 Fixing: ${filePath}`);
            
            // Find the right place to add the import
            const lines = content.split('\n');
            let insertIndex = 0;
            
            // Find last require statement or first const/class
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('require(') && !lines[i].includes('sqlite3')) {
                    insertIndex = i + 1;
                } else if (lines[i].includes('class ') || lines[i].includes('function ')) {
                    break;
                }
            }
            
            // Insert the sqlite3 import
            lines.splice(insertIndex, 0, "const sqlite3 = require('sqlite3').verbose();");
            
            const newContent = lines.join('\n');
            fs.writeFileSync(filePath, newContent);
            
            this.fixedFiles.push(filePath);
        }
    }

    generateReport() {
        console.log('\n📊 SQLite3 Import Fix Report');
        console.log('===========================');
        
        if (this.fixedFiles.length > 0) {
            console.log(`✅ Fixed ${this.fixedFiles.length} files:`);
            this.fixedFiles.forEach(file => console.log(`   - ${file}`));
        } else {
            console.log('✅ No files needed fixing');
        }
        
        if (this.errors.length > 0) {
            console.log(`❌ ${this.errors.length} errors encountered:`);
            this.errors.forEach(({ file, error }) => {
                console.log(`   - ${file}: ${error}`);
            });
        }
        
        console.log('\n🎉 SQLite3 import fixing complete!');
    }
}

async function main() {
    const fixer = new SQLite3ImportFixer();
    await fixer.fixAllImports();
}

if (require.main === module) {
    main();
}

module.exports = SQLite3ImportFixer;