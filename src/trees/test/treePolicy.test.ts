import * as vscode from 'vscode';
import * as assert from 'assert';
import { PolicyTreeDataProvider, PolicyTreeItem, TreeFailure, TreePolicy, TreeRule, TreeRuleBundle } from '../treePolicy';
import { Policy } from '../../types';
import * as sinon from 'sinon';

suite('PolicyTreeDataProvider', () => {
    let treeDataProvider: PolicyTreeDataProvider;
    let policy: Policy;

    setup(() => {
        treeDataProvider = new PolicyTreeDataProvider();
        policy = {
            name: 'Policy 1',
            type: 'Type 1',
            identifier: 'Policy 1',
            acceptedRiskTotal: 0,
            evaluationResult: 'passed',
            createdAt: '2021-01-01',
            updatedAt: '2021-01-01',
            bundles: [
                {
                    name: 'Bundle 1',
                    type: 'Type 1',
                    identifier: 'Bundle 1',
                    rules: [
                        {
                            description: 'Rule 1',
                            evaluationResult: 'passed',
                            failures: [],
                            ruleType: 'Type 1',
                            failureType: 'imageConfigFailure'
                        }
                    ]
                }
            ]
        };
    });

    test('should add policies', () => {
        const policies : Array<Policy> = [policy];

        treeDataProvider.addPolicies(policies);

        assert.deepStrictEqual(treeDataProvider['policies'], policies);
        assert.deepStrictEqual(treeDataProvider['filteredPolicies'], policies);
    });

    test('should update filters', () => {
        const severities = ['high', 'medium'];

        treeDataProvider.updateFilters(severities);

        assert.deepStrictEqual(treeDataProvider['activeFilters'], new Set(severities));
    });

    test('should check if a filter is enabled', () => {
        const filter = 'high';

        treeDataProvider.updateFilters(['high', 'medium']);

        assert.strictEqual(treeDataProvider.isFilterEnabled(filter), true);
    });

    test('should update backlink', () => {      
        const backlink = 'https://example.com';

        treeDataProvider.updateBacklink(backlink);

        assert.strictEqual(treeDataProvider['backlink'], backlink);
    });

    test('should refresh the tree data', () => {      
        const onDidChangeTreeDataSpy = sinon.spy(treeDataProvider['_onDidChangeTreeData'], 'fire');

        treeDataProvider.refresh();

        assert.strictEqual(onDidChangeTreeDataSpy.calledOnce, true);
    });

    test('should get the tree item', () => {      
        const element = new PolicyTreeItem('Label', vscode.TreeItemCollapsibleState.None);

        const treeItem = treeDataProvider.getTreeItem(element);

        assert.strictEqual(treeItem, element);
    });

    test('should get the children', async () => {
        treeDataProvider.addPolicies([policy]);

        const children = await treeDataProvider.getChildren();

        assert.strictEqual(children.length, 1);
        assert.ok(children[0] instanceof TreePolicy);

        const ruleBundles = await treeDataProvider.getChildren(children[0]);

        assert.strictEqual(ruleBundles.length, 1);
        assert.ok(ruleBundles[0] instanceof TreeRuleBundle);

        const rules = await treeDataProvider.getChildren(ruleBundles[0]);

        assert.strictEqual(rules.length, 1);
        assert.ok(rules[0] instanceof TreeRule);

        const failures = await treeDataProvider.getChildren(rules[0]);

        assert.strictEqual(failures.length, 0);
    });
});
