#!/usr/bin/env python3
"""
Comprehensive test result reporting and notification system.
Requirements: 14.6, 15.3, 15.6 - Test result reporting and notifications
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import xml.etree.ElementTree as ET
import click
import structlog

logger = structlog.get_logger(__name__)


class TestResultReporter:
    """Comprehensive test result reporter."""
    
    def __init__(self, output_dir: Path = None):
        self.output_dir = output_dir or Path("test_reports")
        self.output_dir.mkdir(exist_ok=True)
        self.results = {}
    
    def collect_pytest_results(self, junit_files: List[Path]) -> Dict[str, Any]:
        """Collect and parse pytest JUnit XML results."""
        total_tests = 0
        total_failures = 0
        total_errors = 0
        total_skipped = 0
        total_time = 0.0
        
        test_suites = []
        failed_tests = []
        
        for junit_file in junit_files:
            if not junit_file.exists():
                logger.warning(f"JUnit file not found: {junit_file}")
                continue
            
            try:
                tree = ET.parse(junit_file)
                root = tree.getroot()
                
                # Parse testsuite or testsuites
                if root.tag == 'testsuites':
                    suites = root.findall('testsuite')
                else:
                    suites = [root]
                
                for suite in suites:
                    suite_name = suite.get('name', 'Unknown')
                    suite_tests = int(suite.get('tests', 0))
                    suite_failures = int(suite.get('failures', 0))
                    suite_errors = int(suite.get('errors', 0))
                    suite_skipped = int(suite.get('skipped', 0))
                    suite_time = float(suite.get('time', 0))
                    
                    total_tests += suite_tests
                    total_failures += suite_failures
                    total_errors += suite_errors
                    total_skipped += suite_skipped
                    total_time += suite_time
                    
                    # Collect failed test details
                    for testcase in suite.findall('testcase'):
                        failure = testcase.find('failure')
                        error = testcase.find('error')
                        
                        if failure is not None or error is not None:
                            failed_tests.append({
                                'name': testcase.get('name'),
                                'classname': testcase.get('classname'),
                                'time': float(testcase.get('time', 0)),
                                'failure_message': failure.get('message') if failure is not None else None,
                                'error_message': error.get('message') if error is not None else None,
                                'failure_type': failure.get('type') if failure is not None else None,
                                'error_type': error.get('type') if error is not None else None
                            })
                    
                    test_suites.append({
                        'name': suite_name,
                        'tests': suite_tests,
                        'failures': suite_failures,
                        'errors': suite_errors,
                        'skipped': suite_skipped,
                        'time': suite_time,
                        'success_rate': ((suite_tests - suite_failures - suite_errors) / suite_tests * 100) if suite_tests > 0 else 0
                    })
                    
            except Exception as e:
                logger.error(f"Failed to parse JUnit file {junit_file}: {e}")
        
        return {
            'summary': {
                'total_tests': total_tests,
                'total_failures': total_failures,
                'total_errors': total_errors,
                'total_skipped': total_skipped,
                'total_passed': total_tests - total_failures - total_errors - total_skipped,
                'total_time': total_time,
                'success_rate': ((total_tests - total_failures - total_errors) / total_tests * 100) if total_tests > 0 else 0
            },
            'test_suites': test_suites,
            'failed_tests': failed_tests
        }
    
    def collect_coverage_results(self, coverage_files: List[Path]) -> Dict[str, Any]:
        """Collect and parse coverage results."""
        coverage_data = {}
        
        for coverage_file in coverage_files:
            if not coverage_file.exists():
                continue
            
            try:
                with open(coverage_file, 'r') as f:
                    data = json.load(f)
                
                if 'totals' in data:
                    coverage_data = {
                        'total_coverage': data['totals']['percent_covered'],
                        'lines_covered': data['totals']['covered_lines'],
                        'lines_total': data['totals']['num_statements'],
                        'missing_lines': data['totals']['missing_lines'],
                        'excluded_lines': data['totals']['excluded_lines'],
                        'files': {}
                    }
                    
                    # File-level coverage
                    for file_path, file_data in data.get('files', {}).items():
                        coverage_data['files'][file_path] = {
                            'coverage': file_data['summary']['percent_covered'],
                            'lines_covered': file_data['summary']['covered_lines'],
                            'lines_total': file_data['summary']['num_statements'],
                            'missing_lines': file_data['summary']['missing_lines']
                        }
                
                break  # Use first valid coverage file
                
            except Exception as e:
                logger.error(f"Failed to parse coverage file {coverage_file}: {e}")
        
        return coverage_data
    
    def collect_performance_results(self, performance_files: List[Path]) -> Dict[str, Any]:
        """Collect performance test results."""
        performance_data = {}
        
        for perf_file in performance_files:
            if not perf_file.exists():
                continue
            
            try:
                with open(perf_file, 'r') as f:
                    data = json.load(f)
                
                if 'summary' in data:
                    performance_data = {
                        'total_requests': data['summary'].get('total_requests', 0),
                        'total_failures': data['summary'].get('total_failures', 0),
                        'average_rps': data['summary'].get('peak_rps', 0),
                        'average_response_time': data['summary'].get('worst_p95_response_time', 0),
                        'scenarios': []
                    }
                    
                    # Scenario results
                    for scenario_name, scenario_data in data.get('scenario_results', {}).items():
                        if 'results' in scenario_data:
                            results = scenario_data['results']
                            performance_data['scenarios'].append({
                                'name': scenario_name,
                                'status': scenario_data.get('status', 'unknown'),
                                'requests_per_second': results.get('requests_per_second', 0),
                                'average_response_time': results.get('average_response_time', 0),
                                'p95_response_time': results.get('p95_response_time', 0),
                                'error_rate': results.get('error_rate', 0)
                            })
                
                break  # Use first valid performance file
                
            except Exception as e:
                logger.error(f"Failed to parse performance file {perf_file}: {e}")
        
        return performance_data
    
    def collect_security_results(self, security_files: List[Path]) -> Dict[str, Any]:
        """Collect security test results."""
        security_data = {}
        
        for security_file in security_files:
            if not security_file.exists():
                continue
            
            try:
                with open(security_file, 'r') as f:
                    data = json.load(f)
                
                if 'summary' in data:
                    security_data = {
                        'security_score': data['summary'].get('security_score', 0),
                        'critical_issues': data['summary'].get('critical_issues', 0),
                        'high_issues': data['summary'].get('high_issues', 0),
                        'medium_issues': data['summary'].get('medium_issues', 0),
                        'low_issues': data['summary'].get('low_issues', 0),
                        'total_scans': data['summary'].get('total_scans', 0),
                        'recommendations': data.get('recommendations', [])
                    }
                
                break  # Use first valid security file
                
            except Exception as e:
                logger.error(f"Failed to parse security file {security_file}: {e}")
        
        return security_data
    
    def generate_comprehensive_report(
        self,
        junit_files: List[Path] = None,
        coverage_files: List[Path] = None,
        performance_files: List[Path] = None,
        security_files: List[Path] = None
    ) -> Dict[str, Any]:
        """Generate comprehensive test report."""
        
        report = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'generator': 'TestResultReporter',
                'version': '1.0.0'
            },
            'summary': {
                'overall_status': 'unknown',
                'quality_score': 0,
                'total_tests': 0,
                'test_success_rate': 0,
                'coverage_percentage': 0,
                'security_score': 0,
                'performance_score': 0
            },
            'test_results': {},
            'coverage': {},
            'performance': {},
            'security': {},
            'recommendations': []
        }
        
        # Collect test results
        if junit_files:
            test_results = self.collect_pytest_results(junit_files)
            report['test_results'] = test_results
            report['summary']['total_tests'] = test_results['summary']['total_tests']
            report['summary']['test_success_rate'] = test_results['summary']['success_rate']
        
        # Collect coverage results
        if coverage_files:
            coverage_results = self.collect_coverage_results(coverage_files)
            report['coverage'] = coverage_results
            report['summary']['coverage_percentage'] = coverage_results.get('total_coverage', 0)
        
        # Collect performance results
        if performance_files:
            performance_results = self.collect_performance_results(performance_files)
            report['performance'] = performance_results
            
            # Calculate performance score based on response times and error rates
            perf_score = 100
            for scenario in performance_results.get('scenarios', []):
                if scenario['error_rate'] > 5:
                    perf_score -= 20
                if scenario['p95_response_time'] > 2000:
                    perf_score -= 15
            
            report['summary']['performance_score'] = max(0, perf_score)
        
        # Collect security results
        if security_files:
            security_results = self.collect_security_results(security_files)
            report['security'] = security_results
            report['summary']['security_score'] = security_results.get('security_score', 0)
        
        # Calculate overall quality score
        quality_components = []
        
        if report['summary']['test_success_rate'] > 0:
            quality_components.append(report['summary']['test_success_rate'] * 0.3)
        
        if report['summary']['coverage_percentage'] > 0:
            quality_components.append(report['summary']['coverage_percentage'] * 0.25)
        
        if report['summary']['security_score'] > 0:
            quality_components.append(report['summary']['security_score'] * 0.25)
        
        if report['summary']['performance_score'] > 0:
            quality_components.append(report['summary']['performance_score'] * 0.2)
        
        if quality_components:
            report['summary']['quality_score'] = sum(quality_components)
        
        # Determine overall status
        if report['summary']['quality_score'] >= 85:
            report['summary']['overall_status'] = 'excellent'
        elif report['summary']['quality_score'] >= 75:
            report['summary']['overall_status'] = 'good'
        elif report['summary']['quality_score'] >= 60:
            report['summary']['overall_status'] = 'acceptable'
        else:
            report['summary']['overall_status'] = 'needs_improvement'
        
        # Generate recommendations
        recommendations = []
        
        if report['summary']['test_success_rate'] < 95:
            recommendations.append("Improve test success rate - investigate and fix failing tests")
        
        if report['summary']['coverage_percentage'] < 80:
            recommendations.append("Increase test coverage - aim for at least 80% coverage")
        
        if report['summary']['security_score'] < 70:
            recommendations.append("Address security issues - critical and high-severity issues found")
        
        if report['summary']['performance_score'] < 70:
            recommendations.append("Optimize performance - response times or error rates are too high")
        
        # Add security-specific recommendations
        if 'security' in report and 'recommendations' in report['security']:
            recommendations.extend(report['security']['recommendations'][:3])  # Top 3
        
        report['recommendations'] = recommendations
        
        return report
    
    def generate_html_report(self, report: Dict[str, Any], output_file: Path):
        """Generate HTML test report."""
        
        html_template = """
<!DOCTYPE html>
<html>
<head>
    <title>Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { padding: 20px; background-color: #f8f9fa; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric.excellent { border-left-color: #28a745; }
        .metric.good { border-left-color: #17a2b8; }
        .metric.acceptable { border-left-color: #ffc107; }
        .metric.needs_improvement { border-left-color: #dc3545; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #6c757d; font-size: 0.9em; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 1.5em; font-weight: bold; margin-bottom: 15px; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .test-suite { margin-bottom: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
        .test-suite.failed { background-color: #f8d7da; border-left: 4px solid #dc3545; }
        .test-suite.passed { background-color: #d4edda; border-left: 4px solid #28a745; }
        .failed-test { margin: 10px 0; padding: 10px; background-color: #fff3cd; border-left: 3px solid #ffc107; border-radius: 3px; }
        .recommendations { background-color: #cce5ff; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .recommendations ul { margin: 10px 0; }
        .recommendations li { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .status-excellent { color: #28a745; font-weight: bold; }
        .status-good { color: #17a2b8; font-weight: bold; }
        .status-acceptable { color: #ffc107; font-weight: bold; }
        .status-needs_improvement { color: #dc3545; font-weight: bold; }
        .progress-bar { width: 100%; height: 20px; background-color: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%); transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Comprehensive Test Report</h1>
            <p>Generated on {generated_at}</p>
            <p class="status-{overall_status}">Overall Status: {overall_status_display}</p>
        </div>
        
        <div class="summary">
            <div class="metric {overall_status}">
                <div class="metric-value">{quality_score:.1f}</div>
                <div class="metric-label">Quality Score</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {quality_score}%"></div>
                </div>
            </div>
            <div class="metric">
                <div class="metric-value">{total_tests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">{test_success_rate:.1f}%</div>
                <div class="metric-label">Test Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">{coverage_percentage:.1f}%</div>
                <div class="metric-label">Code Coverage</div>
            </div>
            <div class="metric">
                <div class="metric-value">{security_score:.1f}</div>
                <div class="metric-label">Security Score</div>
            </div>
            <div class="metric">
                <div class="metric-value">{performance_score:.1f}</div>
                <div class="metric-label">Performance Score</div>
            </div>
        </div>
        
        {test_results_section}
        
        {coverage_section}
        
        {performance_section}
        
        {security_section}
        
        <div class="section">
            <div class="section-title">📋 Recommendations</div>
            <div class="recommendations">
                {recommendations_html}
            </div>
        </div>
    </div>
</body>
</html>
        """
        
        # Generate test results section
        test_results_section = ""
        if 'test_results' in report and report['test_results']:
            test_results_section = f"""
            <div class="section">
                <div class="section-title">🧪 Test Results</div>
                <table>
                    <tr>
                        <th>Test Suite</th>
                        <th>Tests</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Errors</th>
                        <th>Skipped</th>
                        <th>Success Rate</th>
                        <th>Time (s)</th>
                    </tr>
            """
            
            for suite in report['test_results'].get('test_suites', []):
                status_class = 'passed' if suite['failures'] == 0 and suite['errors'] == 0 else 'failed'
                test_results_section += f"""
                    <tr class="{status_class}">
                        <td>{suite['name']}</td>
                        <td>{suite['tests']}</td>
                        <td>{suite['tests'] - suite['failures'] - suite['errors'] - suite['skipped']}</td>
                        <td>{suite['failures']}</td>
                        <td>{suite['errors']}</td>
                        <td>{suite['skipped']}</td>
                        <td>{suite['success_rate']:.1f}%</td>
                        <td>{suite['time']:.2f}</td>
                    </tr>
                """
            
            test_results_section += "</table>"
            
            # Add failed tests details
            failed_tests = report['test_results'].get('failed_tests', [])
            if failed_tests:
                test_results_section += "<h3>❌ Failed Tests</h3>"
                for test in failed_tests[:10]:  # Show first 10 failed tests
                    test_results_section += f"""
                    <div class="failed-test">
                        <strong>{test['classname']}.{test['name']}</strong><br>
                        <small>Time: {test['time']:.3f}s</small><br>
                        {test.get('failure_message', test.get('error_message', 'No message'))}
                    </div>
                    """
            
            test_results_section += "</div>"
        
        # Generate coverage section
        coverage_section = ""
        if 'coverage' in report and report['coverage']:
            coverage_section = f"""
            <div class="section">
                <div class="section-title">📊 Code Coverage</div>
                <p><strong>Total Coverage:</strong> {report['coverage'].get('total_coverage', 0):.1f}%</p>
                <p><strong>Lines Covered:</strong> {report['coverage'].get('lines_covered', 0)} / {report['coverage'].get('lines_total', 0)}</p>
            </div>
            """
        
        # Generate performance section
        performance_section = ""
        if 'performance' in report and report['performance']:
            performance_section = """
            <div class="section">
                <div class="section-title">⚡ Performance Results</div>
                <table>
                    <tr>
                        <th>Scenario</th>
                        <th>Status</th>
                        <th>RPS</th>
                        <th>Avg Response (ms)</th>
                        <th>P95 Response (ms)</th>
                        <th>Error Rate (%)</th>
                    </tr>
            """
            
            for scenario in report['performance'].get('scenarios', []):
                status_class = 'passed' if scenario['status'] == 'PASS' else 'failed'
                performance_section += f"""
                    <tr class="{status_class}">
                        <td>{scenario['name']}</td>
                        <td>{scenario['status']}</td>
                        <td>{scenario['requests_per_second']:.1f}</td>
                        <td>{scenario['average_response_time']:.1f}</td>
                        <td>{scenario['p95_response_time']:.1f}</td>
                        <td>{scenario['error_rate']:.2f}</td>
                    </tr>
                """
            
            performance_section += "</table></div>"
        
        # Generate security section
        security_section = ""
        if 'security' in report and report['security']:
            security_section = f"""
            <div class="section">
                <div class="section-title">🔒 Security Results</div>
                <p><strong>Security Score:</strong> {report['security'].get('security_score', 0)}/100</p>
                <p><strong>Critical Issues:</strong> {report['security'].get('critical_issues', 0)}</p>
                <p><strong>High Issues:</strong> {report['security'].get('high_issues', 0)}</p>
                <p><strong>Medium Issues:</strong> {report['security'].get('medium_issues', 0)}</p>
                <p><strong>Total Scans:</strong> {report['security'].get('total_scans', 0)}</p>
            </div>
            """
        
        # Generate recommendations
        recommendations_html = ""
        if report.get('recommendations'):
            recommendations_html = "<ul>" + "".join(f"<li>{rec}</li>" for rec in report['recommendations']) + "</ul>"
        else:
            recommendations_html = "<p>✅ No specific recommendations - all metrics are within acceptable ranges.</p>"
        
        # Fill template
        html_content = html_template.format(
            generated_at=report['metadata']['generated_at'],
            overall_status=report['summary']['overall_status'],
            overall_status_display=report['summary']['overall_status'].replace('_', ' ').title(),
            quality_score=report['summary']['quality_score'],
            total_tests=report['summary']['total_tests'],
            test_success_rate=report['summary']['test_success_rate'],
            coverage_percentage=report['summary']['coverage_percentage'],
            security_score=report['summary']['security_score'],
            performance_score=report['summary']['performance_score'],
            test_results_section=test_results_section,
            coverage_section=coverage_section,
            performance_section=performance_section,
            security_section=security_section,
            recommendations_html=recommendations_html
        )
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        logger.info(f"HTML report generated: {output_file}")
    
    def generate_json_report(self, report: Dict[str, Any], output_file: Path):
        """Generate JSON test report."""
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"JSON report generated: {output_file}")
    
    def generate_markdown_summary(self, report: Dict[str, Any], output_file: Path):
        """Generate Markdown summary for GitHub."""
        
        status_emoji = {
            'excellent': '🟢',
            'good': '🔵', 
            'acceptable': '🟡',
            'needs_improvement': '🔴'
        }
        
        markdown_content = f"""# 🧪 Test Report Summary

## Overall Status: {status_emoji.get(report['summary']['overall_status'], '⚪')} {report['summary']['overall_status'].replace('_', ' ').title()}

### Quality Metrics

| Metric | Score | Status |
|--------|-------|--------|
| **Overall Quality** | {report['summary']['quality_score']:.1f}/100 | {status_emoji.get(report['summary']['overall_status'], '⚪')} |
| **Test Success Rate** | {report['summary']['test_success_rate']:.1f}% | {'✅' if report['summary']['test_success_rate'] >= 95 else '⚠️' if report['summary']['test_success_rate'] >= 80 else '❌'} |
| **Code Coverage** | {report['summary']['coverage_percentage']:.1f}% | {'✅' if report['summary']['coverage_percentage'] >= 80 else '⚠️' if report['summary']['coverage_percentage'] >= 60 else '❌'} |
| **Security Score** | {report['summary']['security_score']:.1f}/100 | {'✅' if report['summary']['security_score'] >= 70 else '⚠️' if report['summary']['security_score'] >= 50 else '❌'} |
| **Performance Score** | {report['summary']['performance_score']:.1f}/100 | {'✅' if report['summary']['performance_score'] >= 70 else '⚠️' if report['summary']['performance_score'] >= 50 else '❌'} |

### Test Results Summary

- **Total Tests:** {report['summary']['total_tests']}
- **Success Rate:** {report['summary']['test_success_rate']:.1f}%
"""

        # Add failed tests if any
        if 'test_results' in report and report['test_results'].get('failed_tests'):
            failed_count = len(report['test_results']['failed_tests'])
            markdown_content += f"- **Failed Tests:** {failed_count}\n"
        
        # Add security issues if any
        if 'security' in report and report['security']:
            critical = report['security'].get('critical_issues', 0)
            high = report['security'].get('high_issues', 0)
            if critical > 0 or high > 0:
                markdown_content += f"\n### 🚨 Security Issues\n"
                markdown_content += f"- **Critical:** {critical}\n"
                markdown_content += f"- **High:** {high}\n"
        
        # Add recommendations
        if report.get('recommendations'):
            markdown_content += f"\n### 📋 Recommendations\n\n"
            for rec in report['recommendations'][:5]:  # Top 5 recommendations
                markdown_content += f"- {rec}\n"
        
        markdown_content += f"\n---\n*Report generated on {report['metadata']['generated_at']}*\n"
        
        with open(output_file, 'w') as f:
            f.write(markdown_content)
        
        logger.info(f"Markdown summary generated: {output_file}")


@click.group()
def cli():
    """Test result reporting CLI."""
    pass


@cli.command()
@click.option('--junit-files', multiple=True, help='JUnit XML files')
@click.option('--coverage-files', multiple=True, help='Coverage JSON files')
@click.option('--performance-files', multiple=True, help='Performance JSON files')
@click.option('--security-files', multiple=True, help='Security JSON files')
@click.option('--output-dir', default='./test_reports', help='Output directory')
@click.option('--format', 'output_format', multiple=True, default=['html', 'json'], 
              type=click.Choice(['html', 'json', 'markdown']), help='Output formats')
def generate_report(junit_files, coverage_files, performance_files, security_files, output_dir, output_format):
    """Generate comprehensive test report."""
    
    reporter = TestResultReporter(Path(output_dir))
    
    # Convert file paths
    junit_paths = [Path(f) for f in junit_files] if junit_files else None
    coverage_paths = [Path(f) for f in coverage_files] if coverage_files else None
    performance_paths = [Path(f) for f in performance_files] if performance_files else None
    security_paths = [Path(f) for f in security_files] if security_files else None
    
    # Generate comprehensive report
    report = reporter.generate_comprehensive_report(
        junit_files=junit_paths,
        coverage_files=coverage_paths,
        performance_files=performance_paths,
        security_files=security_paths
    )
    
    # Generate outputs in requested formats
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    if 'json' in output_format:
        json_file = Path(output_dir) / f'test_report_{timestamp}.json'
        reporter.generate_json_report(report, json_file)
    
    if 'html' in output_format:
        html_file = Path(output_dir) / f'test_report_{timestamp}.html'
        reporter.generate_html_report(report, html_file)
    
    if 'markdown' in output_format:
        md_file = Path(output_dir) / f'test_summary_{timestamp}.md'
        reporter.generate_markdown_summary(report, md_file)
    
    # Print summary
    click.echo(f"\n{'='*60}")
    click.echo("TEST REPORT SUMMARY")
    click.echo(f"{'='*60}")
    click.echo(f"Overall Status: {report['summary']['overall_status'].replace('_', ' ').title()}")
    click.echo(f"Quality Score: {report['summary']['quality_score']:.1f}/100")
    click.echo(f"Total Tests: {report['summary']['total_tests']}")
    click.echo(f"Test Success Rate: {report['summary']['test_success_rate']:.1f}%")
    click.echo(f"Code Coverage: {report['summary']['coverage_percentage']:.1f}%")
    click.echo(f"Security Score: {report['summary']['security_score']:.1f}/100")
    click.echo(f"Performance Score: {report['summary']['performance_score']:.1f}/100")
    
    if report.get('recommendations'):
        click.echo(f"\nTop Recommendations:")
        for i, rec in enumerate(report['recommendations'][:3], 1):
            click.echo(f"  {i}. {rec}")
    
    # Exit with appropriate code
    if report['summary']['overall_status'] == 'needs_improvement':
        click.echo(f"\n❌ Quality score below acceptable threshold")
        sys.exit(1)
    elif report['summary']['test_success_rate'] < 95:
        click.echo(f"\n⚠️  Test success rate below 95%")
        sys.exit(1)
    else:
        click.echo(f"\n✅ All quality metrics passed")


@cli.command()
@click.option('--input-dir', default='./test_reports', help='Input directory with test results')
def auto_collect(input_dir):
    """Auto-collect test results from standard locations."""
    
    input_path = Path(input_dir)
    
    # Auto-discover test result files
    junit_files = list(input_path.glob('**/junit-*.xml')) + list(input_path.glob('**/*junit*.xml'))
    coverage_files = list(input_path.glob('**/coverage.json')) + list(input_path.glob('**/*coverage*.json'))
    performance_files = list(input_path.glob('**/performance_*.json')) + list(input_path.glob('**/*performance*.json'))
    security_files = list(input_path.glob('**/security_*.json')) + list(input_path.glob('**/*security*.json'))
    
    click.echo(f"Auto-discovered files:")
    click.echo(f"  JUnit files: {len(junit_files)}")
    click.echo(f"  Coverage files: {len(coverage_files)}")
    click.echo(f"  Performance files: {len(performance_files)}")
    click.echo(f"  Security files: {len(security_files)}")
    
    if not any([junit_files, coverage_files, performance_files, security_files]):
        click.echo("No test result files found!")
        sys.exit(1)
    
    # Generate report with discovered files
    reporter = TestResultReporter(input_path / 'reports')
    
    report = reporter.generate_comprehensive_report(
        junit_files=junit_files if junit_files else None,
        coverage_files=coverage_files if coverage_files else None,
        performance_files=performance_files if performance_files else None,
        security_files=security_files if security_files else None
    )
    
    # Generate all formats
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    json_file = input_path / 'reports' / f'comprehensive_report_{timestamp}.json'
    html_file = input_path / 'reports' / f'comprehensive_report_{timestamp}.html'
    md_file = input_path / 'reports' / f'test_summary_{timestamp}.md'
    
    reporter.generate_json_report(report, json_file)
    reporter.generate_html_report(report, html_file)
    reporter.generate_markdown_summary(report, md_file)
    
    click.echo(f"\n✅ Comprehensive report generated successfully!")
    click.echo(f"Quality Score: {report['summary']['quality_score']:.1f}/100")


if __name__ == '__main__':
    cli()