import * as assert from 'assert';
import { VulnTreeDataProvider, TreePackage, TreeVulnerability } from '../../trees/treeVulns';
import { Package } from '../../types';

suite('VulnTreeDataProvider Tests', () => {
    let treeDataProvider: VulnTreeDataProvider;
    let packages: Package[];

    setup(() => {
        treeDataProvider = new VulnTreeDataProvider();
        packages = [
            {
                name: 'package1',
                version: '1.0.0',
                type: 'dependency',
                path: 'path/to/package1',
                vulns: [
                    {
                        name: 'vuln1',
                        severity: {
                            value: 'high',
                            sourceName: 'source1'
                        },
                        cvssScore: {
                            value: {
                                version: '3.1',
                                score: 7.5,
                                vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
                            },
                            sourceName: 'source2'
                        },
                        exploitable: true,
                        fixedInVersion: '1.1.0',
                        disclosureDate: '2021-01-01',
                        solutionDate: '2021-01-02',
                        publishDateByVendor: {
                            vendor1: '2021-01-03',
                            vendor2: '2021-01-04'
                        }
                    }
                ]
            }
        ];
    });

    test('addPackages should update the packages', () => {

        treeDataProvider.addPackages(packages);

        const updatedPackages = treeDataProvider.getPackages();
        assert.strictEqual(updatedPackages.length, 1);
        assert.strictEqual(updatedPackages[0].name, 'package1');
        assert.strictEqual(updatedPackages[0].vulns?.length, 1);
        assert.strictEqual(updatedPackages[0].vulns[0].name, 'vuln1');     
    });

    test('getChildren should return package items when element is undefined', async () => {
        treeDataProvider.addPackages(packages);

        const children = await treeDataProvider.getChildren(undefined);

        assert.strictEqual(children.length, 1);
        assert.ok(children[0] instanceof TreePackage);
        assert.strictEqual(children[0].pkg.name, 'package1');
    });

    test('getChildren should return vulnerability items when element is a TreePackage', async () => {
        treeDataProvider.addPackages(packages);

        const packageItem = new TreePackage(packages[0]);
        const children = await treeDataProvider.getChildren(packageItem);

        assert.strictEqual(children.length, 1);
        assert.ok(children[0] instanceof TreeVulnerability);
        assert.strictEqual(children[0].vuln.name, 'vuln1');
    });
});
