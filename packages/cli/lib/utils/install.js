const execa = require('execa')

const stdio = ['ignore', 'pipe', 'pipe']
const defaultArgs = {
  npm: ['install', '--loglevel', 'error'],
  yarn: ['install', '--json'],
  pnpm: ['install']
}

/**
 * @param {string} command
 * @param {string} cwd
 * @param {any} task
 * @returns {Promise<void>}
 */
exports.installDependencies = async (command, cwd, task) => {
  const args = defaultArgs[command] || []

  switch (command) {
    case 'yarn': return installWithYarn(cwd, task)
  }

  await execa(command, args, { stdio, cwd })
}

/**
 * @param {string} cwd
 * @param {any} task
 */
async function installWithYarn (cwd, task) {
  const subprocess = execa('yarn', defaultArgs.yarn, { stdio, cwd })

  if (!task) return subprocess

  return new Promise((resolve, reject) => {
    const onRecievedData = (buffer) => {
      let str = buffer.toString().trim()

      if (str && str.includes('"type":')) {
        const newLineIndex = str.lastIndexOf('\n')

        if (newLineIndex !== -1) {
          str = str.substr(newLineIndex)
        }

        try {
          const { type, data } = JSON.parse(str)
          if (type === 'step') {
            const { message, current, total } = data

            task.setStatus(`${message} (${current} of ${total})`)

            if (current === total) {
              resolve()
            }
          } else if (type === 'error') {
            reject(new Error(data))
          }
        } catch (e) {}
      }
    }

    subprocess.stderr.on('data', onRecievedData)
    subprocess.stdout.on('data', onRecievedData)
  })
}
