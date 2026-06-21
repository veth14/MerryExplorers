import { AppShell } from "@/components/app-shell";
import { reportMetrics } from "@/data/reports";
import { ReportsTable } from "@/components/reports/reports-table";
import { ReportsChart } from "@/components/reports/reports-chart";
import { ReportsFilterBar } from "@/components/reports/reports-filter-bar";
import { ReportsMetricCard } from "@/components/reports/reports-metric-card";
import { ReportsFooterBanner } from "@/components/reports/reports-footer-banner";

export default function ReportsPage() {
  return (
    <AppShell title="Reports" description="Explore key metrics and detailed data visualizations for your activities.">
      {/* Filter Bar - full width */}
      <ReportsFilterBar />

      {/* Metric Cards Row - 3 cards in a row matching the design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportMetrics.map((metric) => (
          <ReportsMetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            unit={"unit" in metric ? metric.unit : undefined}
            type={metric.type}
          />
        ))}
      </div>

      {/* Punctuality Trends Chart - full width */}
      <ReportsChart />

      {/* Detailed Logs Table - full width */}
      <ReportsTable />

      {/* Footer Banner */}
      <ReportsFooterBanner />

      {/* Bottom spacing */}
      <div className="h-4" />
    </AppShell>
  );
}
