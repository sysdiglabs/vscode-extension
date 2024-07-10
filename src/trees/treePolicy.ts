import * as vscode from 'vscode';

import {
    Policy, sortPolicies,
    Rule,
    RuleBundle
} from '../types';
import { outputChannel } from '../extension';

export class PolicyTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly description?: string,
        public readonly iconPath?: vscode.ThemeIcon,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.command = command;
        this.iconPath = iconPath;
    }
}

export class TreeFailure extends PolicyTreeItem {
    constructor(
        public readonly failure: any,
        public readonly failureType: string,
        public readonly iconPath: vscode.ThemeIcon = new vscode.ThemeIcon("search"),
    ) {
        let label = "Unknown Failure";
        let description = "Unknown Failure";

        if (failureType === "imageConfigFailure") {
            label = failure.remediation;
            description = "Image Config Failure";
        } else if (failureType === "pkgVulnFailure") {
            label = failure.description;
            description = "Package Vulnerability";
        } else {
            outputChannel.appendLine("Unknown failure type: " + failureType);
        }
        super(label, vscode.TreeItemCollapsibleState.None, description, iconPath);

        this.contextValue = 'failure';
    }
}

export class TreeRule extends PolicyTreeItem {
    constructor(
        public readonly rule: Rule,
        public readonly iconPath: vscode.ThemeIcon = new vscode.ThemeIcon("circle-large-outline"),
        public readonly failures: Array<TreeFailure> = []
    ) {
        let collapsibleState = (rule.failures && rule.failures?.length > 0) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

        if (rule.evaluationResult === "failed") {
            iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("charts.red"));
        } else if (rule.evaluationResult === "passed") {
            iconPath = new vscode.ThemeIcon("pass", new vscode.ThemeColor("charts.green"));
        }

        super(rule.description, collapsibleState, rule.failureType, iconPath);
        this.contextValue = 'rule';
        
        this.failures = rule.failures ? rule.failures.map(failure => new TreeFailure(failure, rule.failureType)) : [];
    }
}

export class TreeRuleBundle extends PolicyTreeItem {
    constructor(
        public readonly ruleBundle: RuleBundle,
        public readonly iconPath: vscode.ThemeIcon = new vscode.ThemeIcon("archive"),
        public readonly rules: Array<TreeRule> = []
    ) {
        let collapsibleState = (ruleBundle.rules && ruleBundle.rules?.length > 0) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

        super(ruleBundle.name, collapsibleState, ruleBundle.type, iconPath);
        this.contextValue = 'ruleBundle';
        this.rules = ruleBundle.rules ? ruleBundle.rules.map(rule => new TreeRule(rule)) : [];
    }
}

export class TreePolicy extends PolicyTreeItem {
    constructor(
        public readonly policy: Policy,
        public readonly iconPath: vscode.ThemeIcon = new vscode.ThemeIcon("workspace-unknown"),
        public readonly ruleBundles: Array<TreeRuleBundle> = []
    ) {
        let collapsibleState = (policy.bundles && policy.bundles?.length > 0) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

        if (policy.evaluationResult === "failed") {
            iconPath = new vscode.ThemeIcon("workspace-untrusted", new vscode.ThemeColor("charts.red"));
        } else if (policy.evaluationResult === "passed") {
            iconPath = new vscode.ThemeIcon("workspace-trusted", new vscode.ThemeColor("charts.green"));
        }

        super(policy.name, collapsibleState, policy.type, iconPath);
        this.contextValue = 'policy';
        this.ruleBundles = policy.bundles ? policy.bundles.map(bundle => new TreeRuleBundle(bundle)) : [];
    }
}

export class PolicyTreeDataProvider implements vscode.TreeDataProvider<PolicyTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PolicyTreeItem | undefined | void> = new vscode.EventEmitter<PolicyTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<PolicyTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private policies: Policy[] = []; // Default to empty array
    private filteredPolicies: Policy[] = []; // Default to empty array
    private activeFilters: Set<string> = new Set();

    private backlink : string = "";
    
    constructor() {}

    addPolicies(policies: Policy[]) {
        this.policies = sortPolicies(policies) || [];
        this.filteredPolicies = JSON.parse(JSON.stringify(this.policies)); // Deep copy
        this.refresh();
    }

    getPolicies(): Policy[] {
        return this.policies;
    }

    updateFilters(severities: string[]) {
        this.activeFilters = new Set(severities);
        vscode.commands.executeCommand('setContext', 'sysdig-vscode-ext.filterActive', false);
        //this.applyFilters();
    }

    isFilterEnabled(filter: string): boolean {
        return this.activeFilters.has(filter);
    }

    // applyFilters() {
    //     this.filteredPolicies = JSON.parse(JSON.stringify(this.policies)); // Deep copy
    //     if (this.activeFilters.size > 0) {
    //         vscode.commands.executeCommand('setContext', 'sysdig-vscode-ext.filterActive', true);

    //         this.filteredPolicies = this.filteredPolicies.map(policy => {
    //             policy.bundles = policy.bundles ? policy.bundles.filter(vuln => doesVulnPassFilter(vuln, this.activeFilters)) : undefined;
    //             return policy;
    //         }).filter(policy => policy.bundles && policy.bundles.length > 0);

    //         this.filteredPolicies = this.sortPolicys(this.filteredPolicies);
    //     }
    //     this.refresh();
    // }

    updateBacklink(backlink: string) {
        this.backlink = backlink;
    }

    getBacklink(): string {
        return this.backlink;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PolicyTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PolicyTreeItem): Thenable<PolicyTreeItem[]> {
        if (!element) {
            // Return package items
            // Filter out policies without vulnerabilities (TODO: Add a setting to show all policies)
            return Promise.resolve(this.filteredPolicies.map(policy => new TreePolicy(policy)));
        } else if (element instanceof TreePolicy) {
            // Return vulnerability items for the given package
            return Promise.resolve(element.ruleBundles);
        } else if (element instanceof TreeRuleBundle) {
            return Promise.resolve(element.rules);
        } else if (element instanceof TreeRule) {     
            return Promise.resolve(element.failures);
        } else {
            return Promise.resolve([]);
        }
    }
}

export function activateTree(context: vscode.ExtensionContext) : PolicyTreeDataProvider {
    const treeDataProvider = new PolicyTreeDataProvider();

    vscode.window.registerTreeDataProvider('sysdig-vscode-ext.policies', treeDataProvider);
    //vscode.commands.registerCommand('sysdig-vscode-ext.showVulnerabilities', () => treeDataProvider.refresh());

    return treeDataProvider;
}