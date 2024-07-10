import * as assert from 'assert';
import { Policy, scorePolicy, sortPolicies } from '../policy';

suite('Policy Tests', () => {
    test('scorePolicy should return 1 when rule bundles are undefined', () => {
        const policy: Policy = {
            name: 'Test Policy',
            identifier: 'test-policy',
            type: 'test',
            bundles: undefined,
            acceptedRiskTotal: 0,
            evaluationResult: 'passed',
            createdAt: '2022-01-01',
            updatedAt: '2022-01-01'
        };

        const score = scorePolicy(policy);

        assert.strictEqual(score, 1);
    });

    test('scorePolicy should calculate the average score of policy bundles', () => {
        const policy: Policy = {
            name: 'Test Policy',
            identifier: 'test-policy',
            type: 'test',
            bundles: [
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
            ],
            acceptedRiskTotal: 0,
            evaluationResult: 'passed',
            createdAt: '2022-01-01',
            updatedAt: '2022-01-01'
        };

        const score = scorePolicy(policy);

        assert.strictEqual(score, 0.5555555555555555);
    });

    test('sortPolicies should sort policies based on their scores', () => {
        const policy1: Policy = {
            name: 'Policy 1',
            identifier: 'policy-1',
            type: 'test',
            bundles: [
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
                }
            ],
            acceptedRiskTotal: 0,
            evaluationResult: 'passed',
            createdAt: '2022-01-01',
            updatedAt: '2022-01-01'
        };

        const policy2: Policy = {
            name: 'Policy 2',
            identifier: 'policy-2',
            type: 'test',
            bundles: [{
                name: 'Bundle 3',
                identifier: 'bundle-3',
                type: 'type-3',
                rules: [
                    { ruleType: 'type7', failureType: 'imageConfigFailure', description: 'Rule 7', evaluationResult: 'failed' },
                    { ruleType: 'type8', failureType: 'pkgVulnFailure', description: 'Rule 8', evaluationResult: 'failed' },
                    { ruleType: 'type9', failureType: 'imageConfigFailure', description: 'Rule 9', evaluationResult: 'failed' },
                ]
            }],
            acceptedRiskTotal: 0,
            evaluationResult: 'passed',
            createdAt: '2022-01-01',
            updatedAt: '2022-01-01'
        };

        const policy3: Policy = {
            name: 'Policy 3',
            identifier: 'policy-3',
            type: 'test',
            bundles: [],
            acceptedRiskTotal: 0,
            evaluationResult: 'passed',
            createdAt: '2022-01-01',
            updatedAt: '2022-01-01'
        };

        const policies: Policy[] = [policy3, policy1, policy2];

        const sortedPolicies = sortPolicies(policies);

        assert.deepStrictEqual(sortedPolicies, [policy2, policy1, policy3]);
    });
});