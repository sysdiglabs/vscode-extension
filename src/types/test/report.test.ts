import * as assert from 'assert';
import { Report } from '../report';

suite('Report', () => {
    test('should have result property', () => {
        const report: Report = {
            result: {
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: [],
            },
            info: {
                resultUrl: 'https://example.com'
            }
        };

        assert.ok(report.result);
    });

    test('should have info property', () => {
        const report: Report = {
            result: {
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: [],
            },
            info: {
                resultUrl: 'https://example.com'
            }
        };

        assert.ok(report.info);
    });

    test('should have vulnTotalBySeverity property', () => {
        const report: Report = {
            result: {
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: [],
            },
            info: {
                resultUrl: 'https://example.com'
            }
        };

        assert.ok(report.result.vulnTotalBySeverity);
    });

    test('should have packages property', () => {
        const report: Report = {
            result: {
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: [],
            },
            info: {
                resultUrl: 'https://example.com'
            }
        };

        assert.ok(report.result.packages);
    });

    test('should have policyEvaluations property as optional', () => {
        const report: Report = {
            result: {
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: [],
                policyEvaluations: []
            },
            info: {
                resultUrl: 'https://example.com'
            }
        };

        assert.ok(report.result.policyEvaluations);
    });

    test('should have resultUrl property', () => {
        const report: Report = {
            result: {
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: [],
            },
            info: {
                resultUrl: 'https://example.com'
            }
        };

        assert.ok(report.info.resultUrl);
    });
});
