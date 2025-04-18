class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const handleError = (error, req, res) => {
  console.error(`Error processing ${req.path}:`, error);
  
  if (error instanceof APIError) {
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      details: error.details
    };
  }

  // Default error response
  return {
    success: false,
    error: 'Internal server error',
    statusCode: 500
  };
};

export { APIError };
