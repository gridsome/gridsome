workflow "Main Workflow" {
  on = "push"
  resolves = ["create releases"]
}

action "create releases" {
  uses = "./.github/actions/create-releases"
  secrets = ["GITHUB_TOKEN"]
}
