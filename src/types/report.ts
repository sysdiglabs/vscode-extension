import { Package } from './pkg';
import { Policy } from './policy';

export interface Report {
    result: {
        vulnTotalBySeverity: {
            critical: number,
            high: number,
            medium: number,
            low: number,
            negligible: number
        },
        packages: Array<Package>,
        policyEvaluations?: Array<Policy>
    },
    info: { 
        resultUrl: string 
    }
}
