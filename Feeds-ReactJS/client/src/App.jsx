import './App.css';
import PaymentPage from './components/payment.jsx';
import Games from './components/games.jsx';
import Notifications from './components/Notifications.jsx';
import Login from './components/login.jsx';
import ChannelPage from './components/channel.jsx';
import Register from './components/registration.jsx';
import ActivityLog from './components/ActivityLog.jsx';
import Stories from './components/stories.jsx';
import ProfilePage from './components/Profile.jsx';
import Connect from './components/connect.jsx';
import EditProfile from './components/editProfile.jsx';
import KidsProfile from './components/KidsProfile';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { UserDataProvider, useUserData } from './providers/userData.jsx';
import EditChannel from './components/editChannel.jsx';
import ChannelHome from './components/channelHome.jsx';
import ChannelPostOverlay from './components/ChannelPostOverlay.jsx';
import HomePage from './components/Landing.jsx';
import CreatePost from './components/create_post.jsx';
import ImageEditor from './components/create_post_2.jsx';
import FinalizePost from './components/finalize_post.jsx';
import TandC from './components/TandC.jsx';
import Help from './components/Help.jsx';
import Contact from './components/contact.jsx';
import Reels from './components/reels.jsx';
import ChannelRegistration from './components/channelregistration.jsx';
import Settings from './components/settings.jsx';
import ChannelSettings from './components/channelSettings.jsx';
// import { Home } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import ChatPage from './components/chat.jsx';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectSocket, disconnectSocket } from './redux/slices/socketSlice.js';
import DailyUsagePage from './components/dailyUsage.jsx';
import NotFoundRoute from './components/notfound.jsx';
import KidsSettings from './components/KidsSettings.jsx';
import DeleteAccount from './components/DeleteAccount.jsx';
import ChannelDeletePage from './components/channelDelete.jsx';
import KidsHome from './components/kidsHome.jsx';
import { setTheme } from './redux/slices/themeSlice.js';

const AppContent = () => {
  const { userData } = useUserData();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const mode = useSelector(state => state.theme.mode);

  useEffect(() => {
    dispatch(setTheme(userData?.type));
    dispatch(connectSocket());
    return () => dispatch(disconnectSocket());
  }, [navigate, dispatch, userData?.type]);

  useEffect(() => {
    document.documentElement.classList.remove(
      'normal-theme',
      'channel-theme',
      'kid-theme',
    );

    document.documentElement.classList.add(`${mode?.toLowerCase()}-theme`);
  }, [mode]);

  return (
    <>
      <Routes>
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/games" element={<Games />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/login" element={<Login />} />
        <Route path="/channel/:channelName" element={<ChannelPage />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/activityLog" element={<ActivityLog />} />
        <Route path="/stories" element={<Stories />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/edit_profile" element={<EditProfile />} />
        <Route path="/edit_channel" element={<EditChannel />} />
        <Route path="/channel/post/:id" element={<ChannelPostOverlay />} />
        <Route
          path="/home"
          element={
            userData?.type &&
            (userData?.type === 'Channel' ? (
              <ChannelHome />
            ) : userData?.type === 'Kids' ? (
              <KidsHome />
            ) : (
              <HomePage />
            ))
          }
        />
        <Route path="/create_post" element={<CreatePost />} />
        <Route path="/edit_post" element={<ImageEditor />} />
        <Route path="/finalize_post" element={<FinalizePost />} />
        <Route path="/help" element={<Help />} />
        <Route path="/terms" element={<TandC />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/channelregistration" element={<ChannelRegistration />} />
        <Route
          path="/settings"
          element={
            userData?.type === 'Channel' ? (
              <ChannelSettings />
            ) : userData?.type === 'Kids' ? (
              <KidsSettings />
            ) : (
              <Settings />
            )
          }
        />
        <Route path="/kids_settings" element={<KidsSettings />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/dailyUsage" element={<DailyUsagePage />} />
        <Route
          path="/DeleteAccount"
          element={
            userData?.type === 'Channel' ? <ChannelDeletePage /> : <DeleteAccount />
          }
        />
        <Route path="*" element={<NotFoundRoute />} />
        <Route path="/kids-profile/:username" element={<KidsProfile />} />
      </Routes>
      {userData?.username ? (
        <Sidebar />
      ) : userData?.channelName ? (
        <Sidebar />
      ) : null}
    </>
  );
};

function App() {
  return (
    <Router>
      <UserDataProvider>
        <AppContent />
      </UserDataProvider>
    </Router>
  );
}

export default App;
