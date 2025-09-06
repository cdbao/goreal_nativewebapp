/**
 * AI-Powered Debugging Agent
 * Analyzes CI/CD failures and generates code fixes
 */

const fs = require('fs').promises;
const path = require('path');

class AIDebuggingAgent {
    constructor() {
        // Initialize empty strategies, will be populated lazily
        this.fixStrategies = null;
    }
    
    initializeStrategies() {
        if (!this.fixStrategies) {
            this.fixStrategies = {
                // Python-specific fixes
                'flake8_error': this.generateFlake8Fix.bind(this),
                'black_error': this.generateBlackFix.bind(this),
                'python_error': this.generatePythonErrorFix.bind(this),
                'test_failure': this.generateTestFix.bind(this),
                'assertion_error': this.generateAssertionFix.bind(this),
                
                // JavaScript/Node fixes
                'npm_error': this.generateNpmFix.bind(this),
                'compilation_error': this.generateCompilationFix.bind(this),
                
                // Security fixes
                'security_issue': this.generateSecurityFix.bind(this),
                
                // Generic fixes
                'generic_failure': this.generateGenericFix.bind(this)
            };
        }
    }

    /**
     * Main debugging function
     */
    async debugAndProposeFix(analysisResult) {
        try {
            console.log('🧠 Starting AI debugging analysis...');
            
            // Initialize strategies if not already done
            if (!this.fixStrategies) {
                this.initializeStrategies();
            }
            
            const fixes = [];
            const prioritizedErrors = this.prioritizeErrors(analysisResult);
            
            for (const error of prioritizedErrors) {
                console.log(`🔍 Analyzing error: ${error.type} - ${error.message.substring(0, 100)}...`);
                
                const fix = await this.generateFixForError(error, analysisResult);
                if (fix) {
                    fixes.push(fix);
                }
            }

            // Deduplicate fixes for the same file
            const consolidatedFixes = this.consolidateFixes(fixes);
            
            console.log(`✅ Generated ${consolidatedFixes.length} fix proposals`);
            
            return {
                success: true,
                fixes: consolidatedFixes,
                analysis: {
                    totalErrors: prioritizedErrors.length,
                    fixableErrors: fixes.length,
                    confidence: this.calculateOverallConfidence(fixes)
                }
            };
        } catch (error) {
            console.error('❌ Error in AI debugging:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Prioritize errors by severity and fixability
     */
    prioritizeErrors(analysisResult) {
        const allErrors = analysisResult.failedJobs.flatMap(job => 
            job.analysis.errors.map(error => ({
                ...error,
                jobName: job.jobName
            }))
        );

        // Priority order: critical failures first, then by fixability
        const priorityMap = {
            'python_error': 10,
            'flake8_error': 9,
            'black_error': 8,
            'test_failure': 7,
            'assertion_error': 6,
            'compilation_error': 5,
            'npm_error': 4,
            'security_issue': 3,
            'generic_failure': 1
        };

        return allErrors.sort((a, b) => 
            (priorityMap[b.type] || 0) - (priorityMap[a.type] || 0)
        );
    }

    /**
     * Generate fix for a specific error
     */
    async generateFixForError(error, analysisResult) {
        const strategy = this.fixStrategies[error.type];
        if (!strategy) {
            console.log(`⚠️  No strategy available for error type: ${error.type}`);
            return null;
        }

        try {
            const fix = await strategy(error, analysisResult);
            return {
                ...fix,
                errorType: error.type,
                originalError: error.message,
                confidence: fix.confidence || 0.5,
                jobName: error.jobName
            };
        } catch (err) {
            console.error(`❌ Failed to generate fix for ${error.type}:`, err.message);
            return null;
        }
    }

    /**
     * Generate fix for flake8 errors
     */
    async generateFlake8Fix(error, analysisResult) {
        const match = error.message.match(/(.+?):(\d+):(\d+): ([EWF]\d+) (.+)/);
        if (!match) return null;

        const [, filePath, lineNum, colNum, errorCode, errorMsg] = match;
        
        try {
            const fileContent = await this.readProjectFile(filePath);
            const lines = fileContent.split('\n');
            const problemLine = lines[parseInt(lineNum) - 1];
            
            let fixedLine = problemLine;
            let confidence = 0.85; // Increased for autonomous operation

            // Common flake8 fixes
            switch (errorCode) {
                case 'E501': // Line too long
                    if (problemLine.includes('import ')) {
                        fixedLine = this.fixLongImport(problemLine);
                    }
                    break;
                    
                case 'W503': // Line break before binary operator
                    fixedLine = this.fixLineBreakOperator(problemLine, lines, parseInt(lineNum) - 1);
                    break;
                    
                case 'E302': // Expected 2 blank lines
                    return {
                        filePath,
                        fix: this.addBlankLines(lines, parseInt(lineNum) - 1, 2),
                        description: `Add 2 blank lines before function/class definition`,
                        confidence: 0.95 // High confidence for simple formatting fix
                    };
                    
                case 'F401': // Imported but unused
                    const importMatch = errorMsg.match(/'(.+?)' imported but unused/);
                    if (importMatch) {
                        return {
                            filePath,
                            fix: this.removeUnusedImport(lines, importMatch[1]),
                            description: `Remove unused import: ${importMatch[1]}`,
                            confidence: 0.92 // High confidence for safe removal
                        };
                    }
                    break;
            }

            if (fixedLine !== problemLine) {
                return {
                    filePath,
                    fix: this.replaceLineInFile(lines, parseInt(lineNum) - 1, fixedLine),
                    description: `Fix ${errorCode}: ${errorMsg}`,
                    confidence
                };
            }

        } catch (err) {
            console.error(`Error reading file ${filePath}:`, err.message);
        }

        return null;
    }

    /**
     * Generate fix for black formatting errors
     */
    async generateBlackFix(error, analysisResult) {
        const match = error.message.match(/would reformat (.+)/);
        if (!match) return null;

        const filePath = match[1];
        
        try {
            const fileContent = await this.readProjectFile(filePath);
            
            // For black errors, we'll suggest running black formatter
            return {
                filePath,
                fix: null, // Will be handled by running black command
                command: `black ${filePath}`,
                description: `Format file with black`,
                confidence: 0.98 // Very high confidence for formatting
            };
        } catch (err) {
            console.error(`Error processing black fix for ${filePath}:`, err.message);
        }

        return null;
    }

    /**
     * Generate fix for Python runtime errors
     */
    async generatePythonErrorFix(error, analysisResult) {
        const errorMsg = error.message;
        
        // AttributeError fixes
        if (errorMsg.includes('AttributeError')) {
            return await this.fixAttributeError(error, analysisResult);
        }
        
        // ImportError fixes
        if (errorMsg.includes('ImportError') || errorMsg.includes('ModuleNotFoundError')) {
            return await this.fixImportError(error, analysisResult);
        }
        
        // ValueError fixes
        if (errorMsg.includes('ValueError')) {
            return await this.fixValueError(error, analysisResult);
        }

        return null;
    }

    /**
     * Generate fix for test failures
     */
    async generateTestFix(error, analysisResult) {
        const match = error.message.match(/FAILED (.+?) - (.+)/);
        if (!match) return null;

        const [, testPath, reason] = match;
        
        // Common test fix patterns
        if (reason.includes('assert')) {
            return {
                filePath: testPath,
                description: `Fix assertion in test: ${reason}`,
                fix: null, // Would need more context to generate actual fix
                confidence: 0.3,
                requiresHumanReview: true
            };
        }

        return null;
    }

    /**
     * Generate fix for assertion errors
     */
    async generateAssertionFix(error, analysisResult) {
        return {
            description: `Manual review required for assertion error: ${error.message}`,
            confidence: 0.2,
            requiresHumanReview: true
        };
    }

    /**
     * Generate fix for compilation errors
     */
    async generateCompilationFix(error, analysisResult) {
        return {
            description: `Manual review required for compilation error: ${error.message}`,
            confidence: 0.4,
            requiresHumanReview: true
        };
    }

    /**
     * Generate fix for NPM/Node errors
     */
    async generateNpmFix(error, analysisResult) {
        const errorMsg = error.message;
        
        if (errorMsg.includes('Cannot find module')) {
            const moduleMatch = errorMsg.match(/Cannot find module '(.+?)'/);
            if (moduleMatch) {
                const moduleName = moduleMatch[1];
                return {
                    filePath: 'package.json',
                    command: `npm install ${moduleName}`,
                    description: `Install missing module: ${moduleName}`,
                    confidence: 0.7
                };
            }
        }

        if (errorMsg.includes('peer dep missing')) {
            const peerDepMatch = errorMsg.match(/peer dep missing: (.+?)@/);
            if (peerDepMatch) {
                const peerDep = peerDepMatch[1];
                return {
                    filePath: 'package.json',
                    command: `npm install --save-dev ${peerDep}`,
                    description: `Install missing peer dependency: ${peerDep}`,
                    confidence: 0.8
                };
            }
        }

        return null;
    }

    /**
     * Generate fix for security issues
     */
    async generateSecurityFix(error, analysisResult) {
        const errorMsg = error.message;
        
        if (errorMsg.includes('Vulnerability')) {
            return {
                filePath: 'package.json',
                command: 'npm audit fix',
                description: 'Fix security vulnerabilities with npm audit fix',
                confidence: 0.6
            };
        }

        return null;
    }

    /**
     * Generate generic fix
     */
    async generateGenericFix(error, analysisResult) {
        return {
            description: `Manual review required for: ${error.message}`,
            confidence: 0.1,
            requiresHumanReview: true
        };
    }

    /**
     * Utility functions
     */
    async readProjectFile(filePath) {
        const fullPath = path.resolve(process.cwd(), filePath);
        return await fs.readFile(fullPath, 'utf8');
    }

    fixLongImport(line) {
        // Break long import lines
        if (line.includes('from ') && line.includes('import ')) {
            const parts = line.split('import ');
            if (parts[1].includes(',')) {
                const imports = parts[1].split(',').map(imp => imp.trim());
                return `${parts[0]}import (\n    ${imports.join(',\n    ')}\n)`;
            }
        }
        return line;
    }

    addBlankLines(lines, lineIndex, count) {
        const newLines = [...lines];
        const blankLines = Array(count).fill('');
        newLines.splice(lineIndex, 0, ...blankLines);
        return newLines.join('\n');
    }

    removeUnusedImport(lines, unusedImport) {
        return lines.filter(line => 
            !line.includes(`import ${unusedImport}`) && 
            !line.includes(`from ${unusedImport}`)
        ).join('\n');
    }

    replaceLineInFile(lines, lineIndex, newLine) {
        const newLines = [...lines];
        newLines[lineIndex] = newLine;
        return newLines.join('\n');
    }

    consolidateFixes(fixes) {
        const fileGroups = {};
        
        fixes.forEach(fix => {
            if (!fix.filePath) return;
            
            if (!fileGroups[fix.filePath]) {
                fileGroups[fix.filePath] = [];
            }
            fileGroups[fix.filePath].push(fix);
        });

        return Object.entries(fileGroups).map(([filePath, fileFixes]) => ({
            filePath,
            fixes: fileFixes,
            consolidatedFix: this.mergeFixes(fileFixes),
            confidence: Math.max(...fileFixes.map(f => f.confidence || 0))
        }));
    }

    mergeFixes(fixes) {
        // Simple merge strategy - for now, just take the highest confidence fix
        return fixes.reduce((best, current) => 
            (current.confidence || 0) > (best.confidence || 0) ? current : best
        );
    }

    calculateOverallConfidence(fixes) {
        if (fixes.length === 0) return 0;
        const avgConfidence = fixes.reduce((sum, fix) => sum + (fix.confidence || 0), 0) / fixes.length;
        return Math.round(avgConfidence * 100) / 100;
    }

    async fixAttributeError(error, analysisResult) {
        // Analyze AttributeError and suggest fixes
        if (error.message.includes('pkgutil')) {
            return {
                filePath: 'requirements.txt',
                description: 'Update setuptools to fix pkgutil AttributeError',
                fix: 'setuptools>=69.5.1',
                confidence: 0.94 // High confidence for known setuptools fix
            };
        }
        return null;
    }

    async fixImportError(error, analysisResult) {
        const moduleMatch = error.message.match(/No module named '(.+?)'/);
        if (moduleMatch) {
            const moduleName = moduleMatch[1];
            // Higher confidence for common/known modules
            let confidence = 0.75;
            const commonModules = ['requests', 'numpy', 'pandas', 'flask', 'django'];
            if (commonModules.includes(moduleName.toLowerCase())) {
                confidence = 0.88;
            }
            
            return {
                filePath: 'requirements.txt',
                description: `Add missing Python module: ${moduleName}`,
                fix: `${moduleName}>=1.0.0`,
                confidence
            };
        }
        return null;
    }

    async fixValueError(error, analysisResult) {
        if (error.message.includes('extend-ignore')) {
            return {
                filePath: '.flake8',
                description: 'Fix flake8 configuration ValueError',
                confidence: 0.90 // High confidence for config fix
            };
        }
        return null;
    }
}

// CLI usage
async function main() {
    const analysisFile = path.join(__dirname, 'latest-failure-analysis.json');
    
    try {
        const analysisData = await fs.readFile(analysisFile, 'utf8');
        const analysis = JSON.parse(analysisData);
        
        const aiDebugger = new AIDebuggingAgent();
        const result = await aiDebugger.debugAndProposeFix(analysis);
        
        // Save fix proposals
        const fixesFile = path.join(__dirname, 'proposed-fixes.json');
        await fs.writeFile(fixesFile, JSON.stringify(result, null, 2));
        
        console.log(`📁 Fix proposals saved to: ${fixesFile}`);
        
        if (result.success) {
            console.log(`✅ Generated ${result.fixes.length} fix proposals`);
            console.log(`🎯 Overall confidence: ${result.analysis.confidence}`);
        } else {
            console.error('❌ AI debugging failed:', result.error);
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Error running AI debugger:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { AIDebuggingAgent };