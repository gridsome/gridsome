const Queue = require('better-queue')

module.exports = (items, options, taskHandler) => {
  if (typeof options === 'function') {
    taskHandler = options
    options = {}
  }

  const queue = new Queue(taskHandler, {
    concurrent: options.concurrent || 10
  })

  for (let i = 0, l = items.length; i < l; i++) {
    queue.push({ id: `data[${i}]`, data: items[i] })
  }

  return new Promise((resolve, reject) => {
    queue.on('task_failed', (id, err) => {
      reject(`${id} failed with error: ${err}`)
      queue.destroy()
    })

    queue.on('drain', () => {
      resolve()
    })
  })
}
