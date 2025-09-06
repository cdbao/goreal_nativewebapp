/**
 * Test Suite for Automated Debugging System
 * Validates functionality without requiring actual CI failures
 */

const fs = require('fs').promises;
const path = require('path');
const { GitHubLogRetriever } = require('./log-retriever');
const { AIDebuggingAgent } = require('./ai-debugger');

class DebugSystemTester {
    constructor() {
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🧪 Starting Automated Debugging System Tests');
        console.log('='.repeat(50));

        try {
            await this.testLogRetriever();
            await this.testAIDebugger();
            await this.testFixGeneration();
            await this.testErrorParsing();
            await this.generateTestReport();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            process.exit(1);
        }
    }

    async testLogRetriever() {
        console.log('\n🔍 Testing Log Retriever...');
        
        const tests = [
            {
                name: 'Parse Python Error',
                logText: `
2024-01-16T10:30:45.123Z   File "goreal/api/routes.py", line 42, in create_routes
2024-01-16T10:30:45.124Z     import nonexistent_module
2024-01-16T10:30:45.125Z ModuleNotFoundError: No module named 'nonexistent_module'
                `,
                expectedErrors: 1
            },
            {
                name: 'Parse Flake8 Error',
                logText: `
goreal/core/database.py:15:80: E501 line too long (95 > 79 characters)
goreal/api/routes.py:23:1: F401 'os' imported but unused
                `,
                expectedErrors: 2
            },
            {
                name: 'Parse Test Failure',
                logText: `
FAILED tests/test_api.py::test_user_creation - AssertionError: Expected 201, got 500
FAILED tests/test_validation.py::test_email_format - ValueError: Invalid email format
                `,
                expectedErrors: 2
            }
        ];

        for (const test of tests) {
            try {
                const retriever = new GitHubLogRetriever('dummy-token', 'owner', 'repo');
                const result = retriever.parseLogForErrors(test.logText, 'test-job');
                
                const passed = result.errors.length >= test.expectedErrors;
                this.recordTest(`LogRetriever - ${test.name}`, passed, 
                    `Found ${result.errors.length} errors, expected at least ${test.expectedErrors}`);
            } catch (error) {
                this.recordTest(`LogRetriever - ${test.name}`, false, error.message);
            }
        }
    }

    async testAIDebugger() {
        console.log('\n🧠 Testing AI Debugger...');
        
        // Create mock analysis data
        const mockAnalysis = {
            workflowRun: {
                id: 12345,
                sha: 'abc123',
                branch: 'main'
            },
            failedJobs: [
                {
                    jobName: 'Code Quality',
                    analysis: {
                        errors: [
                            {
                                type: 'flake8_error',
                                message: 'goreal/api/routes.py:15:1: F401 \'os\' imported but unused',
                                jobName: 'Code Quality'
                            },
                            {
                                type: 'python_error', 
                                message: 'ModuleNotFoundError: No module named \'requests\'',
                                jobName: 'Code Quality'
                            }
                        ]
                    }
                }
            ]
        };

        try {
            const aiDebugger = new AIDebuggingAgent();
            const result = await aiDebugger.debugAndProposeFix(mockAnalysis);
            
            this.recordTest('AIDebugger - Fix Generation', result.success, 
                result.success ? `Generated ${result.fixes.length} fixes` : result.error);
                
            if (result.success && result.fixes.length > 0) {
                this.recordTest('AIDebugger - Confidence Calculation', 
                    result.analysis.confidence >= 0, 
                    `Confidence: ${result.analysis.confidence}`);
            }
        } catch (error) {
            this.recordTest('AIDebugger - Fix Generation', false, error.message);
        }
    }

    async testFixGeneration() {
        console.log('\n🔧 Testing Fix Generation Strategies...');
        
        const aiDebugger = new AIDebuggingAgent();
        
        const testCases = [
            {
                name: 'Flake8 F401 Fix',
                error: {
                    type: 'flake8_error',
                    message: 'goreal/test.py:1:1: F401 \'os\' imported but unused',
                    jobName: 'lint'
                },
                expectFix: true
            },
            {
                name: 'Module Not Found Fix',
                error: {
                    type: 'python_error',
                    message: 'ModuleNotFoundError: No module named \'requests\'',
                    jobName: 'test'
                },
                expectFix: true
            },
            {
                name: 'NPM Error Fix',
                error: {
                    type: 'npm_error',
                    message: 'npm ERR! Cannot find module \'express\'',
                    jobName: 'build'
                },
                expectFix: true
            }
        ];

        for (const testCase of testCases) {
            try {
                // Create minimal mock file for testing
                const mockFile = `# Test file\nimport os\nprint("Hello World")`;
                await fs.writeFile(path.join(__dirname, 'test-temp.py'), mockFile);
                
                const fix = await aiDebugger.generateFixForError(testCase.error, {});
                
                const hasFix = fix !== null && fix !== undefined;
                this.recordTest(`FixGeneration - ${testCase.name}`, 
                    hasFix === testCase.expectFix,
                    hasFix ? `Generated fix: ${fix.description}` : 'No fix generated');
                    
                // Cleanup
                await fs.unlink(path.join(__dirname, 'test-temp.py')).catch(() => {});
            } catch (error) {
                this.recordTest(`FixGeneration - ${testCase.name}`, false, error.message);
            }
        }
    }

    async testErrorParsing() {
        console.log('\n📊 Testing Error Parsing Accuracy...');
        
        const complexLog = `
2024-01-16T10:30:45.000Z Starting job...
2024-01-16T10:30:46.000Z Installing dependencies...
2024-01-16T10:30:47.000Z Running linting...
2024-01-16T10:30:48.000Z goreal/api/routes.py:15:80: E501 line too long (95 > 79 characters)
2024-01-16T10:30:49.000Z goreal/core/database.py:23:1: F401 'datetime' imported but unused
2024-01-16T10:30:50.000Z would reformat goreal/utils/helpers.py
2024-01-16T10:30:51.000Z Running tests...
2024-01-16T10:30:52.000Z FAILED tests/test_api.py::test_create_user - AssertionError: Expected 201, got 500
2024-01-16T10:30:53.000Z   File "goreal/api/routes.py", line 42, in create_user
2024-01-16T10:30:54.000Z     raise ValueError("Invalid user data")
2024-01-16T10:30:55.000Z ValueError: Invalid user data
2024-01-16T10:30:56.000Z Running security scan...
2024-01-16T10:30:57.000Z HIGH: Vulnerability found in package 'old-library'
2024-01-16T10:30:58.000Z npm ERR! peer dep missing: react@^18.0.0
        `;

        try {
            const retriever = new GitHubLogRetriever('dummy-token', 'owner', 'repo');
            const result = retriever.parseLogForErrors(complexLog, 'complex-test');
            
            const errorTypes = [...new Set(result.errors.map(e => e.type))];
            const expectedTypes = ['flake8_error', 'black_error', 'test_failure', 'python_error', 'security_issue', 'npm_error'];
            const foundExpectedTypes = expectedTypes.filter(type => errorTypes.includes(type));
            
            this.recordTest('ErrorParsing - Complex Log',
                foundExpectedTypes.length >= 4,
                `Found error types: ${errorTypes.join(', ')}`);
                
            this.recordTest('ErrorParsing - File References',
                result.fileReferences.length > 0,
                `Found ${result.fileReferences.length} file references`);
                
        } catch (error) {
            this.recordTest('ErrorParsing - Complex Log', false, error.message);
        }
    }

    recordTest(name, passed, details) {
        this.testResults.push({ name, passed, details });
        const status = passed ? '✅' : '❌';
        console.log(`  ${status} ${name}: ${details}`);
    }

    async generateTestReport() {
        console.log('\n📋 Test Report');
        console.log('='.repeat(50));
        
        const passedTests = this.testResults.filter(r => r.passed);
        const failedTests = this.testResults.filter(r => !r.passed);
        
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${passedTests.length}`);
        console.log(`Failed: ${failedTests.length}`);
        
        if (failedTests.length > 0) {
            console.log('\n❌ Failed Tests:');
            failedTests.forEach(test => {
                console.log(`  - ${test.name}: ${test.details}`);
            });
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.testResults.length,
                passed: passedTests.length,
                failed: failedTests.length,
                successRate: Math.round((passedTests.length / this.testResults.length) * 100)
            },
            tests: this.testResults
        };
        
        // Save report
        await fs.writeFile(
            path.join(__dirname, 'test-report.json'),
            JSON.stringify(report, null, 2)
        );
        
        console.log(`\n📁 Test report saved to: test-report.json`);
        console.log(`🎯 Success Rate: ${report.summary.successRate}%`);
        
        if (report.summary.successRate < 80) {
            console.error('\n❌ Test suite failed - Success rate below 80%');
            process.exit(1);
        } else {
            console.log('\n✅ Test suite passed!');
        }
    }
}

// Mock file creation for tests
async function createMockTestFile() {
    const testContent = `# Mock Python file for testing
import os
import datetime
from typing import Optional

def test_function():
    # This line is intentionally too long to trigger E501 flake8 error for testing purposes
    result = some_very_long_function_name_that_exceeds_the_line_length_limit()
    return result

def unused_function():
    pass
`;

    await fs.writeFile(path.join(__dirname, 'mock-test-file.py'), testContent);
}

async function cleanup() {
    const filesToClean = ['mock-test-file.py', 'test-temp.py'];
    for (const file of filesToClean) {
        try {
            await fs.unlink(path.join(__dirname, file));
        } catch (error) {
            // Ignore cleanup errors
        }
    }
}

// Main execution
async function main() {
    const tester = new DebugSystemTester();
    
    try {
        await createMockTestFile();
        await tester.runAllTests();
    } finally {
        await cleanup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { DebugSystemTester };