export const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  // Surface backend failures in terminal for faster debugging.
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(status).json({ message });
};
