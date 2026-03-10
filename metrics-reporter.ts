import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { metricsCollector, MetricsSummary } from './tests/metrics';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Custom Playwright reporter that outputs API performance metrics.
 * 
 * Generates:
 * - Console output with P50, P95, P99 latencies
 * - JSON file with detailed metrics
 * - HTML section appended to the main report
 */
class MetricsReporter implements Reporter {
  private outputDir: string = 'test-results';
  
  onBegin(config: FullConfig, suite: Suite): void {
    // Initialize metrics collection (creates shared file)
    metricsCollector.start();
    console.log('\n🚀 Starting API tests with metrics collection...\n');
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Tests record metrics via fixtures and shared file
  }

  onEnd(result: FullResult): Promise<void> | void {
    // Load metrics from shared file written by test workers
    metricsCollector.loadFromFile();
    const summary = metricsCollector.getSummary();
    
    // Print to console
    console.log(metricsCollector.formatReport());
    
    // Save JSON metrics
    this.saveJsonMetrics(summary);
    
    // Save HTML metrics report
    this.saveHtmlMetrics(summary);
  }

  private saveJsonMetrics(summary: MetricsSummary): void {
    const metricsPath = path.join(this.outputDir, 'api-metrics.json');
    
    try {
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
      
      fs.writeFileSync(metricsPath, JSON.stringify(summary, null, 2));
      console.log(`📁 Metrics saved to: ${metricsPath}`);
    } catch (error) {
      console.error('Failed to save metrics JSON:', error);
    }
  }

  private saveHtmlMetrics(summary: MetricsSummary): void {
    const htmlPath = path.join(this.outputDir, 'api-metrics.html');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Performance Metrics</title>
  <style>
    :root {
      --primary: #3b82f6;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --border: #334155;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--primary), #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle { color: var(--text-muted); margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid var(--border);
    }
    .card-title { font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-value { font-size: 2rem; font-weight: 700; }
    .card-value.success { color: var(--success); }
    .card-value.warning { color: var(--warning); }
    .card-value.danger { color: var(--danger); }
    .card-value.primary { color: var(--primary); }
    .card-unit { font-size: 1rem; color: var(--text-muted); font-weight: 400; }
    .section { margin-bottom: 2rem; }
    .section-title { font-size: 1.25rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .section-title::before { content: ''; width: 4px; height: 1.25rem; background: var(--primary); border-radius: 2px; }
    table { width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 12px; overflow: hidden; }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: rgba(59, 130, 246, 0.1); font-weight: 600; color: var(--text-muted); font-size: 0.875rem; text-transform: uppercase; }
    tr:last-child td { border-bottom: none; }
    .endpoint { font-family: 'SF Mono', Monaco, monospace; font-size: 0.875rem; }
    .latency-bar { display: flex; align-items: center; gap: 0.5rem; }
    .latency-bar-fill { height: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--success), var(--warning)); }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-success { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    .badge-danger { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .note { background: rgba(59, 130, 246, 0.1); border: 1px solid var(--primary); border-radius: 8px; padding: 1rem 1.25rem; font-size: 0.875rem; line-height: 1.5; }
    .note strong { color: var(--primary); }
    .footer { text-align: center; color: var(--text-muted); font-size: 0.875rem; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border); }
  </style>
</head>
<body>
  <div class="container">
    <h1>API Performance Metrics</h1>
    <p class="subtitle">Test run: ${new Date(summary.testRunStart).toLocaleString()} — Duration: ${summary.totalDuration.toFixed(2)}s</p>
    
    <div class="grid">
      <div class="card">
        <div class="card-title">Total Requests</div>
        <div class="card-value primary">${summary.totalRequests}</div>
      </div>
      <div class="card">
        <div class="card-title">Success Rate</div>
        <div class="card-value ${summary.overallErrorRate < 1 ? 'success' : summary.overallErrorRate < 5 ? 'warning' : 'danger'}">
          ${((summary.totalSuccessful / summary.totalRequests) * 100).toFixed(1)}<span class="card-unit">%</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Failed Requests</div>
        <div class="card-value ${summary.totalFailed === 0 ? 'success' : 'danger'}">${summary.totalFailed}</div>
      </div>
      <div class="card">
        <div class="card-title">Throughput</div>
        <div class="card-value primary">${(summary.totalRequests / summary.totalDuration).toFixed(1)}<span class="card-unit"> req/s</span></div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Latency Percentiles</h2>
      <div class="grid">
        <div class="card">
          <div class="card-title">P50 (Median)</div>
          <div class="card-value ${summary.overallP50 < 100 ? 'success' : summary.overallP50 < 500 ? 'warning' : 'danger'}">
            ${summary.overallP50.toFixed(0)}<span class="card-unit"> ms</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title">P95</div>
          <div class="card-value ${summary.overallP95 < 200 ? 'success' : summary.overallP95 < 1000 ? 'warning' : 'danger'}">
            ${summary.overallP95.toFixed(0)}<span class="card-unit"> ms</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title">P99</div>
          <div class="card-value ${summary.overallP99 < 500 ? 'success' : summary.overallP99 < 2000 ? 'warning' : 'danger'}">
            ${summary.overallP99.toFixed(0)}<span class="card-unit"> ms</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Average</div>
          <div class="card-value primary">${summary.overallAvg.toFixed(0)}<span class="card-unit"> ms</span></div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Endpoints Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Requests</th>
            <th>P50</th>
            <th>P95</th>
            <th>P99</th>
            <th>Avg</th>
            <th>Error Rate</th>
          </tr>
        </thead>
        <tbody>
          ${summary.byEndpoint.map(ep => `
          <tr>
            <td class="endpoint">${ep.endpoint}</td>
            <td>${ep.totalRequests}</td>
            <td>${ep.p50Latency.toFixed(0)} ms</td>
            <td>${ep.p95Latency.toFixed(0)} ms</td>
            <td>${ep.p99Latency.toFixed(0)} ms</td>
            <td>${ep.avgLatency.toFixed(0)} ms</td>
            <td><span class="badge ${ep.errorRate === 0 ? 'badge-success' : 'badge-danger'}">${ep.errorRate.toFixed(1)}%</span></td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section note-section">
      <div class="note">
        <strong>ℹ️ Note:</strong> Some "failed" requests are expected. Error handling tests intentionally trigger 4xx responses 
        (invalid IDs, bad parameters) to verify the API handles edge cases correctly.
      </div>
    </div>

    <div class="footer">
      <p>Generated by MetaPhoto API Test Suite</p>
    </div>
  </div>
</body>
</html>`;

    try {
      fs.writeFileSync(htmlPath, html);
      console.log(`📊 HTML metrics report: ${htmlPath}`);
    } catch (error) {
      console.error('Failed to save metrics HTML:', error);
    }
  }
}

export default MetricsReporter;
