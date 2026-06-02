import { Injectable } from '@nestjs/common';
import { LockerStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type RequestMetric = {
  method: string;
  route: string;
  statusCode: number;
};

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  increment(name: string, labels: Record<string, string | number> = {}) {
    this.add(name, 1, labels);
  }

  observeRequest(metric: RequestMetric, latencyMs: number) {
    const labels = {
      method: metric.method,
      route: metric.route,
      statusCode: metric.statusCode
    };

    this.increment('locker_api_requests_total', labels);
    this.increment('locker_api_request_duration_ms_count', labels);
    this.add('locker_api_request_duration_ms_sum', latencyMs, labels);

    if (metric.statusCode >= 500) {
      this.increment('locker_api_errors_total', labels);
    }
  }

  async renderPrometheus() {
    const [
      totalLockers,
      availableLockers,
      occupiedLockers,
      maintenanceLockers,
      activeSessions,
      completedSessions
    ] = await this.prisma.$transaction([
      this.prisma.locker.count(),
      this.prisma.locker.count({
        where: { status: LockerStatus.AVAILABLE }
      }),
      this.prisma.locker.count({
        where: { status: LockerStatus.OCCUPIED }
      }),
      this.prisma.locker.count({
        where: { status: LockerStatus.MAINTENANCE }
      }),
      this.prisma.storageSession.count({
        where: { status: SessionStatus.ACTIVE }
      }),
      this.prisma.storageSession.count({
        where: { status: SessionStatus.COMPLETED }
      })
    ]);

    const lines = [
      '# HELP locker_api_up API process liveness.',
      '# TYPE locker_api_up gauge',
      'locker_api_up 1',
      '# HELP locker_api_uptime_seconds API process uptime in seconds.',
      '# TYPE locker_api_uptime_seconds gauge',
      `locker_api_uptime_seconds ${process.uptime().toFixed(0)}`,
      '# HELP locker_lockers_total Total lockers.',
      '# TYPE locker_lockers_total gauge',
      `locker_lockers_total ${totalLockers}`,
      '# HELP locker_lockers_by_status Lockers by status.',
      '# TYPE locker_lockers_by_status gauge',
      `locker_lockers_by_status{status="AVAILABLE"} ${availableLockers}`,
      `locker_lockers_by_status{status="OCCUPIED"} ${occupiedLockers}`,
      `locker_lockers_by_status{status="MAINTENANCE"} ${maintenanceLockers}`,
      '# HELP locker_sessions_by_status Storage sessions by status.',
      '# TYPE locker_sessions_by_status gauge',
      `locker_sessions_by_status{status="ACTIVE"} ${activeSessions}`,
      `locker_sessions_by_status{status="COMPLETED"} ${completedSessions}`,
      ...this.renderCounters()
    ];

    return `${lines.join('\n')}\n`;
  }

  private renderCounters() {
    if (this.counters.size === 0) {
      return [];
    }

    return [...this.counters.entries()].map(([key, value]) => `${key} ${value}`);
  }

  private add(
    name: string,
    value: number,
    labels: Record<string, string | number> = {}
  ) {
    const key = this.metricKey(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  private metricKey(name: string, labels: Record<string, string | number>) {
    const labelEntries = Object.entries(labels);

    if (labelEntries.length === 0) {
      return name;
    }

    const renderedLabels = labelEntries
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}="${this.escapeLabel(String(value))}"`)
      .join(',');

    return `${name}{${renderedLabels}}`;
  }

  private escapeLabel(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}
