import * as assert from "assert";
import { Package, sortPackages } from "../pkg";
import { Vulnerability } from "../vulnerability";

suite('Package Tests', () => {
    let vulns: Vulnerability[];
    let packages: Package[];

    setup(() => {
        vulns = [
            { name: 'vuln1', severity: { value: 'High', sourceName: 'source1' }, cvssScore: { value: { version: '3.1', score: 7.5, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }, sourceName: 'source2' }, exploitable: true, fixedInVersion: '1.1.0', disclosureDate: '2021-01-01', solutionDate: '2021-01-02', publishDateByVendor: { vendor1: '2021-01-03', vendor2: '2021-01-04' } },
            { name: 'vuln2', severity: { value: 'Medium', sourceName: 'source3' }, cvssScore: { value: { version: '3.0', score: 5.0, vector: 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L' }, sourceName: 'source4' }, exploitable: false, fixedInVersion: '2.0.0', disclosureDate: '2021-02-01', solutionDate: '2021-02-02', publishDateByVendor: { vendor1: '2021-02-03', vendor2: '2021-02-04' } },
            { name: 'vuln3', severity: { value: 'Negligible', sourceName: 'source5' }, cvssScore: { value: { version: '2.0', score: 3.0, vector: 'CVSS:2.0/AV:N/AC:L/Au:N/C:N/I:P/A:N' }, sourceName: 'source6' }, exploitable: true, fixedInVersion: '3.0.0', disclosureDate: '2021-03-01', solutionDate: '2021-03-02', publishDateByVendor: { vendor1: '2021-03-03', vendor2: '2021-03-04' } },
            { name: 'vuln4', severity: { value: 'High', sourceName: 'source7' }, cvssScore: { value: { version: '3.1', score: 8.0, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }, sourceName: 'source8' }, exploitable: true, fixedInVersion: '4.0.0', disclosureDate: '2021-04-01', solutionDate: '2021-04-02', publishDateByVendor: { vendor1: '2021-04-03', vendor2: '2021-04-04' } },
            { name: 'vuln5', severity: { value: 'Medium', sourceName: 'source9' }, cvssScore: { value: { version: '3.0', score: 6.0, vector: 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L' }, sourceName: 'source10' }, exploitable: false, fixedInVersion: '5.0.0', disclosureDate: '2021-05-01', solutionDate: '2021-05-02', publishDateByVendor: { vendor1: '2021-05-03', vendor2: '2021-05-04' } },
            { name: 'vuln6', severity: { value: 'Negligible', sourceName: 'source11' }, cvssScore: { value: { version: '2.0', score: 4.0, vector: 'CVSS:2.0/AV:N/AC:L/Au:N/C:N/I:P/A:N' }, sourceName: 'source12' }, exploitable: true, disclosureDate: '2021-06-01', publishDateByVendor: { vendor1: '2021-06-03', vendor2: '2021-06-04' } },
            { name: 'vuln7', severity: { value: 'High', sourceName: 'source13' }, cvssScore: { value: { version: '3.1', score: 9.0, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }, sourceName: 'source14' }, exploitable: true, fixedInVersion: '7.0.0', disclosureDate: '2021-07-01', solutionDate: '2021-07-02', publishDateByVendor: { vendor1: '2021-07-03', vendor2: '2021-07-04' } },
            { name: 'vuln8', severity: { value: 'Medium', sourceName: 'source15' }, cvssScore: { value: { version: '3.0', score: 7.0, vector: 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L' }, sourceName: 'source16' }, exploitable: false, fixedInVersion: '8.0.0', disclosureDate: '2021-08-01', solutionDate: '2021-08-02', publishDateByVendor: { vendor1: '2021-08-03', vendor2: '2021-08-04' } },
            { name: 'vuln9', severity: { value: 'Low', sourceName: 'source17' }, cvssScore: { value: { version: '2.0', score: 5.0, vector: 'CVSS:2.0/AV:N/AC:L/Au:N/C:N/I:P/A:N' }, sourceName: 'source18' }, exploitable: true, fixedInVersion: '9.0.0', disclosureDate: '2021-09-01', solutionDate: '2021-09-02', publishDateByVendor: { vendor1: '2021-09-03', vendor2: '2021-09-04' } },
            { name: 'vuln10', severity: { value: 'Critical', sourceName: 'source19' }, cvssScore: { value: { version: '3.1', score: 10.0, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }, sourceName: 'source20' }, exploitable: true, fixedInVersion: '10.0.0', disclosureDate: '2021-10-01', solutionDate: '2021-10-02', publishDateByVendor: { vendor1: '2021-10-03', vendor2: '2021-10-04' } },
            { name: 'vuln11', severity: { value: 'Medium', sourceName: 'source21' }, cvssScore: { value: { version: '3.0', score: 8.0, vector: 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L' }, sourceName: 'source22' }, exploitable: false, fixedInVersion: '11.0.0', disclosureDate: '2021-11-01', solutionDate: '2021-11-02', publishDateByVendor: { vendor1: '2021-11-03', vendor2: '2021-11-04' } },
            { name: 'vuln12', severity: { value: 'Low', sourceName: 'source23' }, cvssScore: { value: { version: '2.0', score: 6.0, vector: 'CVSS:2.0/AV:N/AC:L/Au:N/C:N/I:P/A:N' }, sourceName: 'source24' }, exploitable: true, fixedInVersion: '12.0.0', disclosureDate: '2021-12-01', solutionDate: '2021-12-02', publishDateByVendor: { vendor1: '2021-12-03', vendor2: '2021-12-04' } },
            { name: 'vuln13', severity: { value: 'Critical', sourceName: 'source25' }, cvssScore: { value: { version: '3.1', score: 9.5, vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }, sourceName: 'source26' }, exploitable: true, disclosureDate: '2022-01-01', publishDateByVendor: { vendor1: '2022-01-03', vendor2: '2022-01-04' } },
            { name: 'vuln14', severity: { value: 'Medium', sourceName: 'source27' }, cvssScore: { value: { version: '3.0', score: 9.0, vector: 'CVSS:3.0/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L' }, sourceName: 'source28' }, exploitable: false, fixedInVersion: '14.0.0', disclosureDate: '2022-02-01', solutionDate: '2022-02-02', publishDateByVendor: { vendor1: '2022-02-03', vendor2: '2022-02-04' } }
        ];

        packages = [
            {
                name: 'package1',
                type: 'type1',
                version: '1.0.0',
                path: '/path/to/package1',
                vulns: vulns.slice(0, 7)
            },
            {
                name: 'package2',
                type: 'type2',
                version: '2.0.0',
                path: '/path/to/package2',
                vulns: vulns.slice(7, 11)
            },
            {
                name: 'package3',
                type: 'type3',
                version: '3.0.0',
                path: '/path/to/package3',
                vulns: vulns.slice(11, 14)
            }
        ];
    });

    test('sortPackages should sort packages based on vulnerability severity count', () => {
        const sortedPackages = sortPackages(packages);

        assert.strictEqual(sortedPackages.length, 3);
        assert.strictEqual(sortedPackages[0].name, 'package2');
        assert.strictEqual(sortedPackages[1].name, 'package3');
        assert.strictEqual(sortedPackages[2].name, 'package1');
    });
});