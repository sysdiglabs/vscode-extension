import * as vscode from 'vscode';
import { Layer } from './layer';
import { Package } from './pkg';
import { Policy } from './policy';
import { Vulnerability } from './vulnerability';

export interface Report {
    result: {
        metadata: {
            pullString: string,
            imageId: string,
            digest: string,
            baseOs: string,
            size: number,
            os: string,
            architecture: string,
            layersCount: number,
            createdAt: string,
        },
        vulnTotalBySeverity: {
            critical: number,
            high: number,
            medium: number,
            low: number,
            negligible: number
        },
        fixableVulnTotalBySeverity: {
            critical: number,
            high: number,
            medium: number,
            low: number,
            negligible: number
        },
        packages: Array<Package>,
        layers?: Array<Layer>,
        policyEvaluations?: Array<Policy>
    },
    info: { 
        resultUrl: string 
    }
}


export function getLayer(report : Report, digest : string | undefined)  : Layer | undefined {
    if (report.result.layers) {
        return report.result.layers.find(layer => layer.digest === digest);
    }
    return undefined;
}

export function createMarkdownSummary(report: Report) : vscode.MarkdownString {
    const configuration = vscode.workspace.getConfiguration('sysdig-vscode-ext');
    let detailedReports : boolean = configuration.get('vulnerabilityManagement.detailedReports') || false;

    const mds = new vscode.MarkdownString();
    mds.appendMarkdown(`### Vulnerabilities for ${report.result.metadata.pullString}\n`);
    
    mds.appendMarkdown('|   Severity   | 🟣 Critical | 🔴 High | 🟠 Medium | 🟡 Low | ⚪ Negligible |\n');
    mds.appendMarkdown('|--------------|-------------|------|--------|-----|------------|\n');
    mds.appendMarkdown(`| **Total**    | ${report.result.vulnTotalBySeverity.critical} | ${report.result.vulnTotalBySeverity.high} | ${report.result.vulnTotalBySeverity.medium} | ${report.result.vulnTotalBySeverity.low} | ${report.result.vulnTotalBySeverity.negligible} |\n`);
    mds.appendMarkdown(`| **Fixable**  | ${report.result.fixableVulnTotalBySeverity.critical} | ${report.result.fixableVulnTotalBySeverity.high} | ${report.result.fixableVulnTotalBySeverity.medium} | ${report.result.fixableVulnTotalBySeverity.low} | ${report.result.fixableVulnTotalBySeverity.negligible} |\n`);
    mds.appendMarkdown(`\n`);

    let policyEvaluations = report.result.policyEvaluations;
    let packages = report.result.packages;
    
    if (!policyEvaluations) {
        return mds;
    }


    policyEvaluations.forEach(policy => {
        mds.appendMarkdown(`### ${policy.evaluationResult === "passed" ? "✅" : "❌" } Policy: ${policy.name}\n`)
    
        if (policy.evaluationResult === "failed") {
            policy.bundles?.forEach(bundle => {
                mds.appendMarkdown(`#### Rule Bundle: ${bundle.name}\n`)
        
                bundle.rules?.forEach(rule => {
                mds.appendMarkdown(`##### ${rule.evaluationResult === "passed" ? "✅" : "❌"} Rule: ${rule.description}\n`)
        
                if (rule.evaluationResult != "passed" && detailedReports) {
                    if (rule.failureType == "pkgVulnFailure") {
                        mds.appendMarkdown(`| Severity | Package | CVSS Score | CVSS Version | CVSS Vector | Fixed Version | Exploitable |\n`);
                        mds.appendMarkdown(`|----------|---------|------------|--------------|-------------|---------------|-------------|\n`);

                        rule.failures?.forEach(failure => {
                            let pkgIndex = failure.pkgIndex;
                            let vulnInPkgIndex = failure.vulnInPkgIndex;

                            let pkg = packages[pkgIndex];
                            if (pkg.vulns) {
                                let vuln : Vulnerability = pkg.vulns[vulnInPkgIndex] || undefined;
    
                                if (vuln) {
                                    mds.appendMarkdown(`| ${vuln.severity.value} | ${pkg.name} | ${vuln.cvssScore.value.score} | ${vuln.cvssScore.value.version} | ${vuln.cvssScore.value.vector} | ${vuln.fixedInVersion || "No fix available"} | ${vuln.exploitable} |\n`);
                                }
                            }
                        });

                        mds.appendMarkdown(`\n`);
                    } else {
                        mds.appendMarkdown(`| Rule Failure | Remediation |\n`);
                        mds.appendMarkdown(`|--------------|-------------|\n`);
                        rule.failures?.forEach(failure => {
                            mds.appendMarkdown(`| ${failure.description} | ${failure.remediation} |\n`);
                        });
                        mds.appendMarkdown(`\n`);
                    }
                }
                mds.appendMarkdown(`\n`);
            });
        });
        }
    });
      
    return mds;
}

export function createMarkdownVulnsForLayer(layer: Layer, report: Report) : vscode.MarkdownString {
    const mds = new vscode.MarkdownString();
    mds.appendMarkdown(`### Vulnerabilities for Layer: ${layer.command}\n`);
    
    mds.appendMarkdown('|   Severity   | 🟣 Critical | 🔴 High | 🟠 Medium | 🟡 Low | ⚪ Negligible |\n');
    mds.appendMarkdown('|--------------|-------------|------|--------|-----|------------|\n');
    mds.appendMarkdown(`| **Total**    | ${layer.vulns?.critical || 0} | ${layer.vulns?.high || 0} | ${layer.vulns?.medium || 0} | ${layer.vulns?.low || 0} | ${layer.vulns?.negligible || 0} |\n`);
    mds.appendMarkdown(`\n`);

    let packages = report.result.packages;
    
    packages.forEach(pkg => {
        if (pkg.layerDigest === layer.digest && pkg.vulns && pkg.vulns.length > 0) {
            mds.appendMarkdown(`\n`);
            mds.appendMarkdown(`### Package: ${pkg.name}:${pkg.version}\n`);
            mds.appendMarkdown(`| Severity | Vulnerability | CVSS Score | CVSS Version | CVSS Vector | Fixed Version | Exploitable |\n`);
            mds.appendMarkdown(`|----------|--------------|------------|--------------|-------------|---------------|-------------|\n`);

            pkg.vulns.forEach(vuln => {
                mds.appendMarkdown(`| ${vuln.severity.value} | ${vuln.name} | ${vuln.cvssScore.value.score} | ${vuln.cvssScore.value.version} | ${vuln.cvssScore.value.vector} | ${vuln.fixedInVersion || "No fix available"} | ${vuln.exploitable} |\n`);
            });
        }
    });

    return mds;
}