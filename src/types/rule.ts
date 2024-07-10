export interface Rule {
    ruleType: string,
    failureType: "imageConfigFailure" | "pkgVulnFailure",
    description: string,
    evaluationResult: "passed" | "failed",
    predicates?: Array<{
         types: string,
         extra?: { [key: string]: any } 
        }>,
    failures?: Array<{ [key: string]: any }>
}

export function sortRules(rules: Rule[] | undefined): Rule[] | undefined {
    const evalOrder: { [key: string]: number } = { 'failed': 1, 'passed': 2 };
    return rules?.sort((a, b) => evalOrder[a.evaluationResult] - evalOrder[b.evaluationResult]) || [];
}