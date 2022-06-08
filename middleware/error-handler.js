import { StatusCodes } from 'http-status-codes'

const errorHandlerMiddleware = (err, req, res, next) => {
  const defaultError = {
    // get statusCode and message from custom error if it exists
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || 'Something went wrong, try again later',
  }
  // handle missing field error
  if (err.name === 'ValidationError') {
    defaultError.statusCode = StatusCodes.BAD_REQUEST
    // defaultError.msg = err.message
    
    defaultError.msg = Object.values(err.errors)
      .map((item) => item.message)
      .join(',')
  }
  // handle unique field error
  if (err.code && err.code === 11000) {
    defaultError.statusCode = StatusCodes.BAD_REQUEST
    defaultError.msg = `${Object.keys(err.keyValue)} field has to be unique`
  }

  res.status(defaultError.statusCode).json({ msg: defaultError.msg })
}

export default errorHandlerMiddleware

 