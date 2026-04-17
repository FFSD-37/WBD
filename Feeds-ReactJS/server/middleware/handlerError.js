export const errorhandler = (error, req, res, next) => {
    console.log("Error handler called");
    console.log(error.stack);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        statusCode,
        message: error.message || "Something went wrong"
    });
};