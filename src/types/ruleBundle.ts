import { Rule, sortRules } from './rule';

export interface RuleBundle {
    name: string,
    identifier: string,
    type: string,
    rules?: Array<Rule>
}

/*
 * Number of rules that passed divided by the total number of rules
 */
export function scoreRuleBundle(bundle: RuleBundle | undefined): number {
    return  bundle?.rules && bundle?.rules?.length > 0 ? bundle.rules?.filter(rule => rule.evaluationResult === 'passed').length / bundle.rules?.length : 1;
}

export function sortRuleBundles(bundles: RuleBundle[] | undefined): RuleBundle[] | undefined {
    bundles?.map(bundle => bundle.rules = bundle.rules ? sortRules(bundle.rules) : []); // Sort rules in each bundle
    return bundles?.sort((a, b) => scoreRuleBundle(a) - scoreRuleBundle(b)) || [];
}