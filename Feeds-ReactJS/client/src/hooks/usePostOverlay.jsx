import { useState } from 'react';
import ChannelPostOverlay from '../components/ChannelPostOverlay.jsx';

export default function usePostOverlay() {
  const [activePostId, setActivePostId] = useState(null);

  const openPostOverlay = (postId) => setActivePostId(postId);
  const closePostOverlay = () => setActivePostId(null);

  const overlay = activePostId ? (
    <ChannelPostOverlay id={activePostId} onClose={closePostOverlay} />
  ) : null;

  return { openPostOverlay, closePostOverlay, overlay };
}
