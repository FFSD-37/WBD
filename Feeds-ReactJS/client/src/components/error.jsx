// const NotFound = () => {
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-6">
//       <div className="relative max-w-2xl w-full text-center bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] px-12 py-16">

//         <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />

//         <h1 className="relative text-[10rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 leading-none animate-pulse">
//           404
//         </h1>

//         <p className="mt-4 text-3xl font-semibold text-gray-800">
//           Page not found
//         </p>

//         <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
//           The page you’re looking for doesn’t exist or may have been moved.
//           Let’s get you back somewhere familiar.
//         </p>

//         <a
//           href="/"
//           className="inline-flex items-center justify-center mt-10 px-10 py-4 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.03] transition-all duration-300"
//         >
//           Go back home
//         </a>
//       </div>
//     </div>
//   );
// };

// export default NotFound;


import { useError } from "../providers/ErrorContext";

export default function NotFound() {
  const { error } = useError();

  if (!error) return null;

  return (
    <div style={{ padding: 40 }}>
      <h1>{error.statusCode || 500}</h1>
      <p>{error.message}</p>
    </div>
  );
}
