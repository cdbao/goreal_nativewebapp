/**
 * GitHub API Log Retrieval Script
 * Fetches failed workflow logs for automated debugging
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

class GitHubLogRetriever {
    constructor(token, owner, repo) {
        this.octokit = new Octokit({ auth: token });
        this.owner = owner;
        this.repo = repo;
    }

    /**
     * Get the latest workflow run for a specific workflow
     */
    async getLatestWorkflowRun(workflowId = 'ci.yml') {
        try {
            console.log(`🔍 Fetching latest workflow run for ${workflowId}...`);
            
            const { data: runs } = await this.octokit.rest.actions.listWorkflowRuns({
                owner: this.owner,
                repo: this.repo,
                workflow_id: workflowId,
                per_page: 1,
                status: 'failure'
            });

            if (runs.workflow_runs.length === 0) {
                console.log('✅ No failed workflow runs found');
                return null;
            }

            const latestRun = runs.workflow_runs[0];
            console.log(`📋 Found failed run: ${latestRun.id} (${latestRun.head_sha.substring(0, 7)})`);
            
            return latestRun;
        } catch (error) {
            console.error('❌ Error fetching workflow runs:', error.message);
            throw error;
        }
    }

    /**
     * Get all jobs for a workflow run
     */
    async getWorkflowJobs(runId) {
        try {
            console.log(`🔍 Fetching jobs for run ${runId}...`);
            
            const { data: jobs } = await this.octokit.rest.actions.listJobsForWorkflowRun({
                owner: this.owner,
                repo: this.repo,
                run_id: runId
            });

            const failedJobs = jobs.jobs.filter(job => job.conclusion === 'failure');
            console.log(`📊 Found ${failedJobs.length} failed jobs out of ${jobs.jobs.length} total`);

            return { allJobs: jobs.jobs, failedJobs };
        } catch (error) {
            console.error('❌ Error fetching workflow jobs:', error.message);
            throw error;
        }
    }

    /**
     * Download logs for a specific job
     */
    async downloadJobLogs(jobId, jobName) {
        try {
            console.log(`📥 Downloading logs for job: ${jobName} (${jobId})`);
            
            const { data: logData } = await this.octokit.rest.actions.downloadJobLogsForWorkflowRun({
                owner: this.owner,
                repo: this.repo,
                job_id: jobId
            });

            return logData;
        } catch (error) {
            console.error(`❌ Error downloading logs for job ${jobName}:`, error.message);
            throw error;
        }
    }

    /**
     * Parse log data to extract error information
     */
    parseLogForErrors(logText, jobName) {
        const errorPatterns = [
            // Python errors
            { type: 'python_error', pattern: /(Error|Exception): (.+)/g },
            { type: 'python_traceback', pattern: /Traceback \(most recent call last\):([\s\S]*?)(?=\n\S|\n$)/g },
            
            // Test failures
            { type: 'test_failure', pattern: /FAILED (.+?) - (.+)/g },
            { type: 'assertion_error', pattern: /AssertionError: (.+)/g },
            
            // Linting errors
            { type: 'flake8_error', pattern: /(.+?):(\d+):(\d+): ([EWF]\d+) (.+)/g },
            { type: 'black_error', pattern: /would reformat (.+)/g },
            
            // Build errors
            { type: 'npm_error', pattern: /npm ERR! (.+)/g },
            { type: 'compilation_error', pattern: /Error: (.+)/g },
            
            // Security scan errors
            { type: 'security_issue', pattern: /(HIGH|CRITICAL|MEDIUM): (.+)/g },
            
            // Generic failures
            { type: 'generic_failure', pattern: /Error: (.+)/g }
        ];

        const extractedErrors = [];
        const lines = logText.split('\n');

        errorPatterns.forEach(({ type, pattern }) => {
            let match;
            while ((match = pattern.exec(logText)) !== null) {
                extractedErrors.push({
                    type,
                    message: match[0],
                    groups: match.slice(1),
                    jobName
                });
            }
        });

        // Extract file paths and line numbers
        const fileReferences = [];
        lines.forEach((line, index) => {
            const filePathMatch = line.match(/([^\/\s]+\.(?:py|js|ts|tsx|jsx|json|yml|yaml)):(\d+)/);
            if (filePathMatch) {
                fileReferences.push({
                    file: filePathMatch[1],
                    line: parseInt(filePathMatch[2]),
                    context: line,
                    logLine: index + 1
                });
            }
        });

        return {
            errors: extractedErrors,
            fileReferences,
            rawLog: logText,
            jobName
        };
    }

    /**
     * Main function to retrieve and analyze logs
     */
    async retrieveFailedWorkflowLogs(workflowId = 'ci.yml') {
        try {
            console.log('🚀 Starting automated log retrieval...');
            
            // Get latest failed run
            const latestRun = await this.getLatestWorkflowRun(workflowId);
            if (!latestRun) {
                return { success: true, message: 'No failed runs found' };
            }

            // Get failed jobs
            const { failedJobs } = await this.getWorkflowJobs(latestRun.id);
            if (failedJobs.length === 0) {
                return { success: true, message: 'No failed jobs found' };
            }

            // Download and analyze logs for each failed job
            const analysisResults = [];
            
            for (const job of failedJobs) {
                try {
                    const logData = await this.downloadJobLogs(job.id, job.name);
                    const analysis = this.parseLogForErrors(logData, job.name);
                    
                    analysisResults.push({
                        jobId: job.id,
                        jobName: job.name,
                        conclusion: job.conclusion,
                        startedAt: job.started_at,
                        completedAt: job.completed_at,
                        analysis
                    });
                } catch (error) {
                    console.error(`⚠️  Failed to analyze job ${job.name}:`, error.message);
                }
            }

            const result = {
                success: true,
                workflowRun: {
                    id: latestRun.id,
                    sha: latestRun.head_sha,
                    branch: latestRun.head_branch,
                    conclusion: latestRun.conclusion,
                    createdAt: latestRun.created_at
                },
                failedJobs: analysisResults,
                summary: {
                    totalFailedJobs: failedJobs.length,
                    totalErrors: analysisResults.reduce((sum, job) => sum + job.analysis.errors.length, 0),
                    errorTypes: [...new Set(analysisResults.flatMap(job => job.analysis.errors.map(e => e.type)))]
                }
            };

            // Save analysis to file
            const analysisFile = path.join(__dirname, 'latest-failure-analysis.json');
            await fs.writeFile(analysisFile, JSON.stringify(result, null, 2));
            console.log(`📁 Analysis saved to: ${analysisFile}`);

            return result;
        } catch (error) {
            console.error('❌ Fatal error in log retrieval:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// CLI usage
async function main() {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_REPOSITORY_OWNER || 'cdbao';
    const repo = process.env.GITHUB_REPOSITORY_NAME || 'goreal_nativewebapp';
    const workflowId = process.argv[2] || 'ci.yml';

    if (!token) {
        console.error('❌ GITHUB_TOKEN environment variable is required');
        process.exit(1);
    }

    const retriever = new GitHubLogRetriever(token, owner, repo);
    const result = await retriever.retrieveFailedWorkflowLogs(workflowId);
    
    if (result.success) {
        console.log('✅ Log retrieval completed successfully');
        if (result.summary) {
            console.log(`📊 Summary: ${result.summary.totalErrors} errors in ${result.summary.totalFailedJobs} jobs`);
            console.log(`🏷️  Error types: ${result.summary.errorTypes.join(', ')}`);
        }
    } else {
        console.error('❌ Log retrieval failed:', result.error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { GitHubLogRetriever };