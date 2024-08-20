import * as vscode from 'vscode';

import {
    Vulnerability, vulnToColor, vulnToMarkdownString, doesVulnPassFilter,
    Package, sortPackages,
    Layer
} from '../types';

export class VulnTreeItem extends vscode.TreeItem {
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

export class TreeVulnerability extends VulnTreeItem {
    constructor(
        public readonly vuln: Vulnerability,
        public readonly source?: vscode.TextDocument,
        public readonly rangeInSource?: vscode.Range,
        public readonly iconPath: vscode.ThemeIcon = new vscode.ThemeIcon("bug", new vscode.ThemeColor(vulnToColor(vuln.severity.value))),
    ) {
        let findings : string = "";

        if (vuln.exploitable) {
            findings += "  ⦿ Exploitable";
        }

        if (vuln.fixedInVersion) {
            findings += "  ⦿ Fix Available";
        }

        let command : vscode.Command | undefined;
        if (source && rangeInSource) {
            command = {
                title: "Show in source line",
                command: "sysdig-vscode-ext.pointToLine",
                arguments: [source, rangeInSource]
            };
        }

        super(vuln.name, vscode.TreeItemCollapsibleState.None, findings, iconPath, command);
        this.tooltip = vulnToMarkdownString(vuln);
        this.contextValue = 'vulnerability';
    }
}

export class TreePackage extends VulnTreeItem {
    constructor(
        public readonly pkg: Package,
        public readonly iconPath: vscode.ThemeIcon = new vscode.ThemeIcon("package"),
        public readonly vulnerabilities: Array<TreeVulnerability> = [],
        public readonly source?: vscode.TextDocument,
        public readonly rangeInSource?: vscode.Range
    ) {
        let collapsibleState = (pkg.vulns && pkg.vulns?.length > 0) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;

        super(`${pkg.name}:${pkg.version}`, collapsibleState, pkg.type, iconPath);
        this.contextValue = 'package';
        this.vulnerabilities = pkg.vulns ? pkg.vulns.map(vuln => new TreeVulnerability(vuln, source, rangeInSource)) : [];
    }
}

export class VulnTreeDataProvider implements vscode.TreeDataProvider<VulnTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<VulnTreeItem | undefined | void> = new vscode.EventEmitter<VulnTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<VulnTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private packages: Package[] = []; // Default to empty array
    private filteredPackages: Package[] = []; // Default to empty array
    private activeFilters: Set<string> = new Set();

    private backlink : string = "";
    private source : vscode.TextDocument | undefined = undefined;
    private range: vscode.Range | undefined = undefined;
    private layers : Layer[] | undefined;
    
    constructor(source? : vscode.TextDocument) {
        this.source = source;
    }

    addPackages(packages: Package[]) {
        const configuration = vscode.workspace.getConfiguration('sysdig-vscode-ext');
        this.packages = sortPackages(packages);
        if (configuration.get('vulnerabilityManagement.filterPackagesWithNoVulnerabilities') ?? true) { // Default to true
            this.packages = this.packages.filter(pkg => pkg.vulns && pkg.vulns.length > 0);
        }
        this.filteredPackages = JSON.parse(JSON.stringify(this.packages)); // Deep copy
        this.refresh();
    }

    getPackages(): Package[] {
        return this.packages;
    }

    getFilteredPackages(): Package[] {
        return this.filteredPackages;
    }

    updateFilters(severities: string[]) {
        this.activeFilters = new Set(severities);
        vscode.commands.executeCommand('setContext', 'sysdig-vscode-ext.filterActive', false);
        this.applyFilters();
    }

    isFilterEnabled(filter: string): boolean {
        return this.activeFilters.has(filter);
    }

    applyFilters() {
        this.filteredPackages = JSON.parse(JSON.stringify(this.packages)); // Deep copy
        if (this.activeFilters.size > 0) {
            vscode.commands.executeCommand('setContext', 'sysdig-vscode-ext.filterActive', true);

            this.filteredPackages = this.filteredPackages.map(pkg => {
                pkg.vulns = pkg.vulns ? pkg.vulns.filter(vuln => doesVulnPassFilter(vuln, this.activeFilters)) : undefined;
                return pkg;
            }).filter(pkg => pkg.vulns && pkg.vulns.length > 0);

            this.filteredPackages = sortPackages(this.filteredPackages);
        }
        this.refresh();
    }

    updateBacklink(backlink: string) {
        this.backlink = backlink;
    }

    getBacklink(): string {
        return this.backlink;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: VulnTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: VulnTreeItem): Thenable<VulnTreeItem[]> {
        if (!element) {
            // Return package items

            // Filter out packages without vulnerabilities 
            return Promise.resolve(this.filteredPackages.map(pkg => {
                if (this.source && pkg.layerDigest && this.layers) {
                    return new TreePackage(pkg, undefined, undefined, this.source, this.range);
                } else {
                    return new TreePackage(pkg);
                }
            }));
        } else if (element instanceof TreePackage) {
            // Return vulnerability items for the given package
            return Promise.resolve(element.vulnerabilities);
        } else {
            return Promise.resolve([]);
        }
    }

    updateVulnTree(packages: Package[], backlink: string, layers?: Layer[], source?: vscode.TextDocument, range?: vscode.Range) {
        this.layers = layers;
        this.source = source;
        this.range = range;
        this.addPackages(packages);
        vscode.commands.executeCommand('setContext', 'sysdig-vscode-ext.showBacklink', false);
    
        if (backlink) {
            vscode.commands.executeCommand('setContext', 'sysdig-vscode-ext.showBacklink', true);
            this.updateBacklink(backlink);
        }
    }
}

export function activateTree(context: vscode.ExtensionContext) : VulnTreeDataProvider {
    const treeDataProvider = new VulnTreeDataProvider();

    vscode.window.registerTreeDataProvider('sysdig-vscode-ext.vulnerabilities', treeDataProvider);
    vscode.commands.registerCommand('sysdig-vscode-ext.showVulnerabilities', () => treeDataProvider.refresh());

    return treeDataProvider;
}
