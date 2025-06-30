/**
 * Workflow Manager
 * Central orchestration for all workflow types
 */

const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const EventEmitter = require('events');

class WorkflowManager extends EventEmitter {
    constructor() {
        super();
        this.workflows = new Map();
        this.executionHistory = new Map();
    }

    /**
     * Create a new workflow record
     */
    async createWorkflow(workflowData) {
        const workflow = {
            id: workflowData.id || uuidv4(),
            type: workflowData.type,
            status: 'pending',
            config: workflowData.config,
            userId: workflowData.userId,
            sessionId: workflowData.sessionId,
            estimatedSteps: workflowData.estimatedSteps,
            currentStep: 0,
            progress: 0,
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null,
            results: null,
            error: null,
            metadata: workflowData.metadata || {}
        };

        this.workflows.set(workflow.id, workflow);
        
        console.log(`📋 Workflow created: ${workflow.id} (${workflow.type})`);
        this.emit('workflow:created', workflow);
        
        return workflow;
    }

    /**
     * Update workflow status
     */
    async updateWorkflowStatus(workflowId, status, additionalData = {}) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        const previousStatus = workflow.status;
        workflow.status = status;
        
        if (status === 'running' && !workflow.startedAt) {
            workflow.startedAt = new Date().toISOString();
        }
        
        if (['completed', 'failed', 'cancelled'].includes(status) && !workflow.completedAt) {
            workflow.completedAt = new Date().toISOString();
            workflow.duration = Date.now() - new Date(workflow.startedAt || workflow.createdAt).getTime();
        }

        // Merge additional data
        Object.assign(workflow, additionalData);

        console.log(`📊 Workflow ${workflowId} status: ${previousStatus} → ${status}`);
        this.emit('workflow:status_changed', { workflow, previousStatus, newStatus: status });

        return workflow;
    }

    /**
     * Update workflow progress
     */
    async updateWorkflowProgress(workflowId, progress, progressData = {}) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        workflow.progress = Math.min(100, Math.max(0, progress));
        workflow.progressData = progressData;
        workflow.lastUpdateAt = new Date().toISOString();

        console.log(`📈 Workflow ${workflowId} progress: ${workflow.progress.toFixed(1)}%`);
        this.emit('workflow:progress', { workflow, progress, progressData });

        return workflow;
    }

    /**
     * Complete a workflow with results
     */
    async completeWorkflow(workflowId, results) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        workflow.status = 'completed';
        workflow.progress = 100;
        workflow.results = results;
        workflow.completedAt = new Date().toISOString();
        
        if (workflow.startedAt) {
            workflow.duration = Date.now() - new Date(workflow.startedAt).getTime();
        }

        console.log(`✅ Workflow ${workflowId} completed successfully`);
        this.emit('workflow:completed', { workflow, results });

        // Store in execution history
        this.executionHistory.set(workflowId, {
            ...workflow,
            executionSummary: this.generateExecutionSummary(workflow, results)
        });

        return workflow;
    }

    /**
     * Cancel a running workflow
     */
    async cancelWorkflow(workflowId, reason) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            return { success: false, error: 'Workflow not found' };
        }

        if (!['pending', 'running'].includes(workflow.status)) {
            return { success: false, error: `Cannot cancel workflow in status: ${workflow.status}` };
        }

        workflow.status = 'cancelled';
        workflow.cancelledAt = new Date().toISOString();
        workflow.cancellationReason = reason;
        workflow.completedAt = workflow.cancelledAt;

        console.log(`🛑 Workflow ${workflowId} cancelled: ${reason}`);
        this.emit('workflow:cancelled', { workflow, reason });

        return { success: true, workflow };
    }

    /**
     * Get workflow status with optional details
     */
    async getWorkflowStatus(workflowId, includeDetails = false) {
        const workflow = this.workflows.get(workflowId);
        
        if (!workflow) {
            // Check execution history
            return this.executionHistory.get(workflowId) || null;
        }

        if (!includeDetails) {
            return {
                id: workflow.id,
                type: workflow.type,
                status: workflow.status,
                progress: workflow.progress,
                createdAt: workflow.createdAt,
                duration: workflow.duration
            };
        }

        return workflow;
    }

    /**
     * Get workflow results
     */
    async getWorkflowResults(workflowId, format = 'json') {
        const workflow = this.workflows.get(workflowId) || this.executionHistory.get(workflowId);
        
        if (!workflow || !workflow.results) {
            return null;
        }

        if (format === 'csv') {
            return this.convertResultsToCSV(workflow.results);
        }

        return workflow.results;
    }

    /**
     * List workflows with filtering
     */
    async listWorkflows(filters = {}) {
        let workflows = Array.from(this.workflows.values());
        
        // Add completed workflows from history
        const historyWorkflows = Array.from(this.executionHistory.values())
            .filter(w => !workflows.find(active => active.id === w.id));
        workflows = workflows.concat(historyWorkflows);

        // Apply filters
        if (filters.status) {
            workflows = workflows.filter(w => w.status === filters.status);
        }
        
        if (filters.type) {
            workflows = workflows.filter(w => w.type === filters.type);
        }
        
        if (filters.userId) {
            workflows = workflows.filter(w => w.userId === filters.userId);
        }

        // Sort by creation date (newest first)
        workflows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Pagination
        const total = workflows.length;
        const items = workflows.slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50));

        return {
            items,
            total,
            filtered: items.length
        };
    }

    /**
     * Generate execution summary
     */
    generateExecutionSummary(workflow, results) {
        const summary = {
            workflowType: workflow.type,
            status: workflow.status,
            duration: workflow.duration,
            stepsCompleted: workflow.currentStep,
            estimatedSteps: workflow.estimatedSteps,
            completionRate: workflow.estimatedSteps ? (workflow.currentStep / workflow.estimatedSteps * 100).toFixed(1) : 0
        };

        // Add type-specific summary data
        if (workflow.type === 'training' && results) {
            summary.training = {
                sitesProcessed: results.sitesProcessed,
                registrationsSuccessful: results.registrationsSuccessful,
                surveysCompleted: results.surveysCompleted,
                successRate: results.successRate,
                mlDataCaptured: results.mlDataCaptured
            };
        }

        return summary;
    }

    /**
     * Convert results to CSV format
     */
    convertResultsToCSV(results) {
        if (!results || typeof results !== 'object') {
            return 'No data available';
        }

        // Simple CSV conversion - can be enhanced
        const headers = Object.keys(results).join(',');
        const values = Object.values(results).map(v => 
            typeof v === 'object' ? JSON.stringify(v) : v
        ).join(',');

        return `${headers}\\n${values}`;
    }

    /**
     * Get system statistics
     */
    getSystemStats() {
        const activeWorkflows = Array.from(this.workflows.values());
        const completedWorkflows = Array.from(this.executionHistory.values());

        return {
            active: {
                total: activeWorkflows.length,
                running: activeWorkflows.filter(w => w.status === 'running').length,
                pending: activeWorkflows.filter(w => w.status === 'pending').length
            },
            completed: {
                total: completedWorkflows.length,
                successful: completedWorkflows.filter(w => w.status === 'completed').length,
                failed: completedWorkflows.filter(w => w.status === 'failed').length,
                cancelled: completedWorkflows.filter(w => w.status === 'cancelled').length
            },
            byType: this.getWorkflowTypeStats()
        };
    }

    /**
     * Get workflow statistics by type
     */
    getWorkflowTypeStats() {
        const allWorkflows = [
            ...Array.from(this.workflows.values()),
            ...Array.from(this.executionHistory.values())
        ];

        const stats = {};
        allWorkflows.forEach(workflow => {
            if (!stats[workflow.type]) {
                stats[workflow.type] = { total: 0, completed: 0, failed: 0 };
            }
            stats[workflow.type].total++;
            if (workflow.status === 'completed') stats[workflow.type].completed++;
            if (workflow.status === 'failed') stats[workflow.type].failed++;
        });

        return stats;
    }

    /**
     * Clean up old completed workflows
     */
    cleanupOldWorkflows(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        const cutoff = Date.now() - maxAge;
        
        for (const [id, workflow] of this.workflows) {
            if (['completed', 'failed', 'cancelled'].includes(workflow.status)) {
                const completedTime = new Date(workflow.completedAt).getTime();
                if (completedTime < cutoff) {
                    // Move to history if not already there
                    if (!this.executionHistory.has(id)) {
                        this.executionHistory.set(id, workflow);
                    }
                    this.workflows.delete(id);
                }
            }
        }
    }
}

module.exports = new WorkflowManager();