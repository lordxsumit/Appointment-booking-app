class ApiError extends Error{
    constructor(
        statusCode,
        message="Something went wrong",
        errors = [],
        errStack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.message = message
        this.errors = errors

        if(errStack){
            this.errStack = errStack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiError }