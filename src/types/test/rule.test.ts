import * as assert from 'assert';
import { Rule, sortRules } from '../rule';

suite('Rule Tests', () => {
    test('sortRules should sort rules based on evaluationResult', () => {
        const rules: Rule[] = [
            { ruleType: 'type1', failureType: 'imageConfigFailure', description: 'Rule 1', evaluationResult: 'failed' },
            { ruleType: 'type2', failureType: 'pkgVulnFailure', description: 'Rule 2', evaluationResult: 'passed' },
            { ruleType: 'type3', failureType: 'imageConfigFailure', description: 'Rule 3', evaluationResult: 'passed' },
            { ruleType: 'type4', failureType: 'pkgVulnFailure', description: 'Rule 4', evaluationResult: 'failed' },
        ];

        const sortedRules = sortRules(rules);

        assert.strictEqual(sortedRules?.length, 4);
        assert.strictEqual(sortedRules[0].evaluationResult, 'failed');
        assert.strictEqual(sortedRules[1].evaluationResult, 'failed');
        assert.strictEqual(sortedRules[2].evaluationResult, 'passed');
        assert.strictEqual(sortedRules[3].evaluationResult, 'passed');
    });

    test('sortRules should return empty array if rules array is undefined', () => {
        const sortedRules = sortRules(undefined);

        assert.strictEqual(sortedRules?.length, 0);
    });
});