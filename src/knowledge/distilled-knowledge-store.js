/**
 * Distilled Knowledge Store
 * Hybrid storage system for learned knowledge base
 * 
 * Architecture:
 * - SQLite: Structured learning data, relationships, metrics
 * - Vector DB: Semantic patterns, embeddings, similarity search
 * - Memory Cache: Frequently accessed knowledge for speed
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const crypto = require('crypto');

class DistilledKnowledgeStore {
    constructor(config = {}) {
        this.config = {
            sqliteDbPath: config.sqliteDbPath || './knowledge/distilled-knowledge.db',
            vectorDbPath: config.vectorDbPath || './knowledge/vector-embeddings',
            cacheSize: config.cacheSize || 1000,
            embeddingDimensions: config.embeddingDimensions || 384,
            ...config
        };
        
        this.db = null;
        this.vectorStore = null;
        this.knowledgeCache = new Map();
        this.embeddingCache = new Map();
        
        this.knowledgeTypes = {
            SITE_PATTERNS: 'site_patterns',
            FORM_STRUCTURES: 'form_structures', 
            ERROR_SOLUTIONS: 'error_solutions',
            SUCCESS_STRATEGIES: 'success_strategies',
            PLATFORM_BEHAVIORS: 'platform_behaviors',
            AUTOMATION_RULES: 'automation_rules',
            META_LEARNING: 'meta_learning',
            VELOCITY_OPTIMIZATIONS: 'velocity_optimizations'
        };
    }

    /**
     * Initialize the hybrid knowledge store
     */
    async initialize() {
        console.log('🧠 INITIALIZING DISTILLED KNOWLEDGE STORE');
        console.log('='.repeat(60));
        
        await this.initializeSQLiteStore();
        await this.initializeVectorStore();
        await this.initializeKnowledgeSchemas();
        
        console.log('✅ Distilled knowledge store ready');
        
        return this;
    }

    /**
     * Initialize SQLite for structured knowledge data
     */
    async initializeSQLiteStore() {
        console.log('📊 Setting up SQLite knowledge store...');
        
        // Ensure knowledge directory exists
        const dbDir = require('path').dirname(this.config.sqliteDbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.db = new Database(this.config.sqliteDbPath);
        
        // Create knowledge tables
        await this.createKnowledgeTables();
        
        console.log('✅ SQLite knowledge store initialized');
    }

    /**
     * Initialize vector store for semantic knowledge
     */
    async initializeVectorStore() {
        console.log('🔢 Setting up vector knowledge store...');
        
        // Create vector storage directory
        if (!fs.existsSync(this.config.vectorDbPath)) {
            fs.mkdirSync(this.config.vectorDbPath, { recursive: true });
        }
        
        // Initialize simple file-based vector store (in production, use Pinecone/Weaviate/ChromaDB)
        this.vectorStore = {
            embeddings: new Map(),
            metadata: new Map(),
            indexPath: `${this.config.vectorDbPath}/vector-index.json`,
            embeddingsPath: `${this.config.vectorDbPath}/embeddings.json`
        };
        
        await this.loadVectorIndex();
        
        console.log('✅ Vector knowledge store initialized');
    }

    /**
     * Create SQLite tables for structured knowledge
     */
    async createKnowledgeTables() {
        const tables = [
            // Distilled site patterns
            `CREATE TABLE IF NOT EXISTS distilled_site_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pattern_id TEXT UNIQUE NOT NULL,
                pattern_type TEXT NOT NULL,
                site_domain TEXT,
                platform_type TEXT,
                pattern_data TEXT NOT NULL,
                confidence_score REAL,
                usage_count INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 0.0,
                last_validated DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                vector_embedding_id TEXT,
                tags TEXT,
                metadata TEXT
            )`,

            // Distilled form structures
            `CREATE TABLE IF NOT EXISTS distilled_form_structures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                structure_id TEXT UNIQUE NOT NULL,
                structure_type TEXT NOT NULL,
                complexity_level INTEGER,
                structure_signature TEXT,
                automation_strategy TEXT,
                field_mapping TEXT,
                success_indicators TEXT,
                failure_patterns TEXT,
                optimization_hints TEXT,
                confidence_score REAL,
                usage_frequency INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                vector_embedding_id TEXT
            )`,

            // Distilled error solutions
            `CREATE TABLE IF NOT EXISTS distilled_error_solutions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                solution_id TEXT UNIQUE NOT NULL,
                error_pattern TEXT NOT NULL,
                error_category TEXT,
                solution_strategy TEXT NOT NULL,
                success_probability REAL,
                implementation_complexity TEXT,
                prerequisite_conditions TEXT,
                side_effects TEXT,
                validation_method TEXT,
                usage_count INTEGER DEFAULT 0,
                last_successful DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                vector_embedding_id TEXT
            )`,

            // Distilled success strategies
            `CREATE TABLE IF NOT EXISTS distilled_success_strategies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                strategy_id TEXT UNIQUE NOT NULL,
                strategy_name TEXT NOT NULL,
                strategy_type TEXT,
                target_context TEXT,
                strategy_steps TEXT NOT NULL,
                success_rate REAL,
                avg_execution_time INTEGER,
                resource_requirements TEXT,
                optimization_level INTEGER,
                applicability_conditions TEXT,
                usage_count INTEGER DEFAULT 0,
                last_updated DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                vector_embedding_id TEXT
            )`,

            // Distilled platform behaviors
            `CREATE TABLE IF NOT EXISTS distilled_platform_behaviors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                behavior_id TEXT UNIQUE NOT NULL,
                platform_name TEXT NOT NULL,
                behavior_type TEXT,
                behavior_pattern TEXT NOT NULL,
                trigger_conditions TEXT,
                response_strategy TEXT,
                adaptation_rules TEXT,
                confidence_level REAL,
                observation_count INTEGER DEFAULT 0,
                last_observed DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                vector_embedding_id TEXT
            )`,

            // Distilled automation rules
            `CREATE TABLE IF NOT EXISTS distilled_automation_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_id TEXT UNIQUE NOT NULL,
                rule_name TEXT NOT NULL,
                rule_category TEXT,
                condition_pattern TEXT NOT NULL,
                action_sequence TEXT NOT NULL,
                priority_level INTEGER,
                execution_context TEXT,
                validation_criteria TEXT,
                rollback_strategy TEXT,
                performance_impact TEXT,
                usage_frequency INTEGER DEFAULT 0,
                effectiveness_score REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                vector_embedding_id TEXT
            )`,

            // Meta-learning insights
            `CREATE TABLE IF NOT EXISTS distilled_meta_learning (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                insight_id TEXT UNIQUE NOT NULL,
                insight_type TEXT NOT NULL,
                learning_context TEXT,
                insight_description TEXT NOT NULL,
                applicability_scope TEXT,
                implementation_guidance TEXT,
                validation_method TEXT,
                expected_improvement REAL,
                confidence_level REAL,
                discovery_iteration TEXT,
                usage_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                vector_embedding_id TEXT
            )`,

            // Velocity optimizations
            `CREATE TABLE IF NOT EXISTS distilled_velocity_optimizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                optimization_id TEXT UNIQUE NOT NULL,
                optimization_name TEXT NOT NULL,
                optimization_type TEXT,
                target_process TEXT,
                optimization_technique TEXT NOT NULL,
                speed_improvement_factor REAL,
                implementation_complexity TEXT,
                resource_overhead TEXT,
                compatibility_requirements TEXT,
                measurement_criteria TEXT,
                validation_results TEXT,
                usage_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                vector_embedding_id TEXT
            )`,

            // Knowledge relationships
            `CREATE TABLE IF NOT EXISTS knowledge_relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_knowledge_id TEXT NOT NULL,
                source_knowledge_type TEXT NOT NULL,
                target_knowledge_id TEXT NOT NULL,
                target_knowledge_type TEXT NOT NULL,
                relationship_type TEXT NOT NULL,
                relationship_strength REAL,
                relationship_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Knowledge usage analytics
            `CREATE TABLE IF NOT EXISTS knowledge_usage_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                knowledge_id TEXT NOT NULL,
                knowledge_type TEXT NOT NULL,
                usage_context TEXT,
                usage_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN,
                performance_metrics TEXT,
                user_feedback TEXT
            )`,

            // Knowledge validation results
            `CREATE TABLE IF NOT EXISTS knowledge_validation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                knowledge_id TEXT NOT NULL,
                knowledge_type TEXT NOT NULL,
                validation_type TEXT,
                validation_result BOOLEAN,
                validation_score REAL,
                validation_details TEXT,
                validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                validator_info TEXT
            )`
        ];

        tables.forEach(tableSQL => {
            this.db.exec(tableSQL);
        });

        console.log(`   📊 Created ${tables.length} knowledge tables`);
    }

    /**
     * Initialize knowledge schemas and indexes
     */
    async initializeKnowledgeSchemas() {
        console.log('📋 Setting up knowledge schemas and indexes...');
        
        // Create indexes for fast retrieval
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_site_patterns_domain ON distilled_site_patterns(site_domain)',
            'CREATE INDEX IF NOT EXISTS idx_site_patterns_type ON distilled_site_patterns(pattern_type)',
            'CREATE INDEX IF NOT EXISTS idx_form_structures_type ON distilled_form_structures(structure_type)',
            'CREATE INDEX IF NOT EXISTS idx_error_solutions_category ON distilled_error_solutions(error_category)',
            'CREATE INDEX IF NOT EXISTS idx_success_strategies_type ON distilled_success_strategies(strategy_type)',
            'CREATE INDEX IF NOT EXISTS idx_platform_behaviors_platform ON distilled_platform_behaviors(platform_name)',
            'CREATE INDEX IF NOT EXISTS idx_automation_rules_category ON distilled_automation_rules(rule_category)',
            'CREATE INDEX IF NOT EXISTS idx_meta_learning_type ON distilled_meta_learning(insight_type)',
            'CREATE INDEX IF NOT EXISTS idx_velocity_optimizations_type ON distilled_velocity_optimizations(optimization_type)',
            'CREATE INDEX IF NOT EXISTS idx_knowledge_relationships ON knowledge_relationships(source_knowledge_id, target_knowledge_id)',
            'CREATE INDEX IF NOT EXISTS idx_knowledge_usage ON knowledge_usage_analytics(knowledge_id, knowledge_type)'
        ];

        indexes.forEach(indexSQL => {
            this.db.exec(indexSQL);
        });

        console.log(`   📊 Created ${indexes.length} performance indexes`);
    }

    /**
     * Store distilled knowledge with automatic vectorization
     */
    async storeKnowledge(knowledgeType, knowledge) {
        console.log(`💾 Storing ${knowledgeType} knowledge: ${knowledge.name || knowledge.id}`);
        
        // Generate unique ID if not provided
        if (!knowledge.id) {
            knowledge.id = this.generateKnowledgeId(knowledgeType, knowledge);
        }

        // Store in SQLite
        const sqliteResult = await this.storeInSQLite(knowledgeType, knowledge);
        
        // Generate and store vector embedding
        const embedding = await this.generateEmbedding(knowledge);
        const vectorResult = await this.storeInVectorDB(knowledge.id, embedding, knowledge);
        
        // Update cache
        this.updateKnowledgeCache(knowledgeType, knowledge);
        
        // Create knowledge relationships
        await this.createKnowledgeRelationships(knowledgeType, knowledge);
        
        console.log(`   ✅ Knowledge stored: SQLite ID ${sqliteResult.lastInsertRowid}, Vector ID ${vectorResult.vectorId}`);
        
        return {
            knowledgeId: knowledge.id,
            sqliteId: sqliteResult.lastInsertRowid,
            vectorId: vectorResult.vectorId,
            knowledgeType: knowledgeType
        };
    }

    /**
     * Store knowledge in SQLite based on type
     */
    async storeInSQLite(knowledgeType, knowledge) {
        const tableName = this.getTableName(knowledgeType);
        const columns = this.getTableColumns(knowledgeType);
        
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => this.extractKnowledgeValue(knowledge, col));
        
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders})
        `);
        
        return stmt.run(...values);
    }

    /**
     * Generate vector embedding for knowledge
     */
    async generateEmbedding(knowledge) {
        // Simple TF-IDF based embedding (in production, use OpenAI/HuggingFace embeddings)
        const text = this.extractTextForEmbedding(knowledge);
        const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 2);
        
        // Create simple frequency-based embedding
        const vocabulary = ['automation', 'form', 'survey', 'pattern', 'strategy', 'error', 'success', 'platform', 'optimization', 'learning'];
        const embedding = new Array(this.config.embeddingDimensions).fill(0);
        
        words.forEach(word => {
            const vocabIndex = vocabulary.indexOf(word);
            if (vocabIndex !== -1) {
                embedding[vocabIndex % this.config.embeddingDimensions] += 1;
            }
            
            // Add positional encoding
            const hash = this.simpleHash(word) % this.config.embeddingDimensions;
            embedding[hash] += 0.1;
        });
        
        // Normalize embedding
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
    }

    /**
     * Store embedding in vector database
     */
    async storeInVectorDB(knowledgeId, embedding, metadata) {
        const vectorId = `vec_${knowledgeId}_${Date.now()}`;
        
        this.vectorStore.embeddings.set(vectorId, embedding);
        this.vectorStore.metadata.set(vectorId, {
            knowledgeId: knowledgeId,
            timestamp: new Date().toISOString(),
            metadata: metadata
        });
        
        await this.saveVectorIndex();
        
        return { vectorId };
    }

    /**
     * Retrieve knowledge by similarity search
     */
    async retrieveKnowledgeBySimilarity(queryText, knowledgeType = null, limit = 10) {
        console.log(`🔍 Searching knowledge by similarity: "${queryText.substring(0, 50)}..."`);
        
        // Generate query embedding
        const queryEmbedding = await this.generateEmbedding({ description: queryText });
        
        // Calculate similarities
        const similarities = [];
        
        for (const [vectorId, embedding] of this.vectorStore.embeddings) {
            const similarity = this.cosineSimilarity(queryEmbedding, embedding);
            const metadata = this.vectorStore.metadata.get(vectorId);
            
            if (similarity > 0.1) { // Threshold for relevance
                similarities.push({
                    vectorId,
                    knowledgeId: metadata.knowledgeId,
                    similarity,
                    metadata: metadata.metadata
                });
            }
        }
        
        // Sort by similarity and limit results
        const topResults = similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
        
        // Retrieve full knowledge from SQLite
        const fullKnowledge = [];
        for (const result of topResults) {
            const knowledge = await this.retrieveKnowledgeById(result.knowledgeId, knowledgeType);
            if (knowledge) {
                fullKnowledge.push({
                    ...knowledge,
                    similarity: result.similarity,
                    vectorId: result.vectorId
                });
            }
        }
        
        console.log(`   📊 Found ${fullKnowledge.length} similar knowledge items`);
        return fullKnowledge;
    }

    /**
     * Retrieve knowledge by ID
     */
    async retrieveKnowledgeById(knowledgeId, knowledgeType = null) {
        // Check cache first
        const cacheKey = `${knowledgeType || 'any'}_${knowledgeId}`;
        if (this.knowledgeCache.has(cacheKey)) {
            return this.knowledgeCache.get(cacheKey);
        }
        
        // Query SQLite
        const tables = knowledgeType ? [this.getTableName(knowledgeType)] : this.getAllTableNames();
        
        for (const tableName of tables) {
            try {
                const stmt = this.db.prepare(`SELECT * FROM ${tableName} WHERE ${this.getIdColumn(tableName)} = ?`);
                const result = stmt.get(knowledgeId);
                
                if (result) {
                    // Parse JSON fields
                    const knowledge = this.parseKnowledgeResult(result, tableName);
                    
                    // Update cache
                    this.knowledgeCache.set(cacheKey, knowledge);
                    
                    return knowledge;
                }
            } catch (error) {
                // Table might not exist or other error, continue
            }
        }
        
        return null;
    }

    /**
     * Retrieve knowledge by pattern matching
     */
    async retrieveKnowledgeByPattern(pattern, knowledgeType = null) {
        console.log(`🎯 Searching knowledge by pattern: ${JSON.stringify(pattern)}`);
        
        const results = [];
        const tables = knowledgeType ? [this.getTableName(knowledgeType)] : this.getAllTableNames();
        
        for (const tableName of tables) {
            const searchFields = this.getSearchableFields(tableName);
            const conditions = [];
            const values = [];
            
            Object.entries(pattern).forEach(([key, value]) => {
                if (searchFields.includes(key)) {
                    conditions.push(`${key} LIKE ?`);
                    values.push(`%${value}%`);
                }
            });
            
            if (conditions.length > 0) {
                const query = `SELECT * FROM ${tableName} WHERE ${conditions.join(' AND ')} ORDER BY confidence_score DESC, usage_count DESC LIMIT 20`;
                const stmt = this.db.prepare(query);
                const tableResults = stmt.all(...values);
                
                tableResults.forEach(result => {
                    results.push(this.parseKnowledgeResult(result, tableName));
                });
            }
        }
        
        console.log(`   📊 Found ${results.length} matching knowledge items`);
        return results;
    }

    /**
     * Update knowledge usage and validation
     */
    async updateKnowledgeUsage(knowledgeId, knowledgeType, usage) {
        // Record usage
        const usageStmt = this.db.prepare(`
            INSERT INTO knowledge_usage_analytics 
            (knowledge_id, knowledge_type, usage_context, success, performance_metrics, user_feedback)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        usageStmt.run(
            knowledgeId,
            knowledgeType,
            JSON.stringify(usage.context || {}),
            usage.success ? 1 : 0,
            JSON.stringify(usage.metrics || {}),
            usage.feedback || null
        );
        
        // Update knowledge statistics
        const tableName = this.getTableName(knowledgeType);
        const updateStmt = this.db.prepare(`
            UPDATE ${tableName} 
            SET usage_count = usage_count + 1,
                last_updated = CURRENT_TIMESTAMP
            WHERE ${this.getIdColumn(tableName)} = ?
        `);
        
        updateStmt.run(knowledgeId);
        
        // Clear cache for updated knowledge
        const cacheKey = `${knowledgeType}_${knowledgeId}`;
        this.knowledgeCache.delete(cacheKey);
        
        console.log(`📊 Updated usage for ${knowledgeType} knowledge: ${knowledgeId}`);
    }

    /**
     * Validate knowledge effectiveness
     */
    async validateKnowledge(knowledgeId, knowledgeType, validation) {
        const validationStmt = this.db.prepare(`
            INSERT INTO knowledge_validation
            (knowledge_id, knowledge_type, validation_type, validation_result, validation_score, validation_details, validator_info)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        validationStmt.run(
            knowledgeId,
            knowledgeType,
            validation.type,
            validation.result ? 1 : 0,
            validation.score || 0,
            JSON.stringify(validation.details || {}),
            validation.validator || 'system'
        );
        
        console.log(`✅ Validated ${knowledgeType} knowledge: ${knowledgeId} (${validation.result ? 'PASS' : 'FAIL'})`);
    }

    /**
     * Get knowledge recommendations based on context
     */
    async getKnowledgeRecommendations(context, limit = 5) {
        console.log(`💡 Getting knowledge recommendations for context: ${JSON.stringify(context)}`);
        
        const recommendations = [];
        
        // Context-based recommendations
        if (context.errorType) {
            const errorSolutions = await this.retrieveKnowledgeByPattern(
                { error_category: context.errorType },
                this.knowledgeTypes.ERROR_SOLUTIONS
            );
            recommendations.push(...errorSolutions.slice(0, 2));
        }
        
        if (context.platformType) {
            const platformBehaviors = await this.retrieveKnowledgeByPattern(
                { platform_name: context.platformType },
                this.knowledgeTypes.PLATFORM_BEHAVIORS
            );
            recommendations.push(...platformBehaviors.slice(0, 2));
        }
        
        if (context.formComplexity) {
            const formStrategies = await this.retrieveKnowledgeByPattern(
                { complexity_level: context.formComplexity },
                this.knowledgeTypes.FORM_STRUCTURES
            );
            recommendations.push(...formStrategies.slice(0, 2));
        }
        
        // Similarity-based recommendations
        const contextText = Object.values(context).join(' ');
        const similarKnowledge = await this.retrieveKnowledgeBySimilarity(contextText, null, 3);
        recommendations.push(...similarKnowledge);
        
        // Deduplicate and sort by relevance
        const uniqueRecommendations = recommendations
            .filter((item, index, arr) => arr.findIndex(other => other.id === item.id) === index)
            .sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0))
            .slice(0, limit);
        
        console.log(`   💡 Generated ${uniqueRecommendations.length} knowledge recommendations`);
        return uniqueRecommendations;
    }

    /**
     * Export knowledge for analysis or backup
     */
    async exportKnowledge(knowledgeType = null, format = 'json') {
        console.log(`📤 Exporting knowledge (type: ${knowledgeType || 'all'}, format: ${format})`);
        
        const exportData = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            knowledgeTypes: {},
            vectorEmbeddings: {},
            relationships: [],
            analytics: {}
        };
        
        // Export structured knowledge
        const tables = knowledgeType ? [this.getTableName(knowledgeType)] : this.getAllTableNames();
        
        for (const tableName of tables) {
            try {
                const stmt = this.db.prepare(`SELECT * FROM ${tableName}`);
                const data = stmt.all();
                exportData.knowledgeTypes[tableName] = data.map(row => this.parseKnowledgeResult(row, tableName));
            } catch (error) {
                console.log(`   ⚠️ Failed to export ${tableName}: ${error.message}`);
            }
        }
        
        // Export vector embeddings
        exportData.vectorEmbeddings = Object.fromEntries(this.vectorStore.embeddings);
        
        // Export relationships
        const relationshipStmt = this.db.prepare('SELECT * FROM knowledge_relationships');
        exportData.relationships = relationshipStmt.all();
        
        // Export analytics
        const analyticsStmt = this.db.prepare(`
            SELECT knowledge_type, COUNT(*) as count, AVG(usage_count) as avg_usage
            FROM knowledge_usage_analytics 
            GROUP BY knowledge_type
        `);
        exportData.analytics = analyticsStmt.all();
        
        const filename = `knowledge-export-${knowledgeType || 'all'}-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
        
        console.log(`   📄 Knowledge exported to: ${filename}`);
        return filename;
    }

    // Helper methods
    generateKnowledgeId(knowledgeType, knowledge) {
        const content = JSON.stringify(knowledge);
        return crypto.createHash('md5').update(content).digest('hex').substring(0, 16);
    }

    getTableName(knowledgeType) {
        const tableMap = {
            [this.knowledgeTypes.SITE_PATTERNS]: 'distilled_site_patterns',
            [this.knowledgeTypes.FORM_STRUCTURES]: 'distilled_form_structures',
            [this.knowledgeTypes.ERROR_SOLUTIONS]: 'distilled_error_solutions',
            [this.knowledgeTypes.SUCCESS_STRATEGIES]: 'distilled_success_strategies',
            [this.knowledgeTypes.PLATFORM_BEHAVIORS]: 'distilled_platform_behaviors',
            [this.knowledgeTypes.AUTOMATION_RULES]: 'distilled_automation_rules',
            [this.knowledgeTypes.META_LEARNING]: 'distilled_meta_learning',
            [this.knowledgeTypes.VELOCITY_OPTIMIZATIONS]: 'distilled_velocity_optimizations'
        };
        return tableMap[knowledgeType] || 'distilled_site_patterns';
    }

    getAllTableNames() {
        return [
            'distilled_site_patterns',
            'distilled_form_structures', 
            'distilled_error_solutions',
            'distilled_success_strategies',
            'distilled_platform_behaviors',
            'distilled_automation_rules',
            'distilled_meta_learning',
            'distilled_velocity_optimizations'
        ];
    }

    getTableColumns(knowledgeType) {
        // Return appropriate column names based on knowledge type
        const columnMap = {
            [this.knowledgeTypes.SITE_PATTERNS]: [
                'pattern_id', 'pattern_type', 'site_domain', 'platform_type', 
                'pattern_data', 'confidence_score', 'usage_count', 'success_rate',
                'vector_embedding_id', 'tags', 'metadata'
            ],
            [this.knowledgeTypes.FORM_STRUCTURES]: [
                'structure_id', 'structure_type', 'complexity_level', 'structure_signature',
                'automation_strategy', 'field_mapping', 'success_indicators', 'failure_patterns',
                'optimization_hints', 'confidence_score', 'usage_frequency', 'vector_embedding_id'
            ],
            [this.knowledgeTypes.ERROR_SOLUTIONS]: [
                'solution_id', 'error_pattern', 'error_category', 'solution_strategy',
                'success_probability', 'implementation_complexity', 'prerequisite_conditions',
                'side_effects', 'validation_method', 'usage_count', 'vector_embedding_id'
            ],
            [this.knowledgeTypes.SUCCESS_STRATEGIES]: [
                'strategy_id', 'strategy_name', 'strategy_type', 'target_context',
                'strategy_steps', 'success_rate', 'avg_execution_time', 'resource_requirements',
                'optimization_level', 'applicability_conditions', 'usage_count', 'vector_embedding_id'
            ],
            [this.knowledgeTypes.PLATFORM_BEHAVIORS]: [
                'behavior_id', 'platform_name', 'behavior_type', 'behavior_pattern',
                'trigger_conditions', 'response_strategy', 'adaptation_rules', 'confidence_level',
                'observation_count', 'vector_embedding_id'
            ],
            [this.knowledgeTypes.AUTOMATION_RULES]: [
                'rule_id', 'rule_name', 'rule_category', 'condition_pattern',
                'action_sequence', 'priority_level', 'execution_context', 'validation_criteria',
                'rollback_strategy', 'performance_impact', 'usage_frequency', 'effectiveness_score',
                'vector_embedding_id'
            ],
            [this.knowledgeTypes.META_LEARNING]: [
                'insight_id', 'insight_type', 'learning_context', 'insight_description',
                'applicability_scope', 'implementation_guidance', 'validation_method',
                'expected_improvement', 'confidence_level', 'discovery_iteration', 'usage_count',
                'vector_embedding_id'
            ],
            [this.knowledgeTypes.VELOCITY_OPTIMIZATIONS]: [
                'optimization_id', 'optimization_name', 'optimization_type', 'target_process',
                'optimization_technique', 'speed_improvement_factor', 'implementation_complexity',
                'resource_overhead', 'compatibility_requirements', 'measurement_criteria',
                'validation_results', 'usage_count', 'vector_embedding_id'
            ]
        };
        
        return columnMap[knowledgeType] || columnMap[this.knowledgeTypes.SITE_PATTERNS];
    }

    getIdColumn(tableName) {
        const idColumnMap = {
            'distilled_site_patterns': 'pattern_id',
            'distilled_form_structures': 'structure_id',
            'distilled_error_solutions': 'solution_id',
            'distilled_success_strategies': 'strategy_id',
            'distilled_platform_behaviors': 'behavior_id',
            'distilled_automation_rules': 'rule_id',
            'distilled_meta_learning': 'insight_id',
            'distilled_velocity_optimizations': 'optimization_id'
        };
        return idColumnMap[tableName] || 'id';
    }

    getSearchableFields(tableName) {
        // Return searchable text fields for pattern matching
        return ['pattern_type', 'pattern_data', 'description', 'strategy_name', 'error_pattern'];
    }

    extractKnowledgeValue(knowledge, column) {
        // Extract and format values for SQLite storage
        if (typeof knowledge[column] === 'object') {
            return JSON.stringify(knowledge[column]);
        }
        return knowledge[column] || null;
    }

    extractTextForEmbedding(knowledge) {
        // Extract meaningful text for vector embedding
        const textFields = ['name', 'description', 'pattern_data', 'strategy_steps', 'error_pattern'];
        return textFields
            .map(field => knowledge[field] || '')
            .filter(text => text.length > 0)
            .join(' ');
    }

    parseKnowledgeResult(result, tableName) {
        // Parse JSON fields and format result
        const parsed = { ...result };
        
        // Parse JSON fields
        const jsonFields = ['pattern_data', 'metadata', 'tags', 'strategy_steps'];
        jsonFields.forEach(field => {
            if (parsed[field] && typeof parsed[field] === 'string') {
                try {
                    parsed[field] = JSON.parse(parsed[field]);
                } catch (error) {
                    // Keep as string if parsing fails
                }
            }
        });
        
        return parsed;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    cosineSimilarity(vecA, vecB) {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
    }

    updateKnowledgeCache(knowledgeType, knowledge) {
        const cacheKey = `${knowledgeType}_${knowledge.id}`;
        this.knowledgeCache.set(cacheKey, knowledge);
        
        // Maintain cache size limit
        if (this.knowledgeCache.size > this.config.cacheSize) {
            const firstKey = this.knowledgeCache.keys().next().value;
            this.knowledgeCache.delete(firstKey);
        }
    }

    async createKnowledgeRelationships(knowledgeType, knowledge) {
        // Create relationships with similar knowledge automatically
        // This is a simplified implementation - in production, use more sophisticated relationship detection
    }

    async loadVectorIndex() {
        try {
            if (fs.existsSync(this.vectorStore.indexPath)) {
                const indexData = JSON.parse(fs.readFileSync(this.vectorStore.indexPath, 'utf8'));
                this.vectorStore.embeddings = new Map(Object.entries(indexData.embeddings || {}));
                this.vectorStore.metadata = new Map(Object.entries(indexData.metadata || {}));
            }
        } catch (error) {
            console.log('⚠️ No existing vector index found, starting fresh');
        }
    }

    async saveVectorIndex() {
        const indexData = {
            embeddings: Object.fromEntries(this.vectorStore.embeddings),
            metadata: Object.fromEntries(this.vectorStore.metadata),
            lastUpdated: new Date().toISOString()
        };
        
        fs.writeFileSync(this.vectorStore.indexPath, JSON.stringify(indexData, null, 2));
    }

    async close() {
        if (this.db) {
            this.db.close();
        }
        await this.saveVectorIndex();
    }
}

module.exports = DistilledKnowledgeStore;