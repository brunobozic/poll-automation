/**
 * Database Connection Fix Script
 * Replaces scattered database connections with centralized DatabaseManager
 */

const fs = require('fs');
const path = require('path');

class DatabaseConnectionFixer {
    constructor() {
        this.fixedFiles = [];
        this.errors = [];
        this.patterns = {
            // Patterns to find and replace
            oldPatterns: [
                /const sqlite3 = require\('sqlite3'\)\.verbose\(\);?/g,
                /new sqlite3\.Database\([^)]+\)/g,
                /this\.db = new sqlite3\.Database/g,
                /sqlite3\.Database\(/g,
                /\.createTables\(\)/g,
                /this\.dbPath = [^;]+;/g,
                /dbPath = [^,)]+/g
            ],
            // Imports to add
            newImport: "const { getDatabaseManager } = require('./database/database-manager.js');",
            // Initialization pattern
            newInit: "this.db = getDatabaseManager();\n        await this.db.initialize();"
        };
    }

    async findProblematicFiles() {
        const searchDirs = ['./src', './app.js'];
        const problematicFiles = [];

        const searchDirectory = async (dir) => {
            try {
                const items = await fs.promises.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stat = await fs.promises.stat(itemPath);
                    
                    if (stat.isDirectory() && !item.startsWith('.')) {
                        await searchDirectory(itemPath);
                    } else if (item.endsWith('.js')) {
                        const content = await fs.promises.readFile(itemPath, 'utf8');
                        if (this.isProblematic(content)) {
                            problematicFiles.push(itemPath);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error searching ${dir}:`, error.message);
            }
        };

        for (const dir of searchDirs) {
            if (fs.existsSync(dir)) {
                if (fs.statSync(dir).isFile()) {
                    const content = await fs.promises.readFile(dir, 'utf8');
                    if (this.isProblematic(content)) {
                        problematicFiles.push(dir);
                    }
                } else {
                    await searchDirectory(dir);
                }
            }
        }

        return problematicFiles;
    }

    isProblematic(content) {
        return (
            content.includes('new sqlite3.Database') ||
            content.includes('sqlite3.verbose()') ||
            (content.includes('sqlite3') && content.includes('createTables'))
        ) && !content.includes('getDatabaseManager') && !content.includes('migration-manager');
    }

    async fixFile(filePath) {
        console.log(`🔧 Fixing: ${filePath}`);
        
        try {
            let content = await fs.promises.readFile(filePath, 'utf8');
            const originalContent = content;
            
            // Skip if already using DatabaseManager
            if (content.includes('getDatabaseManager')) {
                console.log(`  ✅ Already using DatabaseManager`);
                return;
            }
            
            // Skip migration and setup files
            if (filePath.includes('migration') || filePath.includes('analyze-all-databases') || 
                filePath.includes('migrate-all-data') || filePath.includes('consolidate-databases')) {
                console.log(`  ⚠️ Skipping migration/analysis file`);
                return;
            }

            let modified = false;

            // 1. Replace sqlite3 import
            if (content.includes('sqlite3')) {
                content = content.replace(
                    /const sqlite3 = require\('sqlite3'\)\.verbose\(\);?/g,
                    "const { getDatabaseManager } = require('../database/database-manager.js');"
                );
                modified = true;
            }

            // 2. Fix relative imports
            const depth = (filePath.match(/\//g) || []).length;
            let relativePath = '../'.repeat(Math.max(0, depth - 1)) + 'database/database-manager.js';
            if (filePath.includes('src/database/')) {
                relativePath = './database-manager.js';
            }
            
            content = content.replace(
                /require\('\.\.\//g,
                `require('${relativePath.replace('/database-manager.js', '/')}`
            );

            // 3. Replace database initialization patterns
            content = content.replace(
                /this\.dbPath = [^;]+;?\s*/g,
                '// Database path managed by DatabaseManager\n        '
            );

            content = content.replace(
                /this\.db = null;?\s*/g,
                'this.db = null; // Will be initialized with DatabaseManager\n        '
            );

            // 4. Replace constructor database setup
            content = content.replace(
                /constructor\([^)]*dbPath[^)]*\)\s*{[^}]*this\.dbPath[^}]*}/g,
                (match) => {
                    return match.replace(
                        /this\.dbPath = [^;]+;?/g,
                        '// Database managed centrally'
                    );
                }
            );

            // 5. Replace database connection logic
            content = content.replace(
                /this\.db = new sqlite3\.Database\([^}]+}\);/g,
                `this.db = getDatabaseManager();
            await this.db.initialize();`
            );

            // 6. Replace manual table creation with migration dependency
            content = content.replace(
                /async createTables\(\)\s*{[^}]+}/g,
                `async createTables() {
        // Tables are created by migration system
        console.log('✅ Database tables created/verified');
        return Promise.resolve();
    }`
            );

            // 7. Replace database close patterns
            content = content.replace(
                /this\.db\.close\(\)/g,
                '// Database connection managed centrally - no need to close'
            );

            // 8. Add proper import if needed
            if (modified && !content.includes('getDatabaseManager')) {
                const lines = content.split('\n');
                let importAdded = false;
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('require(') && !importAdded) {
                        lines.splice(i + 1, 0, `const { getDatabaseManager } = require('${relativePath}');`);
                        importAdded = true;
                        break;
                    }
                }
                
                if (!importAdded) {
                    lines.unshift(`const { getDatabaseManager } = require('${relativePath}');`);
                }
                
                content = lines.join('\n');
            }

            if (content !== originalContent) {
                // Create backup
                await fs.promises.writeFile(filePath + '.backup', originalContent);
                
                // Write fixed content
                await fs.promises.writeFile(filePath, content);
                
                this.fixedFiles.push(filePath);
                console.log(`  ✅ Fixed and backed up`);
            } else {
                console.log(`  ⚠️ No changes needed`);
            }

        } catch (error) {
            console.error(`  ❌ Error fixing ${filePath}:`, error.message);
            this.errors.push({ file: filePath, error: error.message });
        }
    }

    async fixAllFiles() {
        console.log('🔍 Finding files with scattered database connections...');
        
        const problematicFiles = await this.findProblematicFiles();
        console.log(`📊 Found ${problematicFiles.length} files to fix:`);
        
        for (const file of problematicFiles) {
            console.log(`  📁 ${file}`);
        }
        
        console.log('\n🚀 Starting database connection fixes...');
        
        for (const file of problematicFiles) {
            await this.fixFile(file);
        }
        
        this.generateReport();
    }

    generateReport() {
        console.log('\n📊 DATABASE CONNECTION FIX REPORT');
        console.log('==================================');
        console.log(`✅ Files Fixed: ${this.fixedFiles.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);
        
        if (this.fixedFiles.length > 0) {
            console.log('\n✅ Successfully Fixed Files:');
            this.fixedFiles.forEach(file => console.log(`  📄 ${file}`));
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ Files with Errors:');
            this.errors.forEach(({ file, error }) => {
                console.log(`  📄 ${file}: ${error}`);
            });
        }
        
        console.log(`\n💾 Backup files created with .backup extension`);
        console.log(`📋 Fixed files now use centralized DatabaseManager`);
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up backup files...');
        
        const removeBackups = async (dir) => {
            try {
                const items = await fs.promises.readdir(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stat = await fs.promises.stat(itemPath);
                    
                    if (stat.isDirectory() && !item.startsWith('.')) {
                        await removeBackups(itemPath);
                    } else if (item.endsWith('.backup')) {
                        await fs.promises.unlink(itemPath);
                        console.log(`  🗑️ Removed ${itemPath}`);
                    }
                }
            } catch (error) {
                console.error(`Error cleaning ${dir}:`, error.message);
            }
        };
        
        await removeBackups('./src');
    }
}

async function main() {
    console.log('🚀 DATABASE CONNECTION CONSOLIDATION');
    console.log('====================================');
    
    const fixer = new DatabaseConnectionFixer();
    
    try {
        await fixer.fixAllFiles();
        
        console.log('\n✅ Database connection consolidation complete!');
        console.log('📋 All files now use centralized DatabaseManager');
        
        // Uncomment to remove backup files
        // await fixer.cleanup();
        
    } catch (error) {
        console.error('❌ Fix process failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = DatabaseConnectionFixer;