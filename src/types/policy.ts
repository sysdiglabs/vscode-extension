import { RuleBundle, scoreRuleBundle, sortRuleBundles } from './ruleBundle';

export interface Policy {
    name: string,
    identifier: string,
    type: string,
    bundles?: Array<RuleBundle>,
    acceptedRiskTotal: number,
    evaluationResult: "passed" | "failed",
    createdAt: string,
    updatedAt: string
}

export function scorePolicy(policy: Policy | undefined): number {
    return policy?.bundles && policy?.bundles.length > 0 ? policy.bundles?.map(bundle => scoreRuleBundle(bundle)).reduce((accumulator, score) => accumulator + score) / policy.bundles?.length : 1;
}

export function sortPolicies(policies: Policy[] | undefined): Policy[] | undefined {
    policies?.map(policy => policy.bundles = policy.bundles ? sortRuleBundles(policy.bundles) : []); // Sort bundle in each policy
    return policies?.sort((a, b) => scorePolicy(a) - scorePolicy(b)) || [];
}