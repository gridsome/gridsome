const { GITHUB_EVENT_PATH, GITHUB_WORKSPACE } = process.env

const payload = GITHUB_EVENT_PATH ? require(GITHUB_EVENT_PATH) : {}

console.log('Create Releases', {
  workspace: GITHUB_WORKSPACE,
  payload
})
