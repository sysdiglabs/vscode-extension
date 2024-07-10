import { Vulnerability, sortVulnerabilities } from './vulnerability';

export interface Package {
    name: string,
    type: string,
    version: string,
    path: string,
    vulns?: Array<Vulnerability>
}


export function sortPackages(packages: Package[]): Package[] {
    return packages.sort((a, b) => {
        const getSeverityCount = (pkg: Package, severity: string) => 
            pkg.vulns?.filter((vul: any) => vul.severity.value === severity).length || 0;
        
        const severities = ['Critical', 'High', 'Medium', 'Low', 'Negligible'];
        for (const severity of severities) {
            const countA = getSeverityCount(a, severity);
            const countB = getSeverityCount(b, severity);
            if (countA !== countB) {
                return countB - countA;
            }
        }
        return 0;
    }).map(pkg => {
        pkg.vulns = sortVulnerabilities(pkg.vulns);
        return pkg;
    });
}