import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "./components/dashboard.jsx";
import AdminLoginPage from "./components/login.jsx";
import ProtectedRoute from "./Routes/PrivateRoute.jsx";
import PublicRoute from "./Routes/PublicRoute.jsx";
import UsersPage from "./components/UserList.jsx";
import WelcomePageWithHover from "./components/WelcomePage.jsx";
import FeedbacksPage from "./components/Feedback.jsx";
import ReportsPage from "./components/Reports.jsx";
import PaymentsPage from "./components/Transactions.jsx";
import SettingsPage from "./components/Settings.jsx";
import ChannelsPage from "./components/ChannelList.jsx";
import ErrorPage from "./components/ErrorPage.jsx";
import Managers from "./components/Managers.jsx";
import PostsPage from "./components/Posts.jsx";

function App() {
  return (
    <Router>
      <ErrorPage />
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<AdminLoginPage />} />
          <Route path="/" element={<WelcomePageWithHover />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/feedbacks" element={<FeedbacksPage />} />
          <Route path="/userList" element={<UsersPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/transactions" element={<PaymentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/channelList" element={<ChannelsPage />} />
          <Route path="/posts" element={<PostsPage />} />
          <Route path="/managers" element={<Managers />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
