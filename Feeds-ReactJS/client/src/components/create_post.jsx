import ImageKit from 'imagekit-javascript';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '../providers/userData';

const PostCreation = () => {
  const { userData } = useUserData();
  const [selectedPostType, setSelectedPostType] = useState('image');
  const [postTypeText, setPostTypeText] = useState('Image Post');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success'); // 'success' or 'error'
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // File validation constants
  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 5MB for images and videos
  const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
  ];

  let postTypes = [
    { type: 'image', accept: 'image/*', label: 'Image Post' },
    { type: 'reel', accept: 'video/*', label: 'Reel Post' },
  ];
  if (userData?.type !== 'Channel')
    postTypes.push({
      type: 'story',
      accept: 'image/*, video/*',
      label: 'Story',
    });

  const uploadToImageKit = async file => {
    const authRes = await fetch(
      import.meta.env.VITE_SERVER_URL + '/imagKitauth',
    );
    const authData = await authRes.json();

    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const imagekit = new ImageKit({
          publicKey: 'public_kFHkU6GMQrtHeX9lEvE8hn7bOqM=',
          urlEndpoint: 'https://ik.imagekit.io/vzp8taxcnc/',
        });

        imagekit.upload(
          {
            file: reader.result,
            fileName: file.name,
            tags: ['story'],
            token: authData.token,
            signature: authData.signature,
            expire: authData.expire,
          },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          },
        );
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePostTypeSelect = (type, accept, label) => {
    setSelectedPostType(type);
    setPostTypeText(label);
    setIsDropdownOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
    }
  };

  const showAlert = (message, type = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    if (type === 'success') {
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  const validateFile = file => {
    const fileType = file.type.split('/')[0];

    // Check if file type matches selected post type
    if (selectedPostType === 'image' && fileType !== 'image') {
      return {
        valid: false,
        error: 'Please select an image file for Image Post',
      };
    }

    if (selectedPostType === 'reel' && fileType !== 'video') {
      return {
        valid: false,
        error: 'Please select a video file for Reel Post',
      };
    }

    // Validate file type
    if (fileType === 'image') {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return {
          valid: false,
          error: 'Invalid image format. Allowed: JPEG, PNG, GIF, WebP',
        };
      }
      if (file.size > MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `Image size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        };
      }
    } else if (fileType === 'video') {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return {
          valid: false,
          error: 'Invalid video format. Allowed: MP4, WebM, OGG, MOV',
        };
      }
      if (file.size > MAX_FILE_SIZE)
        return {
          valid: false,
          error: `Video size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        };
    } else {
      return {
        valid: false,
        error: 'Invalid file type. Please select an image or video',
      };
    }

    // Check for empty file
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty. Please select a valid file',
      };
    }

    return { valid: true };
  };

  const storeFilesInLocalStorage = files => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('uploadedFile_')) localStorage.removeItem(k);
    });

    Array.from(files).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = e => {
        localStorage.setItem(
          `uploadedFile_${i}`,
          JSON.stringify({
            name: file.name,
            data: e.target.result,
          }),
        );
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async event => {
    const files = event.target.files;
    if (files.length > 0) {
      const file = files[0];

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        showAlert(validation.error, 'error');
        event.target.value = ''; // Reset input
        return;
      }

      const fileType = file.type.split('/')[0];

      try {
        if (selectedPostType !== 'story') {
          storeFilesInLocalStorage(files);
        }

        // Create preview
        const url = URL.createObjectURL(file);
        setPreviewSrc(url);
        setPreviewType(fileType);

        // Handle story type upload
        if (selectedPostType === 'story') {
          setIsLoading(true);
          try {
            // Simulate ImageKit upload - in real app, you'd call your backend
            const uploadResult = await uploadToImageKit(file);

            setProfileImageUrl(uploadResult.url);
            showAlert('Story uploaded successfully!', 'success');
          } catch (error) {
            console.error('Upload failed:', error);
            showAlert('Upload failed. Please try again', 'error');
          }
          // Clear loading state after handling success or error (avoids using finally)
          setIsLoading(false);
        } else {
          showAlert('File selected successfully!', 'success');
        }
      } catch (error) {
        console.error('File handling error:', error);
        showAlert('Error processing file. Please try again', 'error');
        event.target.value = '';
      }
    }
  };

  const handleContinue = async () => {
    if (selectedPostType === 'story') {
      if (!profileImageUrl) {
        showAlert('Story not uploaded yet', 'error');
        return;
      }

      console.log('Story confirmed:', profileImageUrl);
      await fetch(import.meta.env.VITE_SERVER_URL + '/createpost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          caption: '',
          postType: 'story',
          mediaUrl: profileImageUrl,
        }),
      });

      showAlert('Story published successfully!', 'success');

      setPreviewSrc(null);
      setPreviewType(null);
      setProfileImageUrl('');
    } else {
      if (!previewSrc) {
        showAlert('Please select a file first', 'error');
        return;
      }
      if (selectedPostType === 'image')
        navigate('/edit_post', { state: { fromCreatePost: true } });
      else
        navigate('/finalize_post', {
          state: { fromCreatePost: true, selectedPostType },
        });
    }
  };

  const handleAgainSelect = () => {
    setPreviewSrc(null);
    setPreviewType(null);
    setProfileImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center !p-6">
      <div className="w-full max-w-lg bg-gray-900 rounded-2xl !p-6 shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="text-center !mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent !mb-2">
            Create New Post
          </h1>
          <p className="text-gray-400 text-sm">
            Choose your content type and upload media
          </p>
        </div>

        {/* Alert */}
        {alertMessage && (
          <div
            className={`!mb-6 rounded-xl !p-4 border ${
              alertType === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-300'
                : 'bg-green-500/10 border-green-500/20 text-green-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${alertType === 'error' ? 'bg-red-400' : 'bg-green-400'}`}
                ></div>
                <span className="text-sm font-medium">{alertMessage}</span>
              </div>
              <button
                className="text-gray-400 hover:text-white transition-colors"
                onClick={() => setAlertMessage('')}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Post Type Selector */}
        <div className="relative !mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Post Type
          </label>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-gray-800 border border-gray-600 rounded-xl !px-4 !py-3.5 flex items-center justify-between hover:bg-gray-700 transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-white">{postTypeText}</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl z-10 overflow-hidden">
              {postTypes.map(option => (
                <button
                  key={option.type}
                  onClick={() =>
                    handlePostTypeSelect(
                      option.type,
                      option.accept,
                      option.label,
                    )
                  }
                  className="w-full text-left !px-4 !py-3.5 text-white hover:bg-gray-700 transition-all duration-200 flex items-center space-x-3 group"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* File Upload Area */}
        <div className="!mb-6">
          <label className="block text-sm font-medium text-gray-300 !mb-3">
            Media Upload
          </label>
          <label
            htmlFor="file-input"
            className={`relative block w-full aspect-square rounded-xl border-2 border-dashed transition-all duration-300 group cursor-pointer overflow-hidden ${
              previewSrc
                ? 'border-gray-600 bg-black'
                : 'border-gray-600 bg-gray-800 hover:border-gray-500 hover:bg-gray-700'
            }`}
          >
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!previewSrc ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center !p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <p className="text-white font-medium mb-2">Upload Media</p>
                <p className="text-gray-400 text-sm">
                  Drag and drop or click to browse
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Supports images and videos
                </p>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {previewType === 'image' ? (
                  <img
                    src={previewSrc}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={previewSrc}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-gray-800 backdrop-blur-sm rounded-full !p-3">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </label>
        </div>

        {/* Action Buttons */}
        {previewSrc && (
          <div className="flex gap-3">
            <button
              onClick={handleContinue}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold !py-3.5 rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none shadow-lg"
            >
              {selectedPostType === 'story'
                ? isLoading
                  ? 'Uploading...'
                  : 'Publish Story'
                : 'Continue'}
            </button>

            <button
              onClick={handleAgainSelect}
              disabled={isLoading}
              className="!px-6 !py-3.5 rounded-xl bg-gray-800 text-white font-medium hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 border border-gray-600"
            >
              Change
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCreation;
