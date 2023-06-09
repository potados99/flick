const process = require('process');

function handleProcessEvents() {
  // Handle SIGINT
  process.on('SIGINT', () => {
    console.info('SIGINT Received, exiting...')
    process.exit(0)
  })

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    console.info('SIGTERM Received, exiting...')
    process.exit(0)
  })

  // Handle APP ERRORS
  process.on('uncaughtException', (error, origin) => {
    console.log('----- Uncaught exception -----')
    console.log(error)
    console.log('----- Exception origin -----')
    console.log(origin)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.log('----- Unhandled Rejection at -----')
    console.log(promise)
    console.log('----- Reason -----')
    console.log(reason)
  })
}

module.exports = {
  handleProcessEvents
}
