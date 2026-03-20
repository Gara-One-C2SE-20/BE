// Custom Error Class
class AppError extends Error {
    constructor(message, statusCode = 400, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// API Response Class
class ApiRes {
    static send(res, { statusCode, success, message, data = null, errors = null, meta = null }) {
        const response = {
            success,
            message,
            statusCode
        };

        if (data !== null) {
            response.data = data;
        }

        if (errors) {
            response.errors = errors;
        }

        if (meta) {
            response.meta = meta;
        }

        return res.status(statusCode).json(response);
    }

    static success(res, message = "Success", data = null) {
        return this.send(res, {
            statusCode: 200,
            success: true,
            message,
            data
        });
    }

    static successWithMeta(res, message = "Success", data = null, meta = {}) {
        return this.send(res, {
            statusCode: 200,
            success: true,
            message,
            data,
            meta
        });
    }

    static created(res, message = "Created successfully", data = null) {
        return this.send(res, {
            statusCode: 201,
            success: true,
            message,
            data
        });
    }

    static updated(res, message = "Updated successfully", data = null) {
        return this.send(res, {
            statusCode: 200,
            success: true,
            message,
            data
        });
    }

    static deleted(res, message = "Deleted successfully", data = null) {
        return this.send(res, {
            statusCode: 200,
            success: true,
            message,
            data
        });
    }

    static badRequest(res, message = "Bad request", errors = null) {
        return this.send(res, {
            statusCode: 400,
            success: false,
            message,
            errors
        });
    }

    static unauthorized(res, message = "Unauthorized") {
        return this.send(res, {
            statusCode: 401,
            success: false,
            message
        });
    }

    static forbidden(res, message = "Forbidden") {
        return this.send(res, {
            statusCode: 403,
            success: false,
            message
        });
    }

    static notFound(res, message = "Resource not found") {
        return this.send(res, {
            statusCode: 404,
            success: false,
            message
        });
    }

    static conflict(res, message = "Resource already exists") {
        return this.send(res, {
            statusCode: 409,
            success: false,
            message
        });
    }

    static serverError(res, message = "Internal server error", error = null) {
        if (error) {
            console.error('Server Error:', error);
        }

        const response = {
            statusCode: 500,
            success: false,
            message
        };

        if (process.env.NODE_ENV === 'development' && error) {
            response.error = error;
        }

        return this.send(res, response);
    }

    static error(res, message, statusCode = 400, dataOrErrors = null) {
        const isErrorArray = Array.isArray(dataOrErrors);
        
        return this.send(res, {
            statusCode: statusCode instanceof Error ? 500 : statusCode,
            success: false,
            message,
            ...(isErrorArray ? { errors: dataOrErrors } : { data: dataOrErrors })
        });
    }
}

module.exports = { AppError, ApiRes };
