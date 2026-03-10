/**
 * API Metrics Collector
 * 
 * Collects and aggregates API response time metrics including:
 * - P50, P95, P99 latencies
 * - Min/Max/Average response times
 * - Request counts and error rates
 * - Throughput measurements
 * 
 * Uses a shared file to communicate metrics between test workers and reporter.
 */

import * as fs from 'fs';
import * as path from 'path';

const METRICS_FILE = path.join(process.cwd(), 'test-results', '.metrics-data.json');

export interface RequestMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  success: boolean;
}

export interface AggregatedMetrics {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  minLatency: number;
  maxLatency: number;
  avgLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number; // requests per second
}

export interface MetricsSummary {
  testRunStart: number;
  testRunEnd: number;
  totalDuration: number;
  totalRequests: number;
  totalSuccessful: number;
  totalFailed: number;
  overallErrorRate: number;
  overallP50: number;
  overallP95: number;
  overallP99: number;
  overallAvg: number;
  byEndpoint: AggregatedMetrics[];
}

class MetricsCollector {
  private metrics: RequestMetric[] = [];
  private startTime: number = 0;

  /**
   * Start a new metrics collection session
   */
  start(): void {
    this.metrics = [];
    this.startTime = Date.now();
    this.persistStart();
  }

  /**
   * Persist start time to shared file
   */
  private persistStart(): void {
    try {
      const dir = path.dirname(METRICS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(METRICS_FILE, JSON.stringify({ startTime: this.startTime, metrics: [] }));
    } catch {
      // Ignore file write errors
    }
  }

  /**
   * Record a single request metric and persist to shared file
   */
  record(metric: Omit<RequestMetric, 'timestamp'>): void {
    const fullMetric = {
      ...metric,
      timestamp: Date.now(),
    };
    this.metrics.push(fullMetric);
    this.persistMetric(fullMetric);
  }

  /**
   * Persist a single metric to shared file (append)
   */
  private persistMetric(metric: RequestMetric): void {
    try {
      const dir = path.dirname(METRICS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      let data = { startTime: Date.now(), metrics: [] as RequestMetric[] };
      if (fs.existsSync(METRICS_FILE)) {
        const content = fs.readFileSync(METRICS_FILE, 'utf-8');
        data = JSON.parse(content);
      }
      data.metrics.push(metric);
      fs.writeFileSync(METRICS_FILE, JSON.stringify(data));
    } catch {
      // Ignore file write errors
    }
  }

  /**
   * Load metrics from shared file (used by reporter)
   */
  loadFromFile(): void {
    try {
      if (fs.existsSync(METRICS_FILE)) {
        const content = fs.readFileSync(METRICS_FILE, 'utf-8');
        const data = JSON.parse(content);
        this.startTime = data.startTime || Date.now();
        this.metrics = data.metrics || [];
      }
    } catch {
      // Ignore file read errors
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
  }

  /**
   * Get aggregated metrics for a specific endpoint
   */
  private aggregateForEndpoint(endpoint: string, requests: RequestMetric[]): AggregatedMetrics {
    const durations = requests.map(r => r.duration).sort((a, b) => a - b);
    const successful = requests.filter(r => r.success);
    const failed = requests.filter(r => !r.success);
    
    const totalDuration = (Date.now() - this.startTime) / 1000; // seconds

    return {
      endpoint,
      totalRequests: requests.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      errorRate: requests.length > 0 ? (failed.length / requests.length) * 100 : 0,
      minLatency: Math.min(...durations),
      maxLatency: Math.max(...durations),
      avgLatency: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50Latency: this.percentile(durations, 50),
      p95Latency: this.percentile(durations, 95),
      p99Latency: this.percentile(durations, 99),
      throughput: requests.length / totalDuration,
    };
  }

  /**
   * Get full metrics summary
   */
  getSummary(): MetricsSummary {
    const endTime = Date.now();
    const allDurations = this.metrics.map(r => r.duration).sort((a, b) => a - b);
    const successful = this.metrics.filter(r => r.success);
    const failed = this.metrics.filter(r => !r.success);

    // Group by endpoint
    const endpointGroups = new Map<string, RequestMetric[]>();
    for (const metric of this.metrics) {
      const key = metric.endpoint;
      if (!endpointGroups.has(key)) {
        endpointGroups.set(key, []);
      }
      endpointGroups.get(key)!.push(metric);
    }

    const byEndpoint: AggregatedMetrics[] = [];
    for (const [endpoint, requests] of endpointGroups) {
      byEndpoint.push(this.aggregateForEndpoint(endpoint, requests));
    }

    // Sort by total requests descending
    byEndpoint.sort((a, b) => b.totalRequests - a.totalRequests);

    return {
      testRunStart: this.startTime,
      testRunEnd: endTime,
      totalDuration: (endTime - this.startTime) / 1000,
      totalRequests: this.metrics.length,
      totalSuccessful: successful.length,
      totalFailed: failed.length,
      overallErrorRate: this.metrics.length > 0 ? (failed.length / this.metrics.length) * 100 : 0,
      overallP50: this.percentile(allDurations, 50),
      overallP95: this.percentile(allDurations, 95),
      overallP99: this.percentile(allDurations, 99),
      overallAvg: allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0,
      byEndpoint,
    };
  }

  /**
   * Get raw metrics data
   */
  getRawMetrics(): RequestMetric[] {
    return [...this.metrics];
  }

  /**
   * Format metrics as a readable report string
   */
  formatReport(): string {
    const summary = this.getSummary();
    const lines: string[] = [];

    lines.push('');
    lines.push('═'.repeat(70));
    lines.push('                    API PERFORMANCE METRICS REPORT');
    lines.push('═'.repeat(70));
    lines.push('');

    // Overall Summary
    lines.push('📊 OVERALL SUMMARY');
    lines.push('─'.repeat(50));
    lines.push(`  Total Requests:     ${summary.totalRequests}`);
    lines.push(`  Successful:         ${summary.totalSuccessful} (${((summary.totalSuccessful / summary.totalRequests) * 100).toFixed(1)}%)`);
    lines.push(`  Failed:             ${summary.totalFailed} (${summary.overallErrorRate.toFixed(1)}%)`);
    lines.push(`  Test Duration:      ${summary.totalDuration.toFixed(2)}s`);
    lines.push('');

    // Latency Summary
    lines.push('⏱️  LATENCY PERCENTILES (ms)');
    lines.push('─'.repeat(50));
    lines.push(`  P50 (median):       ${summary.overallP50.toFixed(1)} ms`);
    lines.push(`  P95:                ${summary.overallP95.toFixed(1)} ms`);
    lines.push(`  P99:                ${summary.overallP99.toFixed(1)} ms`);
    lines.push(`  Average:            ${summary.overallAvg.toFixed(1)} ms`);
    lines.push('');

    // Per-Endpoint Breakdown
    if (summary.byEndpoint.length > 0) {
      lines.push('📈 BREAKDOWN BY ENDPOINT');
      lines.push('─'.repeat(50));
      
      for (const ep of summary.byEndpoint) {
        lines.push(`\n  ${ep.endpoint}`);
        lines.push(`    Requests: ${ep.totalRequests} | Errors: ${ep.failedRequests} (${ep.errorRate.toFixed(1)}%)`);
        lines.push(`    Latency:  P50=${ep.p50Latency.toFixed(0)}ms | P95=${ep.p95Latency.toFixed(0)}ms | P99=${ep.p99Latency.toFixed(0)}ms`);
        lines.push(`    Range:    ${ep.minLatency.toFixed(0)}ms - ${ep.maxLatency.toFixed(0)}ms (avg: ${ep.avgLatency.toFixed(0)}ms)`);
      }
    }

    lines.push('');
    lines.push('═'.repeat(70));
    lines.push('');

    return lines.join('\n');
  }
}

// Singleton instance for global access
export const metricsCollector = new MetricsCollector();
