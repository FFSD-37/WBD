import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import LoadingSpinner from "../components/Loader";

const ProtectedRoute = () => {
    const { isAuthenticated } = useContext(AuthContext);
    if (isAuthenticated === null) return <LoadingSpinner size="large" color="#10b981" text="Loading data..."  />;
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;