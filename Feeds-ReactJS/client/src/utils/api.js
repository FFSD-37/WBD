const API_URL = "http://localhost:3000/";

export const apiFetch = async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        credentials: "include",
        ...options,
    });

    if (!response.ok){
        const error = await response.json();
        throw error;
    }
    return response.json();
}