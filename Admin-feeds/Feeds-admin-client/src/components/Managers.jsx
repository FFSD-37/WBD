import Sidebar from "./Sidebar";
import { AuthContext } from "../context/AuthContext";
import React, { useState, useEffect, useContext } from "react";
import { User, Mail, Calendar, Trash2, Edit3 } from "lucide-react";
import api, { apiCall } from "../utils/api";
import { useError } from "../context/ErrorContext";

const Managers = () => {
    const { user } = useContext(AuthContext);
    const { showError } = useError();

    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedManager, setSelectedManager] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [managerType, setManagerType] = useState("");
    const [actionReason, setActionReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchManagers = async () => {
            try {
                const data = await apiCall(() => api.get("/manager/list"), showError);
                setManagers(data.managers || []);
                console.table(managers);
            } finally {
                setLoading(false);
            }
        };

        fetchManagers();
    }, []);

    const handleClearSearch = () => setSearchQuery("");

        const filteredManagers = (managers || []).filter((m) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const name = m.username || "";
        const email = m.email || "";
        const type = m.managerType || "";
        return (
            name.toLowerCase().includes(q) ||
            email.toLowerCase().includes(q) ||
            type.toLowerCase().includes(q)
        );
    });

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

    const openManager = (m) => {
        setSelectedManager(m);
        setManagerType(m.managerType || m.role || "manager");
        setActionReason("");
    };

    const handleUpdateRole = async () => {
        if (!actionReason.trim()) return showError("Please provide a reason for this change.");
        setActionLoading(true);
        try {
            await apiCall(
                () => api.post("/manager/updateRole", { managerId: selectedManager._id, managerType, reason: actionReason }),
                showError,
            );
            setManagers((prev) => prev.map((p) => (p._id === selectedManager._id ? { ...p, managerType } : p)));
            setSelectedManager((s) => (s ? { ...s, managerType } : s));
            setActionReason("");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteManager = async () => {
        if (!actionReason.trim()) return showError("Please provide a reason for deleting the manager.");
        if (!window.confirm("Are you sure you want to delete this manager? This action cannot be undone.")) return;
        setActionLoading(true);
        try {
            await apiCall(
                () => api.post("/manager/delete", { managerId: selectedManager._id, reason: actionReason }),
                showError,
            );
            setManagers((prev) => prev.filter((p) => p._id !== selectedManager._id));
            setSelectedManager(null);
            setActionReason("");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="dashboard-container">
            <Sidebar />

            <div className="main-content">
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

                <div className="content-area">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#1f2937", margin: 0 }}>Managers</h2>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                                type="search"
                                placeholder="Search name, email or type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", width: "320px", outline: "none", fontSize: "14px" }}
                            />
                            {searchQuery && (
                                <button onClick={handleClearSearch} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "14px" }}>Clear</button>
                            )}

                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <span style={{ padding: "0.5rem 1rem", backgroundColor: "#e0e7ff", color: "#4338ca", borderRadius: "20px", fontSize: "0.875rem", fontWeight: 600 }}>Total: {managers.length}</span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#6b7280" }}>
                            <div className="spinner" />
                            <p>Loading managers...</p>
                        </div>
                    ) : managers.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                            <User size={48} color="#9ca3af" />
                            <p style={{ marginTop: "1rem", color: "#6b7280", fontSize: "1.125rem" }}>No managers found</p>
                        </div>
                    ) : filteredManagers.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                            <User size={48} color="#9ca3af" />
                            <p style={{ marginTop: "1rem", color: "#6b7280", fontSize: "1.125rem" }}>No managers match your search</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1.5rem" }}>
                            {filteredManagers.map((m) => (
                                <div
                                    key={m._id || m.id}
                                    style={{ borderRadius: "12px", padding: "1.5rem", backgroundColor: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer", transition: "all 0.2s ease", border: "1px solid #e5e7eb" }}
                                    onClick={() => openManager(m)}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                            <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <User size={20} color="#4b5563" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: "1rem", fontWeight: 600, color: "#1f2937" }}>{m.username}</div>
                                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.125rem" }}>{m.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{m.managerType || m.role}</div>
                                    </div>

                                    <div style={{ marginBottom: "1rem" }}>
                                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "#6b7280", fontSize: "0.875rem" }}>
                                            <Calendar size={14} />
                                            <span>Joined: {formatDate(m.createdAt)}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" }}>
                                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{(m.activity || []).length} activities</div>
                                        <div>
                                            <button style={{ padding: "0.4rem 0.6rem", borderRadius: 6, border: "none", backgroundColor: "#4f46e5", color: "#fff", cursor: "pointer", marginRight: 8 }} onClick={(e) => { e.stopPropagation(); openManager(m); }}>
                                                <Edit3 size={14} />
                                            </button>
                                            <button style={{ padding: "0.4rem 0.6rem", borderRadius: 6, border: "none", backgroundColor: "#ef4444", color: "#fff", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); openManager(m); }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedManager && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setSelectedManager(null)}>
                    <div style={{ backgroundColor: "#fff", borderRadius: 12, maxWidth: 800, width: "95%", maxHeight: "85vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", borderBottom: "1px solid #e5e7eb" }}>
                            <h3 style={{ fontSize: "1.25rem", margin: 0 }}>Manager Details</h3>
                            <button style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#6b7280" }} onClick={() => setSelectedManager(null)}>✕</button>
                        </div>

                        <div style={{ padding: "1.5rem" }}>
                            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                                <div style={{ width: 72, height: 72, borderRadius: "50%", backgroundColor: "#e0e7ff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                    <User size={36} color="#4b5563" />
                                </div>
                                <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.5rem" }}>{selectedManager.name}</div>
                                <div style={{ color: "#6b7280", marginTop: "0.25rem" }}>{selectedManager.email}</div>
                            </div>

                            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" }}>
                                <div style={{ minWidth: 140, fontWeight: 600, color: "#6b7280" }}>Manager Type</div>
                                <select value={managerType} onChange={(e) => setManagerType(e.target.value)} style={{ flex: 1, padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}>
                                    <option value="feedback and revenue">feedback and revenue</option>
                                    <option value="feedback">feedback</option>
                                    <option value="revenue">revenue</option>
                                    <option value="viewer">viewer</option>
                                    <option value="admin">admin</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: "1rem" }}>
                                <div style={{ minWidth: 140, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Reason (required)</div>
                                <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} rows={3} style={{ width: "100%", padding: "0.75rem", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                            </div>

                            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                                <button disabled={actionLoading} onClick={handleUpdateRole} style={{ padding: "0.6rem 1rem", borderRadius: 8, border: "none", backgroundColor: "#4f46e5", color: "#fff", cursor: "pointer" }}>
                                                    Update Type
                                                </button>
                                <button disabled={actionLoading} onClick={handleDeleteManager} style={{ padding: "0.6rem 1rem", borderRadius: 8, border: "none", backgroundColor: "#ef4444", color: "#fff", cursor: "pointer" }}>
                                    Delete Manager
                                </button>
                                <button onClick={() => { setActionReason(""); setManagerType(selectedManager.managerType || selectedManager.role || "manager"); }} style={{ padding: "0.6rem 1rem", borderRadius: 8, border: "1px solid #d1d5db", backgroundColor: "#fff", color: "#374151", cursor: "pointer" }}>
                                    Reset
                                </button>
                            </div>

                            <div>
                                <h4 style={{ margin: 0, marginBottom: 8 }}>Activity</h4>
                                {(!selectedManager.activity || selectedManager.activity.length === 0) ? (
                                    <div style={{ color: "#6b7280" }}>No activity for this manager yet.</div>
                                ) : (
                                    <div style={{ display: "grid", gap: 8 }}>
                                        {selectedManager.activity.map((act, idx) => (
                                            <div key={idx} style={{ padding: 12, borderRadius: 8, border: "1px solid #f3f4f6", backgroundColor: "#fff" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                                    <div style={{ fontWeight: 600 }}>{act.title || act.type || "Activity"}</div>
                                                    <div style={{ color: "#6b7280", fontSize: 12 }}>{formatDate(act.date || act.createdAt)}</div>
                                                </div>
                                                <div style={{ color: "#374151" }}>{act.detail || act.description || JSON.stringify(act)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Managers;