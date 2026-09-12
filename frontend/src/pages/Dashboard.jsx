import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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

const CHART_COLORS = ["#FFD11A", "#FF0F8A", "#10B981", "#3B82F6", "#8B5CF6"];

function MinimalChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value || 0;
  return (
    <div className="ch-tooltip">
      <p className="ch-tooltip-label">{label}</p>
      <p className="ch-tooltip-val">
        <span className="ch-tooltip-dot"></span>
        {count.toLocaleString("en-IN")} {count === 1 ? "User" : "Users"}
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
  const [timeframe, setTimeframe] = useState("weekly");
  const [growthData, setGrowthData] = useState([]);
  const [growthCache, setGrowthCache] = useState({});
  const [contentStats, setContentStats] = useState([]);

  const extractNum = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "object" && v !== null) return Number(v.total || v.amount || 0) || 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const formatCurrency = (value) => {
    const num = extractNum(value);
    return `₹${num.toLocaleString("en-IN")}`;
  };

  async function fetchData() {
    setLoading(true);
    try {
      const [uRes, sRes, gRes, subStatsRes, incomeStatsRes, regStatsRes] = await Promise.all([
        API.get("/admin/users"),
        API.get("/admin/content/stats"),
        API.get(`/admin/user/growth?period=${timeframe}`),
        API.get("/admin/subscription/stats"),
        API.get("/admin/subscription/income-stats"),
        API.get("/admin/user/registration-stats"),
      ]);

      // Parse Content Stats
      const rawStats = sRes.data?.stats || sRes.data?.data || sRes.data || {};
      let parsedStats = [];
      if (Array.isArray(rawStats)) {
        parsedStats = rawStats;
      } else if (typeof rawStats === "object") {
        parsedStats = [
          { name: "Movies", value: rawStats.movies || 0 },
          { name: "Series", value: rawStats.series || 0 },
          { name: "Microdramas", value: rawStats.microdramas || 0 },
        ];
      }
      setContentStats(parsedStats);

      const fetchedGrowth = gRes.data?.data || [];
      setGrowthData(fetchedGrowth);
      setGrowthCache((prev) => ({ ...prev, [timeframe]: fetchedGrowth }));

      setSubscriptionStats(subStatsRes.data?.data || {
        totalSubscribedUsers: 0,
        totalNotSubscribedUsers: 0,
        expirySubscriptionCount: 0,
      });

      const rawIncome = incomeStatsRes.data?.data || incomeStatsRes.data?.incomeStats || incomeStatsRes.data || {};
      setIncomeStats({
        todayIncome: extractNum(rawIncome.todayIncome),
        yesterdayIncome: extractNum(rawIncome.yesterdayIncome),
        weeklyIncome: extractNum(rawIncome.weeklyIncome),
        monthlyIncome: extractNum(rawIncome.monthlyIncome),
        yearlyIncome: extractNum(rawIncome.yearlyIncome),
        totalIncome: extractNum(rawIncome.totalIncome),
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

  const handleTimeframeChange = async (period) => {
    if (period === timeframe) return;
    setTimeframe(period);

    // Instant UI switch if cached
    if (growthCache[period]) {
      setGrowthData(growthCache[period]);
    }

    try {
      const gRes = await API.get(`/admin/user/growth?period=${period}`);
      const fetchedData = gRes.data?.data || [];
      setGrowthData(fetchedData);
      setGrowthCache((prev) => ({ ...prev, [period]: fetchedData }));
    } catch (err) {
      console.error("User growth timeframe fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const moviesCount = contentStats.find(c => c.name === "Movies")?.value || 0;
  const seriesCount = contentStats.find(c => c.name === "Series")?.value || 0;
  const microdramasCount = contentStats.find(c => c.name === "Microdramas")?.value || 0;
  const totalContent = moviesCount + seriesCount + microdramasCount;

  const activePieItems = contentStats.filter(c => c.value > 0);
  const PIE = activePieItems.length > 0
    ? activePieItems
    : [
        { name: "Movies", value: moviesCount },
        { name: "Series", value: seriesCount },
        { name: "Microdramas", value: microdramasCount }
      ];

  const defaultWeekly = [
    { day: "Sun", users: 0 },
    { day: "Mon", users: 0 },
    { day: "Tue", users: 0 },
    { day: "Wed", users: 0 },
    { day: "Thu", users: 0 },
    { day: "Fri", users: 0 },
    { day: "Sat", users: 0 },
  ];

  const defaultMonthly = [
    { day: "Jan", users: 0 },
    { day: "Feb", users: 0 },
    { day: "Mar", users: 0 },
    { day: "Apr", users: 0 },
    { day: "May", users: 0 },
    { day: "Jun", users: 0 },
    { day: "Jul", users: 0 },
    { day: "Aug", users: 0 },
    { day: "Sep", users: 0 },
    { day: "Oct", users: 0 },
    { day: "Nov", users: 0 },
    { day: "Dec", users: 0 },
  ];

  const currYear = new Date().getFullYear();
  const defaultYearly = [
    { day: (currYear - 4).toString(), users: 0 },
    { day: (currYear - 3).toString(), users: 0 },
    { day: (currYear - 2).toString(), users: 0 },
    { day: (currYear - 1).toString(), users: 0 },
    { day: currYear.toString(), users: 0 },
  ];

  const getDefaultGrowth = (period) => {
    if (period === "yearly") return defaultYearly;
    if (period === "monthly") return defaultMonthly;
    return defaultWeekly;
  };

  const GROWTH = growthData.length ? growthData : getDefaultGrowth(timeframe);

  const totalUsersCount = Array.isArray(users) ? users.length : (registrationStats.totalRegistration || 0);

  return (
    <div className="page-section">
      {/* ── Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <LayoutDashboard size={22} className="pg-title-icon" />
            Dashboard Overview
          </h1>
          <p className="pg-sub">Real-time metrics, user growth, and revenue statistics</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
          <span>{loading ? "Syncing..." : "Refresh"}</span>
        </button>
      </div>

      {/* ── Section 1: Executive KPI Grid (4 Columns Symmetrical) ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Users</span>
            <div className="kpi-icon-badge icon-amber">
              <Users size={16} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "..." : totalUsersCount.toLocaleString("en-IN")}</div>
          <div className="kpi-footer text-success">
            <TrendingUp size={13} />
            <span>Active user base</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Subscribed Users</span>
            <div className="kpi-icon-badge icon-emerald">
              <BadgeCheck size={16} />
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
              <Film size={16} />
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
            <div className="kpi-icon-badge icon-pink">
              <Wallet size={16} />
            </div>
          </div>
          <div className="kpi-value">{loading ? "..." : formatCurrency(incomeStats.totalIncome)}</div>
          <div className="kpi-footer text-success">
            <TrendingUp size={13} />
            <span>All-time earnings</span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Symmetric Dual Metrics Grid ── */}
      <div className="dual-grid">
        {/* Registration & Subscriptions Breakdown */}
        <div className="content-box">
          <div className="box-header">
            <UserPlus size={16} className="box-icon text-gold" />
            <h3>User & Subscription Activity</h3>
          </div>
          <div className="stat-subgrid">
            <div className="sub-card">
              <div className="sub-icon"><Sun size={16} /></div>
              <div>
                <div className="sub-label">Today Registrations</div>
                <div className="sub-val">{loading ? "..." : registrationStats.todayRegistration}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><CalendarDays size={16} /></div>
              <div>
                <div className="sub-label">Yesterday Registrations</div>
                <div className="sub-val">{loading ? "..." : registrationStats.yesterdayRegistration}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><UserX size={16} /></div>
              <div>
                <div className="sub-label">Unsubscribed Users</div>
                <div className="sub-val">{loading ? "..." : subscriptionStats.totalNotSubscribedUsers}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><Clock3 size={16} /></div>
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
            <CreditCard size={16} className="box-icon text-emerald" />
            <h3>Revenue Breakdown</h3>
          </div>
          <div className="stat-subgrid">
            <div className="sub-card">
              <div className="sub-icon"><Sun size={16} /></div>
              <div>
                <div className="sub-label">Today Earnings</div>
                <div className="sub-val">{loading ? "..." : formatCurrency(incomeStats.todayIncome)}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><CalendarDays size={16} /></div>
              <div>
                <div className="sub-label">Yesterday Earnings</div>
                <div className="sub-val">{loading ? "..." : formatCurrency(incomeStats.yesterdayIncome)}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><CalendarRange size={16} /></div>
              <div>
                <div className="sub-label">Weekly Earnings</div>
                <div className="sub-val">{loading ? "..." : formatCurrency(incomeStats.weeklyIncome)}</div>
              </div>
            </div>

            <div className="sub-card">
              <div className="sub-icon"><CalendarClock size={16} /></div>
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
          <div className="box-header box-header-between">
            <div className="box-header-title">
              <TrendingUp size={16} className="box-icon text-gold" />
              <h3>User Growth Trend</h3>
            </div>
            <div className="timeframe-toggle-group">
              {[
                { key: "weekly", label: "Weekly" },
                { key: "monthly", label: "Monthly" },
                { key: "yearly", label: "Yearly" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`timeframe-btn ${timeframe === item.key ? "active" : ""}`}
                  onClick={() => handleTimeframeChange(item.key)}
                >
                  {timeframe === item.key && (
                    <motion.div
                      layoutId="activeTimeframePill"
                      className="timeframe-pill-active-bg"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="timeframe-btn-text">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={GROWTH} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="var(--text-muted)"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, "auto"]}
                  stroke="var(--text-muted)"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<MinimalChartTip />} cursor={{ stroke: "var(--border2)", strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#FFD11A"
                  strokeWidth={2.2}
                  fill="#FFD11A"
                  fillOpacity={0.12}
                  activeDot={{ r: 5, fill: "#FFD11A", stroke: "var(--bg2)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Content Split */}
        <div className="content-box">
          <div className="box-header">
            <PieChartIcon size={16} className="box-icon text-emerald" />
            <h3>Content Split</h3>
          </div>
          <div className="chart-container">
            {totalContent === 0 ? (
              <div className="tbl-placeholder" style={{ padding: "60px 0" }}>
                No content in library yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={PIE} cx="50%" cy="45%"
                    innerRadius={48} outerRadius={72}
                    paddingAngle={4} dataKey="value" stroke="none">
                    {PIE.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--text)", fontSize: "0.8rem" }} />
                  <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ color: "var(--text-soft)", fontSize: "0.78rem", fontWeight: 500 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 4: Recent Users Table ── */}
      <div className="content-box">
        <div className="box-header">
          <Clock3 size={16} className="box-icon text-soft" />
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
                  <th style={{ width: "50px" }}>#</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 5).map((u, i) => (
                  <tr key={u._id || i}>
                    <td className="text-muted">{i + 1}</td>
                    <td>
                      <div className="user-cell">
                        <div className="u-avatar">
                          <img
                            src={
                              u.profileImage || u.profilePic || u.avatar || u.photo
                                ? (u.profileImage || u.profilePic || u.avatar || u.photo).startsWith("http")
                                  ? (u.profileImage || u.profilePic || u.avatar || u.photo)
                                  : `https://golidoli.com/${u.profileImage || u.profilePic || u.avatar || u.photo}`
                                : `https://i.pravatar.cc/150?u=${encodeURIComponent(u._id || u.email || u.name || i)}`
                            }
                            alt={u.name || "User"}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://i.pravatar.cc/150?u=${encodeURIComponent(u._id || u.email || u.name || i)}`;
                            }}
                          />
                        </div>
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
