import * as assert from 'assert';
import { RuleBundle, scoreRuleBundle, sortRuleBundles } from '../ruleBundle';

suite('RuleBundle Tests', () => {
    test('scoreRuleBundle should return 0 when bundle is undefined', () => {
        const bundle: RuleBundle | undefined = undefined;
        const result = scoreRuleBundle(bundle);
        assert.strictEqual(result, 1);
    });

    test('scoreRuleBundle should return 1 when bundle has no rules', () => {
        const bundle: RuleBundle = {
            name: 'Test Bundle',
            identifier: 'test-bundle',
            type: 'test-type',
            rules: []
        };
        const result = scoreRuleBundle(bundle);
        assert.strictEqual(result, 1);
    });

    test('scoreRuleBundle should return 0 when all rules in the bundle failed', () => {
        const bundle: RuleBundle = {
            name: 'Test Bundle',
            identifier: 'test-bundle',
            type: 'test-type',
            rules: [
                { ruleType: 'type1', failureType: 'imageConfigFailure', description: 'Rule 1', evaluationResult: 'failed' },
                { ruleType: 'type2', failureType: 'pkgVulnFailure', description: 'Rule 2', evaluationResult: 'failed' },
                { ruleType: 'type3', failureType: 'imageConfigFailure', description: 'Rule 3', evaluationResult: 'failed' }
            ]
        };
        const result = scoreRuleBundle(bundle);
        assert.strictEqual(result, 0);
    });

    test('scoreRuleBundle should return 1 when all rules in the bundle passed', () => {
        const bundle: RuleBundle = {
            name: 'Test Bundle',
            identifier: 'test-bundle',
            type: 'test-type',
            rules: [
                { ruleType: 'type1', failureType: 'imageConfigFailure', description: 'Rule 1', evaluationResult: 'passed' },
                { ruleType: 'type2', failureType: 'pkgVulnFailure', description: 'Rule 2', evaluationResult: 'passed' },
                { ruleType: 'type3', failureType: 'imageConfigFailure', description: 'Rule 3', evaluationResult: 'passed' }
            ]
        };
        const result = scoreRuleBundle(bundle);
        assert.strictEqual(result, 1);
    });

    test('sortRuleBundles should sort the bundles based on their scores', () => {
        const bundles: RuleBundle[] = [
            {
                name: 'Bundle 1',
                identifier: 'bundle-1',
                type: 'type-1',
                rules: [
                    { ruleType: 'type1', failureType: 'imageConfigFailure', description: 'Rule 1', evaluationResult: 'failed' },
                    { ruleType: 'type2', failureType: 'pkgVulnFailure', description: 'Rule 2', evaluationResult: 'passed' },
                    { ruleType: 'type3', failureType: 'imageConfigFailure', description: 'Rule 3', evaluationResult: 'passed' }
                ]
            },
            {
                name: 'Bundle 2',
                identifier: 'bundle-2',
                type: 'type-2',
                rules: [
                    { ruleType: 'type4', failureType: 'imageConfigFailure', description: 'Rule 4', evaluationResult: 'passed' },
                    { ruleType: 'type5', failureType: 'pkgVulnFailure', description: 'Rule 5', evaluationResult: 'passed' },
                    { ruleType: 'type6', failureType: 'imageConfigFailure', description: 'Rule 6', evaluationResult: 'passed' },
                ]
            },
            {
                name: 'Bundle 3',
                identifier: 'bundle-3',
                type: 'type-3',
                rules: [
                    { ruleType: 'type7', failureType: 'imageConfigFailure', description: 'Rule 7', evaluationResult: 'failed' },
                    { ruleType: 'type8', failureType: 'pkgVulnFailure', description: 'Rule 8', evaluationResult: 'failed' },
                    { ruleType: 'type9', failureType: 'imageConfigFailure', description: 'Rule 9', evaluationResult: 'failed' },
                ]
            }
        ];        const sortedBundles = sortRuleBundles(bundles);
        assert.strictEqual(sortedBundles?.[0].name, 'Bundle 3');
        assert.strictEqual(sortedBundles?.[1].name, 'Bundle 1');
        assert.strictEqual(sortedBundles?.[2].name, 'Bundle 2');
    });
});