import { useError } from "../context/ErrorContext";

const ErrorPage = () => {
  const { error, clearError } = useError();

  if (!error) return null;

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>⚠️ Oops!</h1>
      <p>{error.message}</p>
      <small>Status Code: {error.statusCode}</small>
      <br />
      <button onClick={clearError} style={{ marginTop: "1rem" }}>
        Go Back
      </button>
    </div>
  );
};

export default ErrorPage;