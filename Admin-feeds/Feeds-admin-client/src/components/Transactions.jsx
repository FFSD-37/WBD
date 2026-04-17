import { useState, useEffect } from "react";
import {
  BadgeIndianRupee,
  User,
  Calendar,
  CreditCard,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import Sidebar from "./Sidebar";
import "../styles/transactions.css";
import { AuthContext } from "../context/AuthContext";
import { useContext } from "react";

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("custom");
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/payment/list`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await res.json();
        if (data.success) {
          setPayments(data.payments);
        } else {
          alert("Error fetching payments");
        }
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const formatDate = (dateObj) => {
    if (!dateObj) return "N/A";
    const date = dateObj.$date ? new Date(dateObj.$date) : new Date(dateObj);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount) => {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  const getCreatedDate = (payment) => {
    if (!payment) return null;
    const created = payment.createdAt;
    if (!created) return null;
    try {
      return created.$date ? new Date(created.$date) : new Date(created);
    } catch (e) {
      return new Date(created);
    }
  };

  const applyPeriod = (period) => {
    const now = new Date();
    let start = null;
    let end = new Date(now);

    switch (period) {
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case "last_quarter":
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = new Date(now);
        break;
      case "last_6_months":
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        end = new Date(now);
        break;
      case "last_year":
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        end = new Date(now);
        break;
      default:
        start = null;
        end = null;
    }

    if (start && end) {
      setFromDate(start.toISOString().slice(0, 10));
      setToDate(end.toISOString().slice(0, 10));
      setSelectedPeriod(period);
    } else {
      setFromDate("");
      setToDate("");
      setSelectedPeriod("custom");
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        bg: "#fef3c7",
        text: "#92400e",
        border: "#fbbf24",
        icon: Clock,
      },
      completed: {
        bg: "#d1fae5",
        text: "#065f46",
        border: "#10b981",
        icon: CheckCircle,
      },
      failed: {
        bg: "#fee2e2",
        text: "#991b1b",
        border: "#ef4444",
        icon: XCircle,
      },
      processing: {
        bg: "#dbeafe",
        text: "#1e40af",
        border: "#3b82f6",
        icon: Clock,
      },
    };
    return configs[status?.toLowerCase()] || configs["pending"];
  };

  const getTypeColor = (type) => {
    const colors = {
      monthly: "#e0e7ff",
      quarterly: "#ddd6fe",
      "semi-annualy": "#fce7f3",
      annually: "#d1fae5",
    };
    return colors[type?.toLowerCase()] || "#f3f4f6";
  };

  const handleStatusChange = async (paymentId, newStatus) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/home/updatePaymentStatus`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentId, status: newStatus }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setPayments(
          payments.map((payment) =>
            payment._id === paymentId
              ? { ...payment, status: newStatus }
              : payment,
          ),
        );
        setSelectedPayment((prev) =>
          prev?._id === paymentId ? { ...prev, status: newStatus } : prev,
        );
      } else {
        alert("Error updating payment status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const statusMatch =
      filterStatus === "all" || payment.status.toLowerCase() === filterStatus;
    const typeMatch =
      filterType === "all" || payment.type.toLowerCase() === filterType;
    return statusMatch && typeMatch;
  });

  // Apply date range filtering on top of status/type filters
  const finalDisplayedPayments = filteredPayments.filter((payment) => {
    if (!fromDate && !toDate) return true;
    const created = getCreatedDate(payment);
    if (!created) return false;
    const start = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const end = toDate ? new Date(toDate + "T23:59:59") : null;
    if (start && end) return created >= start && created <= end;
    if (start) return created >= start;
    if (end) return created <= end;
    return true;
  });

  const statusCounts = {
    all: payments.length,
    pending: payments.filter((p) => p.status.toLowerCase() === "pending")
      .length,
    completed: payments.filter((p) => p.status.toLowerCase() === "completed")
      .length,
    failed: payments.filter((p) => p.status.toLowerCase() === "failed").length,
  };

  const totalAmount = payments.reduce(
    (sum, payment) => sum + parseFloat(payment.amount),
    0,
  );
  const completedAmount = payments
    .filter((p) => p.status.toLowerCase() === "completed")
    .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  const intervalTotal = finalDisplayedPayments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0,
  );

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <div className="header-right">
            <div className="user-info">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bonnie"
                alt="User"
                className="user-avatar"
              />
              <span className="user-name">{user.username}</span>
            </div>
          </div>
        </div>

        {/* Payments Content */}
        <div className="content-area">
          <div className="header">
            <h2 className="pageTitle">Payment Transactions</h2>
            <div className="stats">
              <span className="statBadge">
                Total: {formatAmount(totalAmount)}
              </span>
              <span
                className="statBadge"
                style={{
                  backgroundColor: "#d1fae5",
                  color: "#065f46",
                }}
              >
                Completed: {formatAmount(completedAmount)}
              </span>
              <span
                className="statBadge"
                style={{
                  backgroundColor: "#eef2ff",
                  color: "#3730a3",
                }}
              >
                Revenue: {formatAmount(intervalTotal)}
              </span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="summaryGrid">
            <div className="summaryCard">
              <div className="summaryIcon">
                <BadgeIndianRupee size={24} color="#10b981" />
              </div>
              <div>
                <div className="summaryLabel">Total Transactions</div>
                <div className="summaryValue">{payments.length}</div>
              </div>
            </div>

            <div className="summaryCard">
              <div
                className="summaryIcon warning"
              >
                <Clock size={24} color="#f59e0b" />
              </div>
              <div>
                <div className="summaryLabel">Pending</div>
                <div className="summaryValue">{statusCounts.pending}</div>
              </div>
            </div>

            <div className="summaryCard">
              <div
                className="summaryIcon warning"
              >
                <CheckCircle size={24} color="#10b981" />
              </div>
              <div>
                <div className="summaryLabel">Completed</div>
                <div className="summaryValue">{statusCounts.completed}</div>
              </div>
            </div>

            <div className="summaryCard">
              <div
                className="summaryIcon warning"
              >
                <XCircle size={24} color="#ef4444" />
              </div>
              <div>
                <div className="summaryLabel">Failed</div>
                <div className="summaryValue">{statusCounts.failed}</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filtersContainer">
            <div className="filterGroup">
              <Filter size={16} color="#6b7280" />
              <span className="filterLabel">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filterSelect"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
              </select>
            </div>

            <div className="filterGroup">
              <span className="filterLabel">Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filterSelect"
              >
                <option value="all">All Types</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annualy">Semi-Annually</option>
                <option value="annually">Annually</option>
              </select>
            </div>

            <div className="filterGroup dateFilters">
              <span className="filterLabel">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setSelectedPeriod("custom");
                }}
                className="filterDate"
              />

              <span className="filterLabel">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setSelectedPeriod("custom");
                }}
                className="filterDate"
              />

              <div className="periodButtons">
                <button
                  className={`periodBtn ${selectedPeriod === "last_month" ? "active" : ""}`}
                  onClick={() => applyPeriod("last_month")}
                >
                  Last Month
                </button>
                <button
                  className={`periodBtn ${selectedPeriod === "last_quarter" ? "active" : ""}`}
                  onClick={() => applyPeriod("last_quarter")}
                >
                  Last Quarter
                </button>
                <button
                  className={`periodBtn ${selectedPeriod === "last_6_months" ? "active" : ""}`}
                  onClick={() => applyPeriod("last_6_months")}
                >
                  Last 6 Months
                </button>
                <button
                  className={`periodBtn ${selectedPeriod === "last_year" ? "active" : ""}`}
                  onClick={() => applyPeriod("last_year")}
                >
                  Last Year
                </button>
                <button
                  className="periodBtn"
                  onClick={() => applyPeriod("custom")}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner" />
              <p>Loading payments...</p>
            </div>
          ) : finalDisplayedPayments.length === 0 ? (
            <div className="emptyState">
              <BadgeIndianRupee size={48} color="#9ca3af" />
              <p className="emptyText">No payments found</p>
            </div>
          ) : (
            <div className="paymentList">
              {finalDisplayedPayments.map((payment) => {
                const statusConfig = getStatusConfig(payment.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={payment.id || payment._id}
                    className="paymentCard"
                    onClick={() => setSelectedPayment(payment)}
                  >
                    <div className="cardHeader">
                      <div className="userSection">
                        <div className="avatarCircle">
                          <User size={20} color="#4b5563" />
                        </div>
                        <div>
                          <div className="username">{payment.username}</div>
                          <div className="paymentId">ID: {payment.id}</div>
                        </div>
                      </div>
                      <div
                        className="statusBadge"
                        style={{
                          backgroundColor: statusConfig.bg,
                          color: statusConfig.text,
                          border: `1px solid ${statusConfig.border}`,
                        }}
                      >
                        <StatusIcon size={14} />
                        {payment.status}
                      </div>
                    </div>

                    <div className="cardBody">
                      <div className="amountSection">
                        <BadgeIndianRupee size={20} color="#10b981" />
                        <span className="amount">
                          {formatAmount(payment.amount)}
                        </span>
                      </div>

                      <div className="detailsGrid">
                        <div className="detailItem">
                          <CreditCard size={14} color="#6b7280" />
                          <div>
                            <div className="detailLabel">Type</div>
                            <div
                              className="typeBadge"
                              style={{
                                backgroundColor: getTypeColor(payment.type),
                              }}
                            >
                              {payment.type}
                            </div>
                          </div>
                        </div>

                        <div className="detailItem">
                          <span className="detailLabel">Reference ID</span>
                          <span className="detailValue">
                            {payment.reference_id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="cardFooter">
                      <div className="dateInfo">
                        <Calendar size={14} color="#6b7280" />
                        <span>{formatDate(payment.createdAt)}</span>
                      </div>
                      <button
                        className="viewButton"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPayment(payment);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal for detailed view */}
        {selectedPayment && (
          <div
            className="modalOverlay"
            onClick={() => setSelectedPayment(null)}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <h3 className="modalTitle">Payment Details</h3>
                <button
                  className="closeButton"
                  onClick={() => setSelectedPayment(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modalBody">
                <div className="modalAmountSection">
                  <div className="modalAmountLabel">Amount</div>
                  <div className="modalAmountValue">
                    {formatAmount(selectedPayment.amount)}
                  </div>
                </div>

                <div className="modalRow">
                  <span className="modalLabel">Payment ID:</span>
                  <span className="modalValue">{selectedPayment.id}</span>
                </div>
                <div className="modalRow">
                  <span className="modalLabel">Username:</span>
                  <span className="modalValue">
                    {selectedPayment.username}
                  </span>
                </div>
                <div className="modalRow">
                  <span className="modalLabel">Reference ID:</span>
                  <span className="modalValue">
                    {selectedPayment.reference_id}
                  </span>
                </div>
                <div className="modalRow">
                  <span className="modalLabel">Subscription Type:</span>
                  <span
                    className="typeBadge"
                    style={{
                      backgroundColor: getTypeColor(selectedPayment.type),
                    }}
                  >
                    {selectedPayment.type}
                  </span>
                </div>
                <div className="modalRow">
                  <span className="modalLabel">Status:</span>
                  <select
                    value={selectedPayment.status}
                    onChange={(e) =>
                      handleStatusChange(selectedPayment._id, e.target.value)
                    }
                    className="statusSelect"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Completed">Completed</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
                <div className="modalRow">
                  <span className="modalLabel">Created:</span>
                  <span className="modalValue">
                    {formatDate(selectedPayment.createdAt)}
                  </span>
                </div>
                <div className="modalRow">
                  <span className="modalLabel">Updated:</span>
                  <span className="modalValue">
                    {formatDate(selectedPayment.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
