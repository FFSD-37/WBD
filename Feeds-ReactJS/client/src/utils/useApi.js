import { apiFetch } from "./api";
import { useError } from "../providers/ErrorContext";

export const useApi = () => {
    const { setError } = useError();
    const request = async (...args) => {
        try{
            return await apiFetch(...args);
        } catch (err){
            setError(err);
            throw err;
        }
    }
    return request;
}