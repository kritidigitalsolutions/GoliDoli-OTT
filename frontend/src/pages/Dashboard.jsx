import { useEffect, useState } from "react";
import API from "../api/axios";
import "./Dashboard.css";
import {
  LayoutDashboard,
  Users,
  Film,
  TrendingUp,
  RefreshCw,
  BadgeCheck,
  UserX,
  Clock3,
  Sun,
  CalendarDays,
  CalendarRange,
  CalendarClock,
  Wallet,
  PieChart as PieChartIcon,
  CreditCard,
  UserPlus
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const CHART_COLORS = ["#6366F1", "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6"];

function MinimalChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ch-tooltip">
      <p className="ch-tooltip-label">{label}</p>
      <p className="ch-tooltip-val">
        <span className="ch-tooltip-dot"></span>
        {payload[0].value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState({
    totalSubscribedUsers: 0,
    totalNotSubscribedUsers: 0,
    expirySubscriptionCount: 0,
  });
  const [registrationStats, setRegistrationStats] = useState({
    todayRegistration: 0,
    yesterdayRegistration: 0,
    totalRegistration: 0,
  });
  const [incomeStats, setIncomeStats] = useState({
    todayIncome: 0,
    yesterdayIncome: 0,
    weeklyIncome: 0,
    monthlyIncome: 0,
    yearlyIncome: 0,
    totalIncome: 0,
  });

  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState([]);
  const [contentStats, setContentStats] = useState([]);

  const GROWTH = growthData.length ? growthData : [];
  const PIE = contentStats.length ? contentStats : [];

  async function fetchData() {
    setLoading(true);
    try {
      const [uRes, sRes, gRes, subStatsRes, incomeStatsRes, regStatsRes] = await Promise.all([
        API.get("/admin/users"),
        API.get("/admin/content/stats"),
        API.get("/admin/user/growth"),
        API.get("/admin/subscription/stats"),
        API.get("/admin/subscription/income-stats"),
        API.get("/admin/user/registration-stats"),
      ]);

      setContentStats(sRes.data?.data || []);
      setGrowthData(gRes.data?.data || []);

      setSubscriptionStats(subStatsRes.data?.data || {
        totalSubscribedUsers: 0,
        totalNotSubscribedUsers: 0,
        expirySubscriptionCount: 0,
      });
      setIncomeStats(incomeStatsRes.data?.data || {
        todayIncome: 0,
        yesterdayIncome: 0,
        weeklyIncome: 0,
        monthlyIncome: 0,
        yearlyIncome: 0,
        totalIncome: 0,
      });
      setRegistrationStats(regStatsRes.data?.data || {
        todayRegistration: 0,
        yesterdayRegistration: 0,
        totalRegistration: 0,
      });
      setUsers(uRes.data?.users || uRes.data?.data || uRes.data || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const moviesCount = contentStats.find(c => c.name === "Movies")?.value || 0;
  const seriesCount = contentStats.find(c => c.name === "Series")?.value || 0;
  const totalContent = moviesCount + seriesCount;

  const totalUsersCount = Array.isArray(users) ? users.length : (registrationStats.totalRegistration || 0);

  return (
    <div className="page-section">
      {/* ── Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <LayoutDashboard size={24} className="pg-title-icon" />
            Dashboard Overview
          </h1>
          <p className="pg-sub">Real-time metrics, user growth, and revenue statistics</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin-icon" : ""} />
          <span>{loading ? "Syncing..." : "Refresh"}</span>
        </button>
      </div>

      {/* ── Section 1: Executive KPI Grid (4 Columns Symmetrical) ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Users</span>
            <div className="kpi-icon-badge icon-indigo">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "..." : totalUsersCount.toLocaleString("en-IN")}</div>
          <div className="kpi-footer text-success">
            <TrendingUp size={14} />
            <span>Active user base</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Subscribed Users</span>
            <div className="kpi-icon-badge icon-emerald">
              <BadgeCheck size={18} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "..." : subscriptionStats.totalSubscribedUsers.toLocaleString("en-IN")}</div>
          <div className="kpi-footer text-muted">
            <span>{totalUsersCount > 0 ? `${Math.round((subscriptionStats.totalSubscribedUsers / totalUsersCount) * 100)}% conversion rate` : "0% conversion rate"}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Content Library</span>
            <div className="kpi-icon-badge icon-blue">
              <Film size={18} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "..." : totalContent.toLocaleString("en-IN")}</div>
          <div className="kpi-footer text-muted">
            <span>{moviesCount} Movies • {seriesCount} Series</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Revenue</span>
            <div className="kpi-icon-badge icon-amber">
              <Wallet size={18} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "..." : formatCurrency(incomeStats.totalIncome)}</div>
          <div className="kpi-footer text-success">
            <TrendingUp size={14} />
            <span>All-time earnings</span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Symmetric Dual Metrics Grid ── */}
      <div className="dual-grid">
        {/* Registration & Subscriptions Breakdown */}
        <div className="content-box">
          <div className="box-header">
            <UserPlus size={18} className="box-icon text-indigo" />
            <h3>User & Subscription Activity</h3>
          </div>
          <div className="stat-subgrid">
            <div className="sub-card">
              <div className="sub-icon"><Sun size={18} /></div>
              <div>
                <div className="sub-label">Today Registrations</div>
                <div className="sub-val">{loading ? "..." : registrationStats.todayRegistration}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><CalendarDays size={18} /></div>
              <div>
                <div className="sub-label">Yesterday Registrations</div>
                <div className="sub-val">{loading ? "..." : registrationStats.yesterdayRegistration}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><UserX size={18} /></div>
              <div>
                <div className="sub-label">Unsubscribed Users</div>
                <div className="sub-val">{loading ? "..." : subscriptionStats.totalNotSubscribedUsers}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><Clock3 size={18} /></div>
              <div>
                <div className="sub-label">Expired Subscriptions</div>
                <div className="sub-val text-warning">{loading ? "..." : subscriptionStats.expirySubscriptionCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Income Breakdown */}
        <div className="content-box">
          <div className="box-header">
            <CreditCard size={18} className="box-icon text-emerald" />
            <h3>Revenue Breakdown</h3>
          </div>
          <div className="stat-subgrid">
            <div className="sub-card">
              <div className="sub-icon"><Sun size={18} /></div>
              <div>
                <div className="sub-label">Today Earnings</div>
                <div className="sub-val">{loading ? "..." : formatCurrency(incomeStats.todayIncome)}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><CalendarDays size={18} /></div>
              <div>
                <div className="sub-label">Yesterday Earnings</div>
                <div className="sub-val">{loading ? "..." : formatCurrency(incomeStats.yesterdayIncome)}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><CalendarRange size={18} /></div>
              <div>
                <div className="sub-label">Weekly Earnings</div>
                <div className="sub-val">{loading ? "..." : formatCurrency(incomeStats.weeklyIncome)}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><CalendarClock size={18} /></div>
              <div>
                <div className="sub-label">Monthly Earnings</div>
                <div className="sub-val">{loading ? "..." : formatCurrency(incomeStats.monthlyIncome)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Charts Row ── */}
      <div className="charts-row">
        {/* Area Chart - User Growth */}
        <div className="content-box">
          <div className="box-header">
            <TrendingUp size={18} className="box-icon text-indigo" />
            <h3>User Growth Trend</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={GROWTH} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<MinimalChartTip />} cursor={{ stroke: "var(--border2)", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="users" stroke="#6366F1" strokeWidth={2}
                  fill="url(#indigoGrad)"
                  activeDot={{ r: 5, fill: "#6366F1", stroke: "var(--bg2)", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Content Split */}
        <div className="content-box">
          <div className="box-header">
            <PieChartIcon size={18} className="box-icon text-emerald" />
            <h3>Content Split</h3>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={PIE} cx="50%" cy="45%"
                  innerRadius={55} outerRadius={82}
                  paddingAngle={5} dataKey="value" stroke="none">
                  {PIE.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", fontSize: "0.85rem" }} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: "var(--text-soft)", fontSize: "0.82rem", fontWeight: 500 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Section 4: Recent Users Table ── */}
      <div className="content-box">
        <div className="box-header">
          <Clock3 size={18} className="box-icon text-soft" />
          <h3>Recent User Signups</h3>
        </div>
        {loading ? (
          <div className="tbl-placeholder">Loading recent signups...</div>
        ) : !Array.isArray(users) || users.length === 0 ? (
          <div className="tbl-placeholder">No user signups found</div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 6).map((u, i) => (
                  <tr key={u._id || i}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <div className="user-cell">
                        <div className="u-avatar">{u.name?.[0]?.toUpperCase() || "U"}</div>
                        <span className="u-name">{u.name || "User"}</span>
                      </div>
                    </td>
                    <td className="text-soft">{u.email}</td>
                    <td className="text-muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${u.isBlocked ? "badge-blocked" : "badge-active"}`}>
                        {u.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
