import { useEffect, useState } from 'react';
import ImageKit from 'imagekit-javascript';
import 'emoji-picker-element';
import { useLocation } from 'react-router-dom';
import { useUserData } from '../providers/userData';
import base64ToBlobUrl from '../utils/base64toBlob';

/*
ISSUES/Improvements:
1. Add progress bar for upload status.
2. Adding limit to caption length.

*/

const FinalizePost = () => {
  const { userData } = useUserData();
  const [caption, setCaption] = useState('');
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availCategories, setAvailCategories] = useState([]);
  const [category, setCategory] = useState('');
  const { state } = useLocation();

  const getAuth = async () => {
    return await fetch(import.meta.env.VITE_SERVER_URL + '/imagKitauth');
  };

  useEffect(() => {
    if (!state || !state.fromCreatePost) {
      window.location.href = '/create_post';
      return;
    }
    const keys = Object.keys(localStorage).filter(k =>
      k.startsWith('uploadedFile_'),
    );
    if (!keys.length) return;

    keys.forEach(key => {
      const { data: base64 } = JSON.parse(localStorage.getItem(key));
      if (base64.startsWith('data:video')) {
        const videoUrl = base64ToBlobUrl(base64);
        setMediaPreview(videoUrl);
      } else {
        setMediaPreview(base64);
      }
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(
          import.meta.env.VITE_SERVER_URL + '/channel/categories',
          {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          },
        );
        const data = await res.json();
        setAvailCategories(data.category);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    if (userData?.type === 'Channel') init();
  }, [userData?.type]);

  const uploadPost = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      const keys = Object.keys(localStorage).filter(k =>
        k.startsWith('uploadedFile_'),
      );
      const { data: base64File, name } = JSON.parse(
        localStorage.getItem(keys[0]),
      );

      const authResponse = await getAuth();
      const authData = await authResponse.json();

      const imagekit = new ImageKit({
        publicKey: 'public_kFHkU6GMQrtHeX9lEvE8hn7bOqM=',
        urlEndpoint: 'https://ik.imagekit.io/vzp8taxcnc/',
      });

      imagekit.upload(
        {
          file: base64File,
          fileName: name,
          tags: ['tag1'],
          token: authData.token,
          signature: authData.signature,
          expire: authData.expire,
        },
        async function (err, result) {
          if (err) {
            alert('Upload failed. Please try again.');
            setLoading(false);
            return;
          }

          userData?.type === 'Channel'
            ? await fetch(import.meta.env.VITE_SERVER_URL + '/channel/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  title: caption,
                  url: result.url,
                  content: caption,
                  category,
                  type: !state.selectedPostType ? 'Img' : 'Reels',
                }),
              })
            : await fetch(import.meta.env.VITE_SERVER_URL + '/shareFinalPost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  caption,
                  type: !state.selectedPostType ? 'Img' : 'Reels',
                  avatar: result.url,
                }),
              })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    localStorage.clear();
                    window.location.href = '/home';
                  }
                });

          setLoading(false);
        },
      );
    } catch (error) {
      console.error(error);
      alert('Unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black rounded-xl overflow-hidden">
      <div className="!p-6 flex justify-center items-center border-b border-gray-700 bg-gradient-to-r from-gray-900 to-black">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Create New Post
        </h1>
      </div>

      <div className="flex flex-1 gap-6 items-center justify-center flex-col lg:flex-row">
        {/* Media Preview Section */}
        <div className="flex items-center justify-center !p-8 bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20"></div>
          {mediaPreview && !state.selectedPostType && (
            <div className="relative z-10 w-full max-w-2xl h-96 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
              <img
                src={mediaPreview}
                alt="preview"
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
          {mediaPreview && !!state.selectedPostType && (
            <div className="relative z-10 w-full max-w-2xl h-96 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
              <video
                className="w-full h-full object-cover"
                controls
                autoPlay
                loop
                muted
                playsInline
              >
                <source src={mediaPreview} type="video/mp4" />
              </video>
            </div>
          )}
        </div>

        <div className="w-full gap-6 lg:w-96 bg-gray-900 border-l border-gray-700 flex flex-col justify-between !p-8 space-y-6">
          <form onSubmit={uploadPost} className="space-y-6">
            <div className="flex gap-4 items-center !p-4 bg-gray-800 rounded-2xl shadow-lg">
              <img
                src={userData.profileUrl}
                alt="user"
                className="w-12 h-12 rounded-full border-2 border-purple-500/50 object-cover shadow-lg"
              />
              <div className="flex flex-col">
                <div className="font-bold text-white text-lg">
                  {userData.username}
                </div>
                <div className="text-sm text-gray-400">Posting to feed</div>
              </div>
            </div>

            {userData?.type === 'Channel' && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                  Category
                </label>
                <select
                  className="w-full !p-4 bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 shadow-inner transition-all duration-200"
                  required
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="" disabled>
                    Select a category
                  </option>
                  {availCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                Caption
              </label>
              <textarea
                placeholder="Share your thoughts..."
                className="w-full h-32 !p-4 bg-gray-800 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 resize-none shadow-inner transition-all duration-200"
                required
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />
            </div>

            <div className="border-t border-gray-700 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold !py-4 !px-6 rounded-xl hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? 'Sharing...' : 'Share Post'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {loading && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex flex-col justify-center items-center z-50">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin shadow-lg"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin animate-reverse shadow-lg"></div>
          </div>
          <p className="text-white mt-6 text-xl font-semibold tracking-wide">
            Uploading your masterpiece...
          </p>
          <p className="text-gray-400 mt-2 text-sm">
            This may take a few moments
          </p>
        </div>
      )}
    </div>
  );
};

export default FinalizePost;
