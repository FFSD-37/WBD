import dotenv from "dotenv";
import { connectDB } from "./DB/Connection.js";
import { app } from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

connectDB();
app.listen(PORT, () => {
  console.log(`Manager service at: http://localhost:${PORT}`);
});

export default app;
