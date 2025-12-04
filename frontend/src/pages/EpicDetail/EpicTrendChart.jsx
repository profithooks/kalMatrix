import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// fallback mock (used only if no real data passed)
const mockTrend = [
  { label: "Mon", value: 14 },
  { label: "Tue", value: 16 },
  { label: "Wed", value: 18 },
  { label: "Thu", value: 20 },
  { label: "Fri", value: 22 },
  { label: "Sat", value: 23 },
  { label: "Sun", value: 24 },
];

/**
 * trendData (optional) expected shape (examples):
 * [
 *   { date: "2025-11-25T07:30:00Z", riskScore: 60 },
 *   { date: "2025-11-26T07:30:00Z", riskScore: 55 },
 * ]
 *
 * You can map whatever you get from API to this before passing.
 */
export default function EpicTrendChart({ trendData }) {
  // normalize incoming data → { label, value }
  let data;

  if (Array.isArray(trendData) && trendData.length > 0) {
    data = trendData.map((p, idx) => {
      const date = p.date ? new Date(p.date) : null;
      const label = date
        ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : p.label || `#${idx + 1}`;

      const value =
        typeof p.riskScore === "number"
          ? Math.round(p.riskScore)
          : typeof p.value === "number"
          ? p.value
          : 0;

      return { label, value };
    });
  } else {
    // fallback to mock if nothing passed
    data = mockTrend;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#71717a" />
          <YAxis stroke="#71717a" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              fontSize: 12,
            }}
            labelStyle={{ color: "#e4e4e7" }}
            formatter={(value) => [`${value}%`, "Risk"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
